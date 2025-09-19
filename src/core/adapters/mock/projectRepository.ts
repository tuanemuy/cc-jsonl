import { err, ok, type Result } from "neverthrow";
import type { ProjectRepository } from "@/core/domain/project/ports/projectRepository";
import type {
  CreateProjectParams,
  ListProjectQuery,
  Project,
  ProjectId,
  UpdateProjectParams,
} from "@/core/domain/project/types";
import { RepositoryError } from "@/lib/error";

export class MockProjectRepository implements ProjectRepository {
  private projects: Map<ProjectId, Project> = new Map();
  private nextId = 1;
  private shouldFailList = false;
  private shouldFailUpsert = false;

  constructor(initialProjects: Project[] = []) {
    for (const project of initialProjects) {
      this.projects.set(project.id, project);
    }
  }

  async upsert(
    params: CreateProjectParams,
  ): Promise<Result<Project, RepositoryError>> {
    if (this.shouldFailUpsert) {
      return err(new RepositoryError("Mock repository upsert failure"));
    }

    // Check if project with same name already exists
    const existingProject = Array.from(this.projects.values()).find(
      (project) => project.name === params.name,
    );

    if (existingProject) {
      // Update existing project
      const updatedProject: Project = {
        ...existingProject,
        path: params.path,
        updatedAt: new Date(),
      };

      this.projects.set(existingProject.id, updatedProject);
      return ok(updatedProject);
    }

    // Create new project
    const now = new Date();
    const project: Project = {
      id: `project-${this.nextId++}` as ProjectId,
      name: params.name,
      path: params.path,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(project.id, project);
    return ok(project);
  }

  async findById(
    id: ProjectId,
  ): Promise<Result<Project | null, RepositoryError>> {
    const project = this.projects.get(id);
    return ok(project || null);
  }

  async findByPath(
    path: string,
  ): Promise<Result<Project | null, RepositoryError>> {
    for (const project of this.projects.values()) {
      if (project.path === path) {
        return ok(project);
      }
    }
    return ok(null);
  }

  async update(
    params: UpdateProjectParams,
  ): Promise<Result<Project, RepositoryError>> {
    const existingProject = this.projects.get(params.id);
    if (!existingProject) {
      return err(new RepositoryError("Project not found"));
    }

    // Check if name is being updated to a name that already exists
    if (params.name) {
      for (const [id, project] of this.projects.entries()) {
        if (id !== params.id && project.name === params.name) {
          return err(
            new RepositoryError("Project with this name already exists"),
          );
        }
      }
    }

    const updatedProject: Project = {
      ...existingProject,
      name: params.name ?? existingProject.name,
      path: params.path ?? existingProject.path,
      updatedAt: new Date(),
    };

    this.projects.set(params.id, updatedProject);
    return ok(updatedProject);
  }

  async delete(id: ProjectId): Promise<Result<void, RepositoryError>> {
    if (!this.projects.has(id)) {
      return err(new RepositoryError("Project not found"));
    }

    this.projects.delete(id);
    return ok(undefined);
  }

  async list(
    query: ListProjectQuery,
  ): Promise<Result<{ items: Project[]; count: number }, RepositoryError>> {
    if (this.shouldFailList) {
      return err(new RepositoryError("Mock repository list failure"));
    }

    let filteredProjects = Array.from(this.projects.values());

    // Apply filters
    if (query.filter?.name) {
      const filterName = query.filter.name;
      filteredProjects = filteredProjects.filter((project) =>
        project.name.toLowerCase().includes(filterName.toLowerCase()),
      );
    }

    if (query.filter?.path) {
      const filterPath = query.filter.path;
      filteredProjects = filteredProjects.filter((project) =>
        project.path.toLowerCase().includes(filterPath.toLowerCase()),
      );
    }

    // Sort by createdAt (newest first)
    filteredProjects.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const count = filteredProjects.length;
    const { limit, page } = query.pagination;
    const offset = (page - 1) * limit;
    const items = filteredProjects.slice(offset, offset + limit);

    return ok({ items, count });
  }

  // Test utility methods
  clear(): void {
    this.projects.clear();
    this.nextId = 1;
    this.shouldFailList = false;
    this.shouldFailUpsert = false;
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  setProjects(projects: Project[]): void {
    this.projects.clear();
    for (const project of projects) {
      this.projects.set(project.id, project);
    }
  }

  setShouldFailList(shouldFail: boolean): void {
    this.shouldFailList = shouldFail;
  }

  setShouldFailUpsert(shouldFail: boolean): void {
    this.shouldFailUpsert = shouldFail;
  }
}
