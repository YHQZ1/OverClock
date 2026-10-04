// Load test: many rooms of bot players play full matches at once against a
// real server, while we watch its tick time and responsiveness.
//
//   pnpm --filter @overclock/server test:load              # 30 rooms (≈ 75 players), spawns its own server
//   LOAD_ROOMS=30 pnpm --filter @overclock/server test:load
//   LOAD_URL=https://… pnpm … test:load                     # hit an already-running server instead
//
// Exits non-zero if any match fails to finish, any player hits an error, or the
// server gets slow (thresholds below). Target: a full lab (~40 PCs ≈ 20 matches) × 1.5 = 30 rooms.

import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runBot, type BotResult } from "../../src/scripts/botClient.js";
import type { MetricsSnapshot } from "../../src/services/metrics.js";

const ROOMS = Number(process.env.LOAD_ROOMS ?? 30);
const TWO_V_TWO_EVERY = 4; // every 4th room is 2v2, the rest 1v1
const ROUND_SEC = Number(process.env.LOAD_ROUND_SEC ?? 15);
const PORT = Number(process.env.LOAD_PORT ?? 3210);
const BASE = process.env.LOAD_URL ?? `http://localhost:${PORT}`;

const LIMITS = {
  tickP95Ms: 25, // one game-loop tick for every live match (budget is 100 ms)
  tickMaxMs: 100,
  lagP95Ms: 50, // how late the server's timers fire
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (msg: string) => console.log(`${new Date().toISOString().slice(11, 19)}  ${msg}`);

async function startServer(): Promise<ChildProcess | null> {
  if (process.env.LOAD_URL) return null;
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT), FAST_ROUNDS: "1", FAST_ROUND_SEC: String(ROUND_SEC), NODE_ENV: "test" },
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return child;
    } catch {
      // not up yet
    }
    await sleep(200);
  }
  child.kill();
  throw new Error("Server didn't start");
}

const metrics = async (): Promise<MetricsSnapshot> => (await fetch(`${BASE}/api/metrics`)).json() as Promise<MetricsSnapshot>;

/** One room: a creator plus joiners, all playing to the final. */
async function playRoom(i: number): Promise<BotResult[]> {
  const size = i % TWO_V_TWO_EVERY === 0 ? 4 : 2;
  let shareCode!: (code: string) => void;
  const code = new Promise<string>((r) => (shareCode = r));
  const creator = runBot({ url: BASE, name: `R${i}-P1`, waitFor: size, onCode: shareCode });
  const c = await code;
  const joiners = Array.from({ length: size - 1 }, (_, j) => runBot({ url: BASE, name: `R${i}-P${j + 2}`, code: c, waitFor: size }));
  return Promise.all([creator, ...joiners]);
}

const server = await startServer();
log(`Load test: ${ROOMS} rooms (every ${TWO_V_TWO_EVERY}th is 2v2), ${ROUND_SEC}s rounds, against ${BASE}`);

let peakPlayers = 0;
let polling = true;
const poller = (async () => {
  while (polling) {
    const m = await metrics().catch(() => null);
    if (m) peakPlayers = Math.max(peakPlayers, m.players);
    if (m) log(`rooms ${m.rooms} · players ${m.players} · live ${m.liveMatches} · tick p95 ${m.tickMs.p95}ms max ${m.tickMs.max}ms · lag p95 ${m.eventLoopLagMs.p95}ms`);
    await sleep(3000);
  }
})();

const started = Date.now();
const rooms = await Promise.all(Array.from({ length: ROOMS }, (_, i) => sleep(i * 150).then(() => playRoom(i))));
polling = false;
await poller;
const end = await metrics();
server?.kill();

const bots = rooms.flat();
const unfinished = rooms.filter((room) => room.some((b) => !b.final?.recorded)).length;
const errors = bots.flatMap((b) => b.errors.map((e) => `${b.code}: ${e}`));
const failures = [
  unfinished > 0 && `${unfinished} of ${ROOMS} matches didn't finish properly`,
  errors.length > 0 && `${errors.length} player errors (first: ${errors[0]})`,
  end.tickMs.p95 > LIMITS.tickP95Ms && `tick p95 ${end.tickMs.p95}ms > ${LIMITS.tickP95Ms}ms`,
  end.tickMs.max > LIMITS.tickMaxMs && `tick max ${end.tickMs.max}ms > ${LIMITS.tickMaxMs}ms`,
  end.eventLoopLagMs.p95 > LIMITS.lagP95Ms && `event-loop lag p95 ${end.eventLoopLagMs.p95}ms > ${LIMITS.lagP95Ms}ms`,
].filter(Boolean);

console.log(`
| Measure | Result | Limit |
|---|---:|---:|
| Matches finished | ${ROOMS - unfinished} / ${ROOMS} | all |
| Players (peak) | ${peakPlayers} | — |
| Player actions | ${bots.reduce((n, b) => n + b.actions, 0)} | — |
| Game-loop tick p50 / p95 / max | ${end.tickMs.p50} / ${end.tickMs.p95} / ${end.tickMs.max} ms | p95 ≤ ${LIMITS.tickP95Ms}, max ≤ ${LIMITS.tickMaxMs} |
| Event-loop lag p50 / p95 / max | ${end.eventLoopLagMs.p50} / ${end.eventLoopLagMs.p95} / ${end.eventLoopLagMs.max} ms | p95 ≤ ${LIMITS.lagP95Ms} |
| Player errors | ${errors.length} | 0 |
| Duration | ${Math.round((Date.now() - started) / 1000)}s | — |
`);
if (failures.length) {
  console.error(`LOAD TEST FAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("LOAD TEST PASSED");
process.exit(0);
