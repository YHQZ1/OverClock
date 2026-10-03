// End-to-end: real Socket.IO clients against a real server, with a short round.

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GameTiming } from "./config/game.js";
import { createRealtime } from "./realtime.js";
import { DEFAULT_CONFIG, ROUND_1, type MatchSetup } from "./sim/index.js";
import type {
  AckResponse,
  ClientToServerEvents,
  JoinResult,
  MatchView,
  ServerToClientEvents,
  SessionView,
} from "./types/contracts.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const TIMING: GameTiming = { countdownSec: 0, tickMs: 5, abandonAfterMs: 60_000, sweepEveryMs: 60_000 };
const SHORT_ROUND: MatchSetup = {
  config: DEFAULT_CONFIG,
  scenario: { ...ROUND_1, id: "test", durationSec: 3, events: [] },
};

let url = "";
let realtime: ReturnType<typeof createRealtime>;
const clients: Client[] = [];

beforeEach(async () => {
  const http = createServer();
  realtime = createRealtime(http, TIMING, SHORT_ROUND);
  await new Promise<void>((resolve) => http.listen(0, resolve));
  url = `http://localhost:${(http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await realtime.close();
});

async function client(): Promise<Client> {
  const c: Client = connect(url, { transports: ["websocket"], forceNew: true });
  clients.push(c);
  await new Promise<void>((resolve) => c.on("connect", () => resolve()));
  return c;
}

type AckData = {
  "team:create": JoinResult;
  "team:join": JoinResult;
  "team:rejoin": JoinResult;
  "team:leave": null;
  "session:start": null;
};

/** Emit with ack; resolve to the ack payload. */
function call<E extends keyof AckData>(
  c: Client,
  event: E,
  payload: Parameters<ClientToServerEvents[E]>[0],
): Promise<AckResponse<AckData[E]>> {
  return new Promise((resolve) => (c.emit as (...args: unknown[]) => void)(event, payload, resolve));
}

function ok<T>(res: AckResponse<T>): T {
  if (!res.ok) throw new Error(`expected ok, got: ${res.error}`);
  return res.data;
}

/** Resolve with the first session update matching `predicate`. */
function nextSession(c: Client, predicate: (s: SessionView) => boolean): Promise<SessionView> {
  return new Promise((resolve) => {
    const on = (s: SessionView) => {
      if (!predicate(s)) return;
      c.off("session:state", on);
      resolve(s);
    };
    c.on("session:state", on);
  });
}

function nextMatch(c: Client, predicate: (m: MatchView) => boolean): Promise<MatchView> {
  return new Promise((resolve) => {
    const on = (m: MatchView) => {
      if (!predicate(m)) return;
      c.off("match:state", on);
      resolve(m);
    };
    c.on("match:state", on);
  });
}

async function teamOfThree() {
  const [a, b, c] = [await client(), await client(), await client()];
  const host = ok(await call(a, "team:create", { teamName: "Night Owls", playerName: "Priya" }));
  const code = host.session.code;
  const second = ok(await call(b, "team:join", { code, playerName: "Rahul" }));
  const third = ok(await call(c, "team:join", { code: code.toLowerCase(), playerName: "Aisha" }));
  return { a, b, c, code, host, second, third };
}

describe("team flow", () => {
  it("forms a team of three and keeps every PC in sync", async () => {
    const [a, b] = [await client(), await client()];
    const host = ok(await call(a, "team:create", { teamName: "Night Owls", playerName: "Priya" }));
    expect(host.session.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(host.session.players).toEqual([expect.objectContaining({ name: "Priya", isHost: true })]);

    const seenByHost = nextSession(a, (s) => s.players.length === 2);
    ok(await call(b, "team:join", { code: host.session.code, playerName: "Rahul" }));
    expect((await seenByHost).players.map((p) => p.name)).toEqual(["Priya", "Rahul"]);
  });

  it("explains why a join fails", async () => {
    const { code } = await teamOfThree();
    const d = await client();
    expect(await call(d, "team:join", { code, playerName: "Dev" })).toEqual({
      ok: false,
      error: "That team is full (3 players).",
    });
    expect(await call(d, "team:join", { code: "ZZZZ", playerName: "Dev" })).toEqual({
      ok: false,
      error: "No team with that code.",
    });
    expect((await call(d, "team:join", { code: "AB1", playerName: "Dev" })).ok).toBe(false);
  });

  it("only lets the host start", async () => {
    const { b } = await teamOfThree();
    expect(await call(b, "session:start", {})).toEqual({ ok: false, error: "Only the host can start the game." });
  });

  it("hands the host role on when the host leaves", async () => {
    const { a, b, second } = await teamOfThree();
    const update = nextSession(b, (s) => s.players.length === 2);
    ok(await call(a, "team:leave", {}));
    const s = await update;
    expect(s.players.find((p) => p.isHost)?.id).toBe(second.playerId);
  });
});

describe("live match", () => {
  it("plays one shared match from start to final", async () => {
    const { a, b, c, code } = await teamOfThree();

    const playing = Promise.all([a, b, c].map((p) => nextSession(p, (s) => s.phase === "playing")));
    const firstFrame = nextMatch(c, () => true);
    ok(await call(a, "session:start", {}));
    await playing;
    const start = await firstFrame;
    expect(start.servers).toHaveLength(ROUND_1.startServers);

    // A teammate presses + SERVERS; everyone sees the new (booting) server.
    const grown = nextMatch(a, (m) => m.servers.length === ROUND_1.startServers + 1);
    b.emit("game:action", { action: "addServer" });
    expect((await grown).servers.at(-1)?.state).toBe("booting");

    // Joining mid-game is refused.
    const late = await client();
    expect(await call(late, "team:join", { code, playerName: "Late" })).toEqual({
      ok: false,
      error: "That team has already started.",
    });

    const finals = await Promise.all([a, b, c].map((p) => nextSession(p, (s) => s.phase === "final")));
    for (const s of finals) {
      expect(s.result).not.toBeNull();
      expect(s.result!.served).toBeGreaterThan(0);
    }
  });

  it("ignores malformed actions without breaking the match", async () => {
    const { a, b } = await teamOfThree();
    ok(await call(a, "session:start", {}));
    (b.emit as (...args: unknown[]) => void)("game:action", { action: "deleteEverything" });
    (b.emit as (...args: unknown[]) => void)("game:action", "nonsense");
    const final = await nextSession(a, (s) => s.phase === "final");
    expect(final.result).not.toBeNull();
  });
});

describe("refresh / reconnect", () => {
  it("puts a refreshed PC back in its seat", async () => {
    const { a, b, second } = await teamOfThree();

    const dropped = nextSession(a, (s) => s.players.some((p) => !p.connected));
    b.disconnect();
    expect((await dropped).players.find((p) => p.id === second.playerId)?.connected).toBe(false);

    const back = await client();
    const restored: JoinResult = ok(await call(back, "team:rejoin", { code: second.session.code, token: second.token }));
    expect(restored.playerId).toBe(second.playerId);
    expect(restored.session.players.every((p) => p.connected)).toBe(true);
  });

  it("rejects an unknown seat", async () => {
    const { code } = await teamOfThree();
    const x = await client();
    expect(await call(x, "team:rejoin", { code, token: "0".repeat(32) })).toEqual({
      ok: false,
      error: "Your team is no longer here.",
    });
  });

  it("sends the live match straight away after a mid-game refresh", async () => {
    const { a, b, second } = await teamOfThree();
    ok(await call(a, "session:start", {}));
    await nextMatch(a, (m) => m.tick > 2);

    b.disconnect();
    const back = await client();
    const frame = nextMatch(back, () => true);
    const restored = ok(await call(back, "team:rejoin", { code: second.session.code, token: second.token }));
    expect(restored.session.phase).toBe("playing");
    expect((await frame).servers.length).toBeGreaterThan(0);
  });
});
