import type { ApplicationError } from "./error";
import type { ValidationError } from "./validation";

export type FormState<TInput, TResult> = {
  input: TInput;
  result?: TResult;
  error: ApplicationError | ValidationError<TInput> | null;
};
