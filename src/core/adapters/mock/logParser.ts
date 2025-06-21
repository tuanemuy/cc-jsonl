import { err, ok, type Result } from "neverthrow";
import type {
  LogParser,
  LogParserError,
} from "@/core/domain/watcher/ports/logParser";
import type {
  ClaudeLogEntry,
  ParsedLogFile,
} from "@/core/domain/watcher/types";

export class MockLogParser implements LogParser {
  private parsedFiles = new Map<string, ParsedLogFile>();
  private shouldFail = false;
  private failureMessage = "Mock parser error";

  // Mock methods for testing
  public setParsedFile(filePath: string, parsedFile: ParsedLogFile): void {
    this.parsedFiles.set(filePath, parsedFile);
  }

  public setShouldFail(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }

  public clear(): void {
    this.parsedFiles.clear();
    this.shouldFail = false;
    this.failureMessage = "Mock parser error";
  }

  async parseFile(
    filePath: string,
  ): Promise<Result<ParsedLogFile, LogParserError>> {
    if (this.shouldFail) {
      return err({
        type: "PARSER_ERROR",
        message: this.failureMessage,
      });
    }

    const parsedFile = this.parsedFiles.get(filePath);
    if (!parsedFile) {
      return err({
        type: "PARSER_ERROR",
        message: `No mock data for file: ${filePath}`,
      });
    }

    return ok(parsedFile);
  }

  parseJsonLines(_content: string): Result<ClaudeLogEntry[], LogParserError> {
    if (this.shouldFail) {
      return err({
        type: "PARSER_ERROR",
        message: this.failureMessage,
      });
    }

    // Simple mock implementation - just return empty array for now
    return ok([]);
  }

  extractProjectName(filePath: string): string | null {
    const parts = filePath.split("/");
    const projectIndex = parts.findIndex((part) => part.endsWith(".jsonl"));

    if (projectIndex >= 2) {
      return parts[projectIndex - 1];
    }

    return null;
  }

  extractSessionId(filePath: string): string | null {
    const fileName = filePath.split("/").pop();
    if (!fileName) return null;

    return fileName.replace(".jsonl", "");
  }
}
