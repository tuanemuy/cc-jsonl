import { err } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import { RepositoryError } from "@/lib/error";
import type { Context } from "../context";
import type { CreateProjectInput } from "./createProject";
import { createProject } from "./createProject";

describe("createProject", () => {
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
    it("有効な入力でプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "Test Project",
        path: "/path/to/project",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const project = result.value;
        expect(project.name).toBe("Test Project");
        expect(project.path).toBe("/path/to/project");
        expect(project.id).toBeDefined();
        expect(project.createdAt).toBeInstanceOf(Date);
        expect(project.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("最小文字数の名前でプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "A",
        path: "/path",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it("日本語の名前でプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "テストプロジェクト",
        path: "/path/to/japanese-project",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe("テストプロジェクト");
      }
    });

    it("特殊文字を含む名前でプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "Test-Project_123@example",
        path: "/path/to/special-project",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe("Test-Project_123@example");
      }
    });

    it("絶対パスでプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "Absolute Path Project",
        path: "/home/user/projects/test",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.path).toBe("/home/user/projects/test");
      }
    });

    it("相対パスでプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "Relative Path Project",
        path: "./relative/path",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.path).toBe("./relative/path");
      }
    });
  });

  describe("異常系", () => {
    it("空文字の名前ではプロジェクトを作成できない", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "",
        path: "/path/to/project",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("空文字のパスではプロジェクトを作成できない", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "Test Project",
        path: "",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("nameが未定義ではプロジェクトを作成できない", async () => {
      // Arrange
      const input = {
        path: "/path/to/project",
      } as CreateProjectInput;

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("pathが未定義ではプロジェクトを作成できない", async () => {
      // Arrange
      const input = {
        name: "Test Project",
      } as CreateProjectInput;

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("nameがnullではプロジェクトを作成できない", async () => {
      // Arrange
      const input = {
        name: null,
        path: "/path/to/project",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("pathがnullではプロジェクトを作成できない", async () => {
      // Arrange
      const input = {
        name: "Test Project",
        path: null,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("nameが数値型ではプロジェクトを作成できない", async () => {
      // Arrange
      const input = {
        name: 123,
        path: "/path/to/project",
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("pathが数値型ではプロジェクトを作成できない", async () => {
      // Arrange
      const input = {
        name: "Test Project",
        path: 123,
        // biome-ignore lint/suspicious/noExplicitAny: Testing type validation
      } as any;

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("同一名前のプロジェクトが既に存在する場合はパスが更新される", async () => {
      // Arrange
      const existingInput: CreateProjectInput = {
        name: "Duplicate Project",
        path: "/original/path",
      };

      const duplicateInput: CreateProjectInput = {
        name: "Duplicate Project",
        path: "/updated/path",
      };

      // 既存プロジェクトを作成
      const existingResult = await createProject(context, existingInput);
      expect(existingResult.isOk()).toBe(true);

      // Act
      const result = await createProject(context, duplicateInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk() && existingResult.isOk()) {
        expect(result.value.name).toBe("Duplicate Project");
        expect(result.value.path).toBe("/updated/path");
        expect(result.value.id).toBe(existingResult.value.id); // Same ID, updated path
      }
    });

    it("異なる名前で同じパスのプロジェクトを作成できる", async () => {
      // Arrange
      const firstInput: CreateProjectInput = {
        name: "First Project",
        path: "/shared/path",
      };

      const secondInput: CreateProjectInput = {
        name: "Second Project",
        path: "/shared/path",
      };

      // 最初のプロジェクトを作成
      const firstResult = await createProject(context, firstInput);
      expect(firstResult.isOk()).toBe(true);

      // Act
      const result = await createProject(context, secondInput);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk() && firstResult.isOk()) {
        expect(result.value.name).toBe("Second Project");
        expect(result.value.path).toBe("/shared/path");
        expect(result.value.id).not.toBe(firstResult.value.id); // Different ID, new project
      }
    });

    it("リポジトリエラーが発生した場合はアプリケーションエラーでラップされる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "Test Project",
        path: "/path/to/project",
      };

      // Mock the repository to throw an error
      const originalUpsert = context.projectRepository.upsert;
      context.projectRepository.upsert = vi
        .fn()
        .mockResolvedValue(err(new RepositoryError("Mock repository error")));

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Failed to create project");
        expect(result.error.cause).toBeDefined();
      }

      // Restore original method
      context.projectRepository.upsert = originalUpsert;
    });
  });

  describe("境界値テスト", () => {
    it("1文字の名前でプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "a",
        path: "/a",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it("長い名前でプロジェクトを作成できる", async () => {
      // Arrange
      const longName = "a".repeat(1000);
      const input: CreateProjectInput = {
        name: longName,
        path: "/long/path",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(longName);
      }
    });

    it("長いパスでプロジェクトを作成できる", async () => {
      // Arrange
      const longPath = `/very/${"long/".repeat(100)}path`;
      const input: CreateProjectInput = {
        name: "Long Path Project",
        path: longPath,
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.path).toBe(longPath);
      }
    });

    it("スペースのみの名前ではプロジェクトを作成できない", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "   ",
        path: "/path/to/project",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid project input");
      }
    });

    it("改行を含む名前でプロジェクトを作成できる", async () => {
      // Arrange
      const input: CreateProjectInput = {
        name: "Multi\nLine\nProject",
        path: "/multiline/path",
      };

      // Act
      const result = await createProject(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe("Multi\nLine\nProject");
      }
    });
  });
});
