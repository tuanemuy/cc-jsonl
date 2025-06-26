#!/usr/bin/env node

import "dotenv/config";
import { parseArgs } from "node:util";
import { batchProcessLogFiles } from "@/core/application/watcher";
import { getWatcherContext } from "./watcherContext";

function parseArguments() {
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
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: node batchProcessor.mjs [options] [target-directory]

Options:
  -h, --help              Show this help message
  -c, --maxConcurrency    Maximum number of files to process concurrently (default: 5)
  -s, --skipExisting      Skip files that have already been processed (default: true)
      --no-skipExisting   Force processing of all files
  -p, --pattern          File pattern to match (default: **/*.jsonl)

Arguments:
  target-directory        Directory to process (uses WATCH_TARGET_DIR if not specified)

Examples:
  node batchProcessor.mjs /path/to/logs
  node batchProcessor.mjs -c 10 --no-skipExisting /path/to/logs
  node batchProcessor.mjs --pattern "*.jsonl" /path/to/logs
`);
    process.exit(0);
  }

  return {
    maxConcurrency: Number(values.maxConcurrency),
    skipExisting: values.skipExisting,
    pattern: values.pattern,
    targetDirectory: positionals[0],
  };
}

async function main() {
  try {
    const args = parseArguments();
    const { context, targetDir: defaultTargetDir } = getWatcherContext();

    const targetDir = args.targetDirectory || defaultTargetDir;

    console.log("Starting batch processing of log files...");
    console.log(`Target directory: ${targetDir}`);
    console.log(`Pattern: ${args.pattern}`);
    console.log(`Max concurrency: ${args.maxConcurrency}`);
    console.log(`Skip existing: ${args.skipExisting}`);

    const batchConfig = {
      targetDirectory: targetDir,
      pattern: args.pattern,
      maxConcurrency: args.maxConcurrency,
      skipExisting: args.skipExisting,
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
