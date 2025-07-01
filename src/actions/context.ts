import { z } from "zod";
import { AnthropicClaudeService } from "@/core/adapters/anthropic/claudeService";
import { getDatabase } from "@/core/adapters/drizzleSqlite/client";
import { DrizzleSqliteLogFileTrackingRepository } from "@/core/adapters/drizzleSqlite/logFileTrackingRepository";
import { DrizzleSqliteMessageRepository } from "@/core/adapters/drizzleSqlite/messageRepository";
import { DrizzleSqliteProjectRepository } from "@/core/adapters/drizzleSqlite/projectRepository";
import { DrizzleSqliteSessionRepository } from "@/core/adapters/drizzleSqlite/sessionRepository";
import type { Context } from "@/core/application/context";
import { getClaudeCodeExecutablePath } from "@/lib/claude";

export const envSchema = z.object({
  DATABASE_FILE_NAME: z.string(),
});

export type Env = z.infer<typeof envSchema>;

function getContext(): Context {
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(env.error.errors)}`,
    );
  }

  const db = getDatabase(env.data.DATABASE_FILE_NAME);

  // Get the path to the Claude Code executable
  const claudeExecutablePath = getClaudeCodeExecutablePath();

  return {
    projectRepository: new DrizzleSqliteProjectRepository(db),
    sessionRepository: new DrizzleSqliteSessionRepository(db),
    messageRepository: new DrizzleSqliteMessageRepository(db),
    claudeService: new AnthropicClaudeService(claudeExecutablePath || undefined),
    logFileTrackingRepository: new DrizzleSqliteLogFileTrackingRepository(db),
  };
}

let cachedContext: Context | null = null;

export function getServerContext(): Context {
  if (!cachedContext) {
    cachedContext = getContext();
  }
  return cachedContext;
}
