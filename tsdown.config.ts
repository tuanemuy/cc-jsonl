import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: [
      "./src/watcher/index.ts",
      "./src/watcher/batchProcessor.ts",
      "./src/watcher/periodicBatchProcessor.ts",
      "./src/cli/cli.ts",
      "./src/cli/migrate.ts",
    ],
    dts: true,
  },
]);
