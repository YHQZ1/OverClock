import { createMatch, step, type MatchSetup } from "./engine.js";
import type { Action, MatchState, SimEvent } from "./types.js";

/** Every action with the tick it was applied on — enough to replay a match. */
export type ActionLog = { tick: number; action: Action }[];

/** Decides what to press this tick. Bots may keep private memory. */
export type Policy = (state: MatchState) => Action[];

export type MatchRun = {
  state: MatchState;
  log: ActionLog;
  events: { tick: number; event: SimEvent }[];
};

/** Play a whole match, asking `policy` for actions every tick. */
export function runMatch(setup: MatchSetup, seed: number, policy: Policy): MatchRun {
  let state = createMatch(setup, seed);
  const log: ActionLog = [];
  const events: MatchRun["events"] = [];

  while (state.phase === "running") {
    const tick = state.tick;
    const actions = policy(state);
    for (const action of actions) log.push({ tick, action });
    const result = step(state, actions, setup);
    for (const event of result.events) events.push({ tick, event });
    state = result.state;
  }

  return { state, log, events };
}

/** Rebuild a match from its seed and action log. */
export function replay(setup: MatchSetup, seed: number, log: ActionLog): MatchState {
  const byTick = new Map<number, Action[]>();
  for (const { tick, action } of log) byTick.set(tick, [...(byTick.get(tick) ?? []), action]);

  let state = createMatch(setup, seed);
  while (state.phase === "running") {
    state = step(state, byTick.get(state.tick) ?? [], setup).state;
  }
  return state;
}
