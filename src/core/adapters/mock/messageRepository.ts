import type { MessageRepository } from "@/core/domain/message/ports/messageRepository";
import type {
  CreateMessageParams,
  ListMessageQuery,
  Message,
  MessageId,
} from "@/core/domain/message/types";
import { RepositoryError } from "@/lib/error";
import { type Result, err, ok } from "neverthrow";
import { v7 as uuidv7 } from "uuid";

export class MockMessageRepository implements MessageRepository {
  private messages: Map<MessageId, Message> = new Map();

  constructor(initialMessages: Message[] = []) {
    for (const message of initialMessages) {
      this.messages.set(message.id, message);
    }
  }

  async create(
    params: CreateMessageParams,
  ): Promise<Result<Message, RepositoryError>> {
    const now = new Date();
    const message: Message = {
      id: uuidv7() as MessageId,
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      timestamp: params.timestamp,
      rawData: params.rawData,
      createdAt: now,
      updatedAt: now,
    };

    this.messages.set(message.id, message);
    return ok(message);
  }

  async findById(
    id: MessageId,
  ): Promise<Result<Message | null, RepositoryError>> {
    const message = this.messages.get(id);
    return ok(message || null);
  }

  async delete(id: MessageId): Promise<Result<void, RepositoryError>> {
    if (!this.messages.has(id)) {
      return err(new RepositoryError("Message not found"));
    }

    this.messages.delete(id);
    return ok(undefined);
  }

  async list(
    query: ListMessageQuery,
  ): Promise<Result<{ items: Message[]; count: number }, RepositoryError>> {
    let filteredMessages = Array.from(this.messages.values());

    // Apply filters
    if (query.filter?.sessionId) {
      filteredMessages = filteredMessages.filter(
        (message) => message.sessionId === query.filter?.sessionId,
      );
    }

    if (query.filter?.role) {
      filteredMessages = filteredMessages.filter(
        (message) => message.role === query.filter?.role,
      );
    }

    // Sort by timestamp (oldest first for conversation flow)
    filteredMessages.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const count = filteredMessages.length;
    const { limit, page } = query.pagination;
    const offset = (page - 1) * limit;
    const items = filteredMessages.slice(offset, offset + limit);

    return ok({ items, count });
  }

  // Test utility methods
  clear(): void {
    this.messages.clear();
  }

  getAll(): Message[] {
    return Array.from(this.messages.values());
  }
}
