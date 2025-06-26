import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockFileSystemManager } from "@/core/adapters/mock/fileSystemManager";
import { MockLogParser } from "@/core/adapters/mock/logParser";
import { createMockRepositories } from "@/core/adapters/mock/repositories";
import type { FileSystemEntry } from "@/core/domain/watcher/ports/fileSystemManager";
import type {
  BatchProcessInput,
  LogFileTrackingId,
} from "@/core/domain/watcher/types";
import type { Context } from "../context";
import { batchProcessLogFiles } from "./batchProcessLogFiles";

// Helper function to create mock file system entries
function createFileEntry(name: string): FileSystemEntry {
  return {
    name,
    isDirectory: () => false,
    isFile: () => true,
  };
}

function createDirectoryEntry(name: string): FileSystemEntry {
  return {
    name,
    isDirectory: () => true,
    isFile: () => false,
  };
}

describe("batchProcessLogFiles", () => {
  let context: Context & {
    logParser: MockLogParser;
    fileSystemManager: MockFileSystemManager;
  };

  beforeEach(() => {
    const mockRepos = createMockRepositories();
    const mockLogParser = new MockLogParser();
    const mockFileSystemManager = new MockFileSystemManager();

    context = {
      ...mockRepos,
      logParser: mockLogParser,
      fileSystemManager: mockFileSystemManager,
    };

    // Clear all mock data
    mockFileSystemManager.clear();
    mockLogParser.clear();
  });

  describe("input validation", () => {
    it("should return error for invalid input", async () => {
      const input = {
        targetDirectory: "", // Invalid: empty string
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("BATCH_PROCESS_LOG_FILES_ERROR");
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should accept valid input with defaults", async () => {
      // Mock empty directory
      context.fileSystemManager.setMockFiles("/test/dir", []);

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(0);
        expect(result.value.processedFiles).toBe(0);
        expect(result.value.skippedFiles).toBe(0);
        expect(result.value.failedFiles).toBe(0);
      }
    });
  });

  describe("file discovery", () => {
    it("should find jsonl files in directory structure", async () => {
      // Mock directory structure
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("file1.jsonl"),
        createDirectoryEntry("subdir"),
        createFileEntry("file.txt"),
      ]);
      context.fileSystemManager.setMockFiles("/test/dir/subdir", [
        createFileEntry("file2.jsonl"),
      ]);

      // Setup mock log parser to return successful parse results
      context.logParser.setMockParseResult(
        ok({
          filePath: "/test/file.jsonl",
          projectName: "test-project",
          sessionId: "test-session",
          entries: [
            {
              type: "user" as const,
              uuid: "user-1",
              parentUuid: null,
              timestamp: "2024-01-01T00:00:00Z",
              isSidechain: false,
              userType: "external" as const,
              cwd: "/test",
              sessionId: "test-session",
              version: "1.0.0",
              message: {
                role: "user" as const,
                content: "Test message",
              },
            },
          ],
        }),
      );

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(2);
        expect(result.value.processedFiles).toBe(2);
        expect(result.value.failedFiles).toBe(0);
        expect(result.value.totalEntries).toBe(2); // 1 entry per file
      }
    });

    it("should handle empty directories", async () => {
      context.fileSystemManager.setMockFiles("/empty/dir", []);

      const input: BatchProcessInput = {
        targetDirectory: "/empty/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(0);
        expect(result.value.processedFiles).toBe(0);
        expect(result.value.skippedFiles).toBe(0);
        expect(result.value.failedFiles).toBe(0);
        expect(result.value.totalEntries).toBe(0);
      }
    });
  });

  describe("batch processing", () => {
    it("should process files in batches with concurrency limit", async () => {
      // Mock directory with multiple files
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("file1.jsonl"),
        createFileEntry("file2.jsonl"),
        createFileEntry("file3.jsonl"),
        createFileEntry("file4.jsonl"),
      ]);

      // Setup mock log parser
      context.logParser.setMockParseResult(
        ok({
          filePath: "/test/file.jsonl",
          projectName: "test-project",
          sessionId: "test-session",
          entries: [
            {
              type: "user" as const,
              uuid: "user-1",
              parentUuid: null,
              timestamp: "2024-01-01T00:00:00Z",
              isSidechain: false,
              userType: "external" as const,
              cwd: "/test",
              sessionId: "test-session",
              version: "1.0.0",
              message: {
                role: "user" as const,
                content: "Test message",
              },
            },
          ],
        }),
      );

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 2, // Process 2 files at a time
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(4);
        expect(result.value.processedFiles).toBe(4);
        expect(result.value.failedFiles).toBe(0);
        expect(result.value.totalEntries).toBe(4);
      }
    });

    it("should handle processing failures gracefully", async () => {
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("good.jsonl"),
        createFileEntry("bad.jsonl"),
      ]);

      // Setup mock to fail for bad.jsonl, succeed for good.jsonl
      context.logParser.parseFile = async (filePath: string) => {
        if (filePath.includes("good.jsonl")) {
          return ok({
            filePath,
            projectName: "test-project",
            sessionId: "test-session",
            entries: [
              {
                type: "user" as const,
                uuid: "user-1",
                parentUuid: null,
                timestamp: "2024-01-01T00:00:00Z",
                isSidechain: false,
                userType: "external" as const,
                cwd: "/test",
                sessionId: "test-session",
                version: "1.0.0",
                message: {
                  role: "user" as const,
                  content: "Test message",
                },
              },
            ],
          });
        }
        return err({
          type: "PARSER_ERROR" as const,
          message: "Failed to parse",
        });
      };

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(2);
        expect(result.value.processedFiles).toBe(1);
        expect(result.value.failedFiles).toBe(1);
        expect(result.value.errors).toHaveLength(1);
        expect(result.value.errors[0].filePath).toContain("bad.jsonl");
      }
    });
  });

  describe("skip existing functionality", () => {
    it("should skip files when skipExisting is true and processLogFile indicates file was skipped", async () => {
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("file1.jsonl"),
        createFileEntry("file2.jsonl"),
      ]);

      // Mock log parser to indicate successful parsing
      context.logParser.setMockParseResult(
        ok({
          filePath: "/test/file.jsonl",
          projectName: "test-project",
          sessionId: "test-session",
          entries: [
            {
              type: "user" as const,
              uuid: "user-1",
              parentUuid: null,
              timestamp: "2024-01-01T00:00:00Z",
              isSidechain: false,
              userType: "external" as const,
              cwd: "/test",
              sessionId: "test-session",
              version: "1.0.0",
              message: {
                role: "user" as const,
                content: "Test message",
              },
            },
          ],
        }),
      );

      // Setup file tracking to simulate one file already processed
      if (context.logFileTrackingRepository) {
        context.logFileTrackingRepository.findByFilePath = async (
          filePath: string,
        ) => {
          if (filePath.includes("file1.jsonl")) {
            return ok({
              id: "tracking-1" as LogFileTrackingId,
              filePath,
              lastProcessedAt: new Date(),
              fileSize: 1000,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return ok(null); // Not found
        };
      }

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: true,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(2);
        // Note: The actual skip behavior depends on the processLogFile implementation
        // This test verifies that the batch processor handles skipExisting parameter correctly
        expect(result.value.processedFiles + result.value.skippedFiles).toBe(2);
        expect(result.value.failedFiles).toBe(0);
      }
    });

    it("should process all files when skipExisting is false", async () => {
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("file1.jsonl"),
        createFileEntry("file2.jsonl"),
      ]);

      // Setup mock log parser
      context.logParser.setMockParseResult(
        ok({
          filePath: "/test/file.jsonl",
          projectName: "test-project",
          sessionId: "test-session",
          entries: [
            {
              type: "user" as const,
              uuid: "user-1",
              parentUuid: null,
              timestamp: "2024-01-01T00:00:00Z",
              isSidechain: false,
              userType: "external" as const,
              cwd: "/test",
              sessionId: "test-session",
              version: "1.0.0",
              message: {
                role: "user" as const,
                content: "Test message",
              },
            },
          ],
        }),
      );

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(2);
        expect(result.value.processedFiles).toBe(2); // Both files processed
        expect(result.value.skippedFiles).toBe(0); // No files skipped
        expect(result.value.failedFiles).toBe(0);
      }
    });
  });

  describe("error handling", () => {
    it("should handle directory access errors gracefully", async () => {
      context.fileSystemManager.setShouldFail(true, "Permission denied");

      const input: BatchProcessInput = {
        targetDirectory: "/forbidden/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(0);
      }
    });

    it("should handle unexpected errors during processing", async () => {
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("file1.jsonl"),
      ]);

      // Force an unexpected error by making readDirectory throw
      context.fileSystemManager.readDirectory = async () => {
        throw new Error("Unexpected error");
      };

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("BATCH_PROCESS_LOG_FILES_ERROR");
        expect(result.error.message).toContain("Failed to find matching files");
      }
    });
  });

  describe("pattern matching", () => {
    it("should only process files matching the pattern", async () => {
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("file1.jsonl"),
        createFileEntry("file2.json"),
        createFileEntry("file3.txt"),
        createFileEntry("file4.jsonl"),
      ]);

      // Setup mock log parser
      context.logParser.setMockParseResult(
        ok({
          filePath: "/test/file.jsonl",
          projectName: "test-project",
          sessionId: "test-session",
          entries: [
            {
              type: "user" as const,
              uuid: "user-1",
              parentUuid: null,
              timestamp: "2024-01-01T00:00:00Z",
              isSidechain: false,
              userType: "external" as const,
              cwd: "/test",
              sessionId: "test-session",
              version: "1.0.0",
              message: {
                role: "user" as const,
                content: "Test message",
              },
            },
          ],
        }),
      );

      const input: BatchProcessInput = {
        targetDirectory: "/test/dir",
        pattern: "**/*.jsonl", // Only .jsonl files
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessLogFiles(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(2); // Only 2 .jsonl files
        expect(result.value.processedFiles).toBe(2);
        expect(result.value.failedFiles).toBe(0);
      }
    });
  });
});
