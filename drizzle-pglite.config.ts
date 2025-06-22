import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.PGLITE_DATABASE_DIR;

if (!url) {
  throw new Error("PGLITE_DATABASE_DIR environment variable is not set.");
}

export default defineConfig({
  out: "./src/core/adapters/drizzlePglite/migrations",
  schema: "./src/core/adapters/drizzlePglite/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
