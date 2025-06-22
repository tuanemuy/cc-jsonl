import { promises as fs } from "node:fs";
import { err, ok, type Result } from "neverthrow";
import type {
  FileSystemEntry,
  FileSystemManager,
  FileSystemManagerError,
} from "@/core/domain/watcher/ports/fileSystemManager";

export class NodeFsFileSystemManager implements FileSystemManager {
  async readDirectory(
    path: string,
    _options: { withFileTypes: boolean },
  ): Promise<Result<FileSystemEntry[], FileSystemManagerError>> {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true });
      return ok(entries as FileSystemEntry[]);
    } catch (error) {
      return err({
        type: "FILE_SYSTEM_ERROR",
        message: `Failed to read directory: ${path}`,
        cause: error,
      });
    }
  }
}
