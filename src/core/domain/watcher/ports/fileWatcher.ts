import type { Result } from "neverthrow";
import type { FileChangeEvent, WatcherConfig } from "../types";

export type FileWatcherError = {
  type: "WATCHER_ERROR";
  message: string;
  cause?: unknown;
};

export type FileChangeHandler = (event: FileChangeEvent) => Promise<void>;

export interface FileWatcher {
  start(
    config: WatcherConfig,
    handler: FileChangeHandler,
  ): Promise<Result<void, FileWatcherError>>;

  stop(): Promise<Result<void, FileWatcherError>>;

  isWatching(): boolean;
}
