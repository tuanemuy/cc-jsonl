import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockFileSystemManager } from "@/core/adapters/mock/fileSystemManager";
import { MockLogParser } from "@/core/adapters/mock/logParser";
import { createMockRepositories } from "@/core/adapters/mock/repositories";
import { messageIdSchema } from "@/core/domain/message/types";
import { projectIdSchema } from "@/core/domain/project/types";
import { sessionIdSchema } from "@/core/domain/session/types";
import type { FileSystemEntry } from "@/core/domain/watcher/ports/fileSystemManager";
import type { BatchProcessInput } from "@/core/domain/watcher/types";
import type { Context } from "../context";
import { batchProcessDirectory } from "./batchProcessDirectory";

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

describe("batchProcessDirectory", () => {
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

      const result = await batchProcessDirectory(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("BATCH_PROCESS_DIRECTORY_ERROR");
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

      const result = await batchProcessDirectory(context, input);

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

      const result = await batchProcessDirectory(context, input);

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

      const result = await batchProcessDirectory(context, input);

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

      const result = await batchProcessDirectory(context, input);

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

      const result = await batchProcessDirectory(context, input);

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
    it("should skip files when skipExisting is true and file is already processed", async () => {
      context.fileSystemManager.setMockFiles("/test/dir", [
        createFileEntry("session-existing.jsonl"),
        createFileEntry("session-new.jsonl"),
      ]);

      // Mock existing session and messages for the first file
      context.sessionRepository.list = async () => {
        return ok({
          items: [
            {
              id: sessionIdSchema.parse("existing"),
              projectId: projectIdSchema.parse("test-project"),
              name: "Test Session",
              cwd: "/test/dir",
              lastMessageAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          count: 1,
        });
      };

      // Mock messages exist for "existing" session
      context.messageRepository.list = async (query) => {
        if (query.filter?.sessionId === "existing") {
          return ok({
            items: [
              {
                id: messageIdSchema.parse("msg-1"),
                sessionId: sessionIdSchema.parse("existing"),
                role: "user" as const,
                content: "test message",
                timestamp: new Date(),
                rawData: "test",
                uuid: "uuid-1",
                parentUuid: null,
                cwd: "/test/dir",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ], // Messages exist
            count: 1,
          });
        }
        return ok({
          items: [], // No messages
          count: 0,
        });
      };

      context.logParser.setMockParseResult(
        ok({
          filePath: "/test/file.jsonl",
          projectName: "test-project",
          sessionId: "new",
          entries: [
            {
              type: "user" as const,
              uuid: "user-1",
              parentUuid: null,
              timestamp: "2024-01-01T00:00:00Z",
              isSidechain: false,
              userType: "external" as const,
              cwd: "/test",
              sessionId: "new",
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
        skipExisting: true,
      };

      const result = await batchProcessDirectory(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(2);
        expect(result.value.processedFiles).toBe(1); // Only new file processed
        expect(result.value.skippedFiles).toBe(1); // Existing file skipped
        expect(result.value.failedFiles).toBe(0);
      }
    });
  });

  describe("error handling", () => {
    it("should handle directory access errors", async () => {
      context.fileSystemManager.setShouldFail(true, "Permission denied");

      const input: BatchProcessInput = {
        targetDirectory: "/forbidden/dir",
        pattern: "**/*.jsonl",
        maxConcurrency: 5,
        skipExisting: false,
      };

      const result = await batchProcessDirectory(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(0);
      }
    });
  });
});
