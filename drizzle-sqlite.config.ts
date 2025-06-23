import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_FILE_NAME;

if (!url) {
  throw new Error("DATABASE_FILE_NAME environment variable is not set.");
}

export default defineConfig({
  out: "./src/core/adapters/drizzleSqlite/migrations",
  schema: "./src/core/adapters/drizzleSqlite/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${url}`,
  },
});
