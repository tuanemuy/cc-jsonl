import type { Result } from "neverthrow";
import type { RepositoryError } from "@/lib/error";
import type {
  CreateSessionParams,
  ListSessionQuery,
  Session,
  SessionId,
} from "../types";

export interface SessionRepository {
  upsert(
    params: CreateSessionParams,
  ): Promise<Result<Session, RepositoryError>>;
  findById(id: SessionId): Promise<Result<Session | null, RepositoryError>>;
  updateCwd(
    id: SessionId,
    cwd: string,
  ): Promise<Result<Session, RepositoryError>>;
  updateLastMessageAt(
    id: SessionId,
    timestamp: Date,
  ): Promise<Result<Session, RepositoryError>>;
  updateName(
    id: SessionId,
    name: string,
  ): Promise<Result<Session, RepositoryError>>;
  delete(id: SessionId): Promise<Result<void, RepositoryError>>;
  list(
    query: ListSessionQuery,
  ): Promise<Result<{ items: Session[]; count: number }, RepositoryError>>;
}
