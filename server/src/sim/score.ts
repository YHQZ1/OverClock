import type { SimConfig } from "./config.js";
import type { MatchState } from "./types.js";

export type ScoreBreakdown = {
  served: number;
  lost: number;
  lostPenalty: number;
  budgetSaved: number; // negative if overspent
  total: number;
  downtimeSec: number;
};

/** Round score: people served − penalty for people lost + budget left. */
export function scoreOf(state: MatchState, config: SimConfig): ScoreBreakdown {
  const served = Math.round(state.totals.served);
  const lost = Math.round(state.totals.lost);
  const lostPenalty = Math.round(lost * config.lostPenalty);
  const budgetSaved = Math.round(state.budget * config.budgetWeight);
  return {
    served,
    lost,
    lostPenalty,
    budgetSaved,
    total: served - lostPenalty + budgetSaved,
    downtimeSec: state.totals.downtimeTicks / config.tickRate,
  };
}
