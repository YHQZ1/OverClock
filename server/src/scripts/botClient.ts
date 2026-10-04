// A bot player that connects over Socket.IO exactly like a lab PC: create or
// join a room, ready up, vote, play three rounds, finish. Used by play.ts (a
// sparring partner) and the load test (many at once). Dev tooling only.

import { io, type Socket } from "socket.io-client";
import { THEMES } from "../config/game.js";
import type {
  AttackId,
  ClientToServerEvents,
  FinalSummary,
  GameActionPayload,
  ItemId,
  MatchView,
  RoomView,
  ServerToClientEvents,
  ThemeId,
} from "../types/contracts.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

export type BotOptions = {
  url: string;
  name: string;
  /** Join this room; omit to create one. */
  code?: string;
  /** Only ready up once the room has this many players (2 = 1v1, 4 = 2v2). */
  waitFor?: number;
  /** Called with the room code as soon as it's known (creators share it this way). */
  onCode?: (code: string) => void;
  log?: (msg: string) => void;
  /** React at most this often, like a person (ms). */
  reactionMs?: number;
};

export type BotResult = {
  code: string;
  final: FinalSummary | null;
  actions: number;
  matchFrames: number;
  /** Ack failures and unexpected disconnects. */
  errors: string[];
};

const can = (m: MatchView, id: ItemId) => {
  const s = m.shop.find((x) => x.id === id);
  return !!s && s.affordable && s.cooldown === 0 && (s.kind !== "defence" || s.owned < s.max);
};

/** Decide what to press this frame — the same strategy as the "balanced" engine bot, from the screen's point of view. */
function decide(m: MatchView, memo: { handled: Set<number>; built: number; sent: number }): [GameActionPayload, string] | null {
  if (m.phase === "buy") {
    if (memo.built === m.round) return null;
    memo.built = m.round;
    return can(m, "lockAddress") ? [{ kind: "buy", item: "lockAddress" }, "buy phase: nobody steals my visitors"] : null;
  }
  if (m.me.downSecondsLeft !== null || m.me.effects.some((e) => e.kind === "jam")) return null;

  // 1. Answer announced attacks once, ~2s before they land.
  const shield: GameActionPayload = { kind: "use", item: "shield" };
  for (const inc of m.incoming) {
    if (memo.handled.has(inc.id) || inc.secondsLeft > 2.5) continue;
    memo.handled.add(inc.id);
    const counter: Record<AttackId, GameActionPayload | null> = {
      bots: !m.me.owned.bouncer ? { kind: "buy", item: "bouncer" } : shield,
      slowDb: m.me.owned.backupDb < 1 ? { kind: "buy", item: "backupDb" } : shield,
      surge: { kind: "use", item: "overclock" },
      slowServers: { kind: "use", item: "overclock" },
      breakSplitter: m.me.owned.splitter ? null : shield,
      blindfold: m.me.owned.backupMonitor ? null : shield,
      wrongTurn: m.me.owned.lockAddress ? null : shield,
      destroy: shield,
      jam: shield,
    };
    const c = counter[inc.attack];
    if (c && can(m, c.item)) return [c, `counter to incoming ${inc.attack}`];
  }

  // 2. Repairs.
  if (m.me.servers.some((s) => s.state === "wrecked") && can(m, "instantBackup")) return [{ kind: "use", item: "instantBackup" }, "servers wrecked"];
  if (m.me.health < 35 && can(m, "repair")) return [{ kind: "use", item: "repair" }, `health ${m.me.health}`];

  // 3. Scale to what the map shows.
  const booting = m.me.servers.filter((s) => s.state === "booting").length;
  const idle = m.me.servers.filter((s) => s.state === "idle").length;
  if (m.me.bottleneck === "servers" && booting < 2 && can(m, "server")) return [{ kind: "buy", item: "server" }, "servers are the bottleneck"];
  if (m.me.bottleneck === "db" && can(m, "backupDb")) return [{ kind: "buy", item: "backupDb" }, "database is the bottleneck"];
  if (!m.me.bottleneck && idle >= 2 && booting === 0) return [{ kind: "sell", item: "server" }, `${idle} servers idle`];
  if (m.me.servers.length > 5 && !m.me.owned.splitter && can(m, "splitter")) return [{ kind: "buy", item: "splitter" }, "lots of servers"];

  // 4. Attack with spare coins — rotate, skipping what they're protected against.
  if (m.me.coins >= 420) {
    const them = m.them.owned;
    const all: AttackId[] = [
      ...(them.lockAddress ? [] : (["wrongTurn"] as const)),
      ...(them.backupMonitor ? [] : (["blindfold"] as const)),
      ...(them.bouncer ? [] : (["bots"] as const)),
      ...(them.backupDb ? [] : (["slowDb"] as const)),
      ...(them.splitter ? [] : (["breakSplitter"] as const)),
      "jam",
      "destroy",
      "slowServers",
      "surge",
    ];
    const offset = memo.sent % all.length;
    const pick = [...all.slice(offset), ...all.slice(0, offset)].find((a) => can(m, a));
    if (pick) {
      memo.sent++;
      return [{ kind: "attack", item: pick }, `spare coins (${m.me.coins})`];
    }
  }
  return null;
}

/** Play one whole match. Resolves at the final screen (or on a fatal error). */
export function runBot(opts: BotOptions): Promise<BotResult> {
  const log = opts.log ?? (() => {});
  const reaction = opts.reactionMs ?? 500;
  const socket: Client = io(opts.url, { transports: ["websocket"], forceNew: true, reconnection: false });
  const result: BotResult = { code: opts.code ?? "", final: null, actions: 0, matchFrames: 0, errors: [] };
  const memo = { handled: new Set<number>(), built: 0, sent: 0 };
  let room: RoomView | null = null;
  let me = "";
  let lastActAt = 0;
  let readied = false;
  let voted = false;
  let briefed = false;

  return new Promise((resolve) => {
    const finish = () => {
      socket.disconnect();
      resolve(result);
    };
    const ack = async <T>(event: string, payload: object): Promise<T | null> => {
      try {
        const emit = socket.timeout(8000).emitWithAck.bind(socket.timeout(8000)) as (e: string, p: object) => Promise<{ ok: boolean; data?: T; error?: string }>;
        const res = await emit(event, payload);
        if (!res.ok) result.errors.push(`${event}: ${res.error}`);
        return res.ok ? (res.data ?? null) : null;
      } catch (err) {
        result.errors.push(`${event}: ${String(err)}`);
        return null;
      }
    };
    const maybeReady = async (r: RoomView) => {
      if (readied || r.phase !== "room") return;
      if (r.players.length < (opts.waitFor ?? 2)) return;
      readied = true;
      await ack("room:ready", { ready: true });
    };

    socket.on("connect", async () => {
      const joined = opts.code
        ? await ack<{ playerId: string; room: RoomView }>("room:join", { code: opts.code, playerName: opts.name })
        : await ack<{ playerId: string; room: RoomView }>("room:create", { playerName: opts.name });
      if (!joined) return finish();
      me = joined.playerId;
      room = joined.room;
      result.code = room.code;
      opts.onCode?.(room.code);
      log(`${opts.name} in room ${room.code}`);
      await maybeReady(room);
    });

    socket.on("connect_error", (err) => {
      result.errors.push(`connect: ${err.message}`);
      finish();
    });
    socket.on("disconnect", (reason) => {
      if (!result.final && reason !== "io client disconnect") result.errors.push(`disconnected: ${reason}`);
    });

    socket.on("room:state", async (r) => {
      const prev = room?.phase;
      room = r;
      await maybeReady(r);
      if (r.phase === "vote" && !r.votes[me] && !voted) {
        voted = true; // room updates keep arriving while our vote is in flight — vote once
        const counts = new Map<ThemeId, number>();
        for (const t of Object.values(r.votes)) counts.set(t, (counts.get(t) ?? 0) + 1);
        const pick = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? THEMES[0];
        await ack("vote:theme", { theme: pick });
      }
      if (r.phase === "briefing" && !briefed) {
        briefed = true; // a quick read, then Continue
        setTimeout(() => void ack("briefing:continue", {}), 1500);
      }
      if (r.phase !== prev) log(`${opts.name}: ${r.phase}${r.round ? ` (round ${r.round})` : ""}`);
      if (r.phase === "final" && r.final) {
        result.final = r.final;
        finish();
      }
    });

    socket.on("match:state", (m) => {
      result.matchFrames++;
      const now = Date.now();
      if (now - lastActAt < reaction) return;
      lastActAt = now;
      const choice = decide(m, memo);
      if (!choice) return;
      socket.emit("game:action", choice[0]);
      result.actions++;
      log(`${opts.name} → ${choice[0].kind} ${choice[0].item}  (${choice[1]})`);
    });
  });
}
