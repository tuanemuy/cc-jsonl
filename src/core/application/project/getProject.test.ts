import { describe, it, expect, beforeEach } from "vitest";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { getProject, getProjectByPath } from "./getProject";
import type { Context } from "../context";
import type { GetProjectInput } from "./getProject";
import type { Project, ProjectId } from "@/core/domain/project/types";

describe("getProject", () => {
  let mockProjectRepository: MockProjectRepository;
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
    context = {
      projectRepository: mockProjectRepository,
      sessionRepository: {} as any,
      messageRepository: {} as any,
      claudeService: {} as any,
    };
  });

  describe("getProject", () => {
    describe("正常系", () => {
      it("既存のプロジェクトを取得できる", async () => {
        // Arrange
        const existingProject = createTestProject("test-id", "Test Project", "/test/path");
        const mockRepo = new MockProjectRepository([existingProject]);
        context.projectRepository = mockRepo;

        const input: GetProjectInput = {
          id: "test-id" as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(existingProject);
        }
      });

      it("存在しないプロジェクトの場合はnullを返す", async () => {
        // Arrange
        const input: GetProjectInput = {
          id: "non-existent-id" as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBeNull();
        }
      });

      it("複数のプロジェクトがある中から正しいプロジェクトを取得できる", async () => {
        // Arrange
        const projects = [
          createTestProject("project-1", "Project 1", "/path/1"),
          createTestProject("project-2", "Project 2", "/path/2"),
          createTestProject("project-3", "Project 3", "/path/3"),
        ];
        const mockRepo = new MockProjectRepository(projects);
        context.projectRepository = mockRepo;

        const input: GetProjectInput = {
          id: "project-2" as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.name).toBe("Project 2");
          expect(result.value?.path).toBe("/path/2");
        }
      });

      it("UUIDのプロジェクトIDでプロジェクトを取得できる", async () => {
        // Arrange
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        const project = createTestProject(uuid, "UUID Project", "/uuid/path");
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        const input: GetProjectInput = {
          id: uuid as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.id).toBe(uuid);
        }
      });

      it("特殊文字を含むプロジェクトIDでプロジェクトを取得できる", async () => {
        // Arrange
        const specialId = "project-with-special-chars_123@example";
        const project = createTestProject(specialId, "Special Project", "/special/path");
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        const input: GetProjectInput = {
          id: specialId as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.id).toBe(specialId);
        }
      });
    });

    describe("異常系", () => {
      it("idが未定義ではエラーになる", async () => {
        // Arrange
        const input = {} as GetProjectInput;

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe("Invalid project input");
        }
      });

      it("idがnullではエラーになる", async () => {
        // Arrange
        const input = { id: null } as any;

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe("Invalid project input");
        }
      });

      it("idが数値型ではエラーになる", async () => {
        // Arrange
        const input = { id: 123 } as any;

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe("Invalid project input");
        }
      });

      it("idが空文字ではエラーになる", async () => {
        // Arrange
        const input: GetProjectInput = {
          id: "" as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe("Invalid project input");
        }
      });

      it("idがオブジェクトではエラーになる", async () => {
        // Arrange
        const input = { id: {} } as any;

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe("Invalid project input");
        }
      });

      it("idが配列ではエラーになる", async () => {
        // Arrange
        const input = { id: [] } as any;

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe("Invalid project input");
        }
      });
    });

    describe("境界値テスト", () => {
      it("最小文字数のIDでプロジェクトを取得できる", async () => {
        // Arrange
        const project = createTestProject("a", "Single Char ID Project", "/single/path");
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        const input: GetProjectInput = {
          id: "a" as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.id).toBe("a");
        }
      });

      it("長いIDでプロジェクトを取得できる", async () => {
        // Arrange
        const longId = "a".repeat(1000);
        const project = createTestProject(longId, "Long ID Project", "/long/path");
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        const input: GetProjectInput = {
          id: longId as ProjectId,
        };

        // Act
        const result = await getProject(context, input);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.id).toBe(longId);
        }
      });
    });
  });

  describe("getProjectByPath", () => {
    describe("正常系", () => {
      it("既存のパスでプロジェクトを取得できる", async () => {
        // Arrange
        const existingProject = createTestProject("test-id", "Test Project", "/test/path");
        const mockRepo = new MockProjectRepository([existingProject]);
        context.projectRepository = mockRepo;

        const path = "/test/path";

        // Act
        const result = await getProjectByPath(context, path);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(existingProject);
        }
      });

      it("存在しないパスの場合はnullを返す", async () => {
        // Arrange
        const path = "/non/existent/path";

        // Act
        const result = await getProjectByPath(context, path);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBeNull();
        }
      });

      it("複数のプロジェクトがある中から正しいプロジェクトを取得できる", async () => {
        // Arrange
        const projects = [
          createTestProject("project-1", "Project 1", "/path/1"),
          createTestProject("project-2", "Project 2", "/path/2"),
          createTestProject("project-3", "Project 3", "/path/3"),
        ];
        const mockRepo = new MockProjectRepository(projects);
        context.projectRepository = mockRepo;

        const path = "/path/2";

        // Act
        const result = await getProjectByPath(context, path);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.name).toBe("Project 2");
          expect(result.value?.id).toBe("project-2");
        }
      });

      it("絶対パスでプロジェクトを取得できる", async () => {
        // Arrange
        const absolutePath = "/home/user/projects/my-app";
        const project = createTestProject("abs-id", "Absolute Path Project", absolutePath);
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        // Act
        const result = await getProjectByPath(context, absolutePath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.path).toBe(absolutePath);
        }
      });

      it("相対パスでプロジェクトを取得できる", async () => {
        // Arrange
        const relativePath = "./relative/path";
        const project = createTestProject("rel-id", "Relative Path Project", relativePath);
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        // Act
        const result = await getProjectByPath(context, relativePath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.path).toBe(relativePath);
        }
      });

      it("特殊文字を含むパスでプロジェクトを取得できる", async () => {
        // Arrange
        const specialPath = "/path/with-special_chars@123/project";
        const project = createTestProject("special-id", "Special Path Project", specialPath);
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        // Act
        const result = await getProjectByPath(context, specialPath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.path).toBe(specialPath);
        }
      });

      it("スペースを含むパスでプロジェクトを取得できる", async () => {
        // Arrange
        const spacePath = "/path/with spaces/project";
        const project = createTestProject("space-id", "Space Path Project", spacePath);
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        // Act
        const result = await getProjectByPath(context, spacePath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.path).toBe(spacePath);
        }
      });

      it("日本語を含むパスでプロジェクトを取得できる", async () => {
        // Arrange
        const japanesePath = "/パス/日本語/プロジェクト";
        const project = createTestProject("jp-id", "Japanese Path Project", japanesePath);
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        // Act
        const result = await getProjectByPath(context, japanesePath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.path).toBe(japanesePath);
        }
      });
    });

    describe("境界値テスト", () => {
      it("最短パスでプロジェクトを取得できる", async () => {
        // Arrange
        const shortPath = "/";
        const project = createTestProject("root-id", "Root Project", shortPath);
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        // Act
        const result = await getProjectByPath(context, shortPath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.path).toBe(shortPath);
        }
      });

      it("長いパスでプロジェクトを取得できる", async () => {
        // Arrange
        const longPath = "/" + "very-long-directory-name/".repeat(50) + "project";
        const project = createTestProject("long-id", "Long Path Project", longPath);
        const mockRepo = new MockProjectRepository([project]);
        context.projectRepository = mockRepo;

        // Act
        const result = await getProjectByPath(context, longPath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value?.path).toBe(longPath);
        }
      });

      it("空文字のパスでは何も取得できない", async () => {
        // Arrange
        const projects = [
          createTestProject("test-id", "Test Project", "/test/path"),
        ];
        const mockRepo = new MockProjectRepository(projects);
        context.projectRepository = mockRepo;

        const emptyPath = "";

        // Act
        const result = await getProjectByPath(context, emptyPath);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBeNull();
        }
      });
    });
  });
});