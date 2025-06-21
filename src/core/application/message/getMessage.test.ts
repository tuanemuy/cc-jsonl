import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Context } from "@/core/application/context";
import type { Message, MessageId } from "@/core/domain/message/types";
import type { SessionId } from "@/core/domain/session/types";
import { beforeEach, describe, expect, it } from "vitest";
import { getMessage } from "./getMessage";
import type { GetMessageInput } from "./getMessage";

describe("getMessage", () => {
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
    it("should return a message when found by ID", async () => {
      const sessionId = "session-123" as SessionId;
      const message: Message = {
        id: "msg-123" as MessageId,
        sessionId,
        role: "user",
        content: "Hello, world!",
        timestamp: new Date("2024-01-01T10:00:00Z"),
        rawData: JSON.stringify({ text: "Hello, world!" }),
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: "msg-123" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should return null when message not found", async () => {
      const input: GetMessageInput = { id: "non-existent-msg" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it("should handle UUID format IDs", async () => {
      const sessionId = "session-456" as SessionId;
      const message: Message = {
        id: "550e8400-e29b-41d4-a716-446655440000" as MessageId,
        sessionId,
        role: "assistant",
        content: "UUID message",
        timestamp: new Date("2024-01-01T10:01:00Z"),
        rawData: JSON.stringify({ text: "UUID message" }),
        createdAt: new Date("2024-01-01T10:01:00Z"),
        updatedAt: new Date("2024-01-01T10:01:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = {
        id: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should handle IDs with special characters", async () => {
      const sessionId = "session-special" as SessionId;
      const message: Message = {
        id: "msg_123-456_789" as MessageId,
        sessionId,
        role: "user",
        content: "Special ID message",
        timestamp: new Date("2024-01-01T10:02:00Z"),
        rawData: JSON.stringify({ text: "Special ID message" }),
        createdAt: new Date("2024-01-01T10:02:00Z"),
        updatedAt: new Date("2024-01-01T10:02:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: "msg_123-456_789" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should handle Japanese characters in ID", async () => {
      const sessionId = "session-jp" as SessionId;
      const message: Message = {
        id: "メッセージ-123" as MessageId,
        sessionId,
        role: "user",
        content: "Japanese ID message",
        timestamp: new Date("2024-01-01T10:03:00Z"),
        rawData: JSON.stringify({ text: "Japanese ID message" }),
        createdAt: new Date("2024-01-01T10:03:00Z"),
        updatedAt: new Date("2024-01-01T10:03:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: "メッセージ-123" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should handle numeric-only IDs", async () => {
      const sessionId = "session-num" as SessionId;
      const message: Message = {
        id: "123456789" as MessageId,
        sessionId,
        role: "assistant",
        content: "Numeric ID message",
        timestamp: new Date("2024-01-01T10:04:00Z"),
        rawData: JSON.stringify({ text: "Numeric ID message" }),
        createdAt: new Date("2024-01-01T10:04:00Z"),
        updatedAt: new Date("2024-01-01T10:04:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: "123456789" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should handle messages with null content", async () => {
      const sessionId = "session-null" as SessionId;
      const message: Message = {
        id: "msg-null-content" as MessageId,
        sessionId,
        role: "user",
        content: null,
        timestamp: new Date("2024-01-01T10:05:00Z"),
        rawData: JSON.stringify({ type: "file_upload" }),
        createdAt: new Date("2024-01-01T10:05:00Z"),
        updatedAt: new Date("2024-01-01T10:05:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: "msg-null-content" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });
  });

  describe("Error Cases", () => {
    it("should fail with empty string ID", async () => {
      const input: GetMessageInput = { id: "" };

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with null ID", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: null } as any;

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with undefined ID", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: undefined } as any;

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with non-string ID", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: 123 } as any;

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with missing ID field", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = {} as any;

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with whitespace-only ID", async () => {
      const input: GetMessageInput = { id: "   " };

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with tab and newline characters", async () => {
      const input: GetMessageInput = { id: "\t\n" };

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });
  });

  describe("Boundary Cases", () => {
    it("should handle single character ID", async () => {
      const sessionId = "session-single" as SessionId;
      const message: Message = {
        id: "a" as MessageId,
        sessionId,
        role: "user",
        content: "Short ID message",
        timestamp: new Date("2024-01-01T10:06:00Z"),
        rawData: JSON.stringify({ text: "Short ID message" }),
        createdAt: new Date("2024-01-01T10:06:00Z"),
        updatedAt: new Date("2024-01-01T10:06:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: "a" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should handle very long ID", async () => {
      const sessionId = "session-long" as SessionId;
      const longId = `msg-${"a".repeat(1000)}`;
      const message: Message = {
        id: longId as MessageId,
        sessionId,
        role: "user",
        content: "Long ID message",
        timestamp: new Date("2024-01-01T10:07:00Z"),
        rawData: JSON.stringify({ text: "Long ID message" }),
        createdAt: new Date("2024-01-01T10:07:00Z"),
        updatedAt: new Date("2024-01-01T10:07:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: longId };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should handle ID with various symbols", async () => {
      const sessionId = "session-symbols" as SessionId;
      const symbolId = "msg!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const message: Message = {
        id: symbolId as MessageId,
        sessionId,
        role: "user",
        content: "Symbol ID message",
        timestamp: new Date("2024-01-01T10:08:00Z"),
        rawData: JSON.stringify({ text: "Symbol ID message" }),
        createdAt: new Date("2024-01-01T10:08:00Z"),
        updatedAt: new Date("2024-01-01T10:08:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: symbolId };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(message);
      }
    });

    it("should handle case-sensitive ID matching", async () => {
      const sessionId = "session-case" as SessionId;
      const message: Message = {
        id: "Msg-CaseSensitive" as MessageId,
        sessionId,
        role: "user",
        content: "Case sensitive ID message",
        timestamp: new Date("2024-01-01T10:09:00Z"),
        rawData: JSON.stringify({ text: "Case sensitive ID message" }),
        createdAt: new Date("2024-01-01T10:09:00Z"),
        updatedAt: new Date("2024-01-01T10:09:00Z"),
      };

      mockMessageRepository = new MockMessageRepository([message]);
      context = {
        projectRepository: mockProjectRepository,
        sessionRepository: mockSessionRepository,
        messageRepository: mockMessageRepository,
        claudeService: mockClaudeService,
      };

      const input: GetMessageInput = { id: "msg-casesensitive" };

      const result = await getMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it("should handle ID with leading/trailing whitespace", async () => {
      const input: GetMessageInput = { id: "  msg-123  " };

      const result = await getMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });
  });
});
