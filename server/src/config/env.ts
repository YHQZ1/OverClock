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
  /** Dev only: play this many rounds instead of 3 (`pnpm dev:round` sets 1). */
  DEV_ROUNDS: z.coerce.number().int().min(1).max(3).default(3),
  /** Postgres for results. Unset in dev: results live in memory until restart. Required in production. */
  DATABASE_URL: z.url().optional(),
  /** Staff passcode for /admin, /live and /leaderboard. Dev default "admin"; production must set a real one. */
  ADMIN_PASSCODE: z.string().min(1).default("admin"),
})
  .refine((env) => env.NODE_ENV !== "production" || env.DATABASE_URL, {
    message: "DATABASE_URL is required in production",
    path: ["DATABASE_URL"],
  })
  .refine((env) => env.NODE_ENV !== "production" || env.DEV_ROUNDS === 3, {
    message: "DEV_ROUNDS is for development only — a real match is three rounds",
    path: ["DEV_ROUNDS"],
  })
  .refine((env) => env.NODE_ENV !== "production" || (env.ADMIN_PASSCODE.length >= 8 && env.ADMIN_PASSCODE !== "change-me"), {
    message: "ADMIN_PASSCODE must be set to a real passcode (8+ characters) in production",
    path: ["ADMIN_PASSCODE"],
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
