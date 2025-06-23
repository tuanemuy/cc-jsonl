import type { Result } from "neverthrow";

export interface FileSystemEntry {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

export interface FileSystemManagerError {
  type: "FILE_SYSTEM_ERROR";
  message: string;
  cause?: unknown;
}

export interface FileSystemManager {
  readDirectory(
    path: string,
    options: { withFileTypes: boolean },
  ): Promise<Result<FileSystemEntry[], FileSystemManagerError>>;
}
