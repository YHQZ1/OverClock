// Join a room as a bot player over Socket.IO — a sparring partner for testing.
// Usage: pnpm --filter @overclock/server exec tsx src/scripts/play.ts <CODE> [name] [url]

import { io, type Socket } from "socket.io-client";
import type {
  AttackId,
  ClientToServerEvents,
  GameActionPayload,
  ItemId,
  MatchView,
  RoomView,
  ServerToClientEvents,
  ThemeId,
} from "../types/contracts.js";

const [code, name = "Claude", url = "http://localhost:3000"] = process.argv.slice(2);
if (!code) {
  console.error("Usage: tsx src/scripts/play.ts <CODE> [name] [url]");
  process.exit(1);
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, { transports: ["websocket"] });
let room: RoomView | null = null;
let me = "";
let lastActAt = 0;
const handled = new Set<number>();
let builtThisRound = 0;

const log = (msg: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${msg}`);
const send = (action: GameActionPayload, why: string) => {
  socket.emit("game:action", action);
  log(`→ ${action.kind} ${action.item}  (${why})`);
};
const item = (m: MatchView, id: ItemId) => m.shop.find((s) => s.id === id)!;
const can = (m: MatchView, id: ItemId) => {
  const s = item(m, id);
  return s.affordable && s.cooldown === 0 && (s.kind !== "defence" || s.owned < s.max);
};

socket.on("connect", async () => {
  const res = await socket.timeout(5000).emitWithAck("room:join", { code, playerName: name });
  if (!res.ok) {
    log(`Couldn't join: ${res.error}`);
    process.exit(1);
  }
  me = res.data.playerId;
  room = res.data.room;
  log(`Joined room ${code} as ${name}. Readying up…`);
  await socket.timeout(5000).emitWithAck("room:ready", { ready: true });
});

socket.on("room:state", async (r) => {
  const prev = room?.phase;
  room = r;
  if (r.phase !== prev) log(`Phase: ${r.phase}${r.round ? ` (round ${r.round})` : ""}`);
  if (r.phase === "room") {
    const mine = r.players.find((p) => p.id === me);
    if (mine && !mine.ready && mine.slot) await socket.timeout(5000).emitWithAck("room:ready", { ready: true });
  }
  if (r.phase === "vote" && !r.votes[me]) {
    // Go with the most popular choice so far, else Results Day.
    const counts = new Map<ThemeId, number>();
    for (const t of Object.values(r.votes)) counts.set(t, (counts.get(t) ?? 0) + 1);
    const pick = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "results";
    log(`Voting for ${pick}`);
    await socket.timeout(5000).emitWithAck("vote:theme", { theme: pick });
  }
  if (r.phase === "roundResult" && prev !== "roundResult") {
    const last = r.rounds.at(-1)!;
    log(`Round ${last.round}: ${r.teamNames[1]} ${last.scores[1].total} vs ${r.teamNames[2]} ${last.scores[2].total}`);
  }
  if (r.phase === "final" && prev !== "final" && r.final) {
    log(`FINAL — ${r.teamNames[1]} ${r.final.totals[1].total} vs ${r.teamNames[2]} ${r.final.totals[2].total}. GG!`);
    setTimeout(() => process.exit(0), 1000);
  }
});

socket.on("match:state", (m) => {
  const now = Date.now();
  if (now - lastActAt < 500) return; // react about twice a second, like a person
  lastActAt = now;

  if (m.phase === "buy") {
    if (builtThisRound !== m.round) {
      builtThisRound = m.round;
      if (can(m, "secondRoute")) send({ kind: "buy", item: "secondRoute" }, "buy phase: protect the front door");
    }
    return;
  }
  if (m.me.downSecondsLeft !== null) return;

  // 1. Answer announced attacks once, ~2s before they land.
  for (const inc of m.incoming) {
    if (handled.has(inc.id) || inc.secondsLeft > 2.5) continue;
    handled.add(inc.id);
    const counter: Record<AttackId, GameActionPayload | null> = {
      bots: !m.me.owned.bouncer ? { kind: "buy", item: "bouncer" } : { kind: "use", item: "shield" },
      cutRoute: !m.me.owned.secondRoute ? { kind: "use", item: "shield" } : null,
      slowDb: m.me.owned.backupDb < 1 ? { kind: "buy", item: "backupDb" } : { kind: "use", item: "shield" },
      meltdown: { kind: "use", item: "shield" },
      surge: { kind: "use", item: "overclock" },
      flush: null,
    };
    const c = counter[inc.attack];
    if (c && can(m, c.item)) return send(c, `counter to incoming ${inc.attack}`);
  }

  // 2. Repairs.
  if (m.me.servers.some((s) => s.state === "melted") && can(m, "instantBackup")) {
    return send({ kind: "use", item: "instantBackup" }, "servers melted");
  }
  if (m.me.health < 35 && can(m, "repair")) return send({ kind: "use", item: "repair" }, `health ${m.me.health}`);

  // 3. Scale to what the map shows.
  const booting = m.me.servers.filter((s) => s.state === "booting").length;
  const idle = m.me.servers.filter((s) => s.state === "idle").length;
  if (m.me.bottleneck === "servers" && booting < 2 && can(m, "server")) return send({ kind: "buy", item: "server" }, "servers are the bottleneck");
  if (m.me.bottleneck === "db" && can(m, "backupDb")) return send({ kind: "buy", item: "backupDb" }, "database is the bottleneck");
  if (!m.me.bottleneck && idle >= 2 && booting === 0) return send({ kind: "sell", item: "server" }, `${idle} servers idle`);
  if (m.me.servers.length > 5 && !m.me.owned.splitter && can(m, "splitter")) return send({ kind: "buy", item: "splitter" }, "lots of servers");

  // 4. Attack with spare coins — pick what they aren't protected against.
  if (m.me.coins >= 420) {
    const them = m.them.owned;
    const ranked: AttackId[] = [
      ...(them.secondRoute ? [] : (["cutRoute"] as const)),
      ...(them.bouncer ? [] : (["bots"] as const)),
      ...(them.backupDb ? [] : (["slowDb"] as const)),
      "meltdown",
      "surge",
      ...(them.shelf ? (["flush"] as const) : []),
    ];
    const pick = ranked.find((a) => can(m, a));
    if (pick) send({ kind: "attack", item: pick }, `spare coins (${m.me.coins})`);
  }
});

socket.on("match:event", (events) => {
  for (const e of events) {
    if (e.type === "attackLanded") log(e.side === m_side() ? `✗ hit by ${e.attack}` : `✓ our ${e.attack} landed`);
    if (e.type === "attackBlocked") log(e.side === m_side() ? `✓ blocked their ${e.attack}` : `✗ they blocked our ${e.attack}`);
    if (e.type === "crashed") log(e.side === m_side() ? "✗ our site went down" : "✓ their site went down");
  }
});

function m_side(): 1 | 2 | null {
  const slot = room?.players.find((p) => p.id === me)?.slot;
  return slot ? (slot <= 2 ? 1 : 2) : null;
}

socket.on("disconnect", () => log("Disconnected."));
