import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { getConfigOrEnv } from "./src/watcher/config";

const { databaseFileName } = getConfigOrEnv();

if (!databaseFileName) {
  throw new Error(
    "DATABASE_FILE_NAME not found in configuration or environment variables.",
  );
}

export default defineConfig({
  out: "./src/core/adapters/drizzleSqlite/migrations",
  schema: "./src/core/adapters/drizzleSqlite/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${databaseFileName}`,
  },
});
