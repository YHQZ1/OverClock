import { createDuel, step, type MatchSetup } from "./engine.js";
import type { Action, DuelState, Side, SimEvent } from "./types.js";

/** Every action with the tick it was applied on — enough to replay a round. */
export type ActionLog = { tick: number; action: Action }[];

export type Phase = "buy" | "live";

/** Decides what one side presses this tick. Bots may keep private memory. */
export type Policy = (state: DuelState, side: Side, phase: Phase) => Action[];

/** Ticks of buy phase bots get before a round (the real match uses ~20s). */
export const BOT_BUY_TICKS = 5;

/** Buy-phase actions are logged with tick -1: they happen before the clock starts. */
export type RoundRun = { state: DuelState; log: ActionLog; events: { tick: number; event: SimEvent }[] };

/** Play a whole round with one policy per side. */
export function runRound(setup: MatchSetup, seed: number, policies: Record<Side, Policy>): RoundRun {
  let state = createDuel(setup, seed);
  const log: ActionLog = [];
  const events: RoundRun["events"] = [];

  for (let i = 0; i < BOT_BUY_TICKS; i++) {
    const actions = [...policies[1](state, 1, "buy"), ...policies[2](state, 2, "buy")];
    for (const action of actions) log.push({ tick: -1, action });
    const result = step(state, actions, setup, { paused: true });
    for (const event of result.events) events.push({ tick: -1, event });
    state = result.state;
  }

  while (state.phase === "running") {
    const tick = state.tick;
    const actions = [...policies[1](state, 1, "live"), ...policies[2](state, 2, "live")];
    for (const action of actions) log.push({ tick, action });
    const result = step(state, actions, setup);
    for (const event of result.events) events.push({ tick, event });
    state = result.state;
  }
  return { state, log, events };
}

/** Rebuild a round from its seed and action log. */
export function replay(setup: MatchSetup, seed: number, log: ActionLog): DuelState {
  const byTick = new Map<number, Action[]>();
  for (const { tick, action } of log) byTick.set(tick, [...(byTick.get(tick) ?? []), action]);
  let state = createDuel(setup, seed);
  state = step(state, byTick.get(-1) ?? [], setup, { paused: true }).state;
  while (state.phase === "running") state = step(state, byTick.get(state.tick) ?? [], setup).state;
  return state;
}
