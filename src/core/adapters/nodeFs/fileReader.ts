import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { err, ok, type Result } from "neverthrow";
import type {
  FileReader,
  FileReaderError,
} from "@/core/domain/watcher/ports/fileReader";

export class NodeFsFileReader implements FileReader {
  async readFile(
    filePath: string,
    encoding = "utf-8",
  ): Promise<Result<string, FileReaderError>> {
    try {
      const content = await readFile(filePath, {
        encoding: encoding as BufferEncoding,
      });
      return ok(content);
    } catch (error) {
      return err({
        type: "FILE_READER_ERROR",
        message: `Failed to read file: ${filePath}`,
        cause: error,
      });
    }
  }

  async fileExists(
    filePath: string,
  ): Promise<Result<boolean, FileReaderError>> {
    try {
      await access(filePath, constants.F_OK);
      return ok(true);
    } catch (error) {
      // File doesn't exist or permission denied
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return ok(false);
      }
      return err({
        type: "FILE_READER_ERROR",
        message: `Failed to check file existence: ${filePath}`,
        cause: error,
      });
    }
  }
}
