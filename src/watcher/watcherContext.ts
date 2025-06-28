import { z } from "zod";
import { ChokidarFileWatcher } from "@/core/adapters/chokidar/fileWatcher";
import { ClaudeLogParser } from "@/core/adapters/claudeLog/logParser";
import { getDatabase } from "@/core/adapters/drizzleSqlite/client";
import { DrizzleSqliteLogFileTrackingRepository } from "@/core/adapters/drizzleSqlite/logFileTrackingRepository";
import { DrizzleSqliteMessageRepository } from "@/core/adapters/drizzleSqlite/messageRepository";
import { DrizzleSqliteProjectRepository } from "@/core/adapters/drizzleSqlite/projectRepository";
import { DrizzleSqliteSessionRepository } from "@/core/adapters/drizzleSqlite/sessionRepository";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { NodeFsFileReader } from "@/core/adapters/nodeFs/fileReader";
import { NodeFsFileSystemManager } from "@/core/adapters/nodeFs/fileSystemManager";
import type { Context } from "@/core/application/context";
import type { FileSystemManager } from "@/core/domain/watcher/ports/fileSystemManager";
import type { FileWatcher } from "@/core/domain/watcher/ports/fileWatcher";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";
import { getConfigOrEnv } from "../cli/config";

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
  fileSystemManager: FileSystemManager;
  logParser: LogParser;
};

export function getWatcherContext(): {
  context: WatcherContext;
  targetDir: string;
} {
  const configOrEnv = getConfigOrEnv();

  const envData = {
    WATCH_TARGET_DIR: configOrEnv.watchTargetDir,
    DATABASE_FILE_NAME: configOrEnv.databaseFileName,
  };

  const env = watcherEnvSchema.safeParse(envData);
  if (!env.success) {
    throw new Error(
      `Invalid configuration: ${JSON.stringify(env.error.errors)}`,
    );
  }

  const db = getDatabase(env.data.DATABASE_FILE_NAME);

  const fileReader = new NodeFsFileReader();
  const logParser = new ClaudeLogParser(fileReader);
  const fileWatcher = new ChokidarFileWatcher();
  const fileSystemManager = new NodeFsFileSystemManager();

  const context: WatcherContext = {
    projectRepository: new DrizzleSqliteProjectRepository(db),
    sessionRepository: new DrizzleSqliteSessionRepository(db),
    messageRepository: new DrizzleSqliteMessageRepository(db),
    claudeService: new MockClaudeService(),
    logFileTrackingRepository: new DrizzleSqliteLogFileTrackingRepository(db),
    fileWatcher,
    fileSystemManager,
    logParser,
  };

  return {
    context,
    targetDir: env.data.WATCH_TARGET_DIR,
  };
}
