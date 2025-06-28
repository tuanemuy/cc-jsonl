import { beforeEach, describe, expect, it } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockLogFileTrackingRepository } from "@/core/adapters/mock/logFileTrackingRepository";
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
      logFileTrackingRepository: new MockLogFileTrackingRepository(),
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
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

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
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

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
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

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
      const result = await processLogFile(context, {
        filePath: "",
        skipTracking: true,
      });

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
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

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
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

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

      // プロジェクトは正常に作成されるが、セッション検索でエラー
      mockSessionRepository.setShouldFailFindById(true);

      // Act
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("PROCESS_LOG_FILE_ERROR");
        expect(result.error.message).toContain("Failed to find session");
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
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

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

    it("summaryログエントリが処理されてセッション名が更新される", async () => {
      // Arrange
      const filePath = "/path/to/summary/session.jsonl";
      const summaryLogEntry = {
        type: "summary" as const,
        summary: "User discussed implementing a new feature for authentication",
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
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(1);
      }

      // セッションが作成されたことを確認
      const projects = await mockProjectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);

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
          const session = sessions.value.items[0];
          // セッション名がサマリーから生成されていることを確認
          expect(session.name).toBeTruthy();
          expect(session.name).not.toBe("Untitled Session");
          expect(session.name).toContain("User discussed implementing");
        }
      }

      // メッセージが保存されていないことを確認（summaryはメッセージではない）
      const messages = await mockMessageRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: { sessionId: sessionIdSchema.parse("summary-session") },
      });
      expect(messages.isOk()).toBe(true);
      if (messages.isOk()) {
        expect(messages.value.items).toHaveLength(0);
      }
    });

    it("サマリーがない場合は最初のユーザーメッセージからセッション名が生成される", async () => {
      // Arrange
      const filePath = "/path/to/no-summary/session.jsonl";
      const userLogEntry = {
        uuid: "user-uuid-1",
        parentUuid: null,
        timestamp: "2024-01-01T00:00:00Z",
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "no-summary-session",
        version: "1.0.0",
        type: "user" as const,
        message: {
          role: "user" as const,
          content: "How do I implement OAuth authentication in my app?",
        },
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "no-summary-project",
        sessionId: "no-summary-session",
        entries: [userLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(1);
      }

      // セッションが作成されて名前が設定されたことを確認
      const projects = await mockProjectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);

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
          const session = sessions.value.items[0];
          // セッション名がメッセージから生成されていることを確認
          expect(session.name).toBeTruthy();
          expect(session.name).not.toBe("Untitled Session");
          expect(session.name).toContain(
            "How do I implement OAuth authentication",
          );
        }
      }

      // メッセージが保存されていることを確認
      const messages = await mockMessageRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: { sessionId: sessionIdSchema.parse("no-summary-session") },
      });
      expect(messages.isOk()).toBe(true);
      if (messages.isOk()) {
        expect(messages.value.items).toHaveLength(1);
      }
    });
  });

  describe("セッション名生成テスト", () => {
    it("既存のセッション名がある場合は更新されない", async () => {
      // Arrange
      const filePath = "/path/to/existing-name/session.jsonl";
      const projectId = projectIdSchema.parse("project-with-name");
      const sessionId = sessionIdSchema.parse("session-with-name");

      // 既存のプロジェクトとセッション（名前付き）を設定
      const existingProject = {
        id: projectId,
        name: "existing-name-project",
        path: "/path/to/existing-name-project",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingSession = {
        id: sessionId,
        projectId: projectId,
        name: "Existing Session Name",
        cwd: "/workspace",
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectRepository.setProjects([existingProject]);
      mockSessionRepository.setSessions([existingSession]);

      const userLogEntry = {
        uuid: "user-uuid-1",
        parentUuid: null,
        timestamp: "2024-01-01T00:00:00Z",
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: sessionId,
        version: "1.0.0",
        type: "user" as const,
        message: {
          role: "user" as const,
          content: "This should not become the session name",
        },
      };

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: existingProject.name,
        sessionId: sessionId,
        entries: [userLogEntry],
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);

      // セッション名が変更されていないことを確認
      const sessions = await mockSessionRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
        filter: { projectId: projectId },
      });
      expect(sessions.isOk()).toBe(true);
      if (sessions.isOk()) {
        expect(sessions.value.items).toHaveLength(1);
        expect(sessions.value.items[0].name).toBe("Existing Session Name");
      }
    });

    it("タグで始まるメッセージはセッション名生成時にスキップされる", async () => {
      // Arrange
      const filePath = "/path/to/tag-message/session.jsonl";
      const userLogEntries = [
        {
          uuid: "user-uuid-1",
          parentUuid: null,
          timestamp: "2024-01-01T00:00:00Z",
          isSidechain: false,
          userType: "external" as const,
          cwd: "/test",
          sessionId: "tag-session",
          version: "1.0.0",
          type: "user" as const,
          message: {
            role: "user" as const,
            content: "<system>This message starts with a tag</system>",
          },
        },
        {
          uuid: "user-uuid-2",
          parentUuid: null,
          timestamp: "2024-01-01T00:00:01Z",
          isSidechain: false,
          userType: "external" as const,
          cwd: "/test",
          sessionId: "tag-session",
          version: "1.0.0",
          type: "user" as const,
          message: {
            role: "user" as const,
            content: "This is a normal message without tags",
          },
        },
      ];

      const parsedFile: ParsedLogFile = {
        filePath,
        projectName: "tag-project",
        sessionId: "tag-session",
        entries: userLogEntries,
      };

      mockLogParser.setParsedFile(filePath, parsedFile);

      // Act
      const result = await processLogFile(context, {
        filePath,
        skipTracking: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entriesProcessed).toBe(2);
      }

      // セッションが作成されて、タグで始まらないメッセージから名前が設定されたことを確認
      const projects = await mockProjectRepository.list({
        pagination: { page: 1, limit: 10, order: "asc", orderBy: "createdAt" },
      });
      expect(projects.isOk()).toBe(true);
      if (projects.isOk()) {
        expect(projects.value.items).toHaveLength(1);

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
          const session = sessions.value.items[0];
          // セッション名が2番目のメッセージ（タグなし）から生成されていることを確認
          expect(session.name).toBeTruthy();
          expect(session.name).toBe("This is a normal message without tags");
        }
      }
    });
  });
});
