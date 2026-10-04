import type { SimConfig } from "./config.js";
import { SIDES, type DuelState, type Side, type SiteState } from "./types.js";

export type SiteScore = {
  served: number;
  lost: number;
  lostPenalty: number;
  total: number;
  crashes: number;
  downtimeSec: number;
  coinsEarned: number;
  attacksSent: number;
  attacksLanded: number;
  attacksBlocked: number;
};

export type RoundResult = {
  scores: Record<Side, SiteScore>;
  /** null = draw. */
  winner: Side | null;
};

export function scoreSite(site: SiteState, config: SimConfig): SiteScore {
  const served = Math.round(site.totals.served);
  const lost = Math.round(site.totals.lost);
  const lostPenalty = Math.round(lost * config.lostPenalty);
  return {
    served,
    lost,
    lostPenalty,
    total: served - lostPenalty,
    crashes: site.totals.crashes,
    downtimeSec: site.totals.downtimeTicks / config.tickRate,
    coinsEarned: Math.round(site.totals.coinsEarned),
    attacksSent: site.totals.attacksSent,
    attacksLanded: site.totals.attacksLanded,
    attacksBlocked: site.totals.attacksBlocked,
  };
}

/** Higher score wins; ties go to fewer crashes, then less downtime. */
export function decide(a: Pick<SiteScore, "total" | "crashes" | "downtimeSec">, b: typeof a): Side | null {
  if (a.total !== b.total) return a.total > b.total ? 1 : 2;
  if (a.crashes !== b.crashes) return a.crashes < b.crashes ? 1 : 2;
  if (a.downtimeSec !== b.downtimeSec) return a.downtimeSec < b.downtimeSec ? 1 : 2;
  return null;
}

export function roundResult(state: DuelState, config: SimConfig): RoundResult {
  const scores = { 1: scoreSite(state.sites[1], config), 2: scoreSite(state.sites[2], config) };
  return { scores, winner: decide(scores[1], scores[2]) };
}

export type MatchTotals = Record<Side, { total: number; crashes: number; downtimeSec: number; roundsWon: number }>;

/** Sum rounds into match totals and pick the winner. */
export function matchTotals(rounds: readonly RoundResult[]): { totals: MatchTotals; winner: Side | null } {
  const totals = {
    1: { total: 0, crashes: 0, downtimeSec: 0, roundsWon: 0 },
    2: { total: 0, crashes: 0, downtimeSec: 0, roundsWon: 0 },
  } satisfies MatchTotals;
  for (const r of rounds) {
    for (const side of SIDES) {
      totals[side].total += r.scores[side].total;
      totals[side].crashes += r.scores[side].crashes;
      totals[side].downtimeSec += r.scores[side].downtimeSec;
    }
    if (r.winner) totals[r.winner].roundsWon++;
  }
  return { totals, winner: decide(totals[1], totals[2]) };
}

export type MatchPointWeights = { opponentShare: number; winBonus: number };
export const DEFAULT_WEIGHTS: MatchPointWeights = { opponentShare: 0.5, winBonus: 2000 };

/**
 * Leaderboard points for one side. Every match is a one-off, so the
 * opponent's total in the same match is the evidence of their strength.
 */
export function matchPoints(mine: number, theirs: number, won: boolean, w: MatchPointWeights = DEFAULT_WEIGHTS): number {
  return Math.round(mine + w.opponentShare * theirs + (won ? w.winBonus : 0));
}
