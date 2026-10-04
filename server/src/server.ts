import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { DEFAULT_TIMING } from "./config/game.js";
import { createRealtime } from "./realtime.js";
import { ROUNDS } from "./sim/index.js";
import { logger } from "./utils/logger.js";

const env = loadEnv();
const http = createServer(createApp(env));
const realtime = env.FAST_ROUNDS
  ? createRealtime(http, { ...DEFAULT_TIMING, buySec: 5, resultSec: 4 }, { rounds: ROUNDS.map((r) => ({ ...r, durationSec: 20 })) })
  : createRealtime(http);
if (env.FAST_ROUNDS) logger.warn("FAST_ROUNDS is on — short rounds for testing");

http.listen(env.PORT, () => logger.info(`Overclock server listening on :${env.PORT}`, { env: env.NODE_ENV }));

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  logger.info(`${signal} received, shutting down`);
  await realtime.close(); // also closes the HTTP server
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
