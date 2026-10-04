// Balance invariants from docs/BALANCE.md, checked across seeds and rounds.

import { describe, expect, it } from "vitest";
import {
  BOTS,
  DEFAULT_CONFIG,
  ROUNDS,
  matchPoints,
  matchTotals,
  roundResult,
  runRound,
  toTicks,
  type Action,
  type AttackId,
  type BotName,
  type ItemId,
  type MatchSetup,
  type Policy,
} from "./index.js";

const config = DEFAULT_CONFIG;
const SEEDS = Array.from({ length: 8 }, (_, i) => i + 1);

function match(a: BotName, b: BotName, seed: number) {
  const rounds = ROUNDS.map((scenario, i) =>
    roundResult(runRound({ scenario, config }, seed * 10 + i, { 1: BOTS[a](config), 2: BOTS[b](config) }).state, config),
  );
  return matchTotals(rounds);
}

const PLAYERS: BotName[] = ["turtle", "rusher", "balanced", "humanFast", "humanSlow"];

describe("duel balance", () => {
  it("doing nothing loses to everyone", () => {
    for (const bot of PLAYERS) for (const seed of SEEDS) expect(match(bot, "idle", seed).winner).toBe(1);
  });

  it("mirror matches are exact draws — no side advantage", () => {
    for (const bot of ["balanced", "rusher"] as const) {
      const m = match(bot, bot, 3);
      expect(m.totals[1].total).toBe(m.totals[2].total);
      expect(m.winner).toBeNull();
    }
  });

  it("no single strategy dominates", () => {
    for (const a of PLAYERS) {
      let wins = 0;
      let games = 0;
      for (const b of PLAYERS) {
        if (a === b) continue;
        for (const seed of SEEDS.slice(0, 4)) {
          games++;
          if (match(a, b, seed).winner === 1) wins++;
        }
      }
      expect(wins / games, `${a} win rate`).toBeLessThan(0.9);
    }
  });
});

describe("every attack has a counter that measurably helps", () => {
  const setup: MatchSetup = { scenario: { ...ROUNDS[1]!, rushes: [] }, config };
  const at = toTicks(20, config);

  /** A busy site where the database is the limit unless the shelf is warm — where a flush matters. */
  const busy: MatchSetup = {
    scenario: { ...ROUNDS[1]!, startServers: 10, traffic: { ...ROUNDS[1]!.traffic, baseRate: 220, growth: 0 }, rushes: [] },
    config,
  };

  /** Side 1 sends `attack` at 20s; side 2 optionally prepares or reacts. */
  function lostTo(attack: AttackId, prepare: ItemId[], react: Action["kind"] | null, counter?: ItemId) {
    const round = attack === "flush" ? busy : setup;
    const attacker: Policy = (state, side, phase) =>
      phase === "live" && state.tick === at ? [{ side, kind: "attack", item: attack }] : [];
    const defender: Policy = (state, side, phase) => {
      if (phase === "buy") return [];
      const landing = toTicks(config.items.attacks[attack].warningSec, config);
      if (react && counter && state.tick === at + landing + 1) return [{ side, kind: react, item: counter }];
      return [];
    };
    const prepared: Policy = (state, side, phase) =>
      phase === "buy" && state.sites[side].totals.coinsSpent === 0
        ? prepare.map((item) => ({ side, kind: "buy" as const, item }))
        : defender(state, side, phase);
    const run = runRound(round, 5, { 1: attacker, 2: prepare.length ? prepared : defender });
    return run.state.sites[2].totals.lost;
  }

  const cases: { attack: AttackId; prepare: ItemId[]; react?: [Action["kind"], ItemId] }[] = [
    { attack: "bots", prepare: ["bouncer"] },
    { attack: "cutRoute", prepare: ["secondRoute"] },
    { attack: "slowDb", prepare: ["backupDb"] },
    { attack: "surge", prepare: [], react: ["use", "overclock"] },
    { attack: "meltdown", prepare: [], react: ["use", "instantBackup"] },
    { attack: "flush", prepare: ["shelf", "backupDb"] },
  ];

  for (const c of cases) {
    it(`${c.attack} → ${c.prepare.concat(c.react ? [c.react[1]] : []).join(" + ")}`, () => {
      const without = lostTo(c.attack, c.attack === "flush" ? ["shelf"] : [], null);
      const withCounter = lostTo(c.attack, c.prepare, c.react?.[0] ?? null, c.react?.[1]);
      expect(withCounter).toBeLessThan(without * 0.8);
    });
  }
});

describe("match points", () => {
  it("beating a strong team is worth more than crushing a weak one", () => {
    const vsStrong = matchPoints(30_000, 28_000, true);
    const vsWeak = matchPoints(32_000, 15_000, true);
    expect(vsStrong).toBeGreaterThan(vsWeak);
  });

  it("a close loss to a strong team still scores", () => {
    expect(matchPoints(28_000, 30_000, false)).toBeGreaterThan(matchPoints(25_000, 12_000, false));
  });
});
