import { err, type Result } from "neverthrow";
import {
  type CreateMessageParams,
  createMessageParamsSchema,
  type Message,
} from "@/core/domain/message/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export type CreateMessageInput = CreateMessageParams;

export async function createMessage(
  context: Context,
  input: CreateMessageInput,
): Promise<Result<Message, ApplicationError>> {
  const parseResult = validate(createMessageParamsSchema, input);

  if (parseResult.isErr()) {
    const error = new ApplicationError(
      "Invalid message input",
      parseResult.error,
    );
    console.error("[createMessage] Validation failed", error);
    return err(error);
  }

  const params = parseResult.value;

  const result = await context.messageRepository.upsert(params);

  if (result.isOk()) {
    // Update session's lastMessageAt
    const message = result.value;
    await context.sessionRepository.updateLastMessageAt(
      message.sessionId,
      message.timestamp,
    );
  }

  return result.mapErr((error) => {
    const appError = new ApplicationError("Failed to create message", error);
    console.error("[createMessage] Repository operation failed", appError);
    return appError;
  });
}
