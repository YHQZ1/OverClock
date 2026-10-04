// The room phase machine, driven directly (no sockets), with a fake clock.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameTiming } from "../../src/config/game.js";
import type { Broadcaster } from "../../src/services/broadcaster.js";
import { MatchService } from "../../src/services/match.service.js";
import { ResultService } from "../../src/services/result.service.js";
import { MemoryResultStore } from "../../src/services/result.store.js";
import { RoomService } from "../../src/services/room.service.js";
import { SessionService } from "../../src/services/session.service.js";
import { ROUNDS } from "../../src/sim/index.js";
import type { Leaderboards, MatchView, RoomView } from "../../src/types/contracts.js";

const TIMING: GameTiming = {
  voteSec: 0,
  buySec: 0,
  resultSec: 0,
  tickMs: 100,
  abandonAfterMs: 120_000,
  sideGoneMs: 60_000,
  sweepEveryMs: 60_000,
};

let services: SessionService[] = [];
afterEach(() => {
  for (const s of services) s.stop();
  services = [];
});

function setup(timing: Partial<GameTiming> = {}, random = () => 0) {
  let now = 1_000_000;
  const clock = () => now;
  const published: RoomView[] = [];
  const frames: MatchView[] = [];
  const boards: Leaderboards[] = [];
  const notify: Broadcaster = {
    room: (v) => published.push(v),
    match: (_c, _s, v) => frames.push(v),
    matchEvents: () => {},
    leaderboard: (b) => boards.push(b),
  };
  const store = new MemoryResultStore();
  const rooms = new RoomService(clock);
  const t = { ...TIMING, ...timing };
  const matches = new MatchService(notify, t);
  const sessions = new SessionService(rooms, matches, notify, t, {
    now: clock,
    random,
    rounds: ROUNDS.map((r) => ({ ...r, durationSec: 1 })),
    results: new ResultService(store, notify),
  });
  services.push(sessions);
  return { rooms, matches, sessions, published, frames, boards, store, advance: (ms: number) => (now += ms) };
}

/** A 1v1 room with both players ready (so the match has started). */
function started(timing: Partial<GameTiming> = {}, random?: () => number) {
  const ctx = setup(timing, random);
  const a = ctx.sessions.createRoom("A");
  const b = ctx.sessions.joinRoom(a.room.code, "B");
  ctx.sessions.setReady(a.room.code, a.player.id, true);
  ctx.sessions.setReady(a.room.code, b.player.id, true);
  return { ...ctx, room: a.room, a: a.player, b: b.player };
}

describe("SessionService", () => {
  it("starts the match once everyone is ready", () => {
    const { room } = started();
    expect(room.format).toBe("1v1");
    expect(room.phase).toBe("live"); // vote and buy phases are instant here
    expect(room.theme).not.toBeNull();
  });

  it("ends the vote early once everyone has voted; majority wins", () => {
    const ctx = started({ voteSec: 10 });
    expect(ctx.room.phase).toBe("vote");
    ctx.sessions.vote(ctx.room.code, ctx.a.id, "miniclip");
    expect(ctx.room.phase).toBe("vote");
    ctx.sessions.vote(ctx.room.code, ctx.b.id, "miniclip");
    expect(ctx.room.theme).toBe("miniclip");
    expect(ctx.room.phase).toBe("live");
  });

  it("breaks a tie at random — and picks at random with no votes", () => {
    const tie = started({ voteSec: 10 }, () => 0.99);
    tie.sessions.vote(tie.room.code, tie.a.id, "fancode");
    tie.sessions.vote(tie.room.code, tie.b.id, "bookmyshow");
    expect(tie.room.theme).toBe("bookmyshow");

    const none = started({}, () => 0); // voteSec 0: nobody votes
    expect(none.room.theme).toBe("nasdaq");
  });

  it("refuses votes once voting has closed", () => {
    const { sessions, room, a } = started();
    expect(() => sessions.vote(room.code, a.id, "miniclip")).toThrow("Voting has closed.");
  });

  it("routes a player's press to their side, with their name", () => {
    const { sessions, matches, room, b } = started();
    sessions.game(room.code, b.id, { kind: "buy", item: "server" });
    matches.tickAll();
    const view = matches.view(room.code, 2)!;
    expect(view.shop.find((i) => i.id === "server")!.owned).toBe(ROUNDS[0]!.startServers + 1);
  });

  it("plays three rounds to a recorded final", () => {
    const { matches, room } = started();
    for (let i = 0; i < 200 && room.phase !== "final"; i++) matches.tickAll();
    expect(room.rounds).toHaveLength(3);
    expect(room.final).toMatchObject({ recorded: true, endedEarly: null });
  });

  it("saves a recorded match, then shows each team its place and pushes the boards", async () => {
    const { matches, room, store, boards, published } = started();
    for (let i = 0; i < 200 && room.phase !== "final"; i++) matches.tickAll();
    await vi.waitFor(() => expect(room.final?.ranks).not.toBeNull());

    const board = (await store.boards(10))["1v1"];
    expect(board).toHaveLength(2);
    expect(board.map((e) => e.matchId)).toEqual([room.final!.matchId, room.final!.matchId]);
    expect(board.map((e) => e.team).sort()).toEqual(["A", "B"]);
    expect(board[0]!.opponent).toBe(board[1]!.team);
    expect(board[0]!.points).toBeGreaterThanOrEqual(board[1]!.points);
    expect(room.final!.ranks).toEqual(board[0]!.side === 1 ? { 1: 1, 2: board[1]!.rank } : { 1: board[1]!.rank, 2: 1 });
    expect(boards.at(-1)?.["1v1"]).toHaveLength(2);
    expect(published.at(-1)?.final?.ranks).toEqual(room.final!.ranks);
  });

  it("a team that leaves mid-match forfeits — not recorded", () => {
    const { sessions, room, b, boards } = started();
    sessions.leaveRoom(room.code, b.id);
    expect(room.phase).toBe("final");
    expect(room.final).toMatchObject({ winner: 1, recorded: false, endedEarly: { side: 2, reason: "left" } });
    expect(boards).toHaveLength(0); // nothing saved, no board update
  });

  it("a side gone too long mid-match forfeits", () => {
    const { sessions, room, b, advance } = started();
    sessions.setConnected(room.code, b.id, false);
    advance(59_000);
    sessions.sweep();
    expect(room.phase).toBe("live");
    advance(2_000);
    sessions.sweep();
    expect(room.final).toMatchObject({ winner: 1, recorded: false });
  });

  it("abandons a room everyone has left", () => {
    const { sessions, rooms, room, a, b, advance } = started();
    sessions.setConnected(room.code, a.id, false);
    sessions.setConnected(room.code, b.id, false);
    advance(121_000);
    sessions.sweep();
    expect(rooms.get(room.code)).toBeUndefined();
  });
});
