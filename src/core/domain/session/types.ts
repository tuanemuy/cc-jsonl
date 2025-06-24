import { z } from "zod/v4";
import { paginationSchema } from "@/lib/pagination";
import { type ProjectId, projectIdSchema } from "../project/types";

// Re-export types that are commonly used with sessions
export type { ProjectId };

export const sessionIdSchema = z
  .string()
  .min(1)
  .refine((val) => val.trim().length > 0 && val === val.trim(), {
    message:
      "ID cannot be empty, whitespace only, or have leading/trailing whitespace",
  })
  .brand("sessionId");
export type SessionId = z.infer<typeof sessionIdSchema>;

export const sessionSchema = z.object({
  id: sessionIdSchema,
  projectId: projectIdSchema.nullable(),
  name: z.string().nullable(),
  cwd: z.string(),
  lastMessageAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Session = z.infer<typeof sessionSchema>;

export const createSessionParamsSchema = z.object({
  id: sessionIdSchema.optional(),
  projectId: projectIdSchema.nullable().optional(),
  name: z.string().nullable().optional(),
  cwd: z.string(),
});
export type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;

export const listSessionQuerySchema = z.object({
  pagination: paginationSchema,
  filter: z
    .object({
      projectId: projectIdSchema.optional(),
    })
    .optional(),
});
export type ListSessionQuery = z.infer<typeof listSessionQuerySchema>;

export function getSessionDisplayName(name: string | null): string {
  return name || "Untitled Session";
}
