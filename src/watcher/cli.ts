#!/usr/bin/env node

import "dotenv/config";
import { spawn } from "node:child_process";
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
  intervalMinutes?: number;
}

function spawnCommand(
  command: string,
  args: string[] = [],
  options: { stdio?: "inherit" | "pipe" } = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio || "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      resolve(code || 0);
    });

    child.on("error", (error) => {
      reject(error);
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      child.kill("SIGINT");
    });

    process.on("SIGTERM", () => {
      child.kill("SIGTERM");
    });
  });
}

async function runBatchProcessing(config: ProcessorConfig) {
  if (isRunning) {
    console.log("Batch processing already running, skipping this cycle");
    return;
  }

  isRunning = true;
  try {
    const { context } = getWatcherContext();

    console.log(`[${new Date().toISOString()}] Starting batch processing...`);

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
      `[${new Date().toISOString()}] Failed to run batch processor:`,
      error,
    );
  } finally {
    isRunning = false;
  }
}

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
    const { targetDir: defaultTargetDir } = getWatcherContext();

    const targetDir =
      (targetDirectory as string | undefined) || defaultTargetDir;

    console.log("Starting batch processing of log files...");
    console.log(`Target directory: ${targetDir}`);
    console.log(`Pattern: ${pattern}`);
    console.log(`Max concurrency: ${maxConcurrency}`);
    console.log(`Skip existing: ${skipExisting}`);

    const { context } = getWatcherContext();

    const result = await batchProcessLogFiles(context, {
      targetDirectory: targetDir,
      pattern: pattern as string,
      maxConcurrency: maxConcurrency as number,
      skipExisting: skipExisting as boolean,
    });

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

    const intervalMs = (config.intervalMinutes || 60) * 60 * 1000;

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

    // Keep the process running
    return new Promise(() => {});
  },
});

const startCommand = define({
  name: "start",
  description: "Start the production server",
  args: {
    port: {
      type: "number",
      short: "p",
      default: 3000,
      description: "Port to run the production server on",
    },
  },
  run: async (ctx) => {
    const { port } = ctx.values;
    const args = ["start"];

    if (port !== 3000) {
      args.push("--port", String(port));
    }

    console.log(`Starting production server on port ${port}...`);

    try {
      const exitCode = await spawnCommand("next", args);
      process.exit(exitCode);
    } catch (error) {
      console.error("Failed to start production server:", error);
      process.exit(1);
    }
  },
});

const mainCommand = define({
  name: "claude-code-watcher",
  description: "CLI for Claude Code production server and log processing",
  run: (_ctx) => {
    console.log("Claude Code Unified CLI");
    console.log("");
    console.log("Available commands:");
    console.log("  start   Start production server");
    console.log("  batch   Process log files once");
    console.log("  watch   Process log files periodically");
    console.log("");
    console.log("Use --help with any command for more details");
  },
});

async function main() {
  try {
    const subCommands = new Map();
    // Watcher commands
    subCommands.set("batch", batchCommand);
    subCommands.set("watch", watchCommand);

    // Web production server
    subCommands.set("start", startCommand);

    await cli(process.argv.slice(2), mainCommand, {
      name: "claude-code-watcher",
      version: "1.0.0",
      description: "CLI for Claude Code production server and log processing",
      subCommands,
    });
  } catch (error) {
    console.error("Failed to run CLI:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
