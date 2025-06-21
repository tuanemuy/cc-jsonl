import type { FileWatcher } from "@/core/domain/watcher/ports/fileWatcher";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";
import {
  type WatcherConfig,
  watcherConfigSchema,
} from "@/core/domain/watcher/types";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";
import type { Context } from "../context";
import { processLogFile } from "./processLogFile";

export const startWatcherInputSchema = z.object({
  config: watcherConfigSchema,
});

export type StartWatcherInput = z.infer<typeof startWatcherInputSchema>;

export type StartWatcherError = {
  type: "START_WATCHER_ERROR";
  message: string;
  cause?: unknown;
};

export async function startWatcher(
  context: Context & { fileWatcher: FileWatcher; logParser: LogParser },
  input: StartWatcherInput,
): Promise<Result<void, StartWatcherError>> {
  const parseResult = startWatcherInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err({
      type: "START_WATCHER_ERROR",
      message: "Invalid input",
      cause: parseResult.error,
    });
  }

  try {
    console.log("Starting Claude Code Log Watcher...");
    console.log(`Watching directory: ${input.config.targetDirectory}`);
    console.log(`Pattern: ${input.config.pattern}`);

    const result = await context.fileWatcher.start(
      input.config,
      async (event) => {
        if (event.type === "add" || event.type === "change") {
          console.log(`File ${event.type}: ${event.filePath}`);
          const processResult = await processLogFile(context, {
            filePath: event.filePath,
          });
          if (processResult.isErr()) {
            console.error(
              `Failed to process file ${event.filePath}:`,
              processResult.error,
            );
          }
        }
      },
    );

    if (result.isErr()) {
      return err({
        type: "START_WATCHER_ERROR",
        message: "Failed to start file watcher",
        cause: result.error,
      });
    }

    console.log("File watcher is ready and watching for changes...");
    return ok(undefined);
  } catch (error) {
    return err({
      type: "START_WATCHER_ERROR",
      message: "Failed to start watcher",
      cause: error,
    });
  }
}

export async function stopWatcher(
  context: Context & { fileWatcher: FileWatcher },
): Promise<Result<void, StartWatcherError>> {
  try {
    console.log("Shutting down file watcher...");

    const result = await context.fileWatcher.stop();
    if (result.isErr()) {
      return err({
        type: "START_WATCHER_ERROR",
        message: "Failed to stop file watcher",
        cause: result.error,
      });
    }

    console.log("File watcher closed.");
    return ok(undefined);
  } catch (error) {
    return err({
      type: "START_WATCHER_ERROR",
      message: "Failed to stop watcher",
      cause: error,
    });
  }
}
