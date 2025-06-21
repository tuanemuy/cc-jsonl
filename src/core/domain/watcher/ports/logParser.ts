import type { Result } from "neverthrow";
import type { ClaudeLogEntry, ParsedLogFile } from "../types";

export type LogParserError = {
  type: "PARSER_ERROR";
  message: string;
  cause?: unknown;
};

export interface LogParser {
  parseFile(filePath: string): Promise<Result<ParsedLogFile, LogParserError>>;

  parseJsonLines(content: string): Result<ClaudeLogEntry[], LogParserError>;

  extractProjectName(filePath: string): string | null;

  extractSessionId(filePath: string): string | null;
}
