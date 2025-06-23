import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockLogParser } from "@/core/adapters/mock/logParser";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import { projectIdSchema } from "@/core/domain/project/types";
import { sessionIdSchema } from "@/core/domain/session/types";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";
import type {
  AssistantLog,
  ParsedLogFile,
  UserLog,
} from "@/core/domain/watcher/types";
import type { Context } from "../context";
import { processLogFile } from "./processLogFile";

describe("processLogFile", () => {
  let context: Context & { logParser: LogParser };
  let mockProjectRepository: MockProjectRepository;
  let mockSessionRepository: MockSessionRepository;
  let mockMessageRepository: MockMessageRepository;
  let mockLogParser: MockLogParser;

  beforeEach(() => {
    mockProjectRepository = new MockProjectRepository();
    mockSessionRepository = new MockSessionRepository();
    mockMessageRepository = new MockMessageRepository();
    mockLogParser = new MockLogParser();

    context = {
      projectRepository: mockProjectRepository,
      sessionRepository: mockSessionRepository,
      messageRepository: mockMessageRepository,
      claudeService: new MockClaudeService(),
      logParser: mockLogParser,
    };
  });

  describe("正常系", () => {
    it("新しいプロジェクトとセッションを作成してログエントリを処理できる", async () => {
      // Arrange
      const filePath = "/path/to/project1/session1.jsonl";
      const projectName = "project1";
      const sessionId = "session1";

      const userLogEntry: UserLog = {
        uuid: "user-uuid-1",
        parentUuid: null,
        timestamp: "2024-01-01T00:00:00Z",
        isSidechain: false,
        userType: "external",
        cwd: "/workspace",
        sessionId: sessionId,
        version: "1.0.0",
        type: "user",
        message: {
          role: "user",
          content: "Hello, how are you?",
        },
      };

      const assistantLogEntry: AssistantLog = {
        uuid: "assistant-uuid-1",
        parentUuid: "user-uuid-1",
        timestamp: "2024-01-01T00:00:01Z",
        isSidechain: false,
        userType: "external",
        cwd: "/workspace",
        sessionId: sessionId,
        version: "1.0.0",
        type: "assistant",
        message: {
          id: "msg-1",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "I'm doing well, thank you!" }],
        },
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName,
        sessionId,
        entries: [userLogEntry, assistantLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(2);
      }

      // プロジェクトが作成されたことを確認
      const projects = await mockProjectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);
        expect(projects.value.items[0].name).toBe(projectName);
      }

      // セッションが作成されたことを確認
      if (projects.isOk()) {
        const sessions = await mockSessionRepository.list({
          pagination: {
            page: 1,
            limit: 10,
            order: "asc",
            orderBy: "createdAt",
          },
          filter: { projectId: projects.value.items[0].id },
        });
        expect(sessions.isOk()).toBe(true);
        if (sessions.isOk()) {
          expect(sessions.value.items).toHaveLength(1);
          expect(sessions.value.items[0].id).toBe(
            sessionIdSchema.parse(sessionId),
          );
        }
      }

      // メッセージが保存されたことを確認
      const messages = await mockMessageRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: { sessionId: sessionIdSchema.parse(sessionId) },
      });
      expect(messages.isOk()).toBe(true);
      if (messages.isOk()) {
        expect(messages.value.items).toHaveLength(2);
      }
    });

    it("既存のプロジェクトとセッションが存在する場合はそれらを使用する", async () => {
      // Arrange
      const filePath = "/path/to/existing-project/existing-session.jsonl";
      const projectName = "existing-project";
      const sessionId = "existing-session";

      // 既存のプロジェクトとセッションを設定
      const existingProject = {
        id: projectIdSchema.parse("existing-project-id"),
        name: projectName,
        path: "/path/to/existing-project",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingSession = {
        id: sessionIdSchema.parse(sessionId),
        projectId: existingProject.id,
        name: null,
        cwd: "/workspace",
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectRepository.setProjects([existingProject]);
      mockSessionRepository.setSessions([existingSession]);

      const userLogEntry: UserLog = {
        uuid: "user-uuid-2",
        parentUuid: null,
        timestamp: "2024-01-01T00:00:00Z",
        isSidechain: false,
        userType: "external",
        cwd: "/workspace",
        sessionId: sessionId,
        version: "1.0.0",
        type: "user",
        message: {
          role: "user",
          content: "Another message",
        },
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName,
        sessionId,
        entries: [userLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(1);
      }

      // プロジェクトが新たに作成されていないことを確認
      const projects = await mockProjectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);
        expect(projects.value.items[0].id).toBe(existingProject.id);
      }

      // セッションが新たに作成されていないことを確認
      const sessions = await mockSessionRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: { projectId: existingProject.id },
      });
      expect(sessions.isOk()).toBe(true);
      if (sessions.isOk()) {
        expect(sessions.value.items).toHaveLength(1);
        expect(sessions.value.items[0].id).toBe(existingSession.id);
      }
    });

    it("空のログエントリでも正常に処理できる", async () => {
      // Arrange
      const filePath = "/path/to/empty/session.jsonl";
      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "empty-project",
        sessionId: "empty-session",
        entries: [],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(0);
      }
    });
  });

  describe("異常系", () => {
    it("無効な入力でエラーになる", async () => {
      // Act
      const result = await processLogFile(context, { filePath: "" });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("PROCESS_LOG_FILE_ERROR");
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("ログパーサーでエラーが発生した場合にエラーになる", async () => {
      // Arrange
      const filePath = "/path/to/invalid/file.jsonl";
      mockLogParser.setShouldFail(true, "Failed to parse file");

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("PROCESS_LOG_FILE_ERROR");
        expect(result.error.message).toBe("Failed to parse log file");
      }
    });

    it("プロジェクトリポジトリでエラーが発生した場合にエラーになる", async () => {
      // Arrange
      const filePath = "/path/to/project/session.jsonl";
      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "test-project",
        sessionId: "test-session",
        entries: [
          {
            type: "user",
            uuid: "test-uuid",
            parentUuid: null,
            timestamp: "2024-01-01T00:00:00Z",
            isSidechain: false,
            userType: "external",
            cwd: "/workspace",
            sessionId: "test-session",
            version: "1.0.0",
            message: {
              role: "user",
              content: "Hello",
            },
          },
        ],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);
      mockProjectRepository.setShouldFailList(true);

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("PROCESS_LOG_FILE_ERROR");
        expect(result.error.message).toContain("Failed to list projects");
      }
    });

    it("セッションリポジトリでエラーが発生した場合にエラーになる", async () => {
      // Arrange
      const filePath = "/path/to/project/session.jsonl";
      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "test-project",
        sessionId: "test-session",
        entries: [
          {
            type: "user",
            uuid: "test-uuid",
            parentUuid: null,
            timestamp: "2024-01-01T00:00:00Z",
            isSidechain: false,
            userType: "external",
            cwd: "/workspace",
            sessionId: "test-session",
            version: "1.0.0",
            message: {
              role: "user",
              content: "Hello",
            },
          },
        ],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // プロジェクトは正常に作成されるが、セッション一覧取得でエラー
      mockSessionRepository.setShouldFailList(true);

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("PROCESS_LOG_FILE_ERROR");
        expect(result.error.message).toContain("Failed to list sessions");
      }
    });
  });

  describe("境界値テスト", () => {
    it("システムログエントリを正常に処理できる", async () => {
      // Arrange
      const filePath = "/path/to/system/session.jsonl";
      const systemLogEntry = {
        uuid: "system-uuid-1",
        parentUuid: null,
        timestamp: "2024-01-01T00:00:00Z",
        isSidechain: false,
        userType: "external" as const,
        cwd: "/workspace",
        sessionId: "system-session",
        version: "1.0.0",
        type: "system" as const,
        content: "System message",
        level: "info" as const,
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "system-project",
        sessionId: "system-session",
        entries: [systemLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(1);
      }

      // システムメッセージがアシスタントメッセージとして保存されることを確認
      const messages = await mockMessageRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: { sessionId: sessionIdSchema.parse("system-session") },
      });
      expect(messages.isOk()).toBe(true);
      if (messages.isOk()) {
        expect(messages.value.items).toHaveLength(1);
        expect(messages.value.items[0].role).toBe("assistant");
        expect(messages.value.items[0].content).toBe("[SYSTEM] System message");
      }
    });

    it("summaryログエントリは処理されない", async () => {
      // Arrange
      const filePath = "/path/to/summary/session.jsonl";
      const summaryLogEntry = {
        type: "summary" as const,
        summary: "Test summary",
        leafUuid: "leaf-uuid",
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "summary-project",
        sessionId: "summary-session",
        entries: [summaryLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, { filePath });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(1);
      }

      // メッセージが保存されていないことを確認
      const messages = await mockMessageRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: { sessionId: sessionIdSchema.parse("summary-session") },
      });
      expect(messages.isOk()).toBe(true);
      if (messages.isOk()) {
        expect(messages.value.items).toHaveLength(0);
      }
    });
  });

  describe("サンプルデータを使用したテスト", () => {
    it("実際のサンプルファイルを処理できる", async () => {
      // Arrange
      const sampleFilePath = resolve(
        process.cwd(),
        "samples/0383fc27-750b-4b34-87a6-534df55b2038.jsonl",
      );
      const sampleContent = readFileSync(sampleFilePath, "utf-8");
      const lines = sampleContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // 実際のサンプルデータから最初の数エントリを解析
      const entries = lines.slice(1, 5).map((line) => JSON.parse(line)); // summaryを除いて4エントリ

      const parsedFile: ParsedLogFile = {
        filePath: sampleFilePath,
        projectName: "kissa", // サンプルファイルから読み取れるプロジェクト名
        sessionId: "0383fc27-750b-4b34-87a6-534df55b2038",
        entries: entries,
      };

      mockLogParser.setParsedFile(sampleFilePath, parsedFile);

      // Act
      const result = await processLogFile(context, {
        filePath: sampleFilePath,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(4);
      }

      // プロジェクトが作成されたことを確認
      const projects = await mockProjectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);
        expect(projects.value.items[0].name).toBe("kissa");
      }

      // セッションが作成されたことを確認
      if (projects.isOk()) {
        const sessions = await mockSessionRepository.list({
          pagination: {
            page: 1,
            limit: 10,
            order: "asc",
            orderBy: "createdAt",
          },
          filter: { projectId: projects.value.items[0].id },
        });
        expect(sessions.isOk()).toBe(true);
        if (sessions.isOk()) {
          expect(sessions.value.items).toHaveLength(1);
          expect(sessions.value.items[0].id).toBe(
            sessionIdSchema.parse("0383fc27-750b-4b34-87a6-534df55b2038"),
          );
        }
      }

      // メッセージが保存されたことを確認
      const messages = await mockMessageRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: {
          sessionId: sessionIdSchema.parse(
            "0383fc27-750b-4b34-87a6-534df55b2038",
          ),
        },
      });
      expect(messages.isOk()).toBe(true);
      if (messages.isOk()) {
        expect(messages.value.items).toHaveLength(4); // lines.slice(1, 5)で4つのエントリを処理
      }
    });

    it("複数の異なるサンプルファイルを処理できる", async () => {
      // Arrange
      const sampleFiles = [
        "samples/044471d0-cd97-458f-8343-e78160697ad0.jsonl",
        "samples/0abf5859-5a69-4c53-9a04-31c40ca8d3b9.jsonl",
      ];

      let totalEntriesProcessed = 0;

      for (const sampleFile of sampleFiles) {
        const fullPath = resolve(process.cwd(), sampleFile);
        const content = readFileSync(fullPath, "utf-8");
        const lines = content
          .trim()
          .split("\n")
          .filter((line) => line.trim());

        // 最初の数エントリを処理（summaryを除く）
        const entries = lines.slice(1, 4).map((line) => JSON.parse(line));
        const sessionId =
          fullPath.split("/").pop()?.replace(".jsonl", "") || "unknown";

        const parsedFile: ParsedLogFile = {
          filePath: fullPath,
          projectName: "test-project",
          sessionId: sessionId,
          entries: entries,
        };

        mockLogParser.setParsedFile(fullPath, parsedFile);

        // Act
        const result = await processLogFile(context, { filePath: fullPath });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          totalEntriesProcessed += result.value.entriesProcessed;
        }
      }

      expect(totalEntriesProcessed).toBeGreaterThan(0);

      // プロジェクトが作成されたことを確認
      const projects = await mockProjectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);
        expect(projects.value.items[0].name).toBe("test-project");
      }

      // 複数のセッションが作成されたことを確認
      if (projects.isOk()) {
        const sessions = await mockSessionRepository.list({
          pagination: {
            page: 1,
            limit: 10,
            order: "asc",
            orderBy: "createdAt",
          },
          filter: { projectId: projects.value.items[0].id },
        });
        expect(sessions.isOk()).toBe(true);
        if (sessions.isOk()) {
          expect(sessions.value.items).toHaveLength(2);
        }
      }
    });

    it("大きなサンプルファイルのパフォーマンステスト", async () => {
      // Arrange
      const sampleFilePath = resolve(
        process.cwd(),
        "samples/0383fc27-750b-4b34-87a6-534df55b2038.jsonl",
      );
      const sampleContent = readFileSync(sampleFilePath, "utf-8");
      const lines = sampleContent
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // 全エントリを処理（summaryを除く）
      const entries = lines.slice(1).map((line) => JSON.parse(line));

      const parsedFile: ParsedLogFile = {
        filePath: sampleFilePath,
        projectName: "large-project",
        sessionId: "0383fc27-750b-4b34-87a6-534df55b2038",
        entries: entries,
      };

      mockLogParser.setParsedFile(sampleFilePath, parsedFile);

      const startTime = Date.now();

      // Act
      const result = await processLogFile(context, {
        filePath: sampleFilePath,
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(entries.length);
        // パフォーマンス要件：1秒以内で処理完了
        expect(processingTime).toBeLessThan(1000);
      }
    });

    it("不正な形式のサンプルデータでもエラー処理できる", async () => {
      // Arrange
      const invalidEntries: unknown[] = [
        // 不正なJSONオブジェクト
        { type: "invalid", data: "corrupted" },
        // 必要なフィールドが欠けている
        { type: "user" },
        // timestampが不正
        {
          type: "user",
          uuid: "test-uuid",
          timestamp: "invalid-date",
          sessionId: "test-session",
          message: { role: "user", content: "test" },
        },
      ];

      const parsedFile = {
        filePath: "/path/to/invalid/file.jsonl",
        projectName: "invalid-project",
        sessionId: "invalid-session",
        entries: invalidEntries,
      } as ParsedLogFile;

      mockLogParser.setParsedFile("/path/to/invalid/file.jsonl", parsedFile);

      // Act
      const result = await processLogFile(context, {
        filePath: "/path/to/invalid/file.jsonl",
      });

      // Assert
      expect(result.isOk()).toBe(true); // processLogFile は個別エントリのエラーを警告として処理
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(3); // 全エントリが処理されるが、無効なものは無視される
      }
    });
  });
});
