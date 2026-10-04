import type { RoomView } from "@server/types/contracts.js";
import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "../../src/store/game";
import { match, site } from "./fixtures";

const room = (code: string, overrides: Partial<RoomView> = {}): RoomView => ({
  code,
  phase: "live",
  format: "1v1",
  players: [{ id: "p1", name: "Priya", slot: 1, ready: true, connected: true }],
  teamNames: { 1: "Priya", 2: "Rahul" },
  canStart: { ok: true, format: "1v1" },
  votes: {},
  theme: "nasdaq",
  briefed: [],
  round: 1,
  totalRounds: 3,
  secondsLeft: null,
  rounds: [],
  final: null,
  ...overrides,
});

beforeEach(() => useGameStore.getState().clear());

describe("game store", () => {
  it("records health once per second of the round, for both sites", () => {
    const store = useGameStore.getState();
    store.setMatch(match({ timeLeftSec: 90, me: { health: 100 }, them: site({ health: 100 }) }));
    store.setMatch(match({ timeLeftSec: 89.9, me: { health: 90 } })); // same second — ignored
    store.setMatch(match({ timeLeftSec: 87, me: { health: 70 }, them: site({ health: 40 }) })); // skipped seconds filled
    const { history } = useGameStore.getState();
    expect(history.me).toEqual([100, 70, 70, 70]);
    expect(history.them).toEqual([100, 40, 40, 40]);
  });

  it("starts a fresh history and feed each round", () => {
    const store = useGameStore.getState();
    store.setRoom(room("ABCD"));
    store.setMatch(match({ round: 1, timeLeftSec: 80 }));
    store.pushEvents([{ side: 1, type: "crashed" }]);
    store.setMatch(match({ round: 2, phase: "buy", timeLeftSec: 120, durationSec: 120 }));
    expect(useGameStore.getState().history.me).toEqual([]);
    expect(useGameStore.getState().feed).toEqual([]);
  });

  it("keeps only the newest three feed lines", () => {
    const store = useGameStore.getState();
    store.seat("p1", room("ABCD"));
    store.setMatch(match());
    store.pushEvents([
      { side: 1, type: "crashed" },
      { side: 1, type: "rebooted" },
      { side: 2, type: "crashed" },
      { side: 1, type: "critical" },
    ]);
    expect(useGameStore.getState().feed.map((f) => f.text)).toEqual(["Health critical!", "Their site went down!", "Back online"]);
  });

  it("ignores updates for a different room", () => {
    const store = useGameStore.getState();
    store.setRoom(room("ABCD"));
    store.setRoom(room("WXYZ", { phase: "final" }));
    expect(useGameStore.getState().room?.code).toBe("ABCD");
  });

  it("forgets everything on clear (shared lab PCs)", () => {
    const store = useGameStore.getState();
    store.seat("p1", room("ABCD"));
    store.setMatch(match());
    store.clear();
    expect(useGameStore.getState()).toMatchObject({ playerId: null, room: null, match: null, feed: [] });
  });

  it("remembers what this team used and what hit it, for the reveal — and forgets it on clear", () => {
    const store = useGameStore.getState();
    store.seat("p1", room("ABCD"));
    store.setMatch(match()); // side 1
    store.pushEvents([
      { side: 1, type: "bought", item: "bouncer", by: "Priya" },
      { side: 1, type: "attackSent", attack: "bots", by: "Priya" },
      { side: 1, type: "attackLanded", attack: "wrongTurn" },
      { side: 2, type: "bought", item: "shelf", by: "Rahul" }, // theirs: not ours
      { side: 1, type: "bought", item: "bouncer", by: "Priya" },
    ]);
    expect(useGameStore.getState().usage).toEqual({ used: ["bouncer", "bots"], hitBy: ["wrongTurn"] });
    store.clear();
    expect(useGameStore.getState().usage).toEqual({ used: [], hitBy: [] });
  });
});
