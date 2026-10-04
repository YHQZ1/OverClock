import { describe, expect, it } from "vitest";
import { decide, matchPoints, matchTotals, type RoundResult, type SiteScore } from "../../src/sim/index.js";

const site = (total: number, crashes = 0, downtimeSec = 0): SiteScore => ({
  served: total,
  lost: 0,
  lostPenalty: 0,
  total,
  crashes,
  downtimeSec,
  coinsEarned: 0,
  attacksSent: 0,
  attacksLanded: 0,
  attacksBlocked: 0,
});
const round = (a: SiteScore, b: SiteScore): RoundResult => ({ scores: { 1: a, 2: b }, winner: decide(a, b) });

describe("scoring", () => {
  it("higher score wins; ties go to fewer crashes, then less downtime, else draw", () => {
    expect(decide(site(10), site(9))).toBe(1);
    expect(decide(site(10, 2), site(10, 1))).toBe(2);
    expect(decide(site(10, 1, 8), site(10, 1, 4))).toBe(2);
    expect(decide(site(10), site(10))).toBeNull();
  });

  it("sums three rounds into match totals", () => {
    const { totals, winner } = matchTotals([round(site(100), site(90)), round(site(80), site(95)), round(site(70), site(60))]);
    expect(totals[1]).toMatchObject({ total: 250, roundsWon: 2 });
    expect(totals[2]).toMatchObject({ total: 245, roundsWon: 1 });
    expect(winner).toBe(1);
  });

  it("match points reward beating a strong team over crushing a weak one", () => {
    expect(matchPoints(30_000, 28_000, true)).toBeGreaterThan(matchPoints(32_000, 15_000, true));
    expect(matchPoints(28_000, 30_000, false)).toBeGreaterThan(matchPoints(25_000, 12_000, false));
    expect(matchPoints(10_000, 10_000, true) - matchPoints(10_000, 10_000, false)).toBe(2_000);
  });
});
