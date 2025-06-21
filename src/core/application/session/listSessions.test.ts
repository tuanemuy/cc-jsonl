import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { ProjectId } from "@/core/domain/project/types";
import type { Session, SessionId } from "@/core/domain/session/types";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { listSessions } from "./listSessions";
import type { ListSessionQuery } from "./listSessions";

describe("listSessions", () => {
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
    it("空のセッション一覧を取得できる", async () => {
      // Arrange
      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("セッション一覧を取得できる", async () => {
      // Arrange
      const sessions = [
        createTestSession("session-1", "project-1", new Date("2024-01-01")),
        createTestSession("session-2", "project-2", new Date("2024-01-02")),
        createTestSession("session-3", "project-1", new Date("2024-01-03")),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
        expect(result.value.count).toBe(3);
        // 新しい順でソートされることを確認
        expect(result.value.items[0].id).toBe("session-3");
        expect(result.value.items[1].id).toBe("session-2");
        expect(result.value.items[2].id).toBe("session-1");
      }
    });

    it("ページネーションが正常に動作する", async () => {
      // Arrange
      const sessions = Array.from({ length: 25 }, (_, i) =>
        createTestSession(
          `session-${i + 1}`,
          `project-${i + 1}`,
          new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
        ),
      );

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      // 1ページ目
      const query1: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result1 = await listSessions(context, query1);

      // Assert
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.items).toHaveLength(10);
        expect(result1.value.count).toBe(25);
        expect(result1.value.items[0].id).toBe("session-25"); // 最新
      }

      // 2ページ目
      const query2: ListSessionQuery = {
        pagination: { page: 2, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      const result2 = await listSessions(context, query2);

      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value.items).toHaveLength(10);
        expect(result2.value.count).toBe(25);
        expect(result2.value.items[0].id).toBe("session-15");
      }

      // 3ページ目（最後のページ）
      const query3: ListSessionQuery = {
        pagination: { page: 3, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      const result3 = await listSessions(context, query3);

      expect(result3.isOk()).toBe(true);
      if (result3.isOk()) {
        expect(result3.value.items).toHaveLength(5);
        expect(result3.value.count).toBe(25);
        expect(result3.value.items[0].id).toBe("session-5");
      }
    });

    it("プロジェクトIDでフィルタリングできる", async () => {
      // Arrange
      const sessions = [
        createTestSession("session-1", "project-a", new Date("2024-01-01")),
        createTestSession("session-2", "project-b", new Date("2024-01-02")),
        createTestSession("session-3", "project-a", new Date("2024-01-03")),
        createTestSession("session-4", "project-c", new Date("2024-01-04")),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: "project-a" as ProjectId },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items.map((s) => s.id)).toEqual([
          "session-3",
          "session-1",
        ]);
        expect(
          result.value.items.every((s) => s.projectId === "project-a"),
        ).toBe(true);
      }
    });

    it("フィルタにマッチするセッションがない場合は空の結果を返す", async () => {
      // Arrange
      const sessions = [
        createTestSession("session-1", "project-a"),
        createTestSession("session-2", "project-b"),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: "non-existent-project" as ProjectId },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("フィルタなしで全セッションを取得できる", async () => {
      // Arrange
      const sessions = [
        createTestSession("session-1", "project-a"),
        createTestSession("session-2", "project-b"),
        createTestSession("session-3", "project-c"),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
        expect(result.value.count).toBe(3);
      }
    });

    it("空のフィルタオブジェクトで全セッションを取得できる", async () => {
      // Arrange
      const sessions = [
        createTestSession("session-1", "project-a"),
        createTestSession("session-2", "project-b"),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: {},
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
      }
    });

    it("UUIDのプロジェクトIDでフィルタリングできる", async () => {
      // Arrange
      const uuidProjectId = "550e8400-e29b-41d4-a716-446655440000";
      const sessions = [
        createTestSession("session-1", uuidProjectId),
        createTestSession("session-2", "other-project"),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: uuidProjectId as ProjectId },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].projectId).toBe(uuidProjectId);
      }
    });
  });

  describe("異常系", () => {
    it("無効なページ番号でエラーになる", async () => {
      // Arrange
      const query: ListSessionQuery = {
        pagination: { page: 0, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });

    it("無効なリミット値でエラーになる", async () => {
      // Arrange
      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 0, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });

    it("負のページ番号でエラーになる", async () => {
      // Arrange
      const query: ListSessionQuery = {
        pagination: {
          page: -1,
          limit: 10,
          order: "desc",
          orderBy: "createdAt",
        },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });

    it("負のリミット値でエラーになる", async () => {
      // Arrange
      const query: ListSessionQuery = {
        pagination: { page: 1, limit: -1, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });

    it("paginationが未定義ではエラーになる", async () => {
      // Arrange
      const query = {} as ListSessionQuery;

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });

    it("不正な型のフィルタでエラーになる", async () => {
      // Arrange
      const query = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: 123 },
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });

    it("空文字のプロジェクトIDでエラーになる", async () => {
      // Arrange
      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: "" as ProjectId },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });

    it("nullのプロジェクトIDでエラーになる", async () => {
      // Arrange
      const query = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: null },
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid session query");
      }
    });
  });

  describe("境界値テスト", () => {
    it("最大ページサイズでセッション一覧を取得できる", async () => {
      // Arrange
      const sessions = Array.from({ length: 5 }, (_, i) =>
        createTestSession(`session-${i + 1}`, `project-${i + 1}`),
      );

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: {
          page: 1,
          limit: 100,
          order: "desc",
          orderBy: "createdAt",
        },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(5);
        expect(result.value.count).toBe(5);
      }
    });

    it("最小ページサイズでセッション一覧を取得できる", async () => {
      // Arrange
      const sessions = Array.from({ length: 5 }, (_, i) =>
        createTestSession(`session-${i + 1}`, `project-${i + 1}`),
      );

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 1, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.count).toBe(5);
      }
    });

    it("存在しないページを指定した場合は空の結果を返す", async () => {
      // Arrange
      const sessions = [createTestSession("session-1", "project-1")];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: {
          page: 999,
          limit: 10,
          order: "desc",
          orderBy: "createdAt",
        },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(1); // 総数は変わらず
      }
    });

    it("1文字のプロジェクトIDでフィルタリングできる", async () => {
      // Arrange
      const sessions = [
        createTestSession("session-1", "a"),
        createTestSession("session-2", "b"),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: "a" as ProjectId },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].projectId).toBe("a");
      }
    });

    it("長いプロジェクトIDでフィルタリングできる", async () => {
      // Arrange
      const longProjectId = "p".repeat(1000);
      const sessions = [
        createTestSession("session-1", longProjectId),
        createTestSession("session-2", "short-project"),
      ];

      const mockRepo = new MockSessionRepository(sessions);
      context.sessionRepository = mockRepo;

      const query: ListSessionQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { projectId: longProjectId as ProjectId },
      };

      // Act
      const result = await listSessions(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].projectId).toBe(longProjectId);
      }
    });
  });
});
