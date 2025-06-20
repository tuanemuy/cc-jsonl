import { type ClaudeLogEntry, claudeLogEntrySchema } from "./types";

export function parseJsonLines(content: string): ClaudeLogEntry[] {
  const lines = content.split("\n").filter((line) => line.trim());
  const entries: ClaudeLogEntry[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const result = claudeLogEntrySchema.safeParse(parsed);

      if (result.success) {
        entries.push(result.data);
      } else {
        console.warn(
          "Failed to parse log entry:",
          result.error.message,
          "Raw data:",
          line,
        );
      }
    } catch (error) {
      console.warn("Failed to parse JSON line:", error, "Raw data:", line);
    }
  }

  return entries;
}

export function extractProjectName(filePath: string): string | null {
  const parts = filePath.split("/");
  const projectIndex = parts.findIndex((part) => part.endsWith(".jsonl"));

  if (projectIndex >= 2) {
    return parts[projectIndex - 1];
  }

  return null;
}

export function extractSessionId(filePath: string): string | null {
  const fileName = filePath.split("/").pop();
  if (!fileName) return null;

  return fileName.replace(".jsonl", "");
}
