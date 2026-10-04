// End-to-end: real Socket.IO clients against a real server, with short rounds.

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import type { GameTiming } from "../../src/config/game.js";
import { createRealtime } from "../../src/realtime.js";
import { ROUNDS, type SimEvent } from "../../src/sim/index.js";
import type { SessionDeps } from "../../src/services/session.service.js";
import type {
  AckResponse,
  ClientToServerEvents,
  JoinResult,
  Leaderboards,
  MatchView,
  RoomView,
  ServerToClientEvents,
} from "../../src/types/contracts.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const FAST: GameTiming = {
  voteSec: 5,
  buySec: 0,
  resultSec: 0,
  tickMs: 5,
  abandonAfterMs: 60_000,
  sideGoneMs: 60_000,
  sweepEveryMs: 60_000,
};
const SHORT_ROUNDS = ROUNDS.map((r) => ({ ...r, durationSec: 1, rushes: [] }));

let url = "";
let realtime: ReturnType<typeof createRealtime> | null = null;
const clients: Client[] = [];

async function startServer(timing: GameTiming = FAST, deps: SessionDeps = {}) {
  const http = createServer();
  realtime = createRealtime(http, timing, { rounds: SHORT_ROUNDS, random: () => 0, ...deps });
  await new Promise<void>((resolve) => http.listen(0, resolve));
  url = `http://localhost:${(http.address() as AddressInfo).port}`;
}

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await realtime?.close();
  realtime = null;
});

async function client(): Promise<Client> {
  const c: Client = connect(url, { transports: ["websocket"], forceNew: true });
  clients.push(c);
  await new Promise<void>((resolve) => c.on("connect", () => resolve()));
  return c;
}

type AckData = {
  "room:create": JoinResult;
  "room:join": JoinResult;
  "room:rejoin": JoinResult;
  "room:leave": null;
  "room:slot": null;
  "room:ready": null;
  "room:teamName": null;
  "vote:theme": null;
};

function call<E extends keyof AckData>(c: Client, event: E, payload: unknown): Promise<AckResponse<AckData[E]>> {
  return new Promise((resolve) => (c.emit as (...args: unknown[]) => void)(event, payload, resolve));
}

function ok<T>(res: AckResponse<T>): T {
  if (!res.ok) throw new Error(`expected ok, got: ${res.error}`);
  return res.data;
}

function next<E extends "room:state" | "match:state" | "match:event" | "leaderboard:update">(
  c: Client,
  event: E,
  predicate: (x: Parameters<ServerToClientEvents[E]>[0]) => boolean,
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve) => {
    const on = (x: Parameters<ServerToClientEvents[E]>[0]) => {
      if (!predicate(x)) return;
      (c.off as (e: string, f: unknown) => void)(event, on);
      resolve(x);
    };
    (c.on as (e: string, f: unknown) => void)(event, on);
  });
}
const nextRoom = (c: Client, p: (r: RoomView) => boolean) => next(c, "room:state", p) as Promise<RoomView>;
const nextMatch = (c: Client, p: (m: MatchView) => boolean) => next(c, "match:state", p) as Promise<MatchView>;

/** Create a room with `n` players; returns clients and their seats. */
async function room(n: number) {
  const cs = [await client()];
  const seats = [ok(await call(cs[0]!, "room:create", { playerName: "P1" }))];
  for (let i = 1; i < n; i++) {
    const c = await client();
    cs.push(c);
    seats.push(ok(await call(c, "room:join", { code: seats[0]!.room.code, playerName: `P${i + 1}` })));
  }
  return { cs, seats, code: seats[0]!.room.code };
}

async function readyAll(cs: Client[]) {
  for (const c of cs) ok(await call(c, "room:ready", { ready: true }));
}

describe("rooms", () => {
  it("seats a 1v1 on opposite teams automatically", async () => {
    await startServer();
    const { seats } = await room(2);
    const view = seats[1]!.room;
    expect(view.players.map((p) => p.slot)).toEqual([1, 3]);
    expect(view.canStart).toEqual({ ok: false, reason: "Waiting for everyone to be ready." });
  });

  it("explains why a room can't start", async () => {
    await startServer();
    const { seats, code } = await room(3);
    expect(seats[2]!.room.canStart).toEqual({ ok: false, reason: "3 players — you need 2 (1v1) or 4 (2v2)." });

    ok(await call(await client(), "room:join", { code, playerName: "P4" }));
    expect(await call(await client(), "room:join", { code, playerName: "P5" })).toEqual({
      ok: false,
      error: "That room is full (4 players).",
    });
    expect(await call(await client(), "room:join", { code: "ZZZZ", playerName: "X" })).toEqual({
      ok: false,
      error: "No room with that code.",
    });
  });

  it("changing slot clears ready; taken slots are refused", async () => {
    await startServer();
    const { cs } = await room(2);
    ok(await call(cs[0]!, "room:ready", { ready: true }));
    expect(await call(cs[0]!, "room:slot", { slot: 3 })).toEqual({ ok: false, error: "That slot is taken." });
    const moved = nextRoom(cs[1]!, (r) => r.players[0]!.slot === 2);
    ok(await call(cs[0]!, "room:slot", { slot: 2 }));
    expect((await moved).players[0]!.ready).toBe(false);
  });

  it("team names default to the players and can be changed", async () => {
    await startServer();
    const { cs } = await room(2);
    const named = nextRoom(cs[1]!, (r) => r.teamNames[1] === "Night Owls");
    ok(await call(cs[0]!, "room:teamName", { name: "Night Owls" }));
    expect((await named).teamNames[2]).toBe("P2");
  });
});

describe("theme vote", () => {
  it("starts when everyone is ready; majority wins", async () => {
    await startServer();
    const { cs, seats } = await room(4);
    expect(seats[3]!.room.players.map((p) => p.slot).sort()).toEqual([1, 2, 3, 4]); // auto-balanced 2v2
    const voting = nextRoom(cs[0]!, (r) => r.phase === "vote");
    await readyAll(cs);
    expect((await voting).format).toBe("2v2");

    const chosen = nextRoom(cs[0]!, (r) => r.theme !== null);
    ok(await call(cs[0]!, "vote:theme", { theme: "miniclip" }));
    ok(await call(cs[1]!, "vote:theme", { theme: "miniclip" }));
    ok(await call(cs[2]!, "vote:theme", { theme: "nasdaq" }));
    ok(await call(cs[3]!, "vote:theme", { theme: "bookmyshow" }));
    expect((await chosen).theme).toBe("miniclip");
  });

  it("breaks a tie at random", async () => {
    await startServer(FAST, { random: () => 0.99 });
    const { cs } = await room(2);
    await readyAll(cs);
    const chosen = nextRoom(cs[0]!, (r) => r.theme !== null);
    ok(await call(cs[0]!, "vote:theme", { theme: "fancode" }));
    ok(await call(cs[1]!, "vote:theme", { theme: "nasdaq" }));
    expect((await chosen).theme).toBe("nasdaq"); // the last of the tied themes, picked by random() = 0.99
  });
});

describe("the duel", () => {
  it("plays three rounds to a recorded final, each side seeing only its own coins", async () => {
    await startServer({ ...FAST, voteSec: 0 });
    const { cs } = await room(2);
    const [a, b] = cs as [Client, Client];

    const frameA = nextMatch(a, (m) => m.phase === "live");
    const frameB = nextMatch(b, (m) => m.phase === "live");
    await readyAll(cs);
    const [ma, mb] = await Promise.all([frameA, frameB]);
    expect(ma.side).toBe(1);
    expect(mb.side).toBe(2);
    expect(ma.me.coins).toBeGreaterThan(0);
    expect("coins" in ma.them).toBe(false);

    const final = await nextRoom(a, (r) => r.phase === "final");
    expect(final.rounds).toHaveLength(3);
    expect(final.final!.recorded).toBe(true);
    expect(final.final!.points[1]).toBeGreaterThan(0);
  });

  it("saves the result and pushes the leaderboard to every PC — even one not in the match", async () => {
    await startServer({ ...FAST, voteSec: 0 });
    const watcher = await client(); // e.g. the big screen
    const { cs } = await room(2);
    const [a] = cs as [Client, Client];
    const board = next(watcher, "leaderboard:update", (b) => (b as Leaderboards)["1v1"].length === 2) as Promise<Leaderboards>;
    const ranked = nextRoom(a, (r) => r.final?.ranks != null);
    await readyAll(cs);

    const [boards, final] = await Promise.all([board, ranked]);
    expect(boards["1v1"].every((e) => e.matchId === final.final!.matchId)).toBe(true);
    expect(boards["1v1"].map((e) => e.team).sort()).toEqual(["P1", "P2"]);
    for (const e of boards["1v1"]) expect(final.final!.ranks![e.side]).toBe(e.rank); // a draw shares 1st
    expect(await realtime!.services.results.boards()).toEqual(boards);
  });

  it("attacks reach the other team as a warning", async () => {
    await startServer({ ...FAST, voteSec: 0, tickMs: 20 }, { rounds: ROUNDS.map((r) => ({ ...r, durationSec: 5, rushes: [] })) });
    const { cs } = await room(2);
    const [a, b] = cs as [Client, Client];
    const live = nextMatch(a, (m) => m.phase === "live");
    await readyAll(cs);
    await live;

    const warned = next(b, "match:event", (events) =>
      (events as SimEvent[]).some((e) => e.type === "attackIncoming" && e.side === 2),
    );
    const incoming = nextMatch(b, (m) => m.incoming.length > 0);
    a.emit("game:action", { kind: "attack", item: "bots" });
    await warned;
    expect((await incoming).incoming[0]!.attack).toBe("bots");
  });

  it("ignores malformed actions", async () => {
    await startServer({ ...FAST, voteSec: 0 });
    const { cs } = await room(2);
    await readyAll(cs);
    (cs[0]!.emit as (...a: unknown[]) => void)("game:action", { kind: "attack", item: "everything" });
    (cs[0]!.emit as (...a: unknown[]) => void)("game:action", "nonsense");
    expect((await nextRoom(cs[0]!, (r) => r.phase === "final")).final!.recorded).toBe(true);
  });

  it("a team that leaves mid-match forfeits — nothing recorded", async () => {
    await startServer({ ...FAST, voteSec: 0, tickMs: 20 }, { rounds: ROUNDS.map((r) => ({ ...r, durationSec: 30 })) });
    const { cs } = await room(2);
    const live = nextMatch(cs[0]!, (m) => m.phase === "live");
    await readyAll(cs);
    await live;
    const final = nextRoom(cs[0]!, (r) => r.phase === "final");
    ok(await call(cs[1]!, "room:leave", {}));
    const f = (await final).final!;
    expect(f.recorded).toBe(false);
    expect(f.winner).toBe(1);
    expect(f.endedEarly).toEqual({ side: 2, reason: "left" });
  });
});

describe("refresh / reconnect", () => {
  it("puts a refreshed PC back in its seat, mid-match", async () => {
    await startServer({ ...FAST, voteSec: 0, tickMs: 20 }, { rounds: ROUNDS.map((r) => ({ ...r, durationSec: 30 })) });
    const { cs, seats, code } = await room(2);
    const live = nextMatch(cs[1]!, (m) => m.phase === "live");
    await readyAll(cs);
    await live;

    cs[1]!.disconnect();
    const back = await client();
    const frame = nextMatch(back, () => true);
    const restored = ok(await call(back, "room:rejoin", { code, token: seats[1]!.token }));
    expect(restored.playerId).toBe(seats[1]!.playerId);
    expect(restored.room.phase).toBe("live");
    expect((await frame).side).toBe(2);
  });

  it("stays connected when the old connection closes after the new one has rejoined", async () => {
    await startServer();
    const { cs, seats, code } = await room(2);
    const back = await client();
    ok(await call(back, "room:rejoin", { code, token: seats[1]!.token })); // the new connection rejoins first…

    cs[1]!.disconnect(); // …then the old one closes
    await new Promise((r) => setTimeout(r, 100));
    const me = realtime!.services.rooms.get(code)!.players.find((p) => p.id === seats[1]!.playerId)!;
    expect(me.connected).toBe(true);
    expect(realtime!.services.rooms.get(code)!.sideGoneSince[2]).toBeNull();
  });

  it("rejects an unknown seat", async () => {
    await startServer();
    const { code } = await room(2);
    expect(await call(await client(), "room:rejoin", { code, token: "0".repeat(32) })).toEqual({
      ok: false,
      error: "Your room is no longer here.",
    });
  });
});
