import { err, ok, type Result } from "neverthrow";
import { v7 as uuidv7 } from "uuid";
import type { ProjectId } from "@/core/domain/project/types";
import type { SessionRepository } from "@/core/domain/session/ports/sessionRepository";
import type {
  CreateSessionParams,
  ListSessionQuery,
  Session,
  SessionId,
} from "@/core/domain/session/types";
import { RepositoryError } from "@/lib/error";

export class MockSessionRepository implements SessionRepository {
  private sessions: Map<SessionId, Session> = new Map();
  private shouldFailList = false;
  private shouldFailFindById = false;

  constructor(initialSessions: Session[] = []) {
    for (const session of initialSessions) {
      this.sessions.set(session.id, session);
    }
  }

  async upsert(
    params: CreateSessionParams,
  ): Promise<Result<Session, RepositoryError>> {
    // Check if session with same ID already exists (if ID is provided)
    if (params.id && this.sessions.has(params.id)) {
      // Update existing session
      const existingSession = this.sessions.get(params.id);
      if (!existingSession) {
        return err(new RepositoryError("Session not found"));
      }
      const updatedSession: Session = {
        ...existingSession,
        projectId: params.projectId || null,
        name: params.name || null,
        cwd: params.cwd,
        claudeSessionId:
          params.claudeSessionId || existingSession.claudeSessionId,
        updatedAt: new Date(),
      };

      this.sessions.set(params.id, updatedSession);
      return ok(updatedSession);
    }

    // Create new session
    const now = new Date();
    const session: Session = {
      id: params.id || (uuidv7() as SessionId),
      projectId: params.projectId || null,
      name: params.name || null,
      cwd: params.cwd,
      claudeSessionId: params.claudeSessionId || null,
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    return ok(session);
  }

  async findById(
    id: SessionId,
  ): Promise<Result<Session | null, RepositoryError>> {
    if (this.shouldFailFindById) {
      return err(new RepositoryError("Mock repository findById failure"));
    }
    const session = this.sessions.get(id);
    return ok(session || null);
  }

  async updateCwd(
    id: SessionId,
    cwd: string,
  ): Promise<Result<Session, RepositoryError>> {
    const session = this.sessions.get(id);
    if (!session) {
      return err(new RepositoryError("Session not found"));
    }

    const updatedSession: Session = {
      ...session,
      cwd,
      updatedAt: new Date(),
    };

    this.sessions.set(id, updatedSession);
    return ok(updatedSession);
  }

  async updateLastMessageAt(
    id: SessionId,
    timestamp: Date,
  ): Promise<Result<Session, RepositoryError>> {
    const session = this.sessions.get(id);
    if (!session) {
      return err(new RepositoryError("Session not found"));
    }

    const updatedSession: Session = {
      ...session,
      lastMessageAt: timestamp,
      updatedAt: new Date(),
    };

    this.sessions.set(id, updatedSession);
    return ok(updatedSession);
  }

  async updateName(
    id: SessionId,
    name: string,
  ): Promise<Result<Session, RepositoryError>> {
    const session = this.sessions.get(id);
    if (!session) {
      return err(new RepositoryError("Session not found"));
    }

    const updatedSession: Session = {
      ...session,
      name,
      updatedAt: new Date(),
    };

    this.sessions.set(id, updatedSession);
    return ok(updatedSession);
  }

  async delete(id: SessionId): Promise<Result<void, RepositoryError>> {
    if (!this.sessions.has(id)) {
      return err(new RepositoryError("Session not found"));
    }

    this.sessions.delete(id);
    return ok(undefined);
  }

  async list(
    query: ListSessionQuery,
  ): Promise<Result<{ items: Session[]; count: number }, RepositoryError>> {
    if (this.shouldFailList) {
      return err(new RepositoryError("Mock repository list failure"));
    }

    let filteredSessions = Array.from(this.sessions.values());

    // Apply filters
    if (query.filter?.projectId) {
      filteredSessions = filteredSessions.filter(
        (session) => session.projectId === query.filter?.projectId,
      );
    }

    // Sort by createdAt (newest first)
    filteredSessions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

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
    this.shouldFailList = false;
    this.shouldFailFindById = false;
  }

  getAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  setSessions(sessions: Session[]): void {
    this.sessions.clear();
    for (const session of sessions) {
      this.sessions.set(session.id, session);
    }
  }

  setShouldFailList(shouldFail: boolean): void {
    this.shouldFailList = shouldFail;
  }

  setShouldFailFindById(shouldFail: boolean): void {
    this.shouldFailFindById = shouldFail;
  }
}
