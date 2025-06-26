#!/usr/bin/env node

import "dotenv/config";
import { cli, define } from "gunshi";
import { batchProcessLogFiles } from "@/core/application/watcher";
import { getWatcherContext } from "./watcherContext";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

interface ProcessorConfig {
  targetDirectory: string;
  pattern: string;
  maxConcurrency: number;
  skipExisting: boolean;
  intervalMinutes: number;
}

const watchCommand = define({
  name: "watch",
  description:
    "Process Claude Code log files periodically at specified intervals",
  args: {
    targetDirectory: {
      type: "string",
      description:
        "Directory to process (uses WATCH_TARGET_DIR if not specified)",
    },
    maxConcurrency: {
      type: "number",
      short: "c",
      default: 5,
      description: "Maximum number of files to process concurrently",
    },
    skipExisting: {
      type: "boolean",
      short: "s",
      default: true,
      description: "Skip files that have already been processed",
    },
    pattern: {
      type: "string",
      short: "p",
      default: "**/*.jsonl",
      description: "File pattern to match",
    },
    interval: {
      type: "number",
      short: "i",
      default: 60,
      description: "Processing interval in minutes",
    },
  },
  run: async (ctx) => {
    const { targetDirectory, maxConcurrency, skipExisting, pattern, interval } =
      ctx.values;
    const { targetDir: defaultTargetDir } = getWatcherContext();

    const config: ProcessorConfig = {
      targetDirectory:
        (targetDirectory as string | undefined) || defaultTargetDir,
      pattern: pattern as string,
      maxConcurrency: maxConcurrency as number,
      skipExisting: skipExisting as boolean,
      intervalMinutes: interval as number,
    };

    const intervalMs = config.intervalMinutes * 60 * 1000;

    console.log("Starting periodic batch processor with configuration:");
    console.log(`  Target directory: ${config.targetDirectory}`);
    console.log(`  Pattern: ${config.pattern}`);
    console.log(`  Max concurrency: ${config.maxConcurrency}`);
    console.log(`  Skip existing: ${config.skipExisting}`);
    console.log(`  Interval: ${config.intervalMinutes} minutes`);

    // Run once immediately on startup
    console.log("Running initial batch processing...");
    await runBatchProcessing(config);

    // Set up periodic execution
    intervalId = setInterval(async () => {
      await runBatchProcessing(config);
    }, intervalMs);

    console.log(
      `Periodic batch processor started. Next run in ${config.intervalMinutes} minutes.`,
    );

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\nShutting down periodic batch processor...");
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      console.log("Periodic batch processor stopped.");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log(
        "\nReceived SIGTERM, shutting down periodic batch processor...",
      );
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      console.log("Periodic batch processor stopped.");
      process.exit(0);
    });
  },
});

async function runBatchProcessing(config: ProcessorConfig) {
  if (isRunning) {
    console.log("Batch processing already running, skipping this cycle");
    return;
  }

  isRunning = true;
  try {
    const { context } = getWatcherContext();

    console.log(
      `[${new Date().toISOString()}] Starting periodic batch processing...`,
    );

    const batchConfig = {
      targetDirectory: config.targetDirectory,
      pattern: config.pattern,
      maxConcurrency: config.maxConcurrency,
      skipExisting: config.skipExisting,
    };

    const result = await batchProcessLogFiles(context, batchConfig);

    if (result.isErr()) {
      console.error(
        `[${new Date().toISOString()}] Batch processing failed:`,
        result.error,
      );
      return;
    }

    const stats = result.value;
    console.log(`[${new Date().toISOString()}] Batch processing completed:`);
    console.log(`  📁 Total files: ${stats.totalFiles}`);
    console.log(`  ✅ Processed: ${stats.processedFiles}`);
    console.log(`  ⏭️  Skipped: ${stats.skippedFiles}`);
    console.log(`  ❌ Failed: ${stats.failedFiles}`);
    console.log(`  📊 Total entries: ${stats.totalEntries}`);

    if (stats.errors.length > 0) {
      console.log("  Errors encountered:");
      for (const error of stats.errors) {
        console.log(`    - ${error.filePath}: ${error.error}`);
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Failed to run periodic batch processor:`,
      error,
    );
  } finally {
    isRunning = false;
  }
}

async function main() {
  try {
    await cli(process.argv.slice(2), watchCommand, {
      name: "claude-code-watch",
      version: "1.0.0",
      description: "Claude Code log file periodic processor",
    });
  } catch (error) {
    console.error("Failed to start periodic batch processor:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
