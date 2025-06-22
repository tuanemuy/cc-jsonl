import path from "node:path";
import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const client = new PGlite(process.env.PGLITE_DATABASE_DIR);
const db = drizzle({ client });

await migrate(db, {
  migrationsFolder: path.join(
    process.cwd(),
    "src/core/adapters/drizzlePglite/migrations",
  ),
});
