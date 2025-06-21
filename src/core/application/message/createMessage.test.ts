import { beforeEach, describe, expect, it } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Context } from "@/core/application/context";
import type { SessionId } from "@/core/domain/session/types";
import type { CreateMessageInput } from "./createMessage";
import { createMessage } from "./createMessage";

describe("createMessage", () => {
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
    it("should create a message with valid user input", async () => {
      const sessionId = "session-123" as SessionId;
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: "Hello, world!",
        timestamp: new Date("2024-01-01T10:00:00Z"),
        rawData: JSON.stringify({ text: "Hello, world!" }),
        uuid: "test-uuid-1",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.sessionId).toBe(sessionId);
        expect(result.value.role).toBe("user");
        expect(result.value.content).toBe("Hello, world!");
        expect(result.value.timestamp).toEqual(
          new Date("2024-01-01T10:00:00Z"),
        );
        expect(result.value.rawData).toBe(
          JSON.stringify({ text: "Hello, world!" }),
        );
        expect(result.value.id).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should create a message with valid assistant input", async () => {
      const sessionId = "session-456" as SessionId;
      const input: CreateMessageInput = {
        sessionId,
        role: "assistant",
        content: "How can I help you?",
        timestamp: new Date("2024-01-01T10:01:00Z"),
        rawData: JSON.stringify({ text: "How can I help you?" }),
        uuid: "test-uuid-2",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.role).toBe("assistant");
      }
    });

    it("should create a message with null content", async () => {
      const sessionId = "session-789" as SessionId;
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: null,
        timestamp: new Date("2024-01-01T10:02:00Z"),
        rawData: JSON.stringify({ type: "file_upload" }),
        uuid: "test-uuid-3",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBeNull();
      }
    });

    it("should create a message with Japanese content", async () => {
      const sessionId = "session-jp" as SessionId;
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: "こんにちは、世界！",
        timestamp: new Date("2024-01-01T10:03:00Z"),
        rawData: JSON.stringify({ text: "こんにちは、世界！" }),
        uuid: "test-uuid-4",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe("こんにちは、世界！");
      }
    });

    it("should create a message with special characters in content", async () => {
      const sessionId = "session-special" as SessionId;
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
        timestamp: new Date("2024-01-01T10:04:00Z"),
        rawData: JSON.stringify({
          text: "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
        }),
        uuid: "test-uuid-5",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe(
          "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
        );
      }
    });

    it("should create multiple messages for the same session", async () => {
      const sessionId = "session-multi" as SessionId;
      const input1: CreateMessageInput = {
        sessionId,
        role: "user",
        content: "First message",
        timestamp: new Date("2024-01-01T10:00:00Z"),
        rawData: JSON.stringify({ text: "First message" }),
        uuid: "test-uuid-6",
        parentUuid: null,
        cwd: "/tmp",
      };
      const input2: CreateMessageInput = {
        sessionId,
        role: "assistant",
        content: "Second message",
        timestamp: new Date("2024-01-01T10:01:00Z"),
        rawData: JSON.stringify({ text: "Second message" }),
        uuid: "test-uuid-7",
        parentUuid: "test-uuid-6",
        cwd: "/tmp",
      };

      const result1 = await createMessage(context, input1);
      const result2 = await createMessage(context, input2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.id).not.toBe(result2.value.id);
        expect(result1.value.sessionId).toBe(result2.value.sessionId);
      }
    });
  });

  describe("Error Cases", () => {
    it("should fail with empty sessionId", async () => {
      const input = {
        sessionId: "" as SessionId,
        role: "user" as const,
        content: "Hello",
        timestamp: new Date(),
        rawData: "{}",
        uuid: "test-uuid-error",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with null sessionId", async () => {
      const input = {
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
        sessionId: null as any,
        role: "user" as const,
        content: "Hello",
        timestamp: new Date(),
        rawData: "{}",
        uuid: "test-uuid-error",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with invalid role", async () => {
      const input = {
        sessionId: "session-123" as SessionId,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
        role: "invalid" as any,
        content: "Hello",
        timestamp: new Date(),
        rawData: "{}",
        uuid: "test-uuid-error",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with missing required fields", async () => {
      const input = {
        sessionId: "session-123" as SessionId,
        role: "user" as const,
        // Missing content, timestamp, rawData
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await createMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with invalid timestamp", async () => {
      const input = {
        sessionId: "session-123" as SessionId,
        role: "user" as const,
        content: "Hello",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
        timestamp: "invalid-date" as any,
        rawData: "{}",
        uuid: "test-uuid-error",
        parentUuid: null,
        cwd: "/tmp",
      };

      const result = await createMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });

    it("should fail with non-string rawData", async () => {
      const input = {
        sessionId: "session-123" as SessionId,
        role: "user" as const,
        content: "Hello",
        timestamp: new Date(),
        uuid: crypto.randomUUID(),
        parentUuid: null,
        cwd: "/tmp",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
        rawData: 123 as any,
      };

      const result = await createMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid message input");
      }
    });
  });

  describe("Boundary Cases", () => {
    it("should create a message with empty string content", async () => {
      const sessionId = "session-empty" as SessionId;
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: "",
        timestamp: new Date(),
        uuid: crypto.randomUUID(),
        parentUuid: null,
        cwd: "/tmp",
        rawData: JSON.stringify({ text: "" }),
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe("");
      }
    });

    it("should create a message with very long content", async () => {
      const sessionId = "session-long" as SessionId;
      const longContent = "A".repeat(10000);
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: longContent,
        timestamp: new Date(),
        uuid: crypto.randomUUID(),
        parentUuid: null,
        cwd: "/tmp",
        rawData: JSON.stringify({ text: longContent }),
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe(longContent);
      }
    });

    it("should create a message with content containing newlines", async () => {
      const sessionId = "session-newlines" as SessionId;
      const multilineContent = "Line 1\nLine 2\r\nLine 3\n\nEmpty line above";
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: multilineContent,
        timestamp: new Date(),
        uuid: crypto.randomUUID(),
        parentUuid: null,
        cwd: "/tmp",
        rawData: JSON.stringify({ text: multilineContent }),
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe(multilineContent);
      }
    });

    it("should create a message with whitespace-only content", async () => {
      const sessionId = "session-whitespace" as SessionId;
      const whitespaceContent = "   \t   \n   ";
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: whitespaceContent,
        timestamp: new Date(),
        uuid: crypto.randomUUID(),
        parentUuid: null,
        cwd: "/tmp",
        rawData: JSON.stringify({ text: whitespaceContent }),
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe(whitespaceContent);
      }
    });

    it("should create a message with complex JSON rawData", async () => {
      const sessionId = "session-complex" as SessionId;
      const complexRawData = JSON.stringify({
        text: "Hello",
        metadata: {
          timestamp: "2024-01-01T10:00:00Z",
          source: "web",
          nested: { value: 42 },
        },
        array: [1, 2, 3],
      });
      const input: CreateMessageInput = {
        sessionId,
        role: "user",
        content: "Hello",
        timestamp: new Date(),
        uuid: crypto.randomUUID(),
        parentUuid: null,
        cwd: "/tmp",
        rawData: complexRawData,
      };

      const result = await createMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.rawData).toBe(complexRawData);
      }
    });
  });
});
