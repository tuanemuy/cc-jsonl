import { err, ok, type Result } from "neverthrow";
import { z } from "zod/v4";
import type { ClaudeResponse } from "@/core/domain/claude/types";
import type { Session } from "@/core/domain/session/types";
import { sessionIdSchema } from "@/core/domain/session/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export const sendMessageStreamInputSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  cwd: z.string().optional(),
});
export type SendMessageStreamInput = z.infer<
  typeof sendMessageStreamInputSchema
>;

export async function sendMessageStream(
  context: Context,
  input: SendMessageStreamInput,
  onChunk: (chunk: string) => void,
): Promise<
  Result<{ session: Session; claudeResponse: ClaudeResponse }, ApplicationError>
> {
  console.log("[sendMessageStream] Starting streaming message processing", {
    sessionId: input.sessionId,
    messageLength:
      typeof input.message === "string" ? input.message.length : undefined,
  });

  const parseResult = validate(sendMessageStreamInputSchema, input);
  if (parseResult.isErr()) {
    const error = new ApplicationError("Invalid input", parseResult.error);
    console.error("[sendMessageStream] Input validation failed", {
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
        console.error("[sendMessageStream] Session retrieval failed", {
          sessionId,
          error: error.message,
          cause: error.cause,
        });
        return err(error);
      }
      if (!sessionResult.value) {
        const error = new ApplicationError("Session not found");
        console.error("[sendMessageStream] Session not found", {
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
          "[sendMessageStream] No projects available for session creation",
          { error: error.message, cause: error.cause },
        );
        return err(error);
      }

      const createSessionResult = await context.sessionRepository.create({
        projectId: projectsResult.value.items[0].id,
        name: null,
        cwd: "/tmp",
      });
      if (createSessionResult.isErr()) {
        const error = new ApplicationError(
          "Failed to create session",
          createSessionResult.error,
        );
        console.error("[sendMessageStream] Session creation failed", {
          error: error.message,
          cause: error.cause,
        });
        return err(error);
      }
      session = createSessionResult.value;
    }

    // Send to Claude with streaming
    const claudeResult = await context.claudeService.sendMessageStream(
      {
        message: params.message,
        sessionId: params.sessionId,
        cwd: params.cwd || session.cwd,
      },
      [], // No previous messages needed as per requirements
      onChunk,
    );
    if (claudeResult.isErr()) {
      const error = new ApplicationError(
        "Failed to send message to Claude",
        claudeResult.error,
      );
      console.error("[sendMessageStream] Claude API streaming call failed", {
        sessionId: session.id,
        error: error.message,
        cause: error.cause,
      });
      return err(error);
    }

    const claudeResponse = claudeResult.value;

    return ok({
      session,
      claudeResponse,
    });
  } catch (error) {
    const appError = new ApplicationError(
      "Unexpected error in sendMessageStream",
      error,
    );
    console.error("[sendMessageStream] Unexpected error occurred", {
      error: appError.message,
      cause: appError.cause,
    });
    return err(appError);
  }
}
