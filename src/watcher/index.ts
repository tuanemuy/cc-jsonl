#!/usr/bin/env node

import { join } from "node:path";
import { watch } from "chokidar";
import { getWatcherContext } from "./context";
import { processLogFile } from "./processor";

async function main() {
  console.log("Starting Claude Code Log Watcher...");

  try {
    const { context, targetDir } = getWatcherContext();

    console.log(`Watching directory: ${targetDir}`);
    console.log("Pattern: **/*.jsonl");

    const watchPattern = join(targetDir, "**/*.jsonl");

    const watcher = watch(watchPattern, {
      persistent: true,
      ignoreInitial: false,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    });

    watcher.on("add", async (filePath) => {
      console.log(`File added: ${filePath}`);
      await processLogFile(context, filePath);
    });

    watcher.on("change", async (filePath) => {
      console.log(`File changed: ${filePath}`);
      await processLogFile(context, filePath);
    });

    watcher.on("error", (error) => {
      console.error("Watcher error:", error);
    });

    watcher.on("ready", () => {
      console.log("File watcher is ready and watching for changes...");
    });

    process.on("SIGINT", () => {
      console.log("\nShutting down file watcher...");
      watcher.close().then(() => {
        console.log("File watcher closed.");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start file watcher:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
