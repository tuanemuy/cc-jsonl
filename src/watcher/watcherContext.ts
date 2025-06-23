import { z } from "zod";
import { ChokidarFileWatcher } from "@/core/adapters/chokidar/fileWatcher";
import { ClaudeLogParser } from "@/core/adapters/claudeLog/logParser";
import { getDatabase } from "@/core/adapters/drizzleSqlite/client";
import { DrizzleSqliteMessageRepository } from "@/core/adapters/drizzleSqlite/messageRepository";
import { DrizzleSqliteProjectRepository } from "@/core/adapters/drizzleSqlite/projectRepository";
import { DrizzleSqliteSessionRepository } from "@/core/adapters/drizzleSqlite/sessionRepository";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { NodeFsFileReader } from "@/core/adapters/nodeFs/fileReader";
import type { Context } from "@/core/application/context";
import type { FileWatcher } from "@/core/domain/watcher/ports/fileWatcher";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";

export const watcherEnvSchema = z.object({
  WATCH_TARGET_DIR: z.string().min(1),
  DATABASE_FILE_NAME: z.string(),
  // TURSO_DATABASE_URL: z.string(),
  // TURSO_AUTH_TOKEN: z.string(),
  // PGLITE_DATABASE_DIR: z.string(),
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

  const db = getDatabase(env.data.DATABASE_FILE_NAME);

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
