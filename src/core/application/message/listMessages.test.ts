import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Context } from "@/core/application/context";
import type { Message, MessageId } from "@/core/domain/message/types";
import type { SessionId } from "@/core/domain/session/types";
import { beforeEach, describe, expect, it } from "vitest";
import { listMessages } from "./listMessages";
import type { ListMessageQuery } from "./listMessages";

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
});
