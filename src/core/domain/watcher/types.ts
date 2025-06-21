import { z } from "zod";

export const logEntryBaseSchema = z.object({
  uuid: z.string(),
  parentUuid: z.string().nullable(),
  timestamp: z.string(),
  isSidechain: z.boolean(),
  userType: z.literal("external"),
  cwd: z.string(),
  sessionId: z.string(),
  version: z.string(),
});

export const summaryLogSchema = z.object({
  type: z.literal("summary"),
  summary: z.string(),
  leafUuid: z.string(),
});

export const userLogSchema = logEntryBaseSchema.extend({
  type: z.literal("user"),
  message: z.object({
    role: z.literal("user"),
    content: z.union([z.string(), z.array(z.any())]),
  }),
  isMeta: z.boolean().optional(),
  toolUseResult: z.any().optional(),
});

export const assistantLogSchema = logEntryBaseSchema.extend({
  type: z.literal("assistant"),
  message: z.object({
    id: z.string(),
    type: z.literal("message"),
    role: z.literal("assistant"),
    model: z.string().optional(),
    content: z.array(z.any()),
    stop_reason: z.string().nullable().optional(),
    stop_sequence: z.string().nullable().optional(),
    usage: z.any().optional(),
  }),
  requestId: z.string().optional(),
  isApiErrorMessage: z.boolean().optional(),
});

export const systemLogSchema = logEntryBaseSchema.extend({
  type: z.literal("system"),
  content: z.string(),
  level: z.enum(["info", "warning", "error", "debug"]).optional(),
  isMeta: z.boolean().optional(),
});

export const claudeLogEntrySchema = z.union([
  summaryLogSchema,
  userLogSchema,
  assistantLogSchema,
  systemLogSchema,
]);

export type ClaudeLogEntry = z.infer<typeof claudeLogEntrySchema>;
export type SummaryLog = z.infer<typeof summaryLogSchema>;
export type UserLog = z.infer<typeof userLogSchema>;
export type AssistantLog = z.infer<typeof assistantLogSchema>;
export type SystemLog = z.infer<typeof systemLogSchema>;

export const fileChangeEventSchema = z.object({
  type: z.enum(["add", "change", "unlink"]),
  filePath: z.string(),
  timestamp: z.date(),
});

export type FileChangeEvent = z.infer<typeof fileChangeEventSchema>;

export const watcherConfigSchema = z.object({
  targetDirectory: z.string().min(1),
  pattern: z.string().default("**/*.jsonl"),
  ignoreInitial: z.boolean().default(false),
  persistent: z.boolean().default(true),
  stabilityThreshold: z.number().default(1000),
  pollInterval: z.number().default(100),
});

export type WatcherConfig = z.infer<typeof watcherConfigSchema>;

export const parsedLogFileSchema = z.object({
  filePath: z.string(),
  projectName: z.string(),
  sessionId: z.string(),
  entries: z.array(claudeLogEntrySchema),
});

export type ParsedLogFile = z.infer<typeof parsedLogFileSchema>;
