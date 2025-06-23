// @ts-ignore
import { glob } from "node:fs/promises";
import { join } from "node:path";
import { type FSWatcher, watch } from "chokidar";
import { err, ok, type Result } from "neverthrow";
import type {
  FileChangeHandler,
  FileWatcher,
  FileWatcherError,
} from "@/core/domain/watcher/ports/fileWatcher";
import type { WatcherConfig } from "@/core/domain/watcher/types";

export class ChokidarFileWatcher implements FileWatcher {
  private watcher: FSWatcher | null = null;
  private isActive = false;

  async start(
    config: WatcherConfig,
    handler: FileChangeHandler,
  ): Promise<Result<void, FileWatcherError>> {
    try {
      if (this.isActive) {
        return err({
          type: "WATCHER_ERROR",
          message: "Watcher is already running",
        });
      }

      const watchPattern = join(config.targetDirectory, config.pattern);

      this.watcher = watch(await Array.fromAsync(glob(watchPattern)), {
        persistent: config.persistent,
        ignoreInitial: config.ignoreInitial,
        followSymlinks: false,
        awaitWriteFinish: {
          stabilityThreshold: config.stabilityThreshold,
          pollInterval: config.pollInterval,
        },
      });

      this.watcher.on("add", async (filePath) => {
        await handler({
          type: "add",
          filePath,
          timestamp: new Date(),
        });
      });

      this.watcher.on("change", async (filePath) => {
        await handler({
          type: "change",
          filePath,
          timestamp: new Date(),
        });
      });

      this.watcher.on("unlink", async (filePath) => {
        await handler({
          type: "unlink",
          filePath,
          timestamp: new Date(),
        });
      });

      this.watcher.on("error", (error) => {
        console.error("Watcher error:", error);
      });

      this.isActive = true;

      return ok(undefined);
    } catch (error) {
      return err({
        type: "WATCHER_ERROR",
        message: "Failed to start file watcher",
        cause: error,
      });
    }
  }

  async stop(): Promise<Result<void, FileWatcherError>> {
    try {
      if (!this.watcher || !this.isActive) {
        return ok(undefined);
      }

      await this.watcher.close();
      this.watcher = null;
      this.isActive = false;

      return ok(undefined);
    } catch (error) {
      return err({
        type: "WATCHER_ERROR",
        message: "Failed to stop file watcher",
        cause: error,
      });
    }
  }

  isWatching(): boolean {
    return this.isActive;
  }
}
