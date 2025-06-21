import type {
  FileReader,
  FileReaderError,
} from "@/core/domain/watcher/ports/fileReader";
import { type Result, err, ok } from "neverthrow";

export class MockFileReader implements FileReader {
  private files = new Map<string, string>();
  private existingFiles = new Set<string>();

  // Mock methods for testing
  public setFileContent(filePath: string, content: string): void {
    this.files.set(filePath, content);
    this.existingFiles.add(filePath);
  }

  public setFileExists(filePath: string, exists: boolean): void {
    if (exists) {
      this.existingFiles.add(filePath);
    } else {
      this.existingFiles.delete(filePath);
    }
  }

  public clear(): void {
    this.files.clear();
    this.existingFiles.clear();
  }

  async readFile(
    filePath: string,
    encoding?: string,
  ): Promise<Result<string, FileReaderError>> {
    const content = this.files.get(filePath);

    if (content === undefined) {
      return err({
        type: "FILE_READER_ERROR",
        message: `Failed to read file: ${filePath}`,
        cause: new Error("File not found"),
      });
    }

    return ok(content);
  }

  async fileExists(
    filePath: string,
  ): Promise<Result<boolean, FileReaderError>> {
    return ok(this.existingFiles.has(filePath));
  }
}
