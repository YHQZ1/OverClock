// Game rules that are the same for every round. Round content (length,
// traffic, events, budget) lives in scenarios. Tuning notes: docs/BALANCE.md.

export type SimConfig = {
  tickRate: number; // ticks per second

  // Servers
  capacityPerServer: number; // people served per second by one online server
  bootSec: number; // time before a new server goes online
  addCooldownSec: number; // + SERVERS cooldown
  minServers: number;
  maxServers: number; // technical safety limit, not a gameplay cap
  serverCostPerSec: number; // budget drained per running (or booting) server

  // Health
  healthZeroAt: number; // served ratio at or below which health heads to 0
  healthFullAt: number; // served ratio at or above which health heads to 100
  healthEasePerSec: number; // fraction of the gap closed per second
  criticalBelow: number; // health that triggers a "critical" alert
  recoveredAbove: number; // health that clears the critical state

  // Crash
  crashBelow: number; // health at or below which the system goes down
  crashSec: number;
  rebootHealth: number;

  // Score
  lostPenalty: number; // points lost per person turned away
  budgetWeight: number; // points per unit of budget left at the end
};

export const DEFAULT_CONFIG: SimConfig = {
  tickRate: 10,

  capacityPerServer: 30,
  bootSec: 2,
  addCooldownSec: 1,
  minServers: 1,
  maxServers: 40,
  // A busy server serves 30/s = 30 points/s, about 5× its running cost.
  serverCostPerSec: 6,

  healthZeroAt: 0.4,
  healthFullAt: 0.95,
  healthEasePerSec: 0.6,
  criticalBelow: 25,
  recoveredAbove: 60,

  crashBelow: 1,
  crashSec: 8,
  rebootHealth: 30,

  lostPenalty: 1,
  budgetWeight: 1,
};

/** Seconds → whole ticks. */
export const toTicks = (sec: number, config: SimConfig): number => Math.round(sec * config.tickRate);
