import { err, ok, type Result } from "neverthrow";
import type {
  FileSystemEntry,
  FileSystemManager,
  FileSystemManagerError,
} from "@/core/domain/watcher/ports/fileSystemManager";

export class MockFileSystemManager implements FileSystemManager {
  private mockFiles: Map<string, FileSystemEntry[]> = new Map();
  private shouldFail = false;
  private failureMessage = "Mock file system error";

  // Mock methods for testing
  public setMockFiles(directory: string, files: FileSystemEntry[]): void {
    this.mockFiles.set(directory, files);
  }

  public setShouldFail(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }

  public clear(): void {
    this.mockFiles.clear();
    this.shouldFail = false;
    this.failureMessage = "Mock file system error";
  }

  async readDirectory(
    path: string,
    _options: { withFileTypes: boolean },
  ): Promise<Result<FileSystemEntry[], FileSystemManagerError>> {
    if (this.shouldFail) {
      return err({
        type: "FILE_SYSTEM_ERROR",
        message: this.failureMessage,
      });
    }

    const files = this.mockFiles.get(path);
    if (!files) {
      return err({
        type: "FILE_SYSTEM_ERROR",
        message: `Directory not found: ${path}`,
      });
    }

    return ok(files);
  }
}
