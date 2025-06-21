import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { ProjectId } from "@/core/domain/project/types";
import type { Session, SessionId } from "@/core/domain/session/types";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getSession } from "./getSession";
import type { GetSessionInput } from "./getSession";

describe("getSession", () => {
  let mockProjectRepository: MockProjectRepository;
  let mockSessionRepository: MockSessionRepository;
  let mockMessageRepository: MockMessageRepository;
  let mockClaudeService: MockClaudeService;
  let context: Context;

  const createTestSession = (
    id: string,
    projectId: string,
    createdAt: Date = new Date(),
  ): Session => ({
    id: id as SessionId,
    projectId: projectId as ProjectId,
    cwd: "/tmp",
    createdAt,
    updatedAt: createdAt,
  });

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
    it("既存のセッションを取得できる", async () => {
      // Arrange
      const existingSession = createTestSession(
        "test-session-id",
        "test-project-id",
      );
      const mockRepo = new MockSessionRepository([existingSession]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: "test-session-id",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(existingSession);
      }
    });

    it("存在しないセッションの場合はnullを返す", async () => {
      // Arrange
      const input: GetSessionInput = {
        id: "non-existent-session-id",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it("複数のセッションがある中から正しいセッションを取得できる", async () => {
      // Arrange
      const sessions = [
        createTestSession("session-1", "project-1"),
        createTestSession("session-2", "project-2"),
        createTestSession("session-3", "project-3"),
      ];
      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: "session-2",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe("session-2");
        expect(result.value?.projectId).toBe("project-2");
      }
    });

    it("UUIDのセッションIDでセッションを取得できる", async () => {
      // Arrange
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const session = createTestSession(uuid, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: uuid,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(uuid);
      }
    });

    it("特殊文字を含むセッションIDでセッションを取得できる", async () => {
      // Arrange
      const specialId = "session-with-special-chars_123@example";
      const session = createTestSession(specialId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: specialId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(specialId);
      }
    });

    it("数値のみのセッションIDでセッションを取得できる", async () => {
      // Arrange
      const numericId = "123456789";
      const session = createTestSession(numericId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: numericId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(numericId);
      }
    });

    it("ハイフンを含むセッションIDでセッションを取得できる", async () => {
      // Arrange
      const hyphenId = "session-with-hyphens-123";
      const session = createTestSession(hyphenId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: hyphenId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(hyphenId);
      }
    });

    it("アンダースコアを含むセッションIDでセッションを取得できる", async () => {
      // Arrange
      const underscoreId = "session_with_underscores_123";
      const session = createTestSession(underscoreId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: underscoreId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(underscoreId);
      }
    });
  });

  describe("異常系", () => {
    it("idが未定義ではエラーになる", async () => {
      // Arrange
      const input = {} as GetSessionInput;

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("idがnullではエラーになる", async () => {
      // Arrange
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: null } as any;

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("idが数値型ではエラーになる", async () => {
      // Arrange
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: 123 } as any;

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("idが空文字ではエラーになる", async () => {
      // Arrange
      const input: GetSessionInput = {
        id: "",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("idがオブジェクトではエラーになる", async () => {
      // Arrange
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: {} } as any;

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("idが配列ではエラーになる", async () => {
      // Arrange
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: [] } as any;

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("idがbooleanではエラーになる", async () => {
      // Arrange
      // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      const input = { id: true } as any;

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("スペースのみのidではエラーになる", async () => {
      // Arrange
      const input: GetSessionInput = {
        id: "   ",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("タブのみのidではエラーになる", async () => {
      // Arrange
      const input: GetSessionInput = {
        id: "\t\t\t",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });

    it("改行のみのidではエラーになる", async () => {
      // Arrange
      const input: GetSessionInput = {
        id: "\n\n\n",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session input");
      }
    });
  });

  describe("境界値テスト", () => {
    it("最小文字数（1文字）のIDでセッションを取得できる", async () => {
      // Arrange
      const session = createTestSession("a", "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: "a",
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe("a");
      }
    });

    it("長いIDでセッションを取得できる", async () => {
      // Arrange
      const longId = "a".repeat(1000);
      const session = createTestSession(longId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: longId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(longId);
      }
    });

    it("大文字小文字を含むIDでセッションを取得できる", async () => {
      // Arrange
      const mixedCaseId = "MixedCaseSessionId123";
      const session = createTestSession(mixedCaseId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: mixedCaseId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(mixedCaseId);
      }
    });

    it("日本語を含むIDでセッションを取得できる", async () => {
      // Arrange
      const japaneseId = "セッション-123-テスト";
      const session = createTestSession(japaneseId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: japaneseId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(japaneseId);
      }
    });

    it("記号を含むIDでセッションを取得できる", async () => {
      // Arrange
      const symbolId = "session!@#$%^&*()+={}[]|\\:;\"'<>?,./";
      const session = createTestSession(symbolId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: symbolId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(symbolId);
      }
    });

    it("先頭と末尾にスペースを含むIDでセッションを取得できる", async () => {
      // Arrange
      const spacedId = " session-with-spaces ";
      const session = createTestSession(spacedId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: spacedId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(spacedId);
      }
    });

    it("途中にスペースを含むIDでセッションを取得できる", async () => {
      // Arrange
      const spacedId = "session with spaces";
      const session = createTestSession(spacedId, "test-project-id");
      const mockRepo = new MockSessionRepository([session]);
      context.sessionRepository = mockRepo;

      const input: GetSessionInput = {
        id: spacedId,
      };

      // Act
      const result = await getSession(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(spacedId);
      }
    });
  });
});
