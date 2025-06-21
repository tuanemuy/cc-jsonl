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
  try {
    const sessionId = sessionIdSchema.parse(input.id);
    const result = await context.sessionRepository.findById(sessionId);
    return result.mapErr(
      (error) => new ApplicationError("Failed to get session", error),
    );
  } catch (error) {
    return err(new ApplicationError("Invalid session input", error));
  }
}
