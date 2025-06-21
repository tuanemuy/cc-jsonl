import { ok, err, type Result } from "neverthrow";
import type { SessionRepository } from "@/core/domain/session/ports/sessionRepository";
import type {
  Session,
  SessionId,
  CreateSessionParams,
  ListSessionQuery,
} from "@/core/domain/session/types";
import type { ProjectId } from "@/core/domain/project/types";
import { RepositoryError } from "@/lib/error";
import { v7 as uuidv7 } from "uuid";

export class MockSessionRepository implements SessionRepository {
  private sessions: Map<SessionId, Session> = new Map();

  constructor(initialSessions: Session[] = []) {
    for (const session of initialSessions) {
      this.sessions.set(session.id, session);
    }
  }

  async create(
    params: CreateSessionParams,
  ): Promise<Result<Session, RepositoryError>> {
    // Check if session with same ID already exists (if ID is provided)
    if (params.id && this.sessions.has(params.id)) {
      return err(new RepositoryError("Session with this ID already exists"));
    }

    const now = new Date();
    const session: Session = {
      id: params.id || (uuidv7() as SessionId),
      projectId: params.projectId,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    return ok(session);
  }

  async findById(id: SessionId): Promise<Result<Session | null, RepositoryError>> {
    const session = this.sessions.get(id);
    return ok(session || null);
  }

  async list(
    query: ListSessionQuery,
  ): Promise<Result<{ items: Session[]; count: number }, RepositoryError>> {
    let filteredSessions = Array.from(this.sessions.values());

    // Apply filters
    if (query.filter?.projectId) {
      filteredSessions = filteredSessions.filter(
        (session) => session.projectId === query.filter!.projectId,
      );
    }

    // Sort by createdAt (newest first)
    filteredSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const count = filteredSessions.length;
    const { limit, page } = query.pagination;
    const offset = (page - 1) * limit;
    const items = filteredSessions.slice(offset, offset + limit);

    return ok({ items, count });
  }

  async findByProjectId(
    projectId: ProjectId,
  ): Promise<Result<Session[], RepositoryError>> {
    const sessions = Array.from(this.sessions.values()).filter(
      (session) => session.projectId === projectId,
    );
    
    // Sort by createdAt (newest first)
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return ok(sessions);
  }

  // Test utility methods
  clear(): void {
    this.sessions.clear();
  }

  getAll(): Session[] {
    return Array.from(this.sessions.values());
  }
}