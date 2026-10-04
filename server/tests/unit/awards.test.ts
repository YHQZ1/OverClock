import { describe, expect, it } from "vitest";
import { computeAwards, type AwardMatch } from "../../src/services/awards.js";
import type { SiteScore } from "../../src/sim/index.js";

const score = (total: number, attacksLanded = 0): SiteScore => ({
  served: total,
  lost: 0,
  lostPenalty: 0,
  total,
  crashes: 0,
  downtimeSec: 0,
  coinsEarned: 0,
  attacksSent: attacksLanded,
  attacksLanded,
  attacksBlocked: 0,
});

/** Rounds as [side 1 total, side 2 total, side 1 attacks landed, side 2 attacks landed]. */
function match(id: string, rounds: [number, number, number?, number?][], crashes: [number, number] = [0, 0]): AwardMatch {
  const t1 = rounds.reduce((s, r) => s + r[0], 0);
  const t2 = rounds.reduce((s, r) => s + r[1], 0);
  return {
    matchId: id,
    format: "1v1",
    winner: t1 === t2 ? null : t1 > t2 ? 1 : 2,
    teams: [
      { side: 1, name: `${id}-A`, total: t1, crashes: crashes[0] },
      { side: 2, name: `${id}-B`, total: t2, crashes: crashes[1] },
    ],
    rounds: rounds.map(([a, b, la = 0, lb = 0]) => ({ scores: { 1: score(a, la), 2: score(b, lb) } })),
  };
}

describe("awards", () => {
  it("are empty with no matches", () => {
    expect(computeAwards([])).toEqual({ comeback: null, destroyer: null, unbreakable: null });
  });

  it("comeback: the winner who was furthest behind after any round", () => {
    const small = match("m1", [[900, 1000], [1200, 1000], [1000, 1000]]); // A was 100 behind
    const big = match("m2", [[1000, 1500], [1000, 1400], [2000, 900]]); // A was 900 behind
    const awards = computeAwards([small, big]);
    expect(awards.comeback).toMatchObject({ team: "m2-A", matchId: "m2", detail: "Won from 900 behind" });
  });

  it("no comeback award for a team that led all the way", () => {
    expect(computeAwards([match("m1", [[2000, 1000], [2000, 1000], [2000, 1000]])]).comeback).toBeNull();
  });

  it("destroyer: most attacks landed in one match", () => {
    const awards = computeAwards([match("m1", [[1000, 1000, 2, 1], [1000, 1000, 1, 5]]), match("m2", [[1000, 900, 3, 0]])]);
    expect(awards.destroyer).toMatchObject({ team: "m1-B", detail: "6 attacks landed" });
  });

  it("unbreakable: the best total that never went down", () => {
    const awards = computeAwards([match("m1", [[5000, 4000]], [1, 0]), match("m2", [[4500, 1000]])]);
    expect(awards.unbreakable).toMatchObject({ team: "m2-A", detail: "4,500, never went down" });
  });

  it("skips teams the store left out (hidden)", () => {
    const m = match("m1", [[1000, 1500], [3000, 1000]]);
    m.teams = m.teams.filter((t) => t.side !== 1);
    expect(computeAwards([m]).comeback).toBeNull();
  });
});
