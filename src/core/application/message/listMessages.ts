import { err, type Result } from "neverthrow";
import {
  type ListMessageQuery,
  listMessageQuerySchema,
  type Message,
} from "@/core/domain/message/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export type { ListMessageQuery };

export async function listMessages(
  context: Context,
  query: ListMessageQuery,
): Promise<Result<{ items: Message[]; count: number }, ApplicationError>> {
  const parseResult = validate(listMessageQuerySchema, query);

  if (parseResult.isErr()) {
    const error = new ApplicationError(
      "Invalid message query",
      parseResult.error,
    );
    console.error("[listMessages] Query validation failed", error);
    return err(error);
  }

  const result = await context.messageRepository.list(parseResult.value);
  return result.mapErr((error) => {
    const appError = new ApplicationError("Failed to list messages", error);
    console.error("[listMessages] Repository operation failed", appError);
    return appError;
  });
}
