#!/usr/bin/env node

import "dotenv/config";
import { parseArgs } from "node:util";
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

function parseArguments(): ProcessorConfig {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
      maxConcurrency: {
        type: "string",
        short: "c",
        default: "5",
      },
      skipExisting: {
        type: "boolean",
        short: "s",
        default: true,
      },
      pattern: {
        type: "string",
        short: "p",
        default: "**/*.jsonl",
      },
      interval: {
        type: "string",
        short: "i",
        default: "60",
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: node periodicBatchProcessor.mjs [options] [target-directory]

Options:
  -h, --help              Show this help message
  -c, --maxConcurrency    Maximum number of files to process concurrently (default: 5)
  -s, --skipExisting      Skip files that have already been processed (default: true)
      --no-skipExisting   Force processing of all files
  -p, --pattern          File pattern to match (default: **/*.jsonl)
  -i, --interval         Processing interval in minutes (default: 60)

Arguments:
  target-directory        Directory to process (uses WATCH_TARGET_DIR if not specified)

Examples:
  node periodicBatchProcessor.mjs /path/to/logs
  node periodicBatchProcessor.mjs -i 30 -c 10 /path/to/logs
  node periodicBatchProcessor.mjs --no-skipExisting --interval 15 /path/to/logs

Note:
  The processor runs immediately on startup, then at the specified interval.
  Use Ctrl+C (SIGINT) or SIGTERM to stop gracefully.
`);
    process.exit(0);
  }

  const { targetDir: defaultTargetDir } = getWatcherContext();
  const targetDir = positionals[0] || defaultTargetDir;

  return {
    targetDirectory: targetDir,
    pattern: values.pattern || "**/*.jsonl",
    maxConcurrency: Number(values.maxConcurrency) || 5,
    skipExisting: values.skipExisting !== false,
    intervalMinutes: Number(values.interval) || 60,
  };
}

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
    const config = parseArguments();
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
  } catch (error) {
    console.error("Failed to start periodic batch processor:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
