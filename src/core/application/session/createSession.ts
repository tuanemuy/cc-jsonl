import { err, type Result } from "neverthrow";
import {
  type CreateSessionParams,
  createSessionParamsSchema,
  type Session,
} from "@/core/domain/session/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export type CreateSessionInput = CreateSessionParams;

export async function createSession(
  context: Context,
  input: CreateSessionInput,
): Promise<Result<Session, ApplicationError>> {
  const parseResult = validate(createSessionParamsSchema, input);

  if (parseResult.isErr()) {
    const error = new ApplicationError(
      "Invalid session input",
      parseResult.error,
    );
    console.error("[createSession] Validation failed", error);
    return err(error);
  }

  const params = parseResult.value;

  const result = await context.sessionRepository.upsert(params);
  return result.mapErr((error) => {
    const appError = new ApplicationError("Failed to create session", error);
    console.error("[createSession] Repository operation failed", appError);
    return appError;
  });
}
