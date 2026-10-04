// The result store's rules: per-format boards, best first, shared places on
// ties, hidden entries left out. The Postgres store runs the same checks in
// tests/integration/results.db.test.ts.

import { describe, expect, it } from "vitest";
import { MemoryResultStore } from "../../src/services/result.store.js";
import { record } from "../fixtures/results.js";

describe("MemoryResultStore", () => {
  it("ranks each format separately, best first, with opponents", async () => {
    const store = new MemoryResultStore();
    const m1 = record(5000, 3000);
    const m2 = record(7000, 4000);
    await store.save(m1);
    await store.save(m2);
    await store.save(record(9000, 1000, "2v2"));

    const { "1v1": one, "2v2": two } = await store.boards(10);
    expect(one.map((e) => [e.rank, e.points, e.team, e.opponent])).toEqual([
      [1, 7000, m2.teams[0]!.name, m2.teams[1]!.name],
      [2, 5000, m1.teams[0]!.name, m1.teams[1]!.name],
      [3, 4000, m2.teams[1]!.name, m2.teams[0]!.name],
      [4, 3000, m1.teams[1]!.name, m1.teams[0]!.name],
    ]);
    expect(two).toHaveLength(2);
    expect(await store.ranks(m1.id)).toEqual({ 1: 2, 2: 4 });
  });

  it("shares a place on equal points, keeps the earlier match first, and respects the limit", async () => {
    const store = new MemoryResultStore();
    const first = record(6000, 2000);
    const second = record(6000, 1000);
    await store.save(first);
    await store.save(second);
    const board = (await store.boards(3))["1v1"];
    expect(board.map((e) => [e.rank, e.matchId])).toEqual([
      [1, first.id],
      [1, second.id],
      [3, first.id],
    ]);
  });

  it("leaves hidden entries off the board and out of the ranks", async () => {
    const store = new MemoryResultStore();
    const rude = record(9000, 2000);
    const fine = record(5000, 1000);
    await store.save(rude);
    await store.save(fine);
    await store.setHidden(rude.id, 1, true);
    const board = (await store.boards(10))["1v1"];
    expect(board.map((e) => e.team)).not.toContain(rude.teams[0]!.name);
    expect(await store.ranks(fine.id)).toEqual({ 1: 1, 2: 3 });
  });

  it("knows nothing about unsaved matches", async () => {
    expect(await new MemoryResultStore().ranks("00000000-0000-4000-8000-999999999999")).toBeNull();
  });

  it("lists hidden entries for the admin (without a place), and can put them back", async () => {
    const store = new MemoryResultStore();
    const m = record(9000, 2000);
    await store.save(m);
    await store.setHidden(m.id, 1, true);
    const admin = (await store.adminBoards(50))["1v1"];
    expect(admin.map((e) => [e.side, e.hidden, e.rank])).toEqual([
      [1, true, null],
      [2, false, 1],
    ]);
    await store.setHidden(m.id, 1, false);
    expect((await store.boards(10))["1v1"]).toHaveLength(2);
  });
});
