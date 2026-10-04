import type { SiteScore, Side } from "../sim/index.js";
import type { Award, Awards, Format } from "../types/contracts.js";

/** What the awards need from one saved match. Hidden teams are left out by the store. */
export type AwardMatch = {
  matchId: string;
  format: Format;
  winner: Side | null;
  teams: { side: Side; name: string; total: number; crashes: number }[];
  rounds: { scores: Record<Side, SiteScore> }[];
};

const n = (x: number) => Math.round(x).toLocaleString("en-IN");
const otherSide = (s: Side): Side => (s === 1 ? 2 : 1);

/** The big screen's fun awards: no fairness needed, just a moment on screen for more teams. */
export function computeAwards(matches: readonly AwardMatch[]): Awards {
  let comeback: { award: Award; deficit: number } | null = null;
  let destroyer: { award: Award; landed: number } | null = null;
  let unbreakable: { award: Award; total: number } | null = null;

  for (const m of matches) {
    // Comeback: the winner's biggest deficit after any round.
    const winner = m.winner === null ? undefined : m.teams.find((t) => t.side === m.winner);
    if (winner) {
      let mine = 0;
      let theirs = 0;
      let worst = 0;
      for (const r of m.rounds) {
        mine += r.scores[winner.side].total;
        theirs += r.scores[otherSide(winner.side)].total;
        worst = Math.max(worst, theirs - mine);
      }
      if (worst > 0 && (!comeback || worst > comeback.deficit)) {
        comeback = { deficit: worst, award: { team: winner.name, format: m.format, matchId: m.matchId, detail: `Won from ${n(worst)} behind` } };
      }
    }

    for (const t of m.teams) {
      const landed = m.rounds.reduce((sum, r) => sum + r.scores[t.side].attacksLanded, 0);
      if (landed > 0 && (!destroyer || landed > destroyer.landed)) {
        destroyer = { landed, award: { team: t.name, format: m.format, matchId: m.matchId, detail: `${landed} attacks landed` } };
      }
      if (t.crashes === 0 && (!unbreakable || t.total > unbreakable.total)) {
        unbreakable = { total: t.total, award: { team: t.name, format: m.format, matchId: m.matchId, detail: `${n(t.total)}, never went down` } };
      }
    }
  }

  return { comeback: comeback?.award ?? null, destroyer: destroyer?.award ?? null, unbreakable: unbreakable?.award ?? null };
}
