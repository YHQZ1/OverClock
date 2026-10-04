import type { AttackId, DefenceId, ItemId } from "./items.js";
import type { RngState } from "./rng.js";

export type Side = 1 | 2;
export const SIDES: readonly Side[] = [1, 2];
export const other = (side: Side): Side => (side === 1 ? 2 : 1);

/** Defences other than servers — owned as counts. */
export type ExtraDefenceId = Exclude<DefenceId, "server">;

export type ServerUnit = {
  id: number;
  /** > 0 while starting up. */
  bootTicksLeft: number;
  /** > 0 while wrecked by an attack (offline, no upkeep). */
  meltedTicksLeft: number;
};

/** Something active on a site: an attack that landed, or a utility in use. */
export type EffectKind = Exclude<AttackId, "destroy"> | "shield" | "overclock" | "protected";
export type Effect = { kind: EffectKind; ticksLeft: number; totalTicks: number };

/** An attack on its way, announced to the target. */
export type Incoming = { id: number; attack: AttackId; ticksUntil: number };

/** The parts of the pipeline, in the order visitors travel through them. */
export type Part = "door" | "servers" | "shelf" | "db";

export type SiteTotals = {
  served: number;
  lost: number;
  coinsEarned: number;
  coinsSpent: number;
  crashes: number;
  downtimeTicks: number;
  attacksSent: number;
  attacksLanded: number; // attacks that hit this site
  attacksBlocked: number; // attacks this site blocked
  peakServers: number;
};

/** Last tick's numbers — hidden from players except as relative values. */
export type SiteFlow = {
  peopleRate: number; // real visitors arriving per second
  botRate: number; // bots arriving per second
  served: number; // this tick
  lost: number; // this tick
  servedShare: number; // 0 → 1 of real visitors
  utilization: number; // share of server capacity in use
  /** 0 → 1 of what reached each part and got through it. */
  passShare: Record<Part, number>;
  bottleneck: Part | null;
};

export type SiteState = {
  servers: ServerUnit[];
  nextServerId: number;
  /** Defences that are set up and working. */
  owned: Record<ExtraDefenceId, number>;
  /** Defences bought but still setting up. */
  setups: { item: ExtraDefenceId; ticksLeft: number }[];
  /** 0 (cold) → 1 (warm). Only matters with a Fast shelf. */
  shelfWarmth: number;

  coins: number;
  health: number;
  crashTicksLeft: number;
  critical: boolean;
  /** Ticks until the next "out of coins" switch-off may happen. */
  switchOffTicks: number;

  effects: Effect[];
  incoming: Incoming[];
  /** Ticks until each attack / utility can be used again. */
  cooldowns: Partial<Record<ItemId, number>>;
  /** Ticks until any attack can be sent again (attackers regroup). */
  regroupTicks: number;
  /** Attacks sent this round, per kind — repeats cost more. */
  attacksUsed: Partial<Record<AttackId, number>>;

  flow: SiteFlow;
  totals: SiteTotals;
};

export type ScheduledRush = { startTick: number; endTick: number; rampTicks: number; multiplier: number };

export type DuelState = {
  tick: number;
  durationTicks: number;
  phase: "running" | "ended";
  rng: RngState;
  wavePhase: number;
  rushes: ScheduledRush[];
  /** The shared background crowd last tick, people per second. */
  crowdRate: number;
  nextIncomingId: number;
  sites: Record<Side, SiteState>;
};

export type ActionKind = "buy" | "sell" | "use" | "attack";

/** A player's intent. `by` is a display name carried into events (no logic uses it). */
export type Action = { side: Side; kind: ActionKind; item: ItemId; by?: string };

export type RejectReason = "coins" | "cooldown" | "max" | "min" | "none" | "down" | "paused" | "ended" | "wrongKind" | "jammed";

/** Every event names the side it concerns. */
export type SimEvent =
  | { side: Side; type: "bought" | "sold" | "used"; item: ItemId; by?: string }
  | { side: Side; type: "attackSent"; attack: AttackId; by?: string }
  | { side: Side; type: "attackIncoming"; attack: AttackId; inSec: number }
  | { side: Side; type: "attackLanded"; attack: AttackId }
  | { side: Side; type: "attackBlocked"; attack: AttackId; reason: "shield" | "protected" }
  | { side: Side; type: "rejected"; kind: ActionKind; item: ItemId; reason: RejectReason; by?: string }
  | { side: Side; type: "serverOnline" | "serverSwitchedOff" | "serversRestored" }
  | { side: Side; type: "defenceReady"; item: ExtraDefenceId }
  | { side: Side; type: "serversMelted"; count: number }
  | { side: Side; type: "rushStarted" | "rushEnded" | "critical" | "recovered" | "crashed" | "rebooted" }
  | { side: Side; type: "ended" };

export type StepResult = { state: DuelState; events: SimEvent[] };
