import { and, eq, ilike, type SQL, sql } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import type { ProjectRepository } from "@/core/domain/project/ports/projectRepository";
import {
  type CreateProjectParams,
  type ListProjectQuery,
  type Project,
  type ProjectId,
  projectSchema,
  type UpdateProjectParams,
} from "@/core/domain/project/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Database } from "./client";
import { projects } from "./schema";

export class DrizzlePgliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: Database) {}

  async create(
    params: CreateProjectParams,
  ): Promise<Result<Project, RepositoryError>> {
    try {
      const result = await this.db.insert(projects).values(params).returning();

      const project = result[0];
      if (!project) {
        return err(new RepositoryError("Failed to create project"));
      }

      return validate(projectSchema, project).mapErr((error) => {
        return new RepositoryError("Invalid project data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to create project", error));
    }
  }

  async findById(
    id: ProjectId,
  ): Promise<Result<Project | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      const project = result[0];
      if (!project) {
        return ok(null);
      }

      return validate(projectSchema, project)
        .map((validProject) => validProject)
        .mapErr((error) => new RepositoryError("Invalid project data", error));
    } catch (error) {
      return err(new RepositoryError("Failed to find project", error));
    }
  }

  async findByPath(
    path: string,
  ): Promise<Result<Project | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(projects)
        .where(eq(projects.path, path))
        .limit(1);

      const project = result[0];
      if (!project) {
        return ok(null);
      }

      return validate(projectSchema, project)
        .map((validProject) => validProject)
        .mapErr((error) => new RepositoryError("Invalid project data", error));
    } catch (error) {
      return err(new RepositoryError("Failed to find project", error));
    }
  }

  async update(
    params: UpdateProjectParams,
  ): Promise<Result<Project, RepositoryError>> {
    try {
      const updateData: Record<string, unknown> = {};
      if (params.name !== undefined) updateData.name = params.name;
      if (params.path !== undefined) updateData.path = params.path;

      const result = await this.db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, params.id))
        .returning();

      const project = result[0];
      if (!project) {
        return err(new RepositoryError("Project not found"));
      }

      return validate(projectSchema, project).mapErr((error) => {
        return new RepositoryError("Invalid project data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to update project", error));
    }
  }

  async delete(id: ProjectId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(projects).where(eq(projects.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete project", error));
    }
  }

  async list(
    query: ListProjectQuery,
  ): Promise<Result<{ items: Project[]; count: number }, RepositoryError>> {
    const { pagination, filter } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.name) {
      conditions.push(ilike(projects.name, `%${filter.name}%`));
    }
    if (filter?.path) {
      conditions.push(ilike(projects.path, `%${filter.path}%`));
    }

    try {
      let whereClause: SQL | undefined;
      if (conditions.length === 1) {
        whereClause = conditions[0];
      } else if (conditions.length > 1) {
        whereClause = and(...conditions);
      }

      const [items, countResult] = await Promise.all([
        whereClause
          ? this.db
              .select()
              .from(projects)
              .where(whereClause)
              .limit(limit)
              .offset(offset)
          : this.db.select().from(projects).limit(limit).offset(offset),
        whereClause
          ? this.db
              .select({ count: sql<number>`count(*)` })
              .from(projects)
              .where(whereClause)
          : this.db.select({ count: sql<number>`count(*)` }).from(projects),
      ]);

      const validItems = items
        .map((item) => validate(projectSchema, item).unwrapOr(null))
        .filter((item) => item !== null);

      return ok({
        items: validItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list projects", error));
    }
  }
}
