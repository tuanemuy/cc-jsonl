import { err, ok, type Result } from "neverthrow";
import type {
  FileChangeHandler,
  FileWatcher,
  FileWatcherError,
} from "@/core/domain/watcher/ports/fileWatcher";
import type { WatcherConfig } from "@/core/domain/watcher/types";

export class MockFileWatcher implements FileWatcher {
  private watching = false;
  private handler: FileChangeHandler | null = null;
  private config: WatcherConfig | null = null;

  // Mock methods for testing
  public triggerFileAdd = async (filePath: string) => {
    if (this.handler) {
      await this.handler({
        type: "add",
        filePath,
        timestamp: new Date(),
      });
    }
  };

  public triggerFileChange = async (filePath: string) => {
    if (this.handler) {
      await this.handler({
        type: "change",
        filePath,
        timestamp: new Date(),
      });
    }
  };

  public triggerFileUnlink = async (filePath: string) => {
    if (this.handler) {
      await this.handler({
        type: "unlink",
        filePath,
        timestamp: new Date(),
      });
    }
  };

  async start(
    config: WatcherConfig,
    handler: FileChangeHandler,
  ): Promise<Result<void, FileWatcherError>> {
    if (this.watching) {
      return err({
        type: "WATCHER_ERROR",
        message: "Watcher is already running",
      });
    }

    this.config = config;
    this.handler = handler;
    this.watching = true;

    return ok(undefined);
  }

  async stop(): Promise<Result<void, FileWatcherError>> {
    this.watching = false;
    this.handler = null;
    this.config = null;

    return ok(undefined);
  }

  isWatching(): boolean {
    return this.watching;
  }

  getConfig(): WatcherConfig | null {
    return this.config;
  }
}
