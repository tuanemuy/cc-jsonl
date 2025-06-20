import type { Message, MessageId } from "@/core/domain/message/types";
import { messageIdSchema } from "@/core/domain/message/types";
import { ApplicationError } from "@/lib/error";
import { type Result, err } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const getMessageInputSchema = z.object({
  id: z.string().min(1),
});
export type GetMessageInput = z.infer<typeof getMessageInputSchema>;

export async function getMessage(
  context: Context,
  input: GetMessageInput,
): Promise<Result<Message | null, ApplicationError>> {
  try {
    const messageId = messageIdSchema.parse(input.id);
    const result = await context.messageRepository.findById(messageId);
    return result.mapErr(
      (error) => new ApplicationError("Failed to get message", error),
    );
  } catch (error) {
    return err(new ApplicationError("Invalid message input", error));
  }
}
