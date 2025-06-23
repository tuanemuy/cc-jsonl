import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Context } from "@/core/application/context";
import type { Message, MessageId } from "@/core/domain/message/types";
import type { SessionId } from "@/core/domain/session/types";
import type { ListMessageQuery } from "./listMessages";
import { listMessages } from "./listMessages";

describe("listMessages", () => {
  let mockProjectRepository: MockProjectRepository;
  let mockSessionRepository: MockSessionRepository;
  let mockMessageRepository: MockMessageRepository;
  let mockClaudeService: MockClaudeService;
  let context: Context;

  beforeEach(() => {
    mockProjectRepository = new MockProjectRepository();
    mockSessionRepository = new MockSessionRepository();
    mockMessageRepository = new MockMessageRepository();
    mockClaudeService = new MockClaudeService();

    context = {
      projectRepository: mockProjectRepository,
      sessionRepository: mockSessionRepository,
      messageRepository: mockMessageRepository,
      claudeService: mockClaudeService,
    };
  });

  describe("Normal Cases", () => {
    it("should return empty list when no messages exist", async () => {
      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("should return all messages without filter", async () => {
      const session1 = "session-1" as SessionId;
      const session2 = "session-2" as SessionId;
      const messages: Message[] = [
        {
          id: "msg-1" as MessageId,
          sessionId: session1,
          role: "user",
          content: "Hello from session 1",
          timestamp: new Date("2024-01-01T10:00:00Z"),
          rawData: "{}",
          uuid: "test-uuid-1",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          id: "msg-2" as MessageId,
          sessionId: session2,
          role: "assistant",
          content: "Hello from session 2",
          timestamp: new Date("2024-01-01T10:01:00Z"),
          rawData: "{}",
          uuid: "test-uuid-2",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:01:00Z"),
        },
      ];

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        // Messages should be sorted by timestamp (oldest first)
        expect(result.value.items[0].id).toBe("msg-1");
        expect(result.value.items[1].id).toBe("msg-2");
      }
    });

    it("should filter messages by sessionId", async () => {
      const session1 = "session-1" as SessionId;
      const session2 = "session-2" as SessionId;
      const messages: Message[] = [
        {
          id: "msg-1" as MessageId,
          sessionId: session1,
          role: "user",
          content: "Message 1",
          timestamp: new Date("2024-01-01T10:00:00Z"),
          rawData: "{}",
          uuid: "test-uuid-1",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          id: "msg-2" as MessageId,
          sessionId: session2,
          role: "user",
          content: "Message 2",
          timestamp: new Date("2024-01-01T10:01:00Z"),
          rawData: "{}",
          uuid: "test-uuid-2",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:01:00Z"),
        },
        {
          id: "msg-3" as MessageId,
          sessionId: session1,
          role: "assistant",
          content: "Message 3",
          timestamp: new Date("2024-01-01T10:02:00Z"),
          rawData: "{}",
          uuid: "test-uuid-3",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          updatedAt: new Date("2024-01-01T10:02:00Z"),
        },
      ];

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { sessionId: session1 },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(
          result.value.items.every((msg) => msg.sessionId === session1),
        ).toBe(true);
        expect(result.value.items[0].id).toBe("msg-1");
        expect(result.value.items[1].id).toBe("msg-3");
      }
    });

    it("should filter messages by role", async () => {
      const sessionId = "session-1" as SessionId;
      const messages: Message[] = [
        {
          id: "msg-1" as MessageId,
          sessionId,
          role: "user",
          content: "User message 1",
          timestamp: new Date("2024-01-01T10:00:00Z"),
          rawData: "{}",
          uuid: "test-uuid-1",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          id: "msg-2" as MessageId,
          sessionId,
          role: "assistant",
          content: "Assistant message",
          timestamp: new Date("2024-01-01T10:01:00Z"),
          rawData: "{}",
          uuid: "test-uuid-2",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:01:00Z"),
        },
        {
          id: "msg-3" as MessageId,
          sessionId,
          role: "user",
          content: "User message 2",
          timestamp: new Date("2024-01-01T10:02:00Z"),
          rawData: "{}",
          uuid: "test-uuid-3",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          updatedAt: new Date("2024-01-01T10:02:00Z"),
        },
      ];

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { role: "user" },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items.every((msg) => msg.role === "user")).toBe(
          true,
        );
      }
    });

    it("should filter messages by both sessionId and role", async () => {
      const session1 = "session-1" as SessionId;
      const session2 = "session-2" as SessionId;
      const messages: Message[] = [
        {
          id: "msg-1" as MessageId,
          sessionId: session1,
          role: "user",
          content: "User message in session 1",
          timestamp: new Date("2024-01-01T10:00:00Z"),
          rawData: "{}",
          uuid: "test-uuid-1",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          id: "msg-2" as MessageId,
          sessionId: session1,
          role: "assistant",
          content: "Assistant message in session 1",
          timestamp: new Date("2024-01-01T10:01:00Z"),
          rawData: "{}",
          uuid: "test-uuid-2",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:01:00Z"),
        },
        {
          id: "msg-3" as MessageId,
          sessionId: session2,
          role: "user",
          content: "User message in session 2",
          timestamp: new Date("2024-01-01T10:02:00Z"),
          rawData: "{}",
          uuid: "test-uuid-3",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          updatedAt: new Date("2024-01-01T10:02:00Z"),
        },
      ];

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { sessionId: session1, role: "user" },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.count).toBe(1);
        expect(result.value.items[0].id).toBe("msg-1");
      }
    });

    it("should handle pagination correctly", async () => {
      const sessionId = "session-1" as SessionId;
      const messages: Message[] = Array.from({ length: 25 }, (_, i) => ({
        id: `msg-${i + 1}` as MessageId,
        sessionId,
        role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `Message ${i + 1}`,
        timestamp: new Date(
          `2024-01-01T10:${i.toString().padStart(2, "0")}:00Z`,
        ),
        rawData: "{}",
        uuid: `test-uuid-${i + 1}`,
        parentUuid: i > 0 ? `test-uuid-${i}` : null,
        cwd: "/tmp",
        createdAt: new Date(
          `2024-01-01T10:${i.toString().padStart(2, "0")}:00Z`,
        ),
        updatedAt: new Date(
          `2024-01-01T10:${i.toString().padStart(2, "0")}:00Z`,
        ),
      }));

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      // First page
      const query1: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result1 = await listMessages(context, query1);

      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.items).toHaveLength(10);
        expect(result1.value.count).toBe(25);
        expect(result1.value.items[0].id).toBe("msg-1");
        expect(result1.value.items[9].id).toBe("msg-10");
      }

      // Third page
      const query3: ListMessageQuery = {
        pagination: {
          page: 3,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result3 = await listMessages(context, query3);

      expect(result3.isOk()).toBe(true);
      if (result3.isOk()) {
        expect(result3.value.items).toHaveLength(5);
        expect(result3.value.count).toBe(25);
        expect(result3.value.items[0].id).toBe("msg-21");
        expect(result3.value.items[4].id).toBe("msg-25");
      }
    });
  });

  describe("Error Cases", () => {
    it("should fail with invalid page number", async () => {
      const query = {
        pagination: {
          page: 0,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });

    it("should fail with invalid limit", async () => {
      const query = {
        pagination: {
          page: 1,
          limit: 0,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });

    it("should fail with negative page number", async () => {
      const query = {
        pagination: {
          page: -1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });

    it("should fail with negative limit", async () => {
      const query = {
        pagination: {
          page: 1,
          limit: -5,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });

    it("should fail with invalid sessionId type", async () => {
      const query = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { sessionId: 123 },
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });

    it("should fail with invalid role", async () => {
      const query = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { role: "invalid" },
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });

    it("should fail with missing pagination", async () => {
      const query = {
        filter: { sessionId: "session-1" as SessionId },
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });
  });

  describe("Boundary Cases", () => {
    it("should handle page beyond available data", async () => {
      const sessionId = "session-1" as SessionId;
      const messages: Message[] = [
        {
          id: "msg-1" as MessageId,
          sessionId,
          role: "user",
          content: "Only message",
          timestamp: new Date("2024-01-01T10:00:00Z"),
          rawData: "{}",
          uuid: "test-uuid-1",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:00Z"),
        },
      ];

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const query: ListMessageQuery = {
        pagination: {
          page: 5,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(1);
      }
    });

    it("should handle maximum limit", async () => {
      const sessionId = "session-1" as SessionId;
      const messages: Message[] = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i + 1}` as MessageId,
        sessionId,
        role: "user" as const,
        content: `Message ${i + 1}`,
        timestamp: new Date(
          `2024-01-01T10:${i.toString().padStart(2, "0")}:00Z`,
        ),
        rawData: "{}",
        uuid: `test-uuid-boundary-${i + 1}`,
        parentUuid: i > 0 ? `test-uuid-boundary-${i}` : null,
        cwd: "/tmp",
        createdAt: new Date(
          `2024-01-01T10:${i.toString().padStart(2, "0")}:00Z`,
        ),
        updatedAt: new Date(
          `2024-01-01T10:${i.toString().padStart(2, "0")}:00Z`,
        ),
      }));

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 100,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(5);
        expect(result.value.count).toBe(5);
      }
    });

    it("should handle filter with no matches", async () => {
      const sessionId = "session-1" as SessionId;
      const messages: Message[] = [
        {
          id: "msg-1" as MessageId,
          sessionId,
          role: "user",
          content: "User message",
          timestamp: new Date("2024-01-01T10:00:00Z"),
          rawData: "{}",
          uuid: "test-uuid-1",
          parentUuid: null,
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:00Z"),
        },
      ];

      mockMessageRepository = new MockMessageRepository(messages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { sessionId: "non-existent-session" as SessionId },
      };

      const result = await listMessages(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("should handle empty sessionId filter", async () => {
      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { sessionId: "" as SessionId },
      };

      const result = await listMessages(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message query");
      }
    });
  });

  describe("サンプルデータを使用したテスト", () => {
    it("サンプルファイルからメッセージデータを読み込んでテストできる", async () => {
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

      // サンプルデータから実際のメッセージ構造を取得
      const sampleMessages: Message[] = [];
      const sessionId = "0383fc27-750b-4b34-87a6-534df55b2038" as SessionId;

      // サンプルファイルから user と assistant メッセージを抽出
      lines.slice(1, 6).forEach((line) => {
        try {
          const entry = JSON.parse(line);
          if (entry.type === "user" || entry.type === "assistant") {
            const content =
              entry.type === "user"
                ? typeof entry.message.content === "string"
                  ? entry.message.content
                  : JSON.stringify(entry.message.content)
                : JSON.stringify(entry.message.content);

            sampleMessages.push({
              id: `msg-${entry.uuid}` as MessageId,
              sessionId: sessionId,
              role: entry.message.role,
              content: content,
              timestamp: new Date(entry.timestamp),
              rawData: JSON.stringify(entry),
              uuid: entry.uuid,
              parentUuid: entry.parentUuid,
              cwd: entry.cwd || "/tmp",
              createdAt: new Date(entry.timestamp),
              updatedAt: new Date(entry.timestamp),
            });
          }
        } catch (_e) {
          // 不正なJSONは無視
        }
      });

      mockMessageRepository = new MockMessageRepository(sampleMessages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      // Act
      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { sessionId: sessionId },
      };

      const result = await listMessages(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items.length).toBeGreaterThan(0);
        expect(result.value.count).toBe(sampleMessages.length);
        // 全てのメッセージが指定されたセッションIDに属すること
        expect(
          result.value.items.every((msg) => msg.sessionId === sessionId),
        ).toBe(true);
        // タイムスタンプ順に並んでいること
        for (let i = 1; i < result.value.items.length; i++) {
          expect(
            result.value.items[i - 1].timestamp.getTime(),
          ).toBeLessThanOrEqual(result.value.items[i].timestamp.getTime());
        }
      }
    });

    it("複数のサンプルファイルからメッセージを統合してテストできる", async () => {
      // Arrange
      const sampleFiles = [
        "samples/044471d0-cd97-458f-8343-e78160697ad0.jsonl",
        "samples/0abf5859-5a69-4c53-9a04-31c40ca8d3b9.jsonl",
      ];

      const allMessages: Message[] = [];

      sampleFiles.forEach((sampleFile, fileIndex) => {
        const fullPath = resolve(process.cwd(), sampleFile);
        const content = readFileSync(fullPath, "utf-8");
        const lines = content
          .trim()
          .split("\n")
          .filter((line) => line.trim());

        // 044471d0ファイルは12-23行目、0abf5859ファイルは1-30行目を使用
        const startIndex = fileIndex === 0 ? 12 : 1;
        const endIndex = fileIndex === 0 ? 23 : 30;

        lines.slice(startIndex, endIndex).forEach((line, lineIndex) => {
          try {
            const entry = JSON.parse(line);
            if (entry.type === "user" || entry.type === "assistant") {
              const content =
                entry.type === "user"
                  ? typeof entry.message.content === "string"
                    ? entry.message.content
                    : JSON.stringify(entry.message.content)
                  : JSON.stringify(entry.message.content);

              allMessages.push({
                id: `msg-${fileIndex}-${lineIndex}` as MessageId,
                sessionId: entry.sessionId as SessionId,
                role: entry.message.role,
                content: content,
                timestamp: new Date(entry.timestamp),
                rawData: JSON.stringify(entry),
                uuid: entry.uuid,
                parentUuid: entry.parentUuid,
                cwd: entry.cwd || "/tmp",
                createdAt: new Date(entry.timestamp),
                updatedAt: new Date(entry.timestamp),
              });
            }
          } catch (_e) {
            // 不正なJSONは無視
          }
        });
      });

      mockMessageRepository = new MockMessageRepository(allMessages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      // Act - 全メッセージを取得
      const query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 100,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const result = await listMessages(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items.length).toBe(allMessages.length);
        expect(result.value.count).toBe(allMessages.length);

        // 複数のセッションからのメッセージが含まれること
        const sessionIds = new Set(
          result.value.items.map((msg) => msg.sessionId),
        );
        expect(sessionIds.size).toBeGreaterThan(1);
      }
    });

    it("サンプルデータでのロール別フィルタリングテスト", async () => {
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

      const userMessages: Message[] = [];
      const assistantMessages: Message[] = [];
      const sessionId = "0383fc27-750b-4b34-87a6-534df55b2038" as SessionId;

      lines.slice(1, 10).forEach((line, index) => {
        try {
          const entry = JSON.parse(line);
          if (entry.type === "user" || entry.type === "assistant") {
            const content =
              entry.type === "user"
                ? typeof entry.message.content === "string"
                  ? entry.message.content
                  : JSON.stringify(entry.message.content)
                : JSON.stringify(entry.message.content);

            const message: Message = {
              id: `msg-${index}` as MessageId,
              sessionId: sessionId,
              role: entry.message.role,
              content: content,
              timestamp: new Date(entry.timestamp),
              rawData: JSON.stringify(entry),
              uuid: entry.uuid,
              parentUuid: entry.parentUuid,
              cwd: entry.cwd || "/tmp",
              createdAt: new Date(entry.timestamp),
              updatedAt: new Date(entry.timestamp),
            };

            if (entry.message.role === "user") {
              userMessages.push(message);
            } else if (entry.message.role === "assistant") {
              assistantMessages.push(message);
            }
          }
        } catch (_e) {
          // 不正なJSONは無視
        }
      });

      const allMessages = [...userMessages, ...assistantMessages];
      mockMessageRepository = new MockMessageRepository(allMessages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      // Act - ユーザーメッセージのみフィルタ
      const userQuery: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { role: "user" },
      };

      const userResult = await listMessages(context, userQuery);

      // Assert
      expect(userResult.isOk()).toBe(true);
      if (userResult.isOk()) {
        expect(userResult.value.items.length).toBe(userMessages.length);
        expect(userResult.value.items.every((msg) => msg.role === "user")).toBe(
          true,
        );
      }

      // Act - アシスタントメッセージのみフィルタ
      const assistantQuery: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 10,
          order: "desc" as const,
          orderBy: "createdAt",
        },
        filter: { role: "assistant" },
      };

      const assistantResult = await listMessages(context, assistantQuery);

      // Assert
      expect(assistantResult.isOk()).toBe(true);
      if (assistantResult.isOk()) {
        expect(assistantResult.value.items.length).toBe(
          assistantMessages.length,
        );
        expect(
          assistantResult.value.items.every((msg) => msg.role === "assistant"),
        ).toBe(true);
      }
    });

    it("サンプルデータでの大量メッセージのページネーションテスト", async () => {
      // Arrange - 複数のサンプルファイルから大量のメッセージを作成
      const sampleFiles = [
        "samples/0383fc27-750b-4b34-87a6-534df55b2038.jsonl",
        "samples/044471d0-cd97-458f-8343-e78160697ad0.jsonl",
        "samples/0abf5859-5a69-4c53-9a04-31c40ca8d3b9.jsonl",
        "samples/0b50a24d-d77d-4f45-9e96-11f0f31984a6.jsonl",
        "samples/0bb5679e-ecf6-48ed-ad7f-92363838095d.jsonl",
      ];

      const allMessages: Message[] = [];

      sampleFiles.forEach((sampleFile, fileIndex) => {
        const fullPath = resolve(process.cwd(), sampleFile);
        const content = readFileSync(fullPath, "utf-8");
        const lines = content
          .trim()
          .split("\n")
          .filter((line) => line.trim());
        const sessionId = fullPath
          .split("/")
          .pop()
          ?.replace(".jsonl", "") as SessionId;

        lines.slice(1, 6).forEach((line, lineIndex) => {
          try {
            const entry = JSON.parse(line);
            if (entry.type === "user" || entry.type === "assistant") {
              const content =
                entry.type === "user"
                  ? typeof entry.message.content === "string"
                    ? entry.message.content
                    : JSON.stringify(entry.message.content)
                  : JSON.stringify(entry.message.content);

              allMessages.push({
                id: `msg-${fileIndex}-${lineIndex}` as MessageId,
                sessionId: sessionId,
                role: entry.message.role,
                content: content,
                timestamp: new Date(entry.timestamp),
                rawData: JSON.stringify(entry),
                uuid: entry.uuid,
                parentUuid: entry.parentUuid,
                cwd: entry.cwd || "/tmp",
                createdAt: new Date(entry.timestamp),
                updatedAt: new Date(entry.timestamp),
              });
            }
          } catch (_e) {
            // 不正なJSONは無視
          }
        });
      });

      mockMessageRepository = new MockMessageRepository(allMessages);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      // Act - 1ページ目を取得
      const page1Query: ListMessageQuery = {
        pagination: {
          page: 1,
          limit: 5,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const page1Result = await listMessages(context, page1Query);

      // Assert
      expect(page1Result.isOk()).toBe(true);
      if (page1Result.isOk()) {
        expect(page1Result.value.items.length).toBe(
          Math.min(5, allMessages.length),
        );
        expect(page1Result.value.count).toBe(allMessages.length);
      }

      // Act - 2ページ目を取得
      const page2Query: ListMessageQuery = {
        pagination: {
          page: 2,
          limit: 5,
          order: "desc" as const,
          orderBy: "createdAt",
        },
      };

      const page2Result = await listMessages(context, page2Query);

      // Assert
      expect(page2Result.isOk()).toBe(true);
      if (page2Result.isOk()) {
        const expectedPage2Length = Math.max(
          0,
          Math.min(5, allMessages.length - 5),
        );
        expect(page2Result.value.items.length).toBe(expectedPage2Length);
        expect(page2Result.value.count).toBe(allMessages.length);

        // 1ページ目と2ページ目でメッセージが重複していないこと
        if (page1Result.isOk()) {
          const page1Ids = new Set(
            page1Result.value.items.map((msg) => msg.id),
          );
          const page2Ids = new Set(
            page2Result.value.items.map((msg) => msg.id),
          );
          const intersection = new Set(
            [...page1Ids].filter((id) => page2Ids.has(id)),
          );
          expect(intersection.size).toBe(0);
        }
      }
    });
  });
});
