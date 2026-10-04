import { describe, expect, it } from "vitest";
import { RoomService } from "../../src/services/room.service.js";

const fresh = () => {
  let now = 1_000;
  const rooms = new RoomService(() => now);
  return { rooms, advance: (ms: number) => (now += ms) };
};

describe("RoomService", () => {
  it("seats the creator in slot 1 and auto-balances joiners", () => {
    const { rooms } = fresh();
    const { room } = rooms.create("P1");
    rooms.join(room.code, "P2");
    rooms.join(room.code, "P3");
    rooms.join(room.code, "P4");
    expect(room.players.map((p) => p.slot)).toEqual([1, 3, 4, 2]);
  });

  it("generates 4-letter codes without I or O", () => {
    const { rooms } = fresh();
    for (let i = 0; i < 50; i++) expect(rooms.create("P").room.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });

  it("explains every reason a room can't start", () => {
    const { rooms } = fresh();
    const { room, player } = rooms.create("P1");
    expect(rooms.canStart(room)).toEqual({ ok: false, reason: "Waiting for an opponent — share the code." });

    const p2 = rooms.join(room.code, "P2").player;
    expect(rooms.canStart(room)).toEqual({ ok: false, reason: "Waiting for everyone to be ready." });

    rooms.setSlot(room, p2.id, 2); // both on team 1
    expect(rooms.canStart(room)).toEqual({ ok: false, reason: "Pick opposite teams." });

    rooms.setSlot(room, p2.id, 4);
    rooms.setReady(room, player.id, true);
    rooms.setReady(room, p2.id, true);
    expect(rooms.canStart(room)).toEqual({ ok: true, format: "1v1" });

    rooms.join(room.code, "P3");
    expect(rooms.canStart(room)).toEqual({ ok: false, reason: "3 players — you need 2 (1v1) or 4 (2v2)." });
  });

  it("changing slot clears ready; taken slots are refused", () => {
    const { rooms } = fresh();
    const { room, player } = rooms.create("P1");
    rooms.join(room.code, "P2"); // slot 3
    rooms.setReady(room, player.id, true);
    expect(() => rooms.setSlot(room, player.id, 3)).toThrow("That slot is taken.");
    rooms.setSlot(room, player.id, 2);
    expect(player.ready).toBe(false);
  });

  it("refuses ready without a slot, and joins once the match starts", () => {
    const { rooms } = fresh();
    const { room } = rooms.create("P1");
    room.players[0]!.slot = null;
    expect(() => rooms.setReady(room, room.players[0]!.id, true)).toThrow("Pick a slot first.");
    room.phase = "vote";
    expect(() => rooms.join(room.code, "Late")).toThrow("That match has already started.");
  });

  it("names teams after their players until renamed", () => {
    const { rooms } = fresh();
    const { room, player } = rooms.create("Priya");
    rooms.join(room.code, "Rahul");
    expect(rooms.teamName(room, 1)).toBe("Priya");
    rooms.setTeamName(room, player.id, "Night Owls");
    expect(rooms.view(room, 3).teamNames).toEqual({ 1: "Night Owls", 2: "Rahul" });
  });

  it("is full at four", () => {
    const { rooms } = fresh();
    const { room } = rooms.create("P1");
    for (const n of ["P2", "P3", "P4"]) rooms.join(room.code, n);
    expect(() => rooms.join(room.code, "P5")).toThrow("That room is full (4 players).");
  });

  it("tracks when everyone — and each side — has gone", () => {
    const { rooms, advance } = fresh();
    const { room, player } = rooms.create("P1");
    const p2 = rooms.join(room.code, "P2").player;
    rooms.setConnected(room, p2.id, false);
    expect(room.sideGoneSince[2]).toBe(1_000);
    expect(room.allGoneSince).toBeNull();
    advance(500);
    rooms.setConnected(room, player.id, false);
    expect(room.allGoneSince).toBe(1_500);
    rooms.rejoin(room.code, p2.token);
    expect(room.allGoneSince).toBeNull();
    expect(room.sideGoneSince[2]).toBeNull();
  });

  it("deletes the room when the last player leaves", () => {
    const { rooms } = fresh();
    const { room, player } = rooms.create("P1");
    expect(rooms.leave(room.code, player.id)).toBe(false);
    expect(rooms.get(room.code)).toBeUndefined();
  });
});
