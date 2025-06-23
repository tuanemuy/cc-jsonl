import { beforeEach, describe, expect, it } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Project, ProjectId } from "@/core/domain/project/types";
import type { Context } from "../context";
import type { ListProjectQuery } from "./listProjects";
import { listProjects } from "./listProjects";

describe("listProjects", () => {
  let mockProjectRepository: MockProjectRepository;
  let mockSessionRepository: MockSessionRepository;
  let mockMessageRepository: MockMessageRepository;
  let mockClaudeService: MockClaudeService;
  let context: Context;

  const createTestProject = (
    id: string,
    name: string,
    path: string,
    createdAt: Date = new Date(),
  ): Project => ({
    id: id as ProjectId,
    name,
    path,
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
    it("空のプロジェクト一覧を取得できる", async () => {
      // Arrange
      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("プロジェクト一覧を取得できる", async () => {
      // Arrange
      const projects = [
        createTestProject("1", "Project A", "/path/a", new Date("2024-01-01")),
        createTestProject("2", "Project B", "/path/b", new Date("2024-01-02")),
        createTestProject("3", "Project C", "/path/c", new Date("2024-01-03")),
      ];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
        expect(result.value.count).toBe(3);
        // 新しい順でソートされることを確認
        expect(result.value.items[0].name).toBe("Project C");
        expect(result.value.items[1].name).toBe("Project B");
        expect(result.value.items[2].name).toBe("Project A");
      }
    });

    it("ページネーションが正常に動作する", async () => {
      // Arrange
      const projects = Array.from({ length: 25 }, (_, i) =>
        createTestProject(
          `${i + 1}`,
          `Project ${i + 1}`,
          `/path/${i + 1}`,
          new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
        ),
      );

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      // 1ページ目
      const query1: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result1 = await listProjects(context, query1);

      // Assert
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.items).toHaveLength(10);
        expect(result1.value.count).toBe(25);
        expect(result1.value.items[0].name).toBe("Project 25"); // 最新
      }

      // 2ページ目
      const query2: ListProjectQuery = {
        pagination: { page: 2, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      const result2 = await listProjects(context, query2);

      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value.items).toHaveLength(10);
        expect(result2.value.count).toBe(25);
        expect(result2.value.items[0].name).toBe("Project 15");
      }

      // 3ページ目（最後のページ）
      const query3: ListProjectQuery = {
        pagination: { page: 3, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      const result3 = await listProjects(context, query3);

      expect(result3.isOk()).toBe(true);
      if (result3.isOk()) {
        expect(result3.value.items).toHaveLength(5);
        expect(result3.value.count).toBe(25);
        expect(result3.value.items[0].name).toBe("Project 5");
      }
    });

    it("名前でフィルタリングできる", async () => {
      // Arrange
      const projects = [
        createTestProject(
          "1",
          "React Project",
          "/path/react",
          new Date("2024-01-01"),
        ),
        createTestProject(
          "2",
          "Vue Project",
          "/path/vue",
          new Date("2024-01-02"),
        ),
        createTestProject(
          "3",
          "Angular Project",
          "/path/angular",
          new Date("2024-01-03"),
        ),
        createTestProject(
          "4",
          "React Native App",
          "/path/react-native",
          new Date("2024-01-04"),
        ),
      ];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { name: "React" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items.map((p) => p.name)).toEqual([
          "React Native App",
          "React Project",
        ]);
      }
    });

    it("パスでフィルタリングできる", async () => {
      // Arrange
      const projects = [
        createTestProject(
          "1",
          "Project 1",
          "/home/user/projects/web",
          new Date("2024-01-01"),
        ),
        createTestProject(
          "2",
          "Project 2",
          "/home/user/projects/mobile",
          new Date("2024-01-02"),
        ),
        createTestProject(
          "3",
          "Project 3",
          "/home/admin/projects/web",
          new Date("2024-01-03"),
        ),
        createTestProject(
          "4",
          "Project 4",
          "/var/www/html",
          new Date("2024-01-04"),
        ),
      ];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { path: "/home/user" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items.map((p) => p.name)).toEqual([
          "Project 2",
          "Project 1",
        ]);
      }
    });

    it("名前とパスの両方でフィルタリングできる", async () => {
      // Arrange
      const projects = [
        createTestProject("1", "Web Project", "/home/user/web"),
        createTestProject("2", "Mobile Project", "/home/user/mobile"),
        createTestProject("3", "Web Project", "/home/admin/web"),
        createTestProject("4", "API Project", "/home/user/api"),
      ];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { name: "Web", path: "/home/user" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.count).toBe(1);
        expect(result.value.items[0].name).toBe("Web Project");
        expect(result.value.items[0].path).toBe("/home/user/web");
      }
    });

    it("フィルタにマッチするプロジェクトがない場合は空の結果を返す", async () => {
      // Arrange
      const projects = [
        createTestProject("1", "Project A", "/path/a"),
        createTestProject("2", "Project B", "/path/b"),
      ];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { name: "NonExistent" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("大文字小文字を区別しないフィルタリング", async () => {
      // Arrange
      const projects = [
        createTestProject("1", "React Project", "/Path/React"),
        createTestProject("2", "Vue Project", "/path/vue"),
      ];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { name: "react", path: "path" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].name).toBe("React Project");
      }
    });
  });

  describe("異常系", () => {
    it("無効なページ番号でエラーになる", async () => {
      // Arrange
      const query: ListProjectQuery = {
        pagination: { page: 0, limit: 10, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project query");
      }
    });

    it("無効なリミット値でエラーになる", async () => {
      // Arrange
      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 0, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project query");
      }
    });

    it("負のページ番号でエラーになる", async () => {
      // Arrange
      const query: ListProjectQuery = {
        pagination: {
          page: -1,
          limit: 10,
          order: "desc",
          orderBy: "createdAt",
        },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project query");
      }
    });

    it("負のリミット値でエラーになる", async () => {
      // Arrange
      const query: ListProjectQuery = {
        pagination: { page: 1, limit: -1, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project query");
      }
    });

    it("paginationが未定義ではエラーになる", async () => {
      // Arrange
      const query = {} as ListProjectQuery;

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project query");
      }
    });

    it("不正な型のフィルタでエラーになる", async () => {
      // Arrange
      const query = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { name: 123 },
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project query");
      }
    });
  });

  describe("境界値テスト", () => {
    it("最大ページサイズでプロジェクト一覧を取得できる", async () => {
      // Arrange
      const projects = Array.from({ length: 5 }, (_, i) =>
        createTestProject(`${i + 1}`, `Project ${i + 1}`, `/path/${i + 1}`),
      );

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: {
          page: 1,
          limit: 100,
          order: "desc",
          orderBy: "createdAt",
        },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(5);
        expect(result.value.count).toBe(5);
      }
    });

    it("最小ページサイズでプロジェクト一覧を取得できる", async () => {
      // Arrange
      const projects = Array.from({ length: 5 }, (_, i) =>
        createTestProject(`${i + 1}`, `Project ${i + 1}`, `/path/${i + 1}`),
      );

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 1, order: "desc", orderBy: "createdAt" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.count).toBe(5);
      }
    });

    it("存在しないページを指定した場合は空の結果を返す", async () => {
      // Arrange
      const projects = [createTestProject("1", "Project 1", "/path/1")];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: {
          page: 999,
          limit: 10,
          order: "desc",
          orderBy: "createdAt",
        },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(1); // 総数は変わらず
      }
    });

    it("空文字のフィルタは無効として扱われる", async () => {
      // Arrange
      const projects = [
        createTestProject("1", "Project A", "/path/a"),
        createTestProject("2", "Project B", "/path/b"),
      ];

      const mockRepo = new MockProjectRepository(projects);
      context.projectRepository = mockRepo;

      const query: ListProjectQuery = {
        pagination: { page: 1, limit: 10, order: "desc", orderBy: "createdAt" },
        filter: { name: "", path: "" },
      };

      // Act
      const result = await listProjects(context, query);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
      }
    });
  });
});
