import type { Result } from "neverthrow";
import type {
  CreateLogFileTrackingParams,
  LogFileTracking,
  LogFileTrackingId,
  UpdateLogFileTrackingParams,
} from "../types";

export type LogFileTrackingRepositoryError = {
  type: "LOG_FILE_TRACKING_REPOSITORY_ERROR";
  message: string;
  cause?: unknown;
};

export interface LogFileTrackingRepository {
  create(
    params: CreateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>>;

  findByFilePath(
    filePath: string,
  ): Promise<Result<LogFileTracking | null, LogFileTrackingRepositoryError>>;

  update(
    id: LogFileTrackingId,
    params: UpdateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>>;

  updateByFilePath(
    filePath: string,
    params: UpdateLogFileTrackingParams,
  ): Promise<Result<LogFileTracking, LogFileTrackingRepositoryError>>;

  delete(
    id: LogFileTrackingId,
  ): Promise<Result<void, LogFileTrackingRepositoryError>>;

  deleteByFilePath(
    filePath: string,
  ): Promise<Result<void, LogFileTrackingRepositoryError>>;

  list(): Promise<Result<LogFileTracking[], LogFileTrackingRepositoryError>>;
}
