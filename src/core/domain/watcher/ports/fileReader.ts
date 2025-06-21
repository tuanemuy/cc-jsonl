import type { Result } from "neverthrow";

export type FileReaderError = {
  type: "FILE_READER_ERROR";
  message: string;
  cause?: unknown;
};

export interface FileReader {
  readFile(
    filePath: string,
    encoding?: string,
  ): Promise<Result<string, FileReaderError>>;

  fileExists(filePath: string): Promise<Result<boolean, FileReaderError>>;
}
