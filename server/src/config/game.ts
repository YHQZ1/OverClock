// Session timing and room limits. Tests pass smaller values.

export type GameTiming = {
  voteSec: number;
  buySec: number;
  resultSec: number;
  tickMs: number;
  /** A room with every player disconnected this long is abandoned. */
  abandonAfterMs: number;
  /** Mid-match, a side with nobody connected this long forfeits (match not recorded). */
  sideGoneMs: number;
  sweepEveryMs: number;
};

export const DEFAULT_TIMING: GameTiming = {
  voteSec: 10,
  buySec: 20,
  resultSec: 8,
  tickMs: 100,
  abandonAfterMs: 2 * 60 * 1000,
  sideGoneMs: 60 * 1000,
  sweepEveryMs: 5 * 1000,
};

export const MAX_PLAYERS = 4;

/** Placeholder theme ids until the real themes are chosen (docs/GAME.md → Themes). Cosmetic only. */
export const THEMES = ["results", "tickets", "sale", "launch"] as const;
export type ThemeId = (typeof THEMES)[number];
