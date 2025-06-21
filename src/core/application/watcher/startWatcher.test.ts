import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockFileWatcher } from "@/core/adapters/mock/fileWatcher";
import { MockLogParser } from "@/core/adapters/mock/logParser";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { FileWatcher } from "@/core/domain/watcher/ports/fileWatcher";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";
import type { ParsedLogFile, UserLog } from "@/core/domain/watcher/types";
import type { Context } from "../context";
import { startWatcher, stopWatcher } from "./startWatcher";

describe("startWatcher", () => {
  let context: Context & { fileWatcher: FileWatcher; logParser: LogParser };
  let mockFileWatcher: MockFileWatcher;
  let mockLogParser: MockLogParser;

  beforeEach(() => {
    mockFileWatcher = new MockFileWatcher();
    mockLogParser = new MockLogParser();

    context = {
      projectRepository: new MockProjectRepository(),
      sessionRepository: new MockSessionRepository(),
      messageRepository: new MockMessageRepository(),
      claudeService: new MockClaudeService(),
      fileWatcher: mockFileWatcher,
      logParser: mockLogParser,
    };
  });

  describe("正常系", () => {
    it("ウォッチャーを正常に開始できる", async () => {
      // Arrange
      const config = {
        targetDirectory: "/test/directory",
        pattern: "**/*.jsonl",
        ignoreInitial: false,
        persistent: true,
        stabilityThreshold: 1000,
        pollInterval: 100,
      };

      // Act
      const result = await startWatcher(context, { config });

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockFileWatcher.isWatching()).toBe(true);
      expect(mockFileWatcher.getConfig()).toEqual(config);
    });

    it("ファイル追加イベントでログファイルが処理される", async () => {
      // Arrange
      const config = {
        targetDirectory: "/test/directory",
        pattern: "**/*.jsonl",
        ignoreInitial: false,
        persistent: true,
        stabilityThreshold: 1000,
        pollInterval: 100,
      };

      const filePath = "/test/directory/project1/session1.jsonl";
      const userLogEntry: UserLog = {
        uuid: "user-uuid-1",
        parentUuid: null,
        timestamp: "2024-01-01T00:00:00Z",
        isSidechain: false,
        userType: "external",
        cwd: "/workspace",
        sessionId: "session1",
        version: "1.0.0",
        type: "user",
        message: {
          role: "user",
          content: "Hello",
        },
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "project1",
        sessionId: "session1",
        entries: [userLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // ウォッチャーを開始
      await startWatcher(context, { config });

      // Act - ファイル追加イベントをトリガー
      await mockFileWatcher.triggerFileAdd(filePath);

      // Assert
      const projects = await context.projectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);
        expect(projects.value.items[0].name).toBe("project1");
      }
    });

    it("ファイル変更イベントでログファイルが処理される", async () => {
      // Arrange
      const config = {
        targetDirectory: "/test/directory",
        pattern: "**/*.jsonl",
        ignoreInitial: false,
        persistent: true,
        stabilityThreshold: 1000,
        pollInterval: 100,
      };

      const filePath = "/test/directory/project2/session2.jsonl";
      const userLogEntry: UserLog = {
        uuid: "user-uuid-2",
        parentUuid: null,
        timestamp: "2024-01-01T00:00:00Z",
        isSidechain: false,
        userType: "external",
        cwd: "/workspace",
        sessionId: "session2",
        version: "1.0.0",
        type: "user",
        message: {
          role: "user",
          content: "Updated content",
        },
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "project2",
        sessionId: "session2",
        entries: [userLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // ウォッチャーを開始
      await startWatcher(context, { config });

      // Act - ファイル変更イベントをトリガー
      await mockFileWatcher.triggerFileChange(filePath);

      // Assert
      const projects = await context.projectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);
        expect(projects.value.items[0].name).toBe("project2");
      }
    });

    it("ファイル削除イベントは処理されない", async () => {
      // Arrange
      const config = {
        targetDirectory: "/test/directory",
        pattern: "**/*.jsonl",
        ignoreInitial: false,
        persistent: true,
        stabilityThreshold: 1000,
        pollInterval: 100,
      };

      const filePath = "/test/directory/project3/session3.jsonl";

      // ウォッチャーを開始
      await startWatcher(context, { config });

      // Act - ファイル削除イベントをトリガー
      await mockFileWatcher.triggerFileUnlink(filePath);

      // Assert - プロジェクトが作成されていないことを確認
      const projects = await context.projectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(0);
      }
    });
  });

  describe("異常系", () => {
    it("無効な設定でエラーになる", async () => {
      // Act
      const result = await startWatcher(context, {
        config: {
          targetDirectory: "", // 無効なディレクトリ
          pattern: "**/*.jsonl",
          ignoreInitial: false,
          persistent: true,
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("START_WATCHER_ERROR");
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("既にウォッチャーが動作中の場合エラーになる", async () => {
      // Arrange
      const config = {
        targetDirectory: "/test/directory",
        pattern: "**/*.jsonl",
        ignoreInitial: false,
        persistent: true,
        stabilityThreshold: 1000,
        pollInterval: 100,
      };

      // 最初のウォッチャーを開始
      await startWatcher(context, { config });

      // Act - 2回目の開始を試行
      const result = await startWatcher(context, { config });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("START_WATCHER_ERROR");
        expect(result.error.message).toBe("Failed to start file watcher");
      }
    });

    it("ログファイル処理でエラーが発生してもウォッチャーは継続する", async () => {
      // Arrange
      const config = {
        targetDirectory: "/test/directory",
        pattern: "**/*.jsonl",
        ignoreInitial: false,
        persistent: true,
        stabilityThreshold: 1000,
        pollInterval: 100,
      };

      const filePath = "/test/directory/invalid/session.jsonl";

      // パーサーを失敗させる
      mockLogParser.setShouldFail(true, "Parse error");

      // consoleのモック
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // ウォッチャーを開始
      await startWatcher(context, { config });

      // Act - ファイル追加イベントをトリガー（エラーが発生する）
      await mockFileWatcher.triggerFileAdd(filePath);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to process file"),
        expect.any(Object),
      );

      // ウォッチャーは継続していることを確認
      expect(mockFileWatcher.isWatching()).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });
});

describe("stopWatcher", () => {
  let context: Context & { fileWatcher: FileWatcher; logParser: LogParser };
  let mockFileWatcher: MockFileWatcher;

  beforeEach(() => {
    mockFileWatcher = new MockFileWatcher();

    context = {
      projectRepository: new MockProjectRepository(),
      sessionRepository: new MockSessionRepository(),
      messageRepository: new MockMessageRepository(),
      claudeService: new MockClaudeService(),
      fileWatcher: mockFileWatcher,
      logParser: new MockLogParser(),
    };
  });

  describe("正常系", () => {
    it("ウォッチャーを正常に停止できる", async () => {
      // Arrange
      const config = {
        targetDirectory: "/test/directory",
        pattern: "**/*.jsonl",
        ignoreInitial: false,
        persistent: true,
        stabilityThreshold: 1000,
        pollInterval: 100,
      };

      // ウォッチャーを開始
      await startWatcher(context, { config });
      expect(mockFileWatcher.isWatching()).toBe(true);

      // Act
      const result = await stopWatcher(context);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockFileWatcher.isWatching()).toBe(false);
    });

    it("ウォッチャーが動作していない状態でも停止できる", async () => {
      // Act
      const result = await stopWatcher(context);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockFileWatcher.isWatching()).toBe(false);
    });
  });
});
