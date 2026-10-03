import { scoreOf, type MatchSetup, type MatchState } from "../sim/index.js";
import type { MatchView, PartStatus, ServerSlotView } from "../types/contracts.js";

const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

function serversStatus(state: MatchState): PartStatus {
  if (state.crashTicksLeft > 0) return "failing";
  if (state.servedRatio >= 0.95) return "ok";
  if (state.servedRatio >= 0.7) return "strained";
  return "failing";
}

/** Engine state → what players are allowed to see. Hidden metrics stay on the server. */
export function toMatchView(state: MatchState, { scenario, config }: MatchSetup): MatchView {
  const bootTicks = config.bootSec * config.tickRate;
  const online = state.servers.filter((u) => u.bootTicksLeft === 0).length;
  let busyLeft = Math.ceil(state.utilization * online - 1e-9);

  const servers: ServerSlotView[] = state.servers.map((u) => {
    if (u.bootTicksLeft > 0) {
      return { id: u.id, state: "booting", bootProgress: round1(1 - u.bootTicksLeft / bootTicks) };
    }
    if (state.crashTicksLeft > 0) return { id: u.id, state: "down", bootProgress: 1 };
    const busy = busyLeft-- > 0;
    return { id: u.id, state: busy ? "busy" : "idle", bootProgress: 1 };
  });

  const score = scoreOf(state, config);
  const cooldownTicks = config.addCooldownSec * config.tickRate;

  return {
    tick: state.tick,
    timeLeftSec: Math.max(0, (state.durationTicks - state.tick) / config.tickRate),
    durationSec: scenario.durationSec,
    health: Math.round(state.health),
    budget: Math.round(state.budget),
    startBudget: scenario.startBudget,
    spendPerSec: state.servers.length * config.serverCostPerSec,
    score: score.served - score.lostPenalty,
    served: score.served,
    lost: score.lost,
    servers,
    serversStatus: serversStatus(state),
    addCooldown: cooldownTicks > 0 ? round1(state.addCooldownTicks / cooldownTicks) : 0,
    downSecondsLeft: state.crashTicksLeft > 0 ? Math.ceil(state.crashTicksLeft / config.tickRate) : null,
    critical: state.critical,
    rush: state.schedule.some((ev) => state.tick >= ev.startTick && state.tick < ev.endTick),
    crowd: round2(state.trafficRate / scenario.traffic.baseRate),
    servedShare: round2(state.servedRatio),
  };
}
