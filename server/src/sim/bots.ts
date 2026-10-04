// Bot players for balance testing (docs/BALANCE.md). Each factory returns a
// fresh Policy. Bots only read what the game screen shows (own site in full,
// the opponent's health and defences — never their coins).

import { toTicks, type SimConfig } from "./config.js";
import { findEffect, onlineServers, priceOf } from "./engine.js";
import type { AttackId, ItemId } from "./items.js";
import type { Policy } from "./run.js";
import { other, type Action, type ActionKind, type DuelState, type Side } from "./types.js";

const act = (side: Side, kind: ActionKind, item: ItemId): Action => ({ side, kind, item });

/** Coins a bot may still spend this tick (so several purchases can't overspend). */
type Wallet = { coins: number };
const spend = (w: Wallet, price: number): boolean => {
  if (w.coins < price) return false;
  w.coins -= price;
  return true;
};

type Plan = {
  /** Built during the buy phase, in order, while affordable. */
  build: ItemId[];
  /** Share of income saved into an attack fund (0 = never attacks). */
  attackShare: number;
  defend: boolean;
  /** Acts only every this many seconds (human reaction). */
  reactionSec: number;
};

type Memo = { nextScaleTick: number };

/**
 * Defence the way an attentive player does it: answer each announced attack
 * with its counter, keep servers matched to the crowd, repair when low.
 */
function defend(state: DuelState, side: Side, config: SimConfig, wallet: Wallet, memo: Memo): Action[] {
  const site = state.sites[side];
  const out: Action[] = [];
  if (site.crashTicksLeft > 0) return out;
  const buy = (item: ItemId) => spend(wallet, priceOf(site, item, config)) && out.push(act(side, "buy", item));
  const use = (item: ItemId) =>
    !site.cooldowns[item] && spend(wallet, priceOf(site, item, config)) && out.push(act(side, "use", item));

  const shield = () => !findEffect(site, "shield") && use("shield");
  for (const inc of site.incoming) {
    if (inc.ticksUntil !== toTicks(2, config)) continue; // react once, 2s before it lands
    switch (inc.attack) {
      case "bots":
        if (!site.owned.bouncer) buy("bouncer") || shield();
        break;
      case "slowDb":
        if (site.owned.backupDb < 1) buy("backupDb");
        break;
      case "surge":
        if (!use("overclock")) {
          buy("server");
          buy("server");
        }
        break;
      case "slowServers":
        use("overclock") || shield();
        break;
      case "breakSplitter":
        if (!site.owned.splitter) shield();
        break;
      case "blindfold":
        if (!site.owned.backupMonitor) shield();
        break;
      case "wrongTurn":
        if (!site.owned.lockAddress) shield();
        break;
      case "destroy":
      case "jam":
        shield();
        break;
    }
  }

  if (site.servers.some((u) => u.meltedTicksLeft > 0)) use("instantBackup");
  if (site.health < 35) use("repair");

  // Scale servers from what's visible: the red part of the map, idle servers.
  if (state.tick >= memo.nextScaleTick) {
    const booting = site.servers.filter((u) => u.bootTicksLeft > 0).length;
    const bottleneck = site.flow.bottleneck;
    if (bottleneck === "servers" && booting < 2 && buy("server")) {
      memo.nextScaleTick = state.tick + toTicks(0.6, config);
    } else if (bottleneck === "db" && site.owned.backupDb < 2 && buy("backupDb")) {
      memo.nextScaleTick = state.tick + toTicks(2, config);
    } else if (site.flow.utilization < 0.6 && onlineServers(site) > 4 && booting === 0) {
      out.push(act(side, "sell", "server"));
      memo.nextScaleTick = state.tick + toTicks(1, config);
    }
  }
  if (onlineServers(site) > 5 && !site.owned.splitter) buy("splitter");
  return out;
}

/** Pick the attack the opponent is least ready for (their defences are visible). */
function chooseAttack(state: DuelState, side: Side, config: SimConfig, fund: number): AttackId | null {
  const me = state.sites[side];
  const them = state.sites[other(side)];
  if (me.regroupTicks > 0 || me.crashTicksLeft > 0) return null;
  const ranked: AttackId[] = [
    ...(them.owned.lockAddress ? [] : (["wrongTurn"] as const)),
    ...(them.owned.bouncer ? [] : (["bots"] as const)),
    ...(them.owned.backupMonitor ? [] : (["blindfold"] as const)),
    ...(them.owned.backupDb ? [] : (["slowDb"] as const)),
    ...(them.owned.splitter ? [] : (["breakSplitter"] as const)),
    "destroy",
    "slowServers",
    "surge",
    "jam",
  ];
  return ranked.find((a) => !me.cooldowns[a] && fund >= priceOf(me, a, config)) ?? null;
}

function planned(config: SimConfig, plan: Plan): Policy {
  const memo: Memo = { nextScaleTick: 0 };
  let fund = 0;
  let lastEarned = 0;
  const every = Math.max(1, toTicks(plan.reactionSec, config));

  return (state, side, phase) => {
    const me = state.sites[side];
    if (phase === "buy") {
      if (me.totals.coinsSpent > 0) return [];
      const wallet: Wallet = { coins: me.coins };
      return plan.build.filter((item) => spend(wallet, priceOf(me, item, config))).map((item) => act(side, "buy", item));
    }
    fund += (me.totals.coinsEarned - lastEarned) * plan.attackShare;
    lastEarned = me.totals.coinsEarned;
    fund = Math.min(fund, me.coins);
    if (state.tick % every !== 0) return [];

    const wallet: Wallet = { coins: me.coins - fund };
    const out = plan.defend ? defend(state, side, config, wallet, memo) : [];

    const attack = plan.attackShare > 0 ? chooseAttack(state, side, config, plan.attackShare >= 1 ? me.coins : fund) : null;
    if (attack) {
      fund = Math.max(0, fund - priceOf(me, attack, config));
      out.push(act(side, "attack", attack));
    }
    return out;
  };
}

/** Never presses anything. */
export const idleBot = (): Policy => () => [];

/** Only defends. */
export const turtleBot = (config: SimConfig) =>
  planned(config, { build: ["bouncer", "lockAddress"], attackShare: 0, defend: true, reactionSec: 0 });

/** Spends everything on attacks; never defends. */
export const rusherBot = (config: SimConfig) =>
  planned(config, { build: [], attackShare: 1, defend: false, reactionSec: 0 });

/** Defends to stay healthy, saves part of its income for attacks. */
export const balancedBot = (config: SimConfig) =>
  planned(config, { build: ["lockAddress"], attackShare: 0.45, defend: true, reactionSec: 0 });

/** Balanced, but reacting like a person (only every `reactionSec`). */
export const humanBot = (config: SimConfig, reactionSec: number) =>
  planned(config, { build: ["lockAddress"], attackShare: 0.4, defend: true, reactionSec });

export const BOTS = {
  idle: (_config: SimConfig) => idleBot(),
  turtle: turtleBot,
  rusher: rusherBot,
  balanced: balancedBot,
  humanFast: (config: SimConfig) => humanBot(config, 0.5),
  humanSlow: (config: SimConfig) => humanBot(config, 1.5),
} satisfies Record<string, (config: SimConfig) => Policy>;

export type BotName = keyof typeof BOTS;
