import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/watcher/index.ts"],
    dts: true,
  },
]);
