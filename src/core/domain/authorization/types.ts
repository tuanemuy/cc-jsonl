import { z } from "zod/v4";

export const permissionErrorKeywordsSchema = z.union([
  z.literal("requested permissions"),
  z.literal("haven't granted it yet"),
  z.literal("permission denied"),
]);
export type PermissionErrorKeywords = z.infer<
  typeof permissionErrorKeywordsSchema
>;

export const toolTypeSchema = z.enum(["Bash", "Read", "WebSearch"]);
export type ToolType = z.infer<typeof toolTypeSchema>;

export const allowedToolSchema = z
  .string()
  .regex(/^(Bash|Read|WebSearch)\(.+\)$/);
export type AllowedTool = z.infer<typeof allowedToolSchema>;

export const permissionRequestSchema = z.object({
  toolName: toolTypeSchema,
  toolCommand: z.string(),
  originalToolUse: z.object({
    id: z.string(),
    name: z.string(),
    input: z.record(z.string(), z.any()),
  }),
});
export type PermissionRequest = z.infer<typeof permissionRequestSchema>;

export const continueMessageSchema = z.object({
  message: z.literal("continue"),
  allowedTools: z.array(allowedToolSchema),
});
export type ContinueMessage = z.infer<typeof continueMessageSchema>;

export const authorizationStateSchema = z.object({
  isWaitingForPermission: z.boolean(),
  pendingRequest: permissionRequestSchema.nullable(),
});
export type AuthorizationState = z.infer<typeof authorizationStateSchema>;
