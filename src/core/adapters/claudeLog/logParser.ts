import { err, ok, type Result } from "neverthrow";
import type { FileReader } from "@/core/domain/watcher/ports/fileReader";
import type {
  LogParser,
  LogParserError,
} from "@/core/domain/watcher/ports/logParser";
import {
  type ClaudeLogEntry,
  claudeLogEntrySchema,
  type ParsedLogFile,
} from "@/core/domain/watcher/types";

export class ClaudeLogParser implements LogParser {
  constructor(private readonly fileReader: FileReader) {}

  async parseFile(
    filePath: string,
  ): Promise<Result<ParsedLogFile, LogParserError>> {
    try {
      const projectName = this.extractProjectName(filePath);
      const sessionId = this.extractSessionId(filePath);

      if (!projectName || !sessionId) {
        return err({
          type: "PARSER_ERROR",
          message: `Could not extract project name or session ID from: ${filePath}`,
        });
      }

      const contentResult = await this.fileReader.readFile(filePath);
      if (contentResult.isErr()) {
        return err({
          type: "PARSER_ERROR",
          message: "Failed to read file",
          cause: contentResult.error,
        });
      }

      const entriesResult = this.parseJsonLines(contentResult.value);
      if (entriesResult.isErr()) {
        return err({
          type: "PARSER_ERROR",
          message: "Failed to parse JSON lines",
          cause: entriesResult.error,
        });
      }

      return ok({
        filePath,
        projectName,
        sessionId,
        entries: entriesResult.value,
      });
    } catch (error) {
      return err({
        type: "PARSER_ERROR",
        message: `Failed to parse file: ${filePath}`,
        cause: error,
      });
    }
  }

  parseJsonLines(content: string): Result<ClaudeLogEntry[], LogParserError> {
    try {
      const lines = content.split("\n").filter((line) => line.trim());
      const entries: ClaudeLogEntry[] = [];
      const errors: string[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const result = claudeLogEntrySchema.safeParse(parsed);

          if (result.success) {
            entries.push(result.data);
          } else {
            errors.push(`Invalid log entry: ${result.error.message}`);
            console.warn(
              "Failed to parse log entry:",
              result.error.message,
              "Raw data:",
              line,
            );
          }
        } catch (jsonError) {
          errors.push(`Invalid JSON: ${String(jsonError)}`);
          console.warn(
            "Failed to parse JSON line:",
            jsonError,
            "Raw data:",
            line,
          );
        }
      }

      if (entries.length === 0 && errors.length > 0) {
        return err({
          type: "PARSER_ERROR",
          message: `No valid entries found. Errors: ${errors.join(", ")}`,
        });
      }

      return ok(entries);
    } catch (error) {
      return err({
        type: "PARSER_ERROR",
        message: "Failed to parse JSON lines",
        cause: error,
      });
    }
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
