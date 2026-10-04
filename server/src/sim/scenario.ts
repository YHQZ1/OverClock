// Round content: length, starting coins and the background crowd both sites
// share. Pure data — the engine interprets it.

export type RushSpec = {
  atSec: number; // nominal start (seeded jitter applies)
  durationSec: number;
  multiplier: number; // crowd × this at full strength
  rampSec: number;
};

export type Scenario = {
  id: string;
  durationSec: number;
  startServers: number;
  startCoins: number;
  traffic: {
    baseRate: number; // people per second at the start
    growth: number; // base rises by this share by the end of the round
    waveAmp: number; // gentle wave, as a share of base
    wavePeriodSec: number;
    noiseAmp: number; // per-tick wobble, as a share
  };
  /** Natural rushes that hit both sites equally. */
  rushes: RushSpec[];
  jitterSec: number;
};

const traffic = { baseRate: 100, growth: 0.15, waveAmp: 0.06, wavePeriodSec: 20, noiseAmp: 0.05 };

// Starting values (tune). Every round starts fresh: same coins, same servers.
export const ROUNDS: readonly Scenario[] = [
  {
    id: "round-1",
    durationSec: 90,
    startServers: 4,
    startCoins: 500,
    traffic,
    rushes: [{ atSec: 45, durationSec: 10, multiplier: 1.6, rampSec: 3 }],
    jitterSec: 4,
  },
  {
    id: "round-2",
    durationSec: 120,
    startServers: 4,
    startCoins: 500,
    traffic: { ...traffic, growth: 0.25 },
    rushes: [{ atSec: 60, durationSec: 12, multiplier: 1.8, rampSec: 3 }],
    jitterSec: 5,
  },
  {
    id: "round-3",
    durationSec: 120,
    startServers: 4,
    startCoins: 500,
    traffic: { ...traffic, growth: 0.35 },
    rushes: [
      { atSec: 40, durationSec: 10, multiplier: 1.8, rampSec: 3 },
      { atSec: 95, durationSec: 15, multiplier: 2, rampSec: 3 },
    ],
    jitterSec: 5,
  },
];
