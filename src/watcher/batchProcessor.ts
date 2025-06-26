#!/usr/bin/env node

import "dotenv/config";
import { batchProcessLogFiles } from "@/core/application/watcher";
import { getWatcherContext } from "./watcherContext";

async function main() {
  try {
    const { context, targetDir } = getWatcherContext();

    console.log("Starting batch processing of log files...");
    console.log(`Target directory: ${targetDir}`);

    const batchConfig = {
      targetDirectory: targetDir,
      pattern: "**/*.jsonl",
      maxConcurrency: Number(process.env.BATCH_MAX_CONCURRENCY) || 5,
      skipExisting: (process.env.BATCH_SKIP_EXISTING || "true") === "true",
    };

    const result = await batchProcessLogFiles(context, batchConfig);

    if (result.isErr()) {
      console.error("Batch processing failed:", result.error);
      process.exit(1);
    }

    const stats = result.value;
    console.log("\nBatch processing completed successfully!");
    console.log(`📁 Total files: ${stats.totalFiles}`);
    console.log(`✅ Processed: ${stats.processedFiles}`);
    console.log(`⏭️  Skipped: ${stats.skippedFiles}`);
    console.log(`❌ Failed: ${stats.failedFiles}`);
    console.log(`📊 Total entries: ${stats.totalEntries}`);

    if (stats.errors.length > 0) {
      console.log("\nErrors encountered:");
      for (const error of stats.errors) {
        console.log(`  - ${error.filePath}: ${error.error}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Failed to run batch processor:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
