import { z } from "zod";
import { AnthropicClaudeService } from "@/core/adapters/anthropic/claudeService";
import { getDatabase } from "@/core/adapters/drizzlePglite/client";
import { DrizzlePgliteMessageRepository } from "@/core/adapters/drizzlePglite/messageRepository";
import { DrizzlePgliteProjectRepository } from "@/core/adapters/drizzlePglite/projectRepository";
import { DrizzlePgliteSessionRepository } from "@/core/adapters/drizzlePglite/sessionRepository";
import type { Context } from "@/core/application/context";

export const envSchema = z.object({
  // DATABASE_FILE_NAME: z.string(),
  // TURSO_DATABASE_URL: z.string(),
  // TURSO_AUTH_TOKEN: z.string(),
  PGLITE_DATABASE_DIR: z.string(),
});

export type Env = z.infer<typeof envSchema>;

function getContext(): Context {
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(env.error.errors)}`,
    );
  }

  console.log(env.data.PGLITE_DATABASE_DIR);

  const db = getDatabase(env.data.PGLITE_DATABASE_DIR);

  return {
    projectRepository: new DrizzlePgliteProjectRepository(db),
    sessionRepository: new DrizzlePgliteSessionRepository(db),
    messageRepository: new DrizzlePgliteMessageRepository(db),
    claudeService: new AnthropicClaudeService(),
  };
}

let cachedContext: Context | null = null;

export function getServerContext(): Context {
  if (!cachedContext) {
    cachedContext = getContext();
  }
  return cachedContext;
}
