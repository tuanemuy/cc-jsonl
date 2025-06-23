import { beforeEach, describe, expect, it } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Context } from "@/core/application/context";
import type { Message, MessageId } from "@/core/domain/message/types";
import type { Project, ProjectId } from "@/core/domain/project/types";
import type { Session, SessionId } from "@/core/domain/session/types";
import type { SendMessageInputLocal } from "./sendMessage";
import { sendMessage } from "./sendMessage";

describe("sendMessage", () => {
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
    it("should create new session and send message when no sessionId provided", async () => {
      // Setup project
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageInputLocal = {
        message: "Hello, Claude!",
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.session).toBeDefined();
        expect(result.value.session.projectId).toBe(project.id);
        expect(result.value.userMessage.content).toBe("Hello, Claude!");
        expect(result.value.userMessage.role).toBe("user");
        expect(result.value.assistantMessage.content).toBe(
          "You said: Hello, Claude!",
        );
        expect(result.value.assistantMessage.role).toBe("assistant");

        // Check that messages were created in correct order
        const allMessages = mockMessageRepository.getAll();
        expect(allMessages).toHaveLength(2);
        expect(allMessages[0].role).toBe("user");
        expect(allMessages[1].role).toBe("assistant");
      }
    });

    it("should use existing session when sessionId provided", async () => {
      // Setup project and session
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
        cwd: "/tmp",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };

      mockProjectRepository = new MockProjectRepository([project]);
      mockSessionRepository = new MockSessionRepository([session]);
      context.projectRepository = mockProjectRepository;
      context.sessionRepository = mockSessionRepository;

      const input: SendMessageInputLocal = {
        message: "Hello with existing session!",
        sessionId: "session-123",
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.session.id).toBe("session-123");
        expect(result.value.userMessage.sessionId).toBe("session-123");
        expect(result.value.assistantMessage.sessionId).toBe("session-123");
      }
    });

    it("should include previous messages as context", async () => {
      // Setup project, session, and existing messages
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
        cwd: "/tmp",
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

      const input: SendMessageInputLocal = {
        message: "New message with context",
        sessionId: "session-123",
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should have original 2 messages + 2 new messages
        const allMessages = mockMessageRepository.getAll();
        expect(allMessages).toHaveLength(4);
      }
    });

    it("should handle Japanese text input", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageInputLocal = {
        message: "こんにちは、Claude！",
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe("こんにちは、Claude！");
        expect(result.value.assistantMessage.content).toBe(
          "You said: こんにちは、Claude！",
        );
      }
    });

    it("should handle multiline text input", async () => {
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
      const input: SendMessageInputLocal = {
        message: multilineMessage,
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe(multilineMessage);
        expect(result.value.assistantMessage.content).toBe(
          `You said: ${multilineMessage}`,
        );
      }
    });

    it("should handle special characters in input", async () => {
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
      const input: SendMessageInputLocal = {
        message: specialMessage,
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe(specialMessage);
      }
    });
  });

  describe("Error Cases", () => {
    it("should fail with empty message", async () => {
      const input: SendMessageInputLocal = {
        message: "",
      };

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with null message", async () => {
      const input = {
        message: null,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with non-string message", async () => {
      const input = {
        message: 123,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail when no projects exist and no sessionId provided", async () => {
      const input: SendMessageInputLocal = {
        message: "Hello, Claude!",
      };

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("No projects found");
      }
    });

    it("should fail when sessionId provided but session not found", async () => {
      const input: SendMessageInputLocal = {
        message: "Hello, Claude!",
        sessionId: "non-existent-session",
      };

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Session not found");
      }
    });

    it("should fail when Claude service returns error", async () => {
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

      const input: SendMessageInputLocal = {
        message: "Hello, Claude!",
      };

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Failed to send message to Claude");
      }
    });

    it("should fail with invalid sessionId type", async () => {
      const input = {
        message: "Hello, Claude!",
        sessionId: 123,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with empty sessionId", async () => {
      const input: SendMessageInputLocal = {
        message: "Hello, Claude!",
        sessionId: "",
      };

      const result = await sendMessage(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("Boundary Cases", () => {
    it("should handle single character message", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const input: SendMessageInputLocal = {
        message: "A",
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe("A");
        expect(result.value.assistantMessage.content).toBe("You said: A");
      }
    });

    it("should handle very long message", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const longMessage = "A".repeat(10000);
      const input: SendMessageInputLocal = {
        message: longMessage,
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe(longMessage);
        expect(result.value.assistantMessage.content).toBe(
          `You said: ${longMessage}`,
        );
      }
    });

    it("should handle whitespace-only message", async () => {
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
      const input: SendMessageInputLocal = {
        message: whitespaceMessage,
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe(whitespaceMessage);
      }
    });

    it("should handle message with only line breaks", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const lineBreakMessage = "\n\n\n";
      const input: SendMessageInputLocal = {
        message: lineBreakMessage,
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe(lineBreakMessage);
      }
    });

    it("should handle complex message with mixed content", async () => {
      const project: Project = {
        id: "project-1" as ProjectId,
        name: "Test Project",
        path: "/test/path",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
      };
      mockProjectRepository = new MockProjectRepository([project]);
      context.projectRepository = mockProjectRepository;

      const complexMessage =
        "English text\n日本語\n🎉 Emoji\nCode: `console.log('hello');\nSpecial: !@#$%^&*()";
      const input: SendMessageInputLocal = {
        message: complexMessage,
      };

      const result = await sendMessage(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userMessage.content).toBe(complexMessage);
        expect(result.value.assistantMessage.content).toBe(
          `You said: ${complexMessage}`,
        );
      }
    });
  });
});
