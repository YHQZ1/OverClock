import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema.js";

/** server/drizzle — the same path from src/db and dist/db. */
const MIGRATIONS = fileURLToPath(new URL("../../drizzle", import.meta.url));

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Connect, bring the schema up to date, and hand back the client. */
export async function connectDb(
  url: string,
): Promise<{ db: Db; close: () => Promise<void> }> {
  const sql = postgres(url, { max: 5, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return { db, close: () => sql.end({ timeout: 5 }) };
}
