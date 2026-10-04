// Duel rules that are the same for every round. Round content (length,
// traffic, starting coins) lives in scenarios; the shop in items.ts.
// Tuning notes: docs/BALANCE.md.

import { DEFAULT_CATALOGUE, type Catalogue } from "./items.js";

export type SimConfig = {
  tickRate: number; // ticks per second

  // Servers
  serverCapacity: number; // people per second one online server handles
  bootSec: number;
  /** Other defences take this long to set up (instant in the buy phase). */
  setupSec: number;
  minServers: number;
  /** Without a Traffic splitter, servers beyond this many work at `unsplitEfficiency`. */
  splitterFreeServers: number;
  unsplitEfficiency: number;

  // Database + Fast shelf
  dbCapacity: number; // people per second the database handles
  dbPerBackup: number; // extra per Backup database
  shelfHitShare: number; // share of visitors a warm shelf answers on its own
  shelfWarmSec: number; // cold → warm after buying or a flush

  // Bouncer
  bouncerBotBlock: number; // share of bots stopped
  bouncerFalsePositive: number; // share of real people wrongly turned away

  // Economy
  incomePerPerson: number; // coins per visitor served
  comebackGap: number; // trailing by more than this share of the leader's score…
  comebackBoost: number; // …earns this much more
  sellRefund: number; // share of the price returned on sale
  attackRegroupSec: number; // after any attack, all attacks wait this long
  attackPriceStep: number; // each repeat of the same attack in a round costs this much more
  attackFatigueStep: number; // every attack sent makes all attacks this much pricier for the round

  // Health
  healthZeroAt: number; // served share at/below which health heads to 0
  healthFullAt: number; // served share at/above which health heads to 100
  healthEasePerSec: number; // fraction of the gap closed per second
  criticalBelow: number;
  recoveredAbove: number;

  // Crash
  crashBelow: number;
  crashSec: number;
  rebootHealth: number;
  rebootProtectSec: number; // attacks bounce off a freshly rebooted site

  // Score
  lostPenalty: number; // points lost per visitor turned away

  items: Catalogue;
};

export const DEFAULT_CONFIG: SimConfig = {
  tickRate: 10,

  serverCapacity: 30,
  bootSec: 2,
  setupSec: 4,
  minServers: 1,
  splitterFreeServers: 4,
  unsplitEfficiency: 0.6,

  dbCapacity: 150,
  dbPerBackup: 120,
  shelfHitShare: 0.6,
  shelfWarmSec: 8,

  bouncerBotBlock: 0.85,
  bouncerFalsePositive: 0.03,

  incomePerPerson: 0.12,
  comebackGap: 0.15,
  comebackBoost: 1.25,
  sellRefund: 0.5,
  attackRegroupSec: 5,
  attackPriceStep: 0.25,
  attackFatigueStep: 0.08,

  healthZeroAt: 0.4,
  healthFullAt: 0.95,
  healthEasePerSec: 0.6,
  criticalBelow: 25,
  recoveredAbove: 60,

  crashBelow: 1,
  crashSec: 8,
  rebootHealth: 30,
  rebootProtectSec: 5,

  lostPenalty: 1,

  items: DEFAULT_CATALOGUE,
};

/** Seconds → whole ticks. */
export const toTicks = (sec: number, config: SimConfig): number => Math.round(sec * config.tickRate);
