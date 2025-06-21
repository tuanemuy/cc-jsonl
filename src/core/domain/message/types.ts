import { z } from "zod/v4";
import { paginationSchema } from "@/lib/pagination";
import { sessionIdSchema } from "../session/types";

export const messageIdSchema = z
  .string()
  .min(1)
  .refine((val) => val.trim().length > 0 && val === val.trim(), {
    message:
      "ID cannot be empty, whitespace only, or have leading/trailing whitespace",
  })
  .brand("messageId");
export type MessageId = z.infer<typeof messageIdSchema>;

export const messageRoleSchema = z.enum(["user", "assistant"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageSchema = z.object({
  id: messageIdSchema,
  sessionId: sessionIdSchema,
  role: messageRoleSchema,
  content: z.string().nullable(),
  timestamp: z.date(),
  rawData: z.string(),
  uuid: z.string(),
  parentUuid: z.string().nullable(),
  cwd: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Message = z.infer<typeof messageSchema>;

export const createMessageParamsSchema = z.object({
  sessionId: sessionIdSchema,
  role: messageRoleSchema,
  content: z.string().nullable(),
  timestamp: z.date(),
  rawData: z.string(),
  uuid: z.string(),
  parentUuid: z.string().nullable(),
  cwd: z.string(),
});
export type CreateMessageParams = z.infer<typeof createMessageParamsSchema>;

export const listMessageQuerySchema = z.object({
  pagination: paginationSchema,
  filter: z
    .object({
      sessionId: sessionIdSchema.optional(),
      role: messageRoleSchema.optional(),
    })
    .optional(),
});
export type ListMessageQuery = z.infer<typeof listMessageQuerySchema>;
