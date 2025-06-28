#!/usr/bin/env node

import "dotenv/config";
import { cli, define } from "gunshi";
import { batchProcessLogFiles } from "@/core/application/watcher";
import { getWatcherContext } from "./watcherContext";

const batchCommand = define({
  name: "batch",
  description: "Process Claude Code log files once and exit",
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
  },
  run: async (ctx) => {
    const { targetDirectory, maxConcurrency, skipExisting, pattern } =
      ctx.values;
    const { context, targetDir: defaultTargetDir } = getWatcherContext();

    const targetDir =
      (targetDirectory as string | undefined) || defaultTargetDir;

    console.log("Starting batch processing of log files...");
    console.log(`Target directory: ${targetDir}`);
    console.log(`Pattern: ${pattern}`);
    console.log(`Max concurrency: ${maxConcurrency}`);
    console.log(`Skip existing: ${skipExisting}`);

    const batchConfig = {
      targetDirectory: targetDir,
      pattern: pattern as string,
      maxConcurrency: maxConcurrency as number,
      skipExisting: skipExisting as boolean,
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
  },
});

async function main() {
  try {
    await cli(process.argv.slice(2), batchCommand, {
      name: "claude-code-batch",
      version: "1.0.0",
      description: "Claude Code log file batch processor",
    });
  } catch (error) {
    console.error("Failed to run batch processor:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
