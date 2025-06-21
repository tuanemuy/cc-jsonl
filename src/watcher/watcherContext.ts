import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { z } from "zod";
import { ChokidarFileWatcher } from "@/core/adapters/chokidar/fileWatcher";
import { ClaudeLogParser } from "@/core/adapters/claudeLog/logParser";
import type { Database } from "@/core/adapters/drizzleSqlite/client";
import { DrizzleSqliteMessageRepository } from "@/core/adapters/drizzleSqlite/messageRepository";
import { DrizzleSqliteProjectRepository } from "@/core/adapters/drizzleSqlite/projectRepository";
import * as schema from "@/core/adapters/drizzleSqlite/schema";
import { DrizzleSqliteSessionRepository } from "@/core/adapters/drizzleSqlite/sessionRepository";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { NodeFsFileReader } from "@/core/adapters/nodeFs/fileReader";
import type { Context } from "@/core/application/context";
import type { FileWatcher } from "@/core/domain/watcher/ports/fileWatcher";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";

export const watcherEnvSchema = z.object({
  WATCH_TARGET_DIR: z.string().min(1),
  DATABASE_FILE_NAME: z.string().optional(),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
});

export type WatcherEnv = z.infer<typeof watcherEnvSchema>;

export type WatcherContext = Context & {
  fileWatcher: FileWatcher;
  logParser: LogParser;
};

export function getWatcherContext(): {
  context: WatcherContext;
  targetDir: string;
} {
  const env = watcherEnvSchema.safeParse(process.env);
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

  const fileReader = new NodeFsFileReader();
  const logParser = new ClaudeLogParser(fileReader);
  const fileWatcher = new ChokidarFileWatcher();

  const context: WatcherContext = {
    projectRepository: new DrizzleSqliteProjectRepository(db),
    sessionRepository: new DrizzleSqliteSessionRepository(db),
    messageRepository: new DrizzleSqliteMessageRepository(db),
    claudeService: new MockClaudeService(),
    fileWatcher,
    logParser,
  };

  return {
    context,
    targetDir: env.data.WATCH_TARGET_DIR,
  };
}
