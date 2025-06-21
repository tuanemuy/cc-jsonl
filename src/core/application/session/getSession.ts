import { err, type Result } from "neverthrow";
import { z } from "zod/v4";
import type { Session } from "@/core/domain/session/types";
import { sessionIdSchema } from "@/core/domain/session/types";
import { ApplicationError } from "@/lib/error";
import type { Context } from "../context";

export const getSessionInputSchema = z.object({
  id: z.string().min(1),
});
export type GetSessionInput = z.infer<typeof getSessionInputSchema>;

export async function getSession(
  context: Context,
  input: GetSessionInput,
): Promise<Result<Session | null, ApplicationError>> {
  console.log("[getSession] Starting session retrieval", { id: input.id });

  try {
    const sessionId = sessionIdSchema.parse(input.id);
    const result = await context.sessionRepository.findById(sessionId);
    return result.mapErr((error) => {
      const appError = new ApplicationError("Failed to get session", error);
      console.error("[getSession] Repository operation failed", {
        sessionId,
        error: appError.message,
        cause: appError.cause,
      });
      return appError;
    });
  } catch (error) {
    const appError = new ApplicationError("Invalid session input", error);
    console.error("[getSession] Invalid session input or unexpected error", {
      id: input.id,
      error: appError.message,
      cause: appError.cause,
    });
    return err(appError);
  }
}
