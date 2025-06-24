import { promises as fs } from "node:fs";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type {
  CreateLogFileTrackingParams,
  FileProcessingStatus,
  UpdateLogFileTrackingParams,
} from "@/core/domain/watcher/types";
import type { Context } from "../context";

export const checkFileProcessingStatusInputSchema = z.object({
  filePath: z.string().min(1),
});

export type CheckFileProcessingStatusInput = z.infer<
  typeof checkFileProcessingStatusInputSchema
>;

export type CheckFileProcessingStatusError = {
  type: "CHECK_FILE_PROCESSING_STATUS_ERROR";
  message: string;
  cause?: unknown;
};

export async function checkFileProcessingStatus(
  context: Context,
  input: CheckFileProcessingStatusInput,
): Promise<Result<FileProcessingStatus, CheckFileProcessingStatusError>> {
  const parseResult = checkFileProcessingStatusInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err({
      type: "CHECK_FILE_PROCESSING_STATUS_ERROR",
      message: "Invalid input",
      cause: parseResult.error,
    });
  }

  try {
    // Check if repository is available
    if (!context.logFileTrackingRepository) {
      return ok({
        filePath: input.filePath,
        shouldProcess: true,
        reason: "new_file",
      });
    }

    // Get file stats
    const fileStats = await fs.stat(input.filePath);
    const fileModifiedAt = fileStats.mtime;
    const fileSize = fileStats.size;

    // Check if tracking record exists
    const trackingResult =
      await context.logFileTrackingRepository.findByFilePath(input.filePath);

    if (trackingResult.isErr()) {
      return err({
        type: "CHECK_FILE_PROCESSING_STATUS_ERROR",
        message: "Failed to check file tracking record",
        cause: trackingResult.error,
      });
    }

    const tracking = trackingResult.value;

    // If no tracking record exists, file should be processed
    if (!tracking) {
      return ok({
        filePath: input.filePath,
        shouldProcess: true,
        reason: "new_file",
      });
    }

    // Check if file was modified after last processing
    // Compare file modification time with last processed time to avoid precision issues
    if (fileModifiedAt > tracking.lastProcessedAt) {
      return ok({
        filePath: input.filePath,
        shouldProcess: true,
        reason: "file_modified",
        lastProcessedAt: tracking.lastProcessedAt,
      });
    }

    // Check if file size changed
    if (tracking.fileSize && fileSize !== tracking.fileSize) {
      return ok({
        filePath: input.filePath,
        shouldProcess: true,
        reason: "size_changed",
        lastProcessedAt: tracking.lastProcessedAt,
      });
    }

    // File is up to date
    return ok({
      filePath: input.filePath,
      shouldProcess: false,
      reason: "up_to_date",
      lastProcessedAt: tracking.lastProcessedAt,
    });
  } catch (error) {
    return err({
      type: "CHECK_FILE_PROCESSING_STATUS_ERROR",
      message: "Failed to check file processing status",
      cause: error,
    });
  }
}

export const updateFileProcessingStatusInputSchema = z.object({
  filePath: z.string().min(1),
});

export type UpdateFileProcessingStatusInput = z.infer<
  typeof updateFileProcessingStatusInputSchema
>;

export type UpdateFileProcessingStatusError = {
  type: "UPDATE_FILE_PROCESSING_STATUS_ERROR";
  message: string;
  cause?: unknown;
};

export async function updateFileProcessingStatus(
  context: Context,
  input: UpdateFileProcessingStatusInput,
): Promise<Result<void, UpdateFileProcessingStatusError>> {
  const parseResult = updateFileProcessingStatusInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err({
      type: "UPDATE_FILE_PROCESSING_STATUS_ERROR",
      message: "Invalid input",
      cause: parseResult.error,
    });
  }

  try {
    // Check if repository is available
    if (!context.logFileTrackingRepository) {
      return ok(undefined);
    }

    // Get file stats
    const fileStats = await fs.stat(input.filePath);
    const fileSize = fileStats.size;
    const now = new Date();

    // Check if tracking record exists
    const trackingResult =
      await context.logFileTrackingRepository.findByFilePath(input.filePath);

    if (trackingResult.isErr()) {
      return err({
        type: "UPDATE_FILE_PROCESSING_STATUS_ERROR",
        message: "Failed to check existing tracking record",
        cause: trackingResult.error,
      });
    }

    const tracking = trackingResult.value;

    if (!tracking) {
      // Create new tracking record
      const createParams: CreateLogFileTrackingParams = {
        filePath: input.filePath,
        lastProcessedAt: now,
        fileSize,
      };

      const createResult =
        await context.logFileTrackingRepository.create(createParams);
      if (createResult.isErr()) {
        return err({
          type: "UPDATE_FILE_PROCESSING_STATUS_ERROR",
          message: "Failed to create file tracking record",
          cause: createResult.error,
        });
      }
    } else {
      // Update existing tracking record
      const updateParams: UpdateLogFileTrackingParams = {
        lastProcessedAt: now,
        fileSize,
      };

      const updateResult =
        await context.logFileTrackingRepository.updateByFilePath(
          input.filePath,
          updateParams,
        );
      if (updateResult.isErr()) {
        return err({
          type: "UPDATE_FILE_PROCESSING_STATUS_ERROR",
          message: "Failed to update file tracking record",
          cause: updateResult.error,
        });
      }
    }

    return ok(undefined);
  } catch (error) {
    return err({
      type: "UPDATE_FILE_PROCESSING_STATUS_ERROR",
      message: "Failed to update file processing status",
      cause: error,
    });
  }
}
