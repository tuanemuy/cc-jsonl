#!/usr/bin/env node

import "dotenv/config";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { cli, define } from "gunshi";
import { batchProcessLogFiles } from "@/core/application/watcher";
import { version } from "../../package.json";
import { getWatcherContext } from "../watcher/watcherContext";
import {
  type Config,
  getDefaultDatabasePath,
  getDefaultTargetDir,
  hasConfig,
  loadConfig,
  saveConfig,
} from "./config";
import { getProjectRoot } from "./util";

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
  options: {
    stdio?: "inherit" | "pipe";
    cwd?: string;
    env?: { [key: string]: string };
  } = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio || "inherit",
      shell: true,
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
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
    console.log(`  ⏭  Skipped: ${stats.skippedFiles}`);
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
      negatable: true,
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
    if (!hasConfig() && !process.env.DATABASE_FILE_NAME) {
      console.error(
        "No configuration found. Please run 'setup' command first.",
      );
      console.error("");
      console.error("Example: cc-jsonl setup");
      process.exit(1);
    }

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
    console.log(`⏭  Skipped: ${stats.skippedFiles}`);
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
      negatable: true,
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
    if (!hasConfig() && !process.env.DATABASE_FILE_NAME) {
      console.error(
        "No configuration found. Please run 'setup' command first.",
      );
      console.error("");
      console.error("Example: cc-jsonl setup");
      process.exit(1);
    }

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
      description:
        "Port to run the production server on (overrides configured port)",
    },
  },
  run: async (ctx) => {
    const { port: argPort } = ctx.values;

    const pathToClaudeCodeExecutable = path.join(
      getProjectRoot(),
      "../@anthropic-ai/claude-code/cli.js",
    );

    // Load configuration to get the port setting
    const config = loadConfig();
    const configuredPort = config?.port || 3000;
    const port = (argPort as number | undefined) || configuredPort;

    console.log(`Starting production server on port ${port}...`);

    try {
      const projectRoot = getProjectRoot();

      // Run database migrations before starting the server
      console.log("Running database migrations...");
      const migrationExitCode = await spawnCommand(
        "node",
        ["dist/cli/migrate.mjs"],
        {
          cwd: projectRoot,
        },
      );

      if (migrationExitCode !== 0) {
        console.error("❌ Database migration failed!");
        process.exit(1);
      }

      console.log("✅ Database migrations completed successfully!");

      // Start the web server
      const exitCode = await spawnCommand("npm", ["run", "start:web"], {
        cwd: projectRoot,
        env: {
          PORT: String(port),
          DATABASE_FILE_NAME:
            config?.databaseFileName || getDefaultDatabasePath(),
          PATH_TO_CLAUDE_CODE_EXECUTABLE: pathToClaudeCodeExecutable,
        },
      });
      process.exit(exitCode);
    } catch (error) {
      console.error("Failed to start production server:", error);
      process.exit(1);
    }
  },
});

const setupCommand = define({
  name: "setup",
  description: "Initialize configuration and run database migrations",
  args: {
    databaseFile: {
      type: "string",
      short: "d",
      description:
        "Database file path (default: $XDG_CONFIG_HOME/cc-jsonl/data.db or ~/.config/cc-jsonl/data.db)",
    },
    watchDir: {
      type: "string",
      short: "w",
      description:
        "Directory to watch for log files (default: $XDG_CONFIG_HOME/claude/projects or ~/.claude/projects)",
    },
    port: {
      type: "number",
      short: "p",
      default: 3000,
      description: "Port for the production server",
    },
    force: {
      type: "boolean",
      short: "f",
      default: false,
      description: "Force overwrite existing configuration",
    },
  },
  run: async (ctx) => {
    const { databaseFile, watchDir, port, force } = ctx.values;

    if (hasConfig() && !force) {
      console.error("Configuration already exists. Use --force to overwrite.");
      process.exit(1);
    }

    const defaultDbPath = getDefaultDatabasePath();
    const defaultWatchDir = getDefaultTargetDir();

    const config: Config = {
      databaseFileName: (databaseFile as string) || defaultDbPath,
      watchTargetDir: (watchDir as string) || defaultWatchDir,
      port: (port as number) || 3000,
    };

    console.log("Setting up Claude Code Watcher...");
    console.log("");
    console.log("Configuration:");
    console.log(`  Database file: ${config.databaseFileName}`);
    console.log(`  Watch directory: ${config.watchTargetDir}`);
    console.log(`  Port: ${config.port}`);
    console.log("");

    try {
      saveConfig(config);
      console.log("✅ Configuration saved successfully!");

      // Create database directory if it doesn't exist
      const dbDir = path.dirname(config.databaseFileName);
      const fs = await import("node:fs");
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      console.log("");
      console.log("Running database migrations...");

      const projectRoot = getProjectRoot();
      const exitCode = await spawnCommand("node", ["dist/cli/migrate.mjs"], {
        cwd: projectRoot,
      });

      if (exitCode !== 0) {
        console.error("❌ Database migration failed!");
        process.exit(1);
      }

      console.log("✅ Database migrations completed successfully!");

      console.log("");
      console.log("Setup completed! You can now run:");
      console.log("  cc-jsonl batch  - Process files once");
      console.log("  cc-jsonl watch  - Process files periodically");
      console.log("  cc-jsonl start  - Start production server");
    } catch (error) {
      console.error("Setup failed:", error);
      process.exit(1);
    }
  },
});

const mainCommand = define({
  name: "cc-jsonl",
  description: "CLI for Claude Code production server and log processing",
  run: (_ctx) => {
    console.log("Claude Code Unified CLI");
    console.log("");
    console.log("Available commands:");
    console.log("  setup   Initialize configuration and database");
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
    // Setup command
    subCommands.set("setup", setupCommand);

    // Watcher commands
    subCommands.set("batch", batchCommand);
    subCommands.set("watch", watchCommand);

    // Web production server
    subCommands.set("start", startCommand);

    await cli(process.argv.slice(2), mainCommand, {
      name: "cc-jsonl",
      version,
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
