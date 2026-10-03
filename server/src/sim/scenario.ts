// Round content: how long it lasts, how much budget, how traffic behaves
// and which events happen. Pure data — the engine interprets it.

export type RushSpec = {
  kind: "rush";
  atSec: number; // nominal start
  durationSec: number;
  multiplier: number; // traffic × this at full strength
  rampSec: number; // build-up and wind-down time
};

export type EventSpec = RushSpec;

export type Scenario = {
  id: string;
  durationSec: number;
  startServers: number;
  startBudget: number;

  traffic: {
    baseRate: number; // people per second at the start
    growth: number; // base rises by this fraction by the end of the round
    waveAmp: number; // gentle wave, as a fraction of base
    wavePeriodSec: number;
    noiseAmp: number; // per-tick wobble, as a fraction
  };

  events: EventSpec[];
  /** Each event starts up to ± this many seconds from its nominal time (seeded). */
  jitterSec: number;
};

/** Round 1 "Learn": one problem at a time, generous budget. */
export const ROUND_1: Scenario = {
  id: "round-1",
  durationSec: 120,
  startServers: 4,
  startBudget: 6000,
  traffic: {
    baseRate: 100,
    growth: 0.1,
    waveAmp: 0.06,
    wavePeriodSec: 20,
    noiseAmp: 0.05,
  },
  events: [
    { kind: "rush", atSec: 25, durationSec: 15, multiplier: 2.5, rampSec: 4 },
    { kind: "rush", atSec: 75, durationSec: 18, multiplier: 3, rampSec: 4 },
  ],
  jitterSec: 3,
};
