import { err } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { ProjectId, SessionId } from "@/core/domain/session/types";
import { RepositoryError } from "@/lib/error";
import type { Context } from "../context";
import type { CreateSessionInput } from "./createSession";
import { createSession } from "./createSession";

describe("createSession", () => {
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

  describe("正常系", () => {
    it("プロジェクトIDを指定してセッションを作成できる", async () => {
      // Arrange
      const input: CreateSessionInput = {
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.projectId).toBe("test-project-id");
        expect(session.id).toBeDefined();
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("セッションIDを指定してセッションを作成できる", async () => {
      // Arrange
      const input: CreateSessionInput = {
        id: "custom-session-id" as SessionId,
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.id).toBe("custom-session-id");
        expect(session.projectId).toBe("test-project-id");
      }
    });

    it("セッションIDを指定しない場合は自動生成される", async () => {
      // Arrange
      const input: CreateSessionInput = {
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const session = result.value;
        expect(session.id).toBeDefined();
        expect(typeof session.id).toBe("string");
        expect(session.id.length).toBeGreaterThan(0);
      }
    });

    it("UUIDのプロジェクトIDでセッションを作成できる", async () => {
      // Arrange
      const projectId = "550e8400-e29b-41d4-a716-446655440000";
      const input: CreateSessionInput = {
        projectId: projectId as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projectId).toBe(projectId);
      }
    });

    it("UUIDのセッションIDでセッションを作成できる", async () => {
      // Arrange
      const sessionId = "550e8400-e29b-41d4-a716-446655440001";
      const input: CreateSessionInput = {
        id: sessionId as SessionId,
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(sessionId);
      }
    });

    it("特殊文字を含むIDでセッションを作成できる", async () => {
      // Arrange
      const sessionId = "session-with-special_chars@123";
      const projectId = "project-with-special_chars@456";
      const input: CreateSessionInput = {
        id: sessionId as SessionId,
        projectId: projectId as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(sessionId);
        expect(result.value.projectId).toBe(projectId);
      }
    });

    it("複数のセッションを異なるプロジェクトで作成できる", async () => {
      // Arrange
      const input1: CreateSessionInput = {
        projectId: "project-1" as ProjectId,
        name: "Test Session 1",
        cwd: "/tmp",
      };
      const input2: CreateSessionInput = {
        projectId: "project-2" as ProjectId,
        name: "Test Session 2",
        cwd: "/tmp",
      };

      // Act
      const result1 = await createSession(context, input1);
      const result2 = await createSession(context, input2);

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.projectId).toBe("project-1");
        expect(result2.value.projectId).toBe("project-2");
        expect(result1.value.id).not.toBe(result2.value.id);
      }
    });

    it("同じプロジェクトで複数のセッションを作成できる", async () => {
      // Arrange
      const projectId = "shared-project" as ProjectId;
      const input1: CreateSessionInput = {
        projectId,
        name: "Test Session 1",
        cwd: "/tmp",
      };
      const input2: CreateSessionInput = {
        projectId,
        name: "Test Session 2",
        cwd: "/tmp",
      };

      // Act
      const result1 = await createSession(context, input1);
      const result2 = await createSession(context, input2);

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.projectId).toBe(projectId);
        expect(result2.value.projectId).toBe(projectId);
        expect(result1.value.id).not.toBe(result2.value.id);
      }
    });
  });

  describe("異常系", () => {
    it("プロジェクトIDが未定義ではセッションを作成できない", async () => {
      // Arrange
      const input = {} as CreateSessionInput;

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("プロジェクトIDがnullではセッションを作成できない", async () => {
      // Arrange
      const input = {
        projectId: null,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("プロジェクトIDが数値型ではセッションを作成できない", async () => {
      // Arrange
      const input = {
        projectId: 123,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("プロジェクトIDが空文字ではセッションを作成できない", async () => {
      // Arrange
      const input: CreateSessionInput = {
        projectId: "" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("セッションIDがnullではセッションを作成できない", async () => {
      // Arrange
      const input = {
        id: null,
        projectId: "test-project-id" as ProjectId,
        cwd: "/tmp",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("セッションIDが数値型ではセッションを作成できない", async () => {
      // Arrange
      const input = {
        id: 123,
        projectId: "test-project-id" as ProjectId,
        cwd: "/tmp",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("セッションIDが空文字ではセッションを作成できない", async () => {
      // Arrange
      const input: CreateSessionInput = {
        id: "" as SessionId,
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("同一のセッションIDが既に存在する場合は更新される", async () => {
      // Arrange
      const duplicateId = "duplicate-session-id" as SessionId;
      const input1: CreateSessionInput = {
        id: duplicateId,
        projectId: "project-1" as ProjectId,
        name: "Test Session 1",
        cwd: "/tmp",
      };
      const input2: CreateSessionInput = {
        id: duplicateId,
        projectId: "project-2" as ProjectId,
        name: "Test Session 2",
        cwd: "/updated/path",
      };

      // 最初のセッションを作成
      const firstResult = await createSession(context, input1);
      expect(firstResult.isOk()).toBe(true);

      // Act
      const result = await createSession(context, input2);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk() && firstResult.isOk()) {
        expect(result.value.id).toBe(duplicateId);
        expect(result.value.projectId).toBe("project-2");
        expect(result.value.cwd).toBe("/updated/path");
        expect(result.value.id).toBe(firstResult.value.id); // Same ID, updated content
      }
    });

    it("プロジェクトIDがオブジェクトではセッションを作成できない", async () => {
      // Arrange
      const input = {
        projectId: {},
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("セッションIDがオブジェクトではセッションを作成できない", async () => {
      // Arrange
      const input = {
        id: {},
        projectId: "test-project-id" as ProjectId,
        cwd: "/tmp",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("リポジトリエラーが発生した場合はアプリケーションエラーでラップされる", async () => {
      // Arrange
      const input: CreateSessionInput = {
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Mock the repository to throw an error
      const originalCreate = context.sessionRepository.create;
      context.sessionRepository.create = vi
        .fn()
        .mockResolvedValue(err(new RepositoryError("Mock repository error")));

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Failed to create session");
        expect(result.error.cause).toBeDefined();
      }

      // Restore original method
      context.sessionRepository.create = originalCreate;
    });
  });

  describe("境界値テスト", () => {
    it("1文字のプロジェクトIDでセッションを作成できる", async () => {
      // Arrange
      const input: CreateSessionInput = {
        projectId: "a" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projectId).toBe("a");
      }
    });

    it("1文字のセッションIDでセッションを作成できる", async () => {
      // Arrange
      const input: CreateSessionInput = {
        id: "b" as SessionId,
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe("b");
      }
    });

    it("長いプロジェクトIDでセッションを作成できる", async () => {
      // Arrange
      const longProjectId = "a".repeat(1000);
      const input: CreateSessionInput = {
        projectId: longProjectId as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.projectId).toBe(longProjectId);
      }
    });

    it("長いセッションIDでセッションを作成できる", async () => {
      // Arrange
      const longSessionId = "s".repeat(1000);
      const input: CreateSessionInput = {
        id: longSessionId as SessionId,
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(longSessionId);
      }
    });

    it("スペースのみのプロジェクトIDではセッションを作成できない", async () => {
      // Arrange
      const input: CreateSessionInput = {
        projectId: "   " as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("スペースのみのセッションIDではセッションを作成できない", async () => {
      // Arrange
      const input: CreateSessionInput = {
        id: "   " as SessionId,
        projectId: "test-project-id" as ProjectId,
        name: "Test Session",
        cwd: "/tmp",
      };

      // Act
      const result = await createSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });
  });
});
