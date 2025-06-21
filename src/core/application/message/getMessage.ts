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
  const inputResult = getMessageInputSchema.safeParse(input);
  if (!inputResult.success) {
    return err(
      new ApplicationError("Invalid message input", inputResult.error),
    );
  }

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
