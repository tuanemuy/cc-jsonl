import { and, eq, type SQL, sql } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import type { MessageRepository } from "@/core/domain/message/ports/messageRepository";
import {
  type CreateMessageParams,
  type ListMessageQuery,
  type Message,
  type MessageId,
  messageSchema,
} from "@/core/domain/message/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Database } from "./client";
import { messages } from "./schema";

export class DrizzleSqliteMessageRepository implements MessageRepository {
  constructor(private readonly db: Database) {}

  async upsert(
    params: CreateMessageParams,
  ): Promise<Result<Message, RepositoryError>> {
    try {
      const result = await this.db
        .insert(messages)
        .values(params)
        .onConflictDoUpdate({
          target: messages.uuid,
          set: {
            sessionId: params.sessionId,
            role: params.role,
            content: params.content,
            timestamp: params.timestamp,
            rawData: params.rawData,
            parentUuid: params.parentUuid,
            cwd: params.cwd,
            updatedAt: new Date(),
          },
        })
        .returning();

      const message = result[0];
      if (!message) {
        return err(new RepositoryError("Failed to upsert message"));
      }

      return validate(messageSchema, message).mapErr((error) => {
        return new RepositoryError("Invalid message data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to upsert message", error));
    }
  }

  async findById(
    id: MessageId,
  ): Promise<Result<Message | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      const message = result[0];
      if (!message) {
        return ok(null);
      }

      return validate(messageSchema, message)
        .map((validMessage) => validMessage)
        .mapErr((error) => new RepositoryError("Invalid message data", error));
    } catch (error) {
      return err(new RepositoryError("Failed to find message", error));
    }
  }

  async findByUuid(
    uuid: string,
  ): Promise<Result<Message | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(messages)
        .where(eq(messages.uuid, uuid))
        .limit(1);

      const message = result[0];
      if (!message) {
        return ok(null);
      }

      return validate(messageSchema, message)
        .map((validMessage) => validMessage)
        .mapErr((error) => new RepositoryError("Invalid message data", error));
    } catch (error) {
      return err(new RepositoryError("Failed to find message by UUID", error));
    }
  }

  async delete(id: MessageId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(messages).where(eq(messages.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete message", error));
    }
  }

  async list(
    query: ListMessageQuery,
  ): Promise<Result<{ items: Message[]; count: number }, RepositoryError>> {
    const { pagination, filter } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.sessionId) {
      conditions.push(eq(messages.sessionId, filter.sessionId));
    }
    if (filter?.role) {
      conditions.push(eq(messages.role, filter.role));
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
              .from(messages)
              .where(whereClause)
              .limit(limit)
              .offset(offset)
          : this.db.select().from(messages).limit(limit).offset(offset),
        whereClause
          ? this.db
              .select({ count: sql<number>`count(*)` })
              .from(messages)
              .where(whereClause)
          : this.db.select({ count: sql<number>`count(*)` }).from(messages),
      ]);

      const validItems = items
        .map((item) => validate(messageSchema, item).unwrapOr(null))
        .filter((item) => item !== null);

      return ok({
        items: validItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list messages", error));
    }
  }
}
