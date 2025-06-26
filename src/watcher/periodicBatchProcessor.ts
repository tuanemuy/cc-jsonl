#!/usr/bin/env node

import "dotenv/config";
import { batchProcessLogFiles } from "@/core/application/watcher";
import { getWatcherContext } from "./watcherContext";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

async function runBatchProcessing() {
  if (isRunning) {
    console.log("Batch processing already running, skipping this cycle");
    return;
  }

  isRunning = true;
  try {
    const { context, targetDir } = getWatcherContext();

    console.log(
      `[${new Date().toISOString()}] Starting periodic batch processing...`,
    );

    const batchConfig = {
      targetDirectory: targetDir,
      pattern: "**/*.jsonl",
      maxConcurrency: Number(process.env.BATCH_MAX_CONCURRENCY) || 5,
      skipExisting: (process.env.BATCH_SKIP_EXISTING || "true") === "true",
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
    // Parse interval from environment variable (in minutes, default to 60)
    const intervalMinutes = Number(process.env.BATCH_INTERVAL_MINUTES) || 60;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(
      `Starting periodic batch processor with ${intervalMinutes} minute intervals`,
    );
    console.log("Environment variables:");
    console.log(`  BATCH_INTERVAL_MINUTES: ${intervalMinutes}`);
    console.log(
      `  BATCH_MAX_CONCURRENCY: ${Number(process.env.BATCH_MAX_CONCURRENCY) || 5}`,
    );
    console.log(
      `  BATCH_SKIP_EXISTING: ${process.env.BATCH_SKIP_EXISTING || "true"}`,
    );

    // Run once immediately on startup
    console.log("Running initial batch processing...");
    await runBatchProcessing();

    // Set up periodic execution
    intervalId = setInterval(async () => {
      await runBatchProcessing();
    }, intervalMs);

    console.log(
      `Periodic batch processor started. Next run in ${intervalMinutes} minutes.`,
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
