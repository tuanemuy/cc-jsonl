import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { FileSystemManager } from "@/core/domain/watcher/ports/fileSystemManager";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";
import {
  type BatchProcessFileResult,
  type BatchProcessInput,
  type BatchProcessResult,
  batchProcessInputSchema,
} from "@/core/domain/watcher/types";
import type { Context } from "../context";
import { processLogFile } from "./processLogFile";

export type BatchProcessLogFilesError = {
  type: "BATCH_PROCESS_LOG_FILES_ERROR";
  message: string;
  cause?: unknown;
};

export async function batchProcessLogFiles(
  context: Context & {
    logParser: LogParser;
    fileSystemManager: FileSystemManager;
  },
  input: BatchProcessInput,
): Promise<Result<BatchProcessResult, BatchProcessLogFilesError>> {
  const parseResult = batchProcessInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err({
      type: "BATCH_PROCESS_LOG_FILES_ERROR",
      message: "Invalid input",
      cause: parseResult.error,
    });
  }

  const { targetDirectory, pattern, maxConcurrency, skipExisting } =
    parseResult.data;

  try {
    // Find all matching files
    const filesResult = await findMatchingFiles(
      context.fileSystemManager,
      targetDirectory,
      pattern,
    );
    if (filesResult.isErr()) {
      return err({
        type: "BATCH_PROCESS_LOG_FILES_ERROR",
        message: "Failed to find matching files",
        cause: filesResult.error,
      });
    }

    const files = filesResult.value;

    if (files.length === 0) {
      return ok({
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        failedFiles: 0,
        totalEntries: 0,
        fileResults: [],
        errors: [],
      });
    }

    // Process files in parallel with concurrency limit
    const fileResults: BatchProcessFileResult[] = [];
    const errors: { filePath: string; error: string }[] = [];
    let totalEntries = 0;

    for (let i = 0; i < files.length; i += maxConcurrency) {
      const batch = files.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(
        async (filePath): Promise<BatchProcessFileResult> => {
          const result = await processLogFile(context, {
            filePath,
            skipTracking: !skipExisting,
          });

          if (result.isOk()) {
            if (result.value.skipped) {
              return {
                filePath,
                status: "skipped",
                entriesProcessed: 0,
              };
            }

            return {
              filePath,
              status: "success",
              entriesProcessed: result.value.entriesProcessed,
            };
          }

          const errorMessage = result.error.message;
          console.error(`Failed to process: ${filePath}`, result.error);
          errors.push({ filePath, error: errorMessage });
          return {
            filePath,
            status: "failed",
            error: errorMessage,
            entriesProcessed: 0,
          };
        },
      );

      const batchResults = await Promise.all(batchPromises);
      fileResults.push(...batchResults);

      // Accumulate total entries from successful processing
      totalEntries += batchResults.reduce(
        (sum, result) => sum + result.entriesProcessed,
        0,
      );
    }

    const processedFiles = fileResults.filter(
      (r) => r.status === "success",
    ).length;
    const skippedFiles = fileResults.filter(
      (r) => r.status === "skipped",
    ).length;
    const failedFiles = fileResults.filter((r) => r.status === "failed").length;

    return ok({
      totalFiles: files.length,
      processedFiles,
      skippedFiles,
      failedFiles,
      totalEntries,
      fileResults,
      errors,
    });
  } catch (error) {
    const batchError = {
      type: "BATCH_PROCESS_LOG_FILES_ERROR" as const,
      message: `Error during batch processing of ${targetDirectory}`,
      cause: error,
    };
    console.error(
      "[batchProcessLogFiles] Unexpected error occurred",
      {
        targetDirectory,
      },
      batchError,
    );
    return err(batchError);
  }
}

async function findMatchingFiles(
  fileSystemManager: FileSystemManager,
  directory: string,
  pattern: string,
): Promise<Result<string[], { message: string; cause?: unknown }>> {
  try {
    const files: string[] = [];

    // Convert glob-like pattern to simple extension matching for now
    const extension = pattern.includes("*.jsonl") ? ".jsonl" : undefined;

    const result = await walkDirectory(
      fileSystemManager,
      directory,
      files,
      extension,
    );
    if (result.isErr()) {
      return err({
        message: `Failed to scan directory: ${directory}`,
        cause: result.error,
      });
    }

    return ok(files.sort());
  } catch (error) {
    return err({
      message: `Failed to scan directory: ${directory}`,
      cause: error,
    });
  }
}

async function walkDirectory(
  fileSystemManager: FileSystemManager,
  dir: string,
  files: string[],
  extension?: string,
): Promise<Result<void, { message: string; cause?: unknown }>> {
  const entriesResult = await fileSystemManager.readDirectory(dir, {
    withFileTypes: true,
  });
  if (entriesResult.isErr()) {
    // Some directories might not be accessible - continue without failing
    return ok(undefined);
  }

  const entries = entriesResult.value;
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const result = await walkDirectory(
        fileSystemManager,
        fullPath,
        files,
        extension,
      );
      if (result.isErr()) {
        return result;
      }
    } else if (entry.isFile()) {
      if (!extension || fullPath.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  }

  return ok(undefined);
}
