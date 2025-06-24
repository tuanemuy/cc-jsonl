import { createHash } from "node:crypto";
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
  includeChecksum: z.boolean().default(false),
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
        fileModifiedAt: new Date(),
      });
    }

    // Get file stats
    const fileStats = await fs.stat(input.filePath);
    const fileModifiedAt = fileStats.mtime;
    const fileSize = fileStats.size;

    // Get file checksum if requested
    let checksum: string | undefined;
    if (input.includeChecksum) {
      const fileContent = await fs.readFile(input.filePath);
      checksum = createHash("sha256").update(fileContent).digest("hex");
    }

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
        fileModifiedAt,
      });
    }

    // Check if file was modified after last processing
    if (tracking.fileModifiedAt && fileModifiedAt > tracking.fileModifiedAt) {
      return ok({
        filePath: input.filePath,
        shouldProcess: true,
        reason: "file_modified",
        lastProcessedAt: tracking.lastProcessedAt,
        fileModifiedAt,
      });
    }

    // Check if file size changed
    if (tracking.fileSize && fileSize !== tracking.fileSize) {
      return ok({
        filePath: input.filePath,
        shouldProcess: true,
        reason: "size_changed",
        lastProcessedAt: tracking.lastProcessedAt,
        fileModifiedAt,
      });
    }

    // Check if checksum changed (if both checksums are available)
    if (checksum && tracking.checksum && checksum !== tracking.checksum) {
      return ok({
        filePath: input.filePath,
        shouldProcess: true,
        reason: "checksum_changed",
        lastProcessedAt: tracking.lastProcessedAt,
        fileModifiedAt,
      });
    }

    // File is up to date
    return ok({
      filePath: input.filePath,
      shouldProcess: false,
      reason: "up_to_date",
      lastProcessedAt: tracking.lastProcessedAt,
      fileModifiedAt,
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
  includeChecksum: z.boolean().default(false),
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
    const fileModifiedAt = fileStats.mtime;
    const fileSize = fileStats.size;
    const now = new Date();

    // Get file checksum if requested
    let checksum: string | undefined;
    if (input.includeChecksum) {
      const fileContent = await fs.readFile(input.filePath);
      checksum = createHash("sha256").update(fileContent).digest("hex");
    }

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
        fileModifiedAt,
        checksum,
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
        fileModifiedAt,
        checksum,
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
