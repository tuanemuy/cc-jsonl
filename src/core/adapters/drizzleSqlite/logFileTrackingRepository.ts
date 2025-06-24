import { eq } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import type {
  LogFileTrackingRepository,
  LogFileTrackingRepositoryError,
} from "@/core/domain/watcher/ports/logFileTrackingRepository";
import {
  type CreateLogFileTrackingParams,
  type LogFileTracking,
  type LogFileTrackingId,
  logFileTrackingSchema,
  type UpdateLogFileTrackingParams,
} from "@/core/domain/watcher/types";
import type { Database } from "./client";
import { logFileTracking } from "./schema";

export class DrizzleSqliteLogFileTrackingRepository
  implements LogFileTrackingRepository
{
  constructor(private readonly db: Database) {}

  async create(
    params: CreateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>> {
    try {
      const result = await this.db
        .insert(logFileTracking)
        .values(params)
        .returning();

      const tracking = result[0];
      if (!tracking) {
        return err({
          type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
          message: "Failed to create log file tracking",
        });
      }

      const validationResult = logFileTrackingSchema.safeParse(tracking);
      if (!validationResult.success) {
        return err({
          type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
          message: "Invalid log file tracking data",
          cause: validationResult.error,
        });
      }

      return ok(validationResult.data);
    } catch (error) {
      return err({
        type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
        message: "Failed to create log file tracking",
        cause: error,
      });
    }
  }

  async findByFilePath(
    filePath: string,
  ): Promise<Result<LogFileTracking | null, LogFileTrackingRepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(logFileTracking)
        .where(eq(logFileTracking.filePath, filePath))
        .limit(1);

      const tracking = result[0];
      if (!tracking) {
        return ok(null);
      }

      const validationResult = logFileTrackingSchema.safeParse(tracking);
      if (!validationResult.success) {
        return err({
          type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
          message: "Invalid log file tracking data",
          cause: validationResult.error,
        });
      }

      return ok(validationResult.data);
    } catch (error) {
      return err({
        type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
        message: "Failed to find log file tracking",
        cause: error,
      });
    }
  }

  async update(
    id: LogFileTrackingId,
    params: UpdateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>> {
    try {
      const result = await this.db
        .update(logFileTracking)
        .set({
          ...params,
          updatedAt: new Date(),
        })
        .where(eq(logFileTracking.id, id))
        .returning();

      const tracking = result[0];
      if (!tracking) {
        return err({
          type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
          message: "Log file tracking not found",
        });
      }

      const validationResult = logFileTrackingSchema.safeParse(tracking);
      if (!validationResult.success) {
        return err({
          type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
          message: "Invalid log file tracking data after update",
          cause: validationResult.error,
        });
      }

      return ok(validationResult.data);
    } catch (error) {
      return err({
        type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
        message: "Failed to update log file tracking",
        cause: error,
      });
    }
  }

  async updateByFilePath(
    filePath: string,
    params: UpdateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>> {
    try {
      const result = await this.db
        .update(logFileTracking)
        .set({
          ...params,
          updatedAt: new Date(),
        })
        .where(eq(logFileTracking.filePath, filePath))
        .returning();

      const tracking = result[0];
      if (!tracking) {
        return err({
          type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
          message: "Log file tracking not found",
        });
      }

      const validationResult = logFileTrackingSchema.safeParse(tracking);
      if (!validationResult.success) {
        return err({
          type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
          message: "Invalid log file tracking data after update",
          cause: validationResult.error,
        });
      }

      return ok(validationResult.data);
    } catch (error) {
      return err({
        type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
        message: "Failed to update log file tracking by file path",
        cause: error,
      });
    }
  }

  async delete(
    id: LogFileTrackingId,
  ): Promise<Result<void, LogFileTrackingRepositoryError>> {
    try {
      await this.db.delete(logFileTracking).where(eq(logFileTracking.id, id));
      return ok(undefined);
    } catch (error) {
      return err({
        type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
        message: "Failed to delete log file tracking",
        cause: error,
      });
    }
  }

  async deleteByFilePath(
    filePath: string,
  ): Promise<Result<void, LogFileTrackingRepositoryError>> {
    try {
      await this.db
        .delete(logFileTracking)
        .where(eq(logFileTracking.filePath, filePath));
      return ok(undefined);
    } catch (error) {
      return err({
        type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
        message: "Failed to delete log file tracking by file path",
        cause: error,
      });
    }
  }

  async list(): Promise<
    Result<LogFileTracking[], LogFileTrackingRepositoryError>
  > {
    try {
      const result = await this.db.select().from(logFileTracking);

      const validItems = result
        .map((item) => {
          const parseResult = logFileTrackingSchema.safeParse(item);
          return parseResult.success ? parseResult.data : null;
        })
        .filter((item) => item !== null) as LogFileTracking[];

      return ok(validItems);
    } catch (error) {
      return err({
        type: "LOG_FILE_TRACKING_REPOSITORY_ERROR",
        message: "Failed to list log file tracking",
        cause: error,
      });
    }
  }
}
