// Session timing. Tests pass smaller values.
export type GameTiming = {
  countdownSec: number;
  tickMs: number;
  /** A team with every player disconnected this long is abandoned. */
  abandonAfterMs: number;
  sweepEveryMs: number;
};

export const DEFAULT_TIMING: GameTiming = {
  countdownSec: 3,
  tickMs: 100,
  abandonAfterMs: 2 * 60 * 1000,
  sweepEveryMs: 10 * 1000,
};

export const MAX_PLAYERS = 3;
