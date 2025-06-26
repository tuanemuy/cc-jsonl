import { z } from "zod/v4";

export const sendMessageInputSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  cwd: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Custom SDKMessage type definition to avoid direct library dependency
export type SDKMessage =
  | {
      type: "assistant";
      message: {
        id: string;
        content: Array<{
          type: string;
          text?: string;
          [key: string]: unknown;
        }>;
        role: "assistant";
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
      };
    }
  | {
      type: "result";
      subtype: string;
      duration_ms: number;
      duration_api_ms: number;
      is_error: boolean;
      num_turns: number;
      result: string;
      session_id: string;
      total_cost_usd: number;
      usage: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens: number;
        cache_read_input_tokens: number;
      };
    }
  | {
      type: string;
      [key: string]: unknown;
    };

// ChunkData is simply an SDKMessage
// The SDK already provides messages in the appropriate granularity for streaming
export type ChunkData = SDKMessage;

// Result type that contains all SDK messages
export const claudeQueryResultSchema = z.object({
  messages: z.array(z.any()), // SDKMessage array
  lastAssistantMessage: z.any().optional(), // Optional assistant message
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
    })
    .optional(),
});
export type ClaudeQueryResult = z.infer<typeof claudeQueryResultSchema>;

// Legacy types - deprecated, use SDK types instead
export const claudeMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ClaudeMessage = z.infer<typeof claudeMessageSchema>;

export const textBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const toolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.any()),
});

export const thinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  content: z.string(),
});

export const contentBlockSchema = z.union([
  textBlockSchema,
  toolUseBlockSchema,
  thinkingBlockSchema,
  z
    .object({
      type: z.string(),
    })
    .passthrough(),
]);

export const usageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
});

export const claudeResponseSchema = z.object({
  id: z.string(),
  content: z.array(contentBlockSchema),
  role: z.literal("assistant"),
  model: z.string(),
  stop_reason: z
    .enum(["end_turn", "max_tokens", "stop_sequence", "tool_use"])
    .nullable(),
  stop_sequence: z.string().nullable().optional(),
  usage: usageSchema,
});
export type ClaudeResponse = z.infer<typeof claudeResponseSchema>;

export type TextBlock = z.infer<typeof textBlockSchema>;
export type ToolUseBlock = z.infer<typeof toolUseBlockSchema>;
export type ThinkingBlock = z.infer<typeof thinkingBlockSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;

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
