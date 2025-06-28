import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Context } from "@/core/application/context";
import type { ChunkData } from "@/core/domain/claude/types";
import type { Message, MessageId } from "@/core/domain/message/types";
import type { Project, ProjectId } from "@/core/domain/project/types";
import type { Session, SessionId } from "@/core/domain/session/types";
import type { SendMessageStreamInput } from "./sendMessageStream";
import { sendMessageStream } from "./sendMessageStream";

describe("sendMessageStream", () => {
  let mockProjectRepository: MockProjectRepository;
  let mockSessionRepository: MockSessionRepository;
  let mockMessageRepository: MockMessageRepository;
  let mockClaudeService: MockClaudeService;
  let context: Context;
  let onChunkSpy: ReturnType<typeof vi.fn>;

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
    onChunkSpy = vi.fn();
  });

  describe("Normal Cases", () => {
    it("should create new session and stream message when no sessionId provided", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageStreamInput = {
        message: "Hello, streaming Claude!",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.session).toBeDefined();
        expect(result.value.session.projectId).toBe(null);
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);

        // Check that onChunk was called with streaming data
        expect(onChunkSpy).toHaveBeenCalled();
        expect(onChunkSpy.mock.calls.length).toBeGreaterThan(0);

        // Messages should not be created automatically for new sessions
        const allMessages = mockMessageRepository.getAll();
        expect(allMessages).toHaveLength(0); // No messages should be created
      }
    });

    it("should use existing session when sessionId provided", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      const session: Session = {
        id: "session-123" as SessionId,
        projectId: project.id,
        name: null,
        cwd: "/tmp",
        lastMessageAt: null,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };

      mockProjectRepository = new MockProjectRepository([project]);
      mockSessionRepository = new MockSessionRepository([session]);
      context.projectRepository = mockProjectRepository;
      context.sessionRepository = mockSessionRepository;

      const input: SendMessageStreamInput = {
        message: "Hello with existing session!",
        sessionId: "session-123",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.session.id).toBe("session-123");
        expect(result.value.messages).toBeDefined();
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });

    it("should stream chunks in correct order", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageStreamInput = {
        message: "Multi word message",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Mock now sends SDKMessages, not text chunks
        const chunks = onChunkSpy.mock.calls.map(
          (call) => call[0] as ChunkData,
        );
        // Find the assistant message
        const assistantMessage = chunks.find(
          (chunk): chunk is Extract<ChunkData, { type: "assistant" }> =>
            chunk.type === "assistant",
        );
        expect(assistantMessage).toBeDefined();
        if (assistantMessage) {
          const content = assistantMessage.message.content[0];
          if (content && typeof content === "object" && "text" in content) {
            expect(content.text).toBe("You said: Multi word message");
          }
        }
      }
    });

    it("should include previous messages as context for streaming", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      const session: Session = {
        id: "session-123" as SessionId,
        projectId: project.id,
        name: null,
        cwd: "/tmp",
        lastMessageAt: null,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      const existingMessages: Message[] = [
        {
          id: "msg-1" as MessageId,
          sessionId: session.id,
          role: "user",
          content: "Previous user message",
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
          sessionId: session.id,
          role: "assistant",
          content: "Previous assistant message",
          timestamp: new Date("2024-01-01T10:01:00Z"),
          rawData: "{}",
          uuid: "test-uuid-2",
          parentUuid: "test-uuid-1",
          cwd: "/tmp",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:01:00Z"),
        },
      ];

      mockProjectRepository = new MockProjectRepository([project]);
      mockSessionRepository = new MockSessionRepository([session]);
      mockMessageRepository = new MockMessageRepository(existingMessages);
      context.projectRepository = mockProjectRepository;
      context.sessionRepository = mockSessionRepository;
      context.messageRepository = mockMessageRepository;

      const input: SendMessageStreamInput = {
        message: "New streaming message with context",
        sessionId: "session-123",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Messages should not be created automatically for existing sessions
        const allMessages = mockMessageRepository.getAll();
        expect(allMessages).toHaveLength(2); // Only the existing messages
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });

    it("should handle Japanese text streaming", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageStreamInput = {
        message: "こんにちは、Claude！",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });

    it("should capture all streamed chunks", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageStreamInput = {
        message: "Test streaming",
        cwd: "/test/workspace",
      };

      const chunks: ChunkData[] = [];
      const chunkCollector = (chunk: ChunkData) => {
        chunks.push(chunk);
      };

      const result = await sendMessageStream(context, input, chunkCollector);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(chunks.length).toBeGreaterThan(0);
        // Find the assistant message in the SDKMessages
        const assistantMessage = chunks.find(
          (chunk): chunk is Extract<ChunkData, { type: "assistant" }> =>
            chunk.type === "assistant",
        );
        expect(assistantMessage).toBeDefined();
        let textContent = "";
        if (assistantMessage) {
          const content = assistantMessage.message.content[0];
          if (content && typeof content === "object" && "text" in content) {
            textContent = content.text || "";
          }
        }
        expect(textContent).toBe("You said: Test streaming");
      }
    });
  });

  describe("Error Cases", () => {
    it("should fail with empty message", async () => {
      const input: SendMessageStreamInput = {
        message: "",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with null message", async () => {
      const input = {
        message: null,
        cwd: "/test/workspace",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail when no cwd provided for new session", async () => {
      const input: SendMessageStreamInput = {
        message: "Hello, streaming Claude!",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should successfully create session with null project when no projects exist", async () => {
      const input: SendMessageStreamInput = {
        message: "Hello, streaming Claude!",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.session).toBeDefined();
        expect(result.value.session.projectId).toBe(null);
        expect(result.value.session.cwd).toBe("/test/workspace");
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
      }
    });

    it("should fail when sessionId provided but session not found", async () => {
      const input: SendMessageStreamInput = {
        message: "Hello, streaming Claude!",
        sessionId: "non-existent-session",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Session not found");
      }
    });

    it("should fail when Claude service streaming returns error", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      mockClaudeService.setShouldFailNext(true);

      const input: SendMessageStreamInput = {
        message: "Hello, streaming Claude!",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Failed to send message to Claude");
      }
    });

    it("should fail with non-string message", async () => {
      const input = {
        message: 123,
        cwd: "/test/workspace",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with empty sessionId", async () => {
      const input: SendMessageStreamInput = {
        message: "Hello, streaming Claude!",
        sessionId: "",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("Boundary Cases", () => {
    it("should handle single character message streaming", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageStreamInput = {
        message: "A",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });

    it("should handle very long message streaming", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const longMessage = "A".repeat(1000);
      const input: SendMessageStreamInput = {
        message: longMessage,
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });

    it("should handle whitespace-only message streaming", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const whitespaceMessage = "   \t   ";
      const input: SendMessageStreamInput = {
        message: whitespaceMessage,
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toBeDefined();
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });

    it("should handle multiline message streaming", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const multilineMessage = "Line 1\nLine 2\nLine 3";
      const input: SendMessageStreamInput = {
        message: multilineMessage,
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });

    it("should handle streaming with no chunk callback invocations on fast responses", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const noOpCallback = () => {};

      const input: SendMessageStreamInput = {
        message: "Fast response test",
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, noOpCallback);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
      }
    });

    it("should handle special characters in streaming message", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const specialMessage = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const input: SendMessageStreamInput = {
        message: specialMessage,
        cwd: "/test/workspace",
      };

      const result = await sendMessageStream(context, input, onChunkSpy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toBeDefined();
        expect(result.value.messages.length).toBeGreaterThan(0);
        expect(onChunkSpy).toHaveBeenCalled();
      }
    });
  });
});
