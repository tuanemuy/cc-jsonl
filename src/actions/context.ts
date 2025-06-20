import { AnthropicClaudeService } from "@/core/adapters/anthropic/claudeService";
import type { Database } from "@/core/adapters/drizzleSqlite/client";
import { DrizzleSqliteMessageRepository } from "@/core/adapters/drizzleSqlite/messageRepository";
import { DrizzleSqliteProjectRepository } from "@/core/adapters/drizzleSqlite/projectRepository";
import * as schema from "@/core/adapters/drizzleSqlite/schema";
import { DrizzleSqliteSessionRepository } from "@/core/adapters/drizzleSqlite/sessionRepository";
import type { Context } from "@/core/application/context";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_FILE_NAME: z.string().optional(),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;

function getContext(): Context {
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(env.error.errors)}`,
    );
  }

  let db: Database;

  if (env.data.TURSO_DATABASE_URL && env.data.TURSO_AUTH_TOKEN) {
    const client = createClient({
      url: env.data.TURSO_DATABASE_URL,
      authToken: env.data.TURSO_AUTH_TOKEN,
    });
    db = drizzle(client, { schema });
  } else if (env.data.DATABASE_FILE_NAME) {
    const client = createClient({
      url: `file:${env.data.DATABASE_FILE_NAME}`,
    });
    db = drizzle(client, { schema });
  } else {
    throw new Error(
      "Either DATABASE_FILE_NAME or TURSO_DATABASE_URL/TURSO_AUTH_TOKEN must be provided",
    );
  }

  return {
    projectRepository: new DrizzleSqliteProjectRepository(db),
    sessionRepository: new DrizzleSqliteSessionRepository(db),
    messageRepository: new DrizzleSqliteMessageRepository(db),
    claudeService: new AnthropicClaudeService(env.data.ANTHROPIC_API_KEY),
  };
}

let cachedContext: Context | null = null;

export function getServerContext(): Context {
  if (!cachedContext) {
    cachedContext = getContext();
  }
  return cachedContext;
}
