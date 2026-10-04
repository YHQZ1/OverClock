// The Postgres result store against a real database: the same rules as the
// memory store (tests/unit/results.test.ts). Needs TEST_DATABASE_URL — set in
// server/.env locally (`pnpm db:up`) and in CI; skipped otherwise.
// The test database is wiped before each test.

import { existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb, type Db } from "../../src/db/client.js";
import { PgResultStore } from "../../src/services/result.store.js";
import { record } from "../fixtures/results.js";

if (!process.env.TEST_DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
const URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL)("PgResultStore (Postgres)", () => {
  let db: Db;
  let store: PgResultStore;

  beforeAll(async () => {
    const conn = await connectDb(URL!);
    db = conn.db;
    store = new PgResultStore(db, conn.close);
  });
  afterAll(() => store?.close());
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE matches CASCADE`);
  });

  it("saves a match with its teams and rounds, and ranks each format separately", async () => {
    const m1 = record(5000, 3000);
    const m2 = record(7000, 4000);
    await store.save(m1);
    await store.save(m2);
    await store.save(record(9000, 1000, "2v2"));

    const { "1v1": one, "2v2": two } = await store.boards(10);
    expect(one.map((e) => [e.rank, e.points, e.team, e.opponent, e.won])).toEqual([
      [1, 7000, m2.teams[0]!.name, m2.teams[1]!.name, true],
      [2, 5000, m1.teams[0]!.name, m1.teams[1]!.name, true],
      [3, 4000, m2.teams[1]!.name, m2.teams[0]!.name, false],
      [4, 3000, m1.teams[1]!.name, m1.teams[0]!.name, false],
    ]);
    expect(one[0]).toMatchObject({ matchId: m2.id, side: 1, players: m2.teams[0]!.players, theme: "nasdaq" });
    expect(two).toHaveLength(2);
    expect(await store.ranks(m1.id)).toEqual({ 1: 2, 2: 4 });

    const rounds = await db.execute(sql`SELECT round_no, seed FROM match_rounds WHERE match_id = ${m1.id}`);
    expect(rounds).toHaveLength(1);
  });

  it("shares a place on equal points and keeps the earlier match first", async () => {
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
    const rude = record(9000, 2000);
    const fine = record(5000, 1000);
    await store.save(rude);
    await store.save(fine);
    await store.hide(rude.id, 1);
    expect((await store.boards(10))["1v1"].map((e) => e.team)).not.toContain(rude.teams[0]!.name);
    expect(await store.ranks(fine.id)).toEqual({ 1: 1, 2: 3 });
  });

  it("hands the awards every match with its rounds, hidden teams left out", async () => {
    const m = record(5000, 3000);
    m.rounds = [
      { round: 1, seed: 1, winner: 1, scores: { 1: { total: 1 }, 2: { total: 2 } } as never, log: [] },
      { round: 2, seed: 2, winner: 1, scores: { 1: { total: 3 }, 2: { total: 4 } } as never, log: [] },
    ];
    await store.save(m);
    await store.hide(m.id, 2);
    const [got] = await store.awardMatches();
    expect(got).toMatchObject({ matchId: m.id, format: "1v1", winner: 1 });
    expect(got!.teams.map((t) => t.side)).toEqual([1]);
    expect(got!.rounds.map((r) => r.scores[1].total)).toEqual([1, 3]);
  });

  it("saves all of a match or none of it", async () => {
    const broken = record(5000, 3000);
    broken.rounds[0]!.seed = 2 ** 40; // too big for the column: the last insert fails
    await expect(store.save(broken)).rejects.toThrow();
    expect((await store.boards(10))["1v1"]).toHaveLength(0); // its match and teams were rolled back
  });
});
