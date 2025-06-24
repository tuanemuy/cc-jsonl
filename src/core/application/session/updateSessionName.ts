import { err, type Result } from "neverthrow";
import { z } from "zod/v4";
import type { Session, SessionId } from "@/core/domain/session/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export const updateSessionNameInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).nullable(),
});

export type UpdateSessionNameInput = z.infer<
  typeof updateSessionNameInputSchema
>;

export async function updateSessionName(
  context: Context,
  input: UpdateSessionNameInput,
): Promise<Result<Session, ApplicationError>> {
  const parseResult = validate(updateSessionNameInputSchema, input);

  if (parseResult.isErr()) {
    return err(
      new ApplicationError(
        "Invalid update session name input",
        parseResult.error,
      ),
    );
  }

  const { id, name } = parseResult.value;

  // First, check if session exists
  const sessionResult = await context.sessionRepository.findById(
    id as SessionId,
  );

  if (sessionResult.isErr()) {
    return err(
      new ApplicationError("Failed to find session", sessionResult.error),
    );
  }

  if (!sessionResult.value) {
    return err(new ApplicationError("Session not found"));
  }

  // Since we don't have a direct updateName method, we'll need to use the create method with upsert
  const updateResult = await context.sessionRepository.create({
    id: id as SessionId,
    projectId: sessionResult.value.projectId,
    name,
    cwd: sessionResult.value.cwd,
  });

  return updateResult.mapErr((error) => {
    return new ApplicationError("Failed to update session name", error);
  });
}
