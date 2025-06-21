import type { Message } from "@/core/domain/message/types";
import type { Session } from "@/core/domain/session/types";
import { sessionIdSchema } from "@/core/domain/session/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const sendMessageStreamInputSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
});
export type SendMessageStreamInput = z.infer<
  typeof sendMessageStreamInputSchema
>;

export async function sendMessageStream(
  context: Context,
  input: SendMessageStreamInput,
  onChunk: (chunk: string) => void,
): Promise<
  Result<
    { session: Session; userMessage: Message; assistantMessage: Message },
    ApplicationError
  >
> {
  const parseResult = validate(sendMessageStreamInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const params = parseResult.value;

  try {
    // Get or create session
    let session: Session;
    if (params.sessionId) {
      const sessionId = sessionIdSchema.parse(params.sessionId);
      const sessionResult = await context.sessionRepository.findById(sessionId);
      if (sessionResult.isErr()) {
        return err(
          new ApplicationError("Failed to get session", sessionResult.error),
        );
      }
      if (!sessionResult.value) {
        return err(new ApplicationError("Session not found"));
      }
      session = sessionResult.value;
    } else {
      // Create new session - need to determine project ID
      const projectsResult = await context.projectRepository.list({
        pagination: { page: 1, limit: 1, order: "desc", orderBy: "createdAt" },
      });
      if (projectsResult.isErr() || projectsResult.value.items.length === 0) {
        return err(new ApplicationError("No projects found"));
      }

      const createSessionResult = await context.sessionRepository.create({
        projectId: projectsResult.value.items[0].id,
        cwd: "/tmp",
      });
      if (createSessionResult.isErr()) {
        return err(
          new ApplicationError(
            "Failed to create session",
            createSessionResult.error,
          ),
        );
      }
      session = createSessionResult.value;
    }

    // Get previous messages for context
    const messagesResult = await context.messageRepository.list({
      pagination: { page: 1, limit: 50, order: "asc", orderBy: "timestamp" },
      filter: { sessionId: session.id },
    });
    if (messagesResult.isErr()) {
      return err(
        new ApplicationError("Failed to get messages", messagesResult.error),
      );
    }

    const previousMessages = messagesResult.value.items
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((msg) => ({
        role: msg.role,
        content: msg.content || "",
      }));

    // Create user message
    const userMessageResult = await context.messageRepository.create({
      sessionId: session.id,
      role: "user",
      content: params.message,
      timestamp: new Date(),
      rawData: JSON.stringify({ content: params.message, role: "user" }),
      uuid: crypto.randomUUID(),
      parentUuid: null,
      cwd: session.cwd,
    });
    if (userMessageResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to create user message",
          userMessageResult.error,
        ),
      );
    }

    // Send to Claude with streaming
    const claudeResult = await context.claudeService.sendMessageStream(
      { message: params.message },
      previousMessages,
      onChunk,
    );
    if (claudeResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to send message to Claude",
          claudeResult.error,
        ),
      );
    }

    const claudeResponse = claudeResult.value;
    const assistantContent = claudeResponse.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    // Create assistant message
    const assistantMessageResult = await context.messageRepository.create({
      sessionId: session.id,
      role: "assistant",
      content: assistantContent,
      timestamp: new Date(),
      rawData: JSON.stringify(claudeResponse),
      uuid: crypto.randomUUID(),
      parentUuid: userMessageResult.value.uuid,
      cwd: session.cwd,
    });
    if (assistantMessageResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to create assistant message",
          assistantMessageResult.error,
        ),
      );
    }

    return ok({
      session,
      userMessage: userMessageResult.value,
      assistantMessage: assistantMessageResult.value,
    });
  } catch (error) {
    return err(
      new ApplicationError("Unexpected error in sendMessageStream", error),
    );
  }
}
