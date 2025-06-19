import { type Result, ResultAsync, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import { AnyError } from "./error";

export class ValidationError<T> extends AnyError {
  override readonly name = "ValidationError";

  constructor(
    public readonly error: z.ZodError<T>,
    override readonly message: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/**
 * Validates data against a schema and returns a Result
 */
export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown,
): Result<z.infer<T>, ValidationError<z.infer<T>>> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return err(
      new ValidationError(
        result.error,
        "Validation error occurred",
        result.error,
      ),
    );
  }

  return ok(result.data);
}
