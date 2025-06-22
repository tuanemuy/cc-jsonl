#!/usr/bin/env node

import "dotenv/config";
import { startWatcher, stopWatcher } from "@/core/application/watcher";
import { getWatcherContext } from "./watcherContext";

async function main() {
  try {
    const { context, targetDir } = getWatcherContext();

    const watcherConfig = {
      targetDirectory: targetDir,
      pattern: "**/*.jsonl",
      ignoreInitial: false,
      persistent: true,
      stabilityThreshold: 1000,
      pollInterval: 100,
    };

    const result = await startWatcher(context, { config: watcherConfig });

    if (result.isErr()) {
      console.error("Failed to start file watcher:", result.error);
      process.exit(1);
    }

    process.on("SIGINT", async () => {
      console.log("\nShutting down...");
      const stopResult = await stopWatcher(context);
      if (stopResult.isErr()) {
        console.error("Failed to stop watcher:", stopResult.error);
        process.exit(1);
      }
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start file watcher:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
