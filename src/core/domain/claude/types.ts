import { z } from "zod/v4";

export const sendMessageInputSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  cwd: z.string().optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const claudeMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ClaudeMessage = z.infer<typeof claudeMessageSchema>;

export const claudeResponseSchema = z.object({
  id: z.string(),
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    }),
  ),
  role: z.literal("assistant"),
  model: z.string(),
  stop_reason: z.string().nullable(),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
  }),
});
export type ClaudeResponse = z.infer<typeof claudeResponseSchema>;

export const claudeStreamChunkSchema = z.object({
  type: z.string(),
  delta: z
    .object({
      type: z.string(),
      text: z.string().optional(),
    })
    .optional(),
});
export type ClaudeStreamChunk = z.infer<typeof claudeStreamChunkSchema>;
