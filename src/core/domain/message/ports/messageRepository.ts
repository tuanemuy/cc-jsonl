import type { Result } from "neverthrow";
import type { RepositoryError } from "@/lib/error";
import type {
  CreateMessageParams,
  ListMessageQuery,
  Message,
  MessageId,
} from "../types";

export interface MessageRepository {
  create(
    params: CreateMessageParams,
  ): Promise<Result<Message, RepositoryError>>;
  findById(id: MessageId): Promise<Result<Message | null, RepositoryError>>;
  findByUuid(uuid: string): Promise<Result<Message | null, RepositoryError>>;
  upsert(
    params: CreateMessageParams,
  ): Promise<Result<Message, RepositoryError>>;
  delete(id: MessageId): Promise<Result<void, RepositoryError>>;
  list(
    query: ListMessageQuery,
  ): Promise<Result<{ items: Message[]; count: number }, RepositoryError>>;
}
