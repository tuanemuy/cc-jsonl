import { err, ok, type Result } from "neverthrow";
import { z } from "zod/v4";
import type { Message } from "@/core/domain/message/types";
import type { Session } from "@/core/domain/session/types";
import { sessionIdSchema } from "@/core/domain/session/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export const sendMessageInputSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});
export type SendMessageInputLocal = z.infer<typeof sendMessageInputSchema>;

export async function sendMessage(
  context: Context,
  input: SendMessageInputLocal,
): Promise<
  Result<
    { session: Session; userMessage: Message; assistantMessage: Message },
    ApplicationError
  >
> {
  console.log("[sendMessage] Starting message processing", {
    sessionId: input.sessionId,
    messageLength: typeof input.message === "string" ? input.message.length : undefined,
  });

  const parseResult = validate(sendMessageInputSchema, input);
  if (parseResult.isErr()) {
    const error = new ApplicationError("Invalid input", parseResult.error);
    console.error("[sendMessage] Input validation failed", {
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  const params = parseResult.value;

  try {
    // Get or create session
    let session: Session;
    if (params.sessionId) {
      const sessionId = sessionIdSchema.parse(params.sessionId);
      const sessionResult = await context.sessionRepository.findById(sessionId);
      if (sessionResult.isErr()) {
        const error = new ApplicationError(
          "Failed to get session",
          sessionResult.error,
        );
        console.error("[sendMessage] Session retrieval failed", {
          sessionId,
          error: error.message,
          cause: error.cause,
        });
        return err(error);
      }
      if (!sessionResult.value) {
        const error = new ApplicationError("Session not found");
        console.error("[sendMessage] Session not found", {
          sessionId,
          error: error.message,
        });
        return err(error);
      }
      session = sessionResult.value;
    } else {
      // Create new session - need to determine project ID
      const projectsResult = await context.projectRepository.list({
        pagination: { page: 1, limit: 1, order: "desc", orderBy: "createdAt" },
      });
      if (projectsResult.isErr() || projectsResult.value.items.length === 0) {
        const error = new ApplicationError(
          "No projects found",
          projectsResult.isErr() ? projectsResult.error : undefined,
        );
        console.error(
          "[sendMessage] No projects available for session creation",
          { error: error.message, cause: error.cause },
        );
        return err(error);
      }

      const createSessionResult = await context.sessionRepository.create({
        projectId: projectsResult.value.items[0].id,
        cwd: "/tmp",
      });
      if (createSessionResult.isErr()) {
        const error = new ApplicationError(
          "Failed to create session",
          createSessionResult.error,
        );
        console.error("[sendMessage] Session creation failed", {
          error: error.message,
          cause: error.cause,
        });
        return err(error);
      }
      session = createSessionResult.value;
    }

    // Get previous messages for context
    const messagesResult = await context.messageRepository.list({
      pagination: { page: 1, limit: 50, order: "asc", orderBy: "timestamp" },
      filter: { sessionId: session.id },
    });
    if (messagesResult.isErr()) {
      const error = new ApplicationError(
        "Failed to get messages",
        messagesResult.error,
      );
      console.error("[sendMessage] Failed to retrieve previous messages", {
        sessionId: session.id,
        error: error.message,
        cause: error.cause,
      });
      return err(error);
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
      const error = new ApplicationError(
        "Failed to create user message",
        userMessageResult.error,
      );
      console.error("[sendMessage] User message creation failed", {
        sessionId: session.id,
        error: error.message,
        cause: error.cause,
      });
      return err(error);
    }

    // Send to Claude
    const claudeResult = await context.claudeService.sendMessage(
      { message: params.message },
      previousMessages,
    );
    if (claudeResult.isErr()) {
      const error = new ApplicationError(
        "Failed to send message to Claude",
        claudeResult.error,
      );
      console.error("[sendMessage] Claude API call failed", {
        sessionId: session.id,
        error: error.message,
        cause: error.cause,
      });
      return err(error);
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
      const error = new ApplicationError(
        "Failed to create assistant message",
        assistantMessageResult.error,
      );
      console.error("[sendMessage] Assistant message creation failed", {
        sessionId: session.id,
        error: error.message,
        cause: error.cause,
      });
      return err(error);
    }

    return ok({
      session,
      userMessage: userMessageResult.value,
      assistantMessage: assistantMessageResult.value,
    });
  } catch (error) {
    const appError = new ApplicationError(
      "Unexpected error in sendMessage",
      error,
    );
    console.error("[sendMessage] Unexpected error occurred", {
      error: appError.message,
      cause: appError.cause,
    });
    return err(appError);
  }
}
