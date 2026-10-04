import { fileURLToPath } from "node:url";
import { z } from "zod";

const defaultWebDist = fileURLToPath(new URL("../../../web/dist", import.meta.url));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_DIST: z.string().default(defaultWebDist),
  /** Dev only: short buy phases and rounds, for quick testing. */
  FAST_ROUNDS: z.stringbool().default(false),
  /** Round length when FAST_ROUNDS is on. */
  FAST_ROUND_SEC: z.coerce.number().int().min(5).max(120).default(20),
  /** Postgres for results. Unset in dev: results live in memory until restart. Required in production. */
  DATABASE_URL: z.url().optional(),
}).refine((env) => env.NODE_ENV !== "production" || env.DATABASE_URL, {
  message: "DATABASE_URL is required in production",
  path: ["DATABASE_URL"],
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
