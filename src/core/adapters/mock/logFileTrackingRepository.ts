import { ok, type Result } from "neverthrow";
import type {
  LogFileTrackingRepository,
  LogFileTrackingRepositoryError,
} from "@/core/domain/watcher/ports/logFileTrackingRepository";
import type {
  CreateLogFileTrackingParams,
  LogFileTracking,
  LogFileTrackingId,
  UpdateLogFileTrackingParams,
} from "@/core/domain/watcher/types";

export class MockLogFileTrackingRepository
  implements LogFileTrackingRepository
{
  private items: LogFileTracking[] = [];

  async create(
    params: CreateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>> {
    const now = new Date();
    const item: LogFileTracking = {
      id: `tracking-${Date.now()}` as LogFileTrackingId,
      ...params,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return ok(item);
  }

  async findByFilePath(
    filePath: string,
  ): Promise<Result<LogFileTracking | null, LogFileTrackingRepositoryError>> {
    const item = this.items.find((item) => item.filePath === filePath);
    return ok(item || null);
  }

  async update(
    id: LogFileTrackingId,
    params: UpdateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return ok({} as LogFileTracking); // Mock implementation
    }

    const updated = {
      ...this.items[index],
      ...params,
      updatedAt: new Date(),
    };
    this.items[index] = updated;
    return ok(updated);
  }

  async updateByFilePath(
    filePath: string,
    params: UpdateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>> {
    const index = this.items.findIndex((item) => item.filePath === filePath);
    if (index === -1) {
      return ok({} as LogFileTracking); // Mock implementation
    }

    const updated = {
      ...this.items[index],
      ...params,
      updatedAt: new Date(),
    };
    this.items[index] = updated;
    return ok(updated);
  }

  async delete(
    id: LogFileTrackingId,
  ): Promise<Result<void, LogFileTrackingRepositoryError>> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
    return ok(undefined);
  }

  async deleteByFilePath(
    filePath: string,
  ): Promise<Result<void, LogFileTrackingRepositoryError>> {
    const index = this.items.findIndex((item) => item.filePath === filePath);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
    return ok(undefined);
  }

  async list(): Promise<
    Result<LogFileTracking[], LogFileTrackingRepositoryError>
  > {
    return ok([...this.items]);
  }
}
