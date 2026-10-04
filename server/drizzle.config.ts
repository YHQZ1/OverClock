import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` turns schema changes into SQL migrations in server/drizzle.
// The server applies them itself on start.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
