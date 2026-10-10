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
} from "../../src/sim/index.js";

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

  // The rusher never defends, so with only five attacks (each with a counter)
  // it loses to everyone: counting wins against it would make any competent
  // strategy look dominant. Dominance is measured against opponents that defend.
  it("no single strategy dominates", () => {
    const defenders = PLAYERS.filter((b) => b !== "rusher");
    for (const a of PLAYERS) {
      let wins = 0;
      let games = 0;
      for (const b of defenders) {
        if (a === b) continue;
        for (const seed of SEEDS) {
          games++;
          if (match(a, b, seed).winner === 1) wins++;
        }
      }
      expect(wins / games, `${a} win rate`).toBeLessThan(0.9);
    }
  });
});

describe("every attack has a counter that measurably helps", () => {
  const normal: MatchSetup = { scenario: { ...ROUNDS[1]!, rushes: [] }, config };
  const at = toTicks(20, config);

  /** Defender's round score when side 1 sends `attack` at 20s (or nothing). */
  function defenderScore(round: MatchSetup, attack: AttackId | null, prepare: ItemId[], react?: [Action["kind"], ItemId]): number {
    const attacker: Policy = (state, side, phase) =>
      attack && phase === "live" && state.tick === at ? [{ side, kind: "attack", item: attack }] : [];
    const landing = attack ? toTicks(config.items.attacks[attack].warningSec, config) : 0;
    const defender: Policy = (state, side, phase) => {
      if (phase === "buy") return state.sites[side].totals.coinsSpent === 0 ? prepare.map((item) => ({ side, kind: "buy" as const, item })) : [];
      return react && state.tick === at + landing + 1 ? [{ side, kind: react[0], item: react[1] }] : [];
    };
    return roundResult(runRound(round, 5, { 1: attacker, 2: defender }).state, config).scores[2].total;
  }

  const cases: { attack: AttackId; prepare?: ItemId[]; react?: [Action["kind"], ItemId] }[] = [
    { attack: "bots", prepare: ["bouncer"] },
    { attack: "surge", react: ["use", "overclock"] },
    { attack: "destroy", react: ["use", "instantBackup"] },
    { attack: "wrongTurn", prepare: ["lockAddress"] },
  ];
  // Jam only hurts players who press things — covered by the engine tests.

  for (const c of cases) {
    const counter = [...(c.prepare ?? []), ...(c.react ? [c.react[1]] : [])].join(" + ");
    it(`${c.attack} → ${counter}`, () => {
      const prepare = c.prepare ?? [];
      const round = normal;
      const damage = defenderScore(round, null, []) - defenderScore(round, c.attack, []);
      const damageCountered = defenderScore(round, null, prepare) - defenderScore(round, c.attack, prepare, c.react);
      expect(damage, "the attack should hurt").toBeGreaterThan(100);
      expect(damageCountered, "the counter should cut the damage at least in half").toBeLessThan(damage * 0.5);
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
