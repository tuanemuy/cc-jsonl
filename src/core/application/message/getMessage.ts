import { err, type Result } from "neverthrow";
import { z } from "zod/v4";
import type { Message } from "@/core/domain/message/types";
import { messageIdSchema } from "@/core/domain/message/types";
import { ApplicationError } from "@/lib/error";
import type { Context } from "../context";

export const getMessageInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .refine((val) => val.trim().length > 0, {
      message: "ID cannot be empty or whitespace only",
    }),
});
export type GetMessageInput = z.infer<typeof getMessageInputSchema>;

export async function getMessage(
  context: Context,
  input: GetMessageInput,
): Promise<Result<Message | null, ApplicationError>> {
  console.log("[getMessage] Starting message retrieval", { id: input.id });

  const inputResult = getMessageInputSchema.safeParse(input);
  if (!inputResult.success) {
    const error = new ApplicationError(
      "Invalid message input",
      inputResult.error,
    );
    console.error("[getMessage] Input validation failed", {
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  try {
    const messageId = messageIdSchema.parse(input.id);
    const result = await context.messageRepository.findById(messageId);
    return result.mapErr((error) => {
      const appError = new ApplicationError("Failed to get message", error);
      console.error("[getMessage] Repository operation failed", {
        messageId,
        error: appError.message,
        cause: appError.cause,
      });
      return appError;
    });
  } catch (error) {
    const appError = new ApplicationError("Invalid message input", error);
    console.error("[getMessage] Unexpected error occurred", {
      id: input.id,
      error: appError.message,
      cause: appError.cause,
    });
    return err(appError);
  }
}
