import type { SimConfig } from "./config.js";
import type { Scenario } from "./scenario.js";
import type { MatchState, ScheduledRush } from "./types.js";

/** Rush strength at a tick: ramps up, holds, ramps down. 1 = no rush. */
export function rushMultiplier(rush: ScheduledRush, tick: number): number {
  if (tick < rush.startTick || tick >= rush.endTick) return 1;
  const ramp = Math.max(1, rush.rampTicks);
  const up = (tick - rush.startTick) / ramp;
  const down = (rush.endTick - tick) / ramp;
  const strength = Math.min(1, up, down);
  return 1 + (rush.multiplier - 1) * strength;
}

/**
 * People arriving per second at the state's current tick, before noise.
 * Noise is applied by the engine so the RNG stays in one place.
 */
export function baseTrafficRate(state: MatchState, scenario: Scenario, config: SimConfig): number {
  const t = state.tick / config.tickRate;
  const { baseRate, growth, waveAmp, wavePeriodSec } = scenario.traffic;

  const base = baseRate * (1 + (growth * t) / scenario.durationSec);
  const wave = 1 + waveAmp * Math.sin((2 * Math.PI * t) / wavePeriodSec + state.wavePhase);
  const rush = state.schedule.reduce((m, ev) => Math.max(m, rushMultiplier(ev, state.tick)), 1);

  return base * wave * rush;
}
