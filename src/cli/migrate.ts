import * as path from "node:path";
import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getDatabase } from "@/core/adapters/drizzleSqlite/client";
import { getConfigOrEnv } from "./config";
import { getProjectRoot } from "./util";

const { databaseFileName } = getConfigOrEnv();

if (!databaseFileName) {
  throw new Error(
    "DATABASE_FILE_NAME not found in configuration or environment variables.",
  );
}

const projectRoot = getProjectRoot();
const db = getDatabase(databaseFileName);

await migrate(db, {
  migrationsFolder: path.join(
    projectRoot,
    "src/core/adapters/drizzleSqlite/migrations",
  ),
});
