// Balance invariants from docs/BALANCE.md, checked across many seeds.

import { describe, expect, it } from "vitest";
import { BOTS, DEFAULT_CONFIG, ROUND_1, runMatch, scoreOf, type BotName, type MatchSetup } from "./index.js";

const setup: MatchSetup = { scenario: ROUND_1, config: DEFAULT_CONFIG };
const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

function play(bot: BotName) {
  return SEEDS.map((seed) => {
    const { state } = runMatch(setup, seed, BOTS[bot](DEFAULT_CONFIG));
    return { crashes: state.totals.crashes, score: scoreOf(state, DEFAULT_CONFIG).total };
  });
}

const results = Object.fromEntries((Object.keys(BOTS) as BotName[]).map((b) => [b, play(b)])) as Record<
  BotName,
  ReturnType<typeof play>
>;
const avg = (bot: BotName) => results[bot].reduce((sum, r) => sum + r.score, 0) / SEEDS.length;

describe("round 1 balance", () => {
  it("idle crashes every time and scores far lower", () => {
    expect(results.idle.every((r) => r.crashes >= 1)).toBe(true);
    expect(avg("idle")).toBeLessThan(0.7 * avg("sensible"));
  });

  it("spamming + SERVERS loses to attentive play", () => {
    expect(avg("spam")).toBeLessThan(avg("humanSlow"));
  });

  it("never adding servers loses to attentive play", () => {
    expect(avg("stingy")).toBeLessThan(avg("humanSlow"));
  });

  it("attentive humans never crash in round 1", () => {
    for (const bot of ["sensible", "humanFast", "humanSlow"] as const) {
      expect(results[bot].every((r) => r.crashes === 0)).toBe(true);
    }
  });

  it("faster reactions score higher", () => {
    expect(avg("humanFast")).toBeGreaterThan(avg("humanSlow"));
  });

  it("serving people outweighs saving budget", () => {
    // The stingy bot banks the most budget yet must score the least of the non-spam bots.
    expect(avg("stingy")).toBeLessThan(avg("idle"));
  });
});
