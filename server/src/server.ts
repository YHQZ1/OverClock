import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { DEFAULT_TIMING } from "./config/game.js";
import { connectDb } from "./db/client.js";
import { createRealtime } from "./realtime.js";
import { AdminService } from "./services/admin.service.js";
import { Metrics } from "./services/metrics.js";
import { MemoryResultStore, PgResultStore, type ResultStore } from "./services/result.store.js";
import { ROUNDS } from "./sim/index.js";
import { logger } from "./utils/logger.js";

// Local settings (server/.env); on Render they come from the environment.
// Test runs (e2e, load) skip it, so they never write to your dev leaderboard.
if (process.env.NODE_ENV !== "test" && existsSync(".env")) process.loadEnvFile(".env");

const env = loadEnv();
const metrics = new Metrics();

let store: ResultStore;
if (env.DATABASE_URL) {
  try {
    const { db, close } = await connectDb(env.DATABASE_URL);
    store = new PgResultStore(db, close);
    logger.info("results database ready");
  } catch (err) {
    const host = new URL(env.DATABASE_URL).host;
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const why = cause?.code === "ECONNREFUSED" ? "nothing is running there" : (cause?.message ?? String(err));
    logger.error(`Can't reach the results database at ${host} — ${why}.`);
    logger.error("Start it with `pnpm db:up` (Docker must be running), or remove DATABASE_URL from server/.env to keep results in memory.");
    process.exit(1);
  }
} else {
  store = new MemoryResultStore();
  logger.warn("DATABASE_URL not set — results are kept in memory until the server restarts");
}

const admin = new AdminService(env.ADMIN_PASSCODE);
const http = createServer(createApp(env, metrics, admin));
const timing = env.FAST_ROUNDS ? { ...DEFAULT_TIMING, buySec: 5, resultSec: 4 } : DEFAULT_TIMING;
const played = ROUNDS.slice(0, env.DEV_ROUNDS);
const deps = env.FAST_ROUNDS || env.DEV_ROUNDS < ROUNDS.length
  ? { rounds: played.map((r) => (env.FAST_ROUNDS ? { ...r, durationSec: env.FAST_ROUND_SEC } : r)) }
  : {};
const realtime = createRealtime(http, timing, deps, { metrics, store, admin });
if (env.FAST_ROUNDS) logger.warn("FAST_ROUNDS is on — short rounds for testing");
if (env.DEV_ROUNDS < ROUNDS.length) logger.warn(`DEV_ROUNDS=${env.DEV_ROUNDS} — matches end after ${env.DEV_ROUNDS} round(s)`);

http.listen(env.PORT, () => logger.info(`Overclock server listening on :${env.PORT}`, { env: env.NODE_ENV }));

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  logger.info(`${signal} received, shutting down`);
  await realtime.close(); // also closes the HTTP server and the database
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
