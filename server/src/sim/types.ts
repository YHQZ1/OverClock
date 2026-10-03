import type { RngState } from "./rng.js";

export type ServerUnit = {
  id: number;
  /** 0 = online; otherwise ticks until it comes online. */
  bootTicksLeft: number;
};

/** An event with its seeded timing resolved, in ticks. */
export type ScheduledRush = {
  kind: "rush";
  startTick: number;
  endTick: number;
  rampTicks: number;
  multiplier: number;
};

export type ScheduledEvent = ScheduledRush;

export type MatchTotals = {
  served: number;
  lost: number;
  crashes: number;
  downtimeTicks: number;
  /** Sum over ticks of online servers with nothing to do (fractional). */
  idleServerTicks: number;
  peakServers: number;
};

export type MatchState = {
  tick: number;
  durationTicks: number;
  phase: "running" | "ended";
  rng: RngState;
  wavePhase: number;

  servers: ServerUnit[];
  nextServerId: number;
  addCooldownTicks: number;

  budget: number;
  health: number;
  /** > 0 while the system is down. */
  crashTicksLeft: number;
  critical: boolean;

  /** Hidden metrics from the last tick (Tech View / bots, never player UI). */
  trafficRate: number; // people arriving per second
  servedRatio: number; // share of arrivals served
  utilization: number; // share of online capacity in use

  schedule: ScheduledEvent[];
  totals: MatchTotals;
};

export type Action = { type: "addServer" } | { type: "removeServer" };

export type RejectReason = "crashed" | "cooldown" | "noBudget" | "maxServers" | "minServers" | "ended";

export type SimEvent =
  | { type: "rushStarted" }
  | { type: "rushEnded" }
  | { type: "serverAdded"; id: number }
  | { type: "serverRemoved"; id: number }
  | { type: "serverOnline"; id: number }
  | { type: "actionRejected"; action: Action["type"]; reason: RejectReason }
  | { type: "critical" }
  | { type: "recovered" }
  | { type: "crashed" }
  | { type: "rebooted" }
  | { type: "ended" };

export type StepResult = { state: MatchState; events: SimEvent[] };
