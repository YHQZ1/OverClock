import { toTicks, type SimConfig } from "./config.js";
import { isAttack, isDefence, isUtility, type AttackId, type ItemId, type UtilityId } from "./items.js";
import { nextFloat, nextRange, seedRng } from "./rng.js";
import type { Scenario } from "./scenario.js";
import {
  SIDES,
  other,
  type Action,
  type DuelState,
  type Effect,
  type EffectKind,
  type ExtraDefenceId,
  type Part,
  type RejectReason,
  type Side,
  type SimEvent,
  type SiteState,
  type StepResult,
} from "./types.js";

/** Everything fixed for one round. */
export type MatchSetup = { scenario: Scenario; config: SimConfig };

const EXTRA_DEFENCES: readonly ExtraDefenceId[] = ["splitter", "bouncer", "shelf", "backupDb", "secondRoute"];
/** What switches off first when a team can't pay upkeep (after spare servers). */
const SWITCH_OFF_ORDER: readonly ExtraDefenceId[] = ["secondRoute", "backupDb", "shelf", "bouncer", "splitter"];

function newSite({ scenario, config }: MatchSetup): SiteState {
  return {
    servers: Array.from({ length: scenario.startServers }, (_, id) => ({ id, bootTicksLeft: 0, meltedTicksLeft: 0 })),
    nextServerId: scenario.startServers,
    owned: { splitter: 0, bouncer: 0, shelf: 0, backupDb: 0, secondRoute: 0 },
    setups: [],
    shelfWarmth: 0,
    coins: scenario.startCoins,
    health: 100,
    crashTicksLeft: 0,
    critical: false,
    switchOffTicks: 0,
    effects: [],
    incoming: [],
    cooldowns: {},
    regroupTicks: 0,
    attacksUsed: {},
    flow: {
      peopleRate: 0,
      botRate: 0,
      served: 0,
      lost: 0,
      servedShare: 1,
      utilization: 0,
      passShare: { door: 1, servers: 1, shelf: 1, db: 1 },
      bottleneck: null,
    },
    totals: {
      served: 0,
      lost: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      crashes: 0,
      downtimeTicks: 0,
      attacksSent: 0,
      attacksLanded: 0,
      attacksBlocked: 0,
      peakServers: scenario.startServers,
    },
  };
}

export function createDuel(setup: MatchSetup, seed: number): DuelState {
  const { scenario, config } = setup;
  let rng = seedRng(seed);
  let wavePhase: number;
  [wavePhase, rng] = nextRange(rng, 0, 2 * Math.PI);

  const rushes = scenario.rushes.map((r) => {
    let jitter: number;
    [jitter, rng] = nextRange(rng, -scenario.jitterSec, scenario.jitterSec);
    const startTick = toTicks(r.atSec + jitter, config);
    return {
      startTick,
      endTick: startTick + toTicks(r.durationSec, config),
      rampTicks: toTicks(r.rampSec, config),
      multiplier: r.multiplier,
    };
  });

  return {
    tick: 0,
    durationTicks: toTicks(scenario.durationSec, config),
    phase: "running",
    rng,
    wavePhase,
    rushes,
    crowdRate: scenario.traffic.baseRate,
    nextIncomingId: 1,
    sites: { 1: newSite(setup), 2: newSite(setup) },
  };
}

// ---------- helpers ----------

const cloneSite = (s: SiteState): SiteState => ({
  ...s,
  servers: s.servers.map((u) => ({ ...u })),
  owned: { ...s.owned },
  setups: s.setups.map((x) => ({ ...x })),
  effects: s.effects.map((e) => ({ ...e })),
  incoming: s.incoming.map((i) => ({ ...i })),
  cooldowns: { ...s.cooldowns },
  attacksUsed: { ...s.attacksUsed },
  flow: { ...s.flow, passShare: { ...s.flow.passShare } },
  totals: { ...s.totals },
});

export const findEffect = (site: SiteState, kind: EffectKind): Effect | undefined =>
  site.effects.find((e) => e.kind === kind);

function addEffect(site: SiteState, kind: EffectKind, ticks: number): void {
  const existing = findEffect(site, kind);
  if (existing) {
    existing.ticksLeft = Math.max(existing.ticksLeft, ticks);
    existing.totalTicks = Math.max(existing.totalTicks, ticks);
  } else {
    site.effects.push({ kind, ticksLeft: ticks, totalTicks: ticks });
  }
}

function removeEffect(site: SiteState, kind: EffectKind): void {
  site.effects = site.effects.filter((e) => e.kind !== kind);
}

/** Ramps in and out over ~2s so attacks build visibly. */
function rampOf(e: Effect, config: SimConfig): number {
  const ramp = Math.max(1, toTicks(2, config));
  const elapsed = e.totalTicks - e.ticksLeft;
  return Math.min(1, (elapsed + 1) / ramp, e.ticksLeft / ramp);
}

export const onlineServers = (site: SiteState) =>
  site.servers.filter((u) => u.bootTicksLeft === 0 && u.meltedTicksLeft === 0).length;

const meltedServers = (site: SiteState) => site.servers.filter((u) => u.meltedTicksLeft > 0).length;

export function siteScore(site: SiteState, config: SimConfig): number {
  return site.totals.served - site.totals.lost * config.lostPenalty;
}

/** Upkeep per second: running/starting servers plus owned defences. Melted servers are free. */
export function upkeepPerSec(site: SiteState, config: SimConfig): number {
  const { defences } = config.items;
  const servers = site.servers.filter((u) => u.meltedTicksLeft === 0).length;
  return (
    servers * defences.server.upkeepPerSec +
    EXTRA_DEFENCES.reduce((sum, id) => sum + site.owned[id] * defences[id].upkeepPerSec, 0) +
    site.setups.reduce((sum, x) => sum + defences[x.item].upkeepPerSec, 0)
  );
}

/** What an item costs this side right now (repeated attacks cost more). */
export function priceOf(site: SiteState, item: ItemId, config: SimConfig): number {
  if (isAttack(item)) {
    const used = site.attacksUsed[item] ?? 0;
    return Math.round(config.items.attacks[item].price * (1 + config.attackPriceStep * used));
  }
  if (isUtility(item)) return config.items.utilities[item].price;
  return config.items.defences[item].price;
}

// ---------- actions ----------

function applyAction(s: DuelState, a: Action, setup: MatchSetup, paused: boolean, events: SimEvent[]): void {
  const { config } = setup;
  const site = s.sites[a.side];
  const reject = (reason: RejectReason) =>
    void events.push({ side: a.side, type: "rejected", kind: a.kind, item: a.item, reason, by: a.by });
  const pay = (price: number): boolean => {
    if (site.coins < price) return false;
    site.coins -= price;
    site.totals.coinsSpent += price;
    return true;
  };

  if (site.crashTicksLeft > 0) return reject("down");

  switch (a.kind) {
    case "buy": {
      if (!isDefence(a.item)) return reject("wrongKind");
      const spec = config.items.defences[a.item];
      const extra = a.item;
      const count =
        extra === "server" ? site.servers.length : site.owned[extra] + site.setups.filter((x) => x.item === extra).length;
      if (count >= spec.max) return reject("max");
      if (!pay(spec.price)) return reject("coins");
      if (a.item === "server") {
        site.servers.push({
          id: site.nextServerId++,
          bootTicksLeft: paused ? 0 : toTicks(config.bootSec, config),
          meltedTicksLeft: 0,
        });
        site.totals.peakServers = Math.max(site.totals.peakServers, site.servers.length);
      } else if (paused) {
        site.owned[a.item]++;
        if (a.item === "shelf") site.shelfWarmth = 1;
      } else {
        site.setups.push({ item: a.item, ticksLeft: toTicks(config.setupSec, config) });
      }
      events.push({ side: a.side, type: "bought", item: a.item, by: a.by });
      return;
    }

    case "sell": {
      if (!isDefence(a.item)) return reject("wrongKind");
      const spec = config.items.defences[a.item];
      if (a.item === "server") {
        if (site.servers.length <= config.minServers) return reject("min");
        // Sell a starting server first, then a healthy one, melted last.
        const order = [...site.servers.keys()].reverse();
        const pick =
          order.find((i) => site.servers[i]!.bootTicksLeft > 0) ??
          order.find((i) => site.servers[i]!.meltedTicksLeft === 0) ??
          order[0]!;
        site.servers.splice(pick, 1);
      } else {
        const pending = site.setups.findIndex((x) => x.item === a.item);
        if (pending >= 0) site.setups.splice(pending, 1);
        else if (site.owned[a.item] > 0) site.owned[a.item]--;
        else return reject("none");
      }
      site.coins += spec.price * config.sellRefund;
      events.push({ side: a.side, type: "sold", item: a.item, by: a.by });
      return;
    }

    case "use": {
      if (!isUtility(a.item)) return reject("wrongKind");
      if (paused) return reject("paused");
      if ((site.cooldowns[a.item] ?? 0) > 0) return reject("cooldown");
      if (a.item === "instantBackup" && meltedServers(site) === 0) return reject("none");
      const spec = config.items.utilities[a.item];
      if (!pay(spec.price)) return reject("coins");
      site.cooldowns[a.item] = toTicks(spec.cooldownSec, config);
      useUtility(site, a.item, setup);
      events.push({ side: a.side, type: "used", item: a.item, by: a.by });
      return;
    }

    case "attack": {
      if (!isAttack(a.item)) return reject("wrongKind");
      if (paused) return reject("paused");
      if ((site.cooldowns[a.item] ?? 0) > 0 || site.regroupTicks > 0) return reject("cooldown");
      const spec = config.items.attacks[a.item];
      if (!pay(priceOf(site, a.item, config))) return reject("coins");
      site.cooldowns[a.item] = toTicks(spec.cooldownSec, config);
      site.regroupTicks = toTicks(config.attackRegroupSec, config);
      site.attacksUsed[a.item] = (site.attacksUsed[a.item] ?? 0) + 1;
      site.totals.attacksSent++;
      const target = other(a.side);
      s.sites[target].incoming.push({
        id: s.nextIncomingId++,
        attack: a.item,
        ticksUntil: toTicks(spec.warningSec, config),
      });
      events.push({ side: a.side, type: "attackSent", attack: a.item, by: a.by });
      events.push({ side: target, type: "attackIncoming", attack: a.item, inSec: spec.warningSec });
      return;
    }
  }
}

function useUtility(site: SiteState, id: UtilityId, { config }: MatchSetup): void {
  const spec = config.items.utilities[id];
  switch (id) {
    case "repair":
      site.health = Math.min(100, site.health + spec.amount);
      return;
    case "shield":
      addEffect(site, "shield", toTicks(spec.durationSec, config));
      return;
    case "overclock":
      addEffect(site, "overclock", toTicks(spec.durationSec, config));
      return;
    case "instantBackup":
      for (const u of site.servers) u.meltedTicksLeft = 0;
      return;
  }
}

function landAttack(target: SiteState, side: Side, attack: AttackId, { config }: MatchSetup, events: SimEvent[]): void {
  if (findEffect(target, "shield")) {
    removeEffect(target, "shield");
    target.totals.attacksBlocked++;
    return void events.push({ side, type: "attackBlocked", attack, reason: "shield" });
  }
  if (findEffect(target, "protected")) {
    target.totals.attacksBlocked++;
    return void events.push({ side, type: "attackBlocked", attack, reason: "protected" });
  }

  const spec = config.items.attacks[attack];
  const ticks = toTicks(spec.durationSec, config);
  switch (attack) {
    case "surge":
    case "bots":
    case "slowDb":
      addEffect(target, attack, ticks);
      break;
    case "cutRoute":
      // With a second route, traffic fails over almost immediately.
      addEffect(target, "cutRoute", target.owned.secondRoute > 0 ? toTicks(1, config) : ticks);
      break;
    case "meltdown": {
      const online = target.servers.filter((u) => u.bootTicksLeft === 0 && u.meltedTicksLeft === 0);
      const count = Math.max(1, Math.ceil(online.length * spec.strength));
      for (const u of online.slice(-count)) u.meltedTicksLeft = ticks;
      events.push({ side, type: "serversMelted", count: Math.min(count, online.length) });
      break;
    }
    case "flush":
      if (target.owned.shelf > 0) {
        target.shelfWarmth = 0;
        addEffect(target, "flush", ticks);
      }
      break;
  }
  target.totals.attacksLanded++;
  events.push({ side, type: "attackLanded", attack });
}

// ---------- the tick ----------

function sharedCrowd(s: DuelState, { scenario, config }: MatchSetup): number {
  const t = s.tick / config.tickRate;
  const { baseRate, growth, waveAmp, wavePeriodSec, noiseAmp } = scenario.traffic;
  const base = baseRate * (1 + (growth * t) / scenario.durationSec);
  const wave = 1 + waveAmp * Math.sin((2 * Math.PI * t) / wavePeriodSec + s.wavePhase);
  const rush = s.rushes.reduce((m, r) => {
    if (s.tick < r.startTick || s.tick >= r.endTick) return m;
    const strength = Math.min(1, (s.tick - r.startTick) / Math.max(1, r.rampTicks), (r.endTick - s.tick) / Math.max(1, r.rampTicks));
    return Math.max(m, 1 + (r.multiplier - 1) * strength);
  }, 1);
  let noise: number;
  [noise, s.rng] = nextFloat(s.rng);
  return base * wave * rush * (1 + noiseAmp * (2 * noise - 1));
}

const healthTarget = (share: number, config: SimConfig): number =>
  Math.min(1, Math.max(0, (share - config.healthZeroAt) / (config.healthFullAt - config.healthZeroAt))) * 100;

function tickTimers(site: SiteState, side: Side, setup: MatchSetup, events: SimEvent[]): void {
  const { config } = setup;
  for (const key of Object.keys(site.cooldowns) as (keyof typeof site.cooldowns)[]) {
    const left = site.cooldowns[key]!;
    if (left <= 1) delete site.cooldowns[key];
    else site.cooldowns[key] = left - 1;
  }

  for (const e of site.effects) e.ticksLeft--;
  site.effects = site.effects.filter((e) => e.ticksLeft > 0);

  let restored = false;
  for (const u of site.servers) {
    if (u.bootTicksLeft > 0 && --u.bootTicksLeft === 0) events.push({ side, type: "serverOnline" });
    if (u.meltedTicksLeft > 0 && --u.meltedTicksLeft === 0) restored = true;
  }
  if (restored) events.push({ side, type: "serversRestored" });

  if (site.owned.shelf > 0 && !findEffect(site, "flush")) {
    site.shelfWarmth = Math.min(1, site.shelfWarmth + 1 / (config.shelfWarmSec * config.tickRate));
  }
  for (const x of site.setups) x.ticksLeft--;
  for (const done of site.setups.filter((x) => x.ticksLeft <= 0)) {
    site.owned[done.item]++;
    if (done.item === "shelf") site.shelfWarmth = 0;
    events.push({ side, type: "defenceReady", item: done.item });
  }
  site.setups = site.setups.filter((x) => x.ticksLeft > 0);
  if (site.switchOffTicks > 0) site.switchOffTicks--;
  if (site.regroupTicks > 0) site.regroupTicks--;

  for (const inc of site.incoming) inc.ticksUntil--;
  const landing = site.incoming.filter((i) => i.ticksUntil <= 0);
  site.incoming = site.incoming.filter((i) => i.ticksUntil > 0);
  for (const inc of landing) landAttack(site, side, inc.attack, setup, events);
}

function flowSite(site: SiteState, side: Side, crowd: number, comeback: boolean, setup: MatchSetup, events: SimEvent[]): void {
  const { config } = setup;
  const dt = 1 / config.tickRate;
  const { attacks, utilities } = config.items;

  const surge = findEffect(site, "surge");
  const botsEffect = findEffect(site, "bots");
  site.flow.peopleRate = crowd * (surge ? 1 + (attacks.surge.strength - 1) * rampOf(surge, config) : 1);
  site.flow.botRate = botsEffect ? crowd * attacks.bots.strength * rampOf(botsEffect, config) : 0;
  const people = site.flow.peopleRate * dt;
  const bots = site.flow.botRate * dt;

  if (site.crashTicksLeft > 0) {
    site.totals.lost += people;
    site.totals.downtimeTicks++;
    site.flow = { ...site.flow, served: 0, lost: people, servedShare: 0, utilization: 0, bottleneck: null };
    if (--site.crashTicksLeft === 0) {
      site.health = config.rebootHealth;
      addEffect(site, "protected", toTicks(config.rebootProtectSec, config));
      events.push({ side, type: "rebooted" });
    }
    return;
  }

  // Front door (+ Bouncer)
  const doorOpen = !findEffect(site, "cutRoute");
  const bouncer = site.owned.bouncer > 0;
  const botsIn = doorOpen ? bots * (bouncer ? 1 - config.bouncerBotBlock : 1) : 0;
  const peopleIn = doorOpen ? people * (bouncer ? 1 - config.bouncerFalsePositive : 1) : 0;

  // Servers (+ Traffic splitter, Overclock)
  const online = onlineServers(site);
  const free = config.splitterFreeServers;
  const effective = site.owned.splitter > 0 ? online : Math.min(online, free) + Math.max(0, online - free) * config.unsplitEfficiency;
  const boost = findEffect(site, "overclock") ? utilities.overclock.amount : 1;
  const capacity = effective * config.serverCapacity * boost * dt;
  const demand = peopleIn + botsIn;
  const serverPass = demand > 0 ? Math.min(1, capacity / demand) : 1;
  const through = peopleIn * serverPass;

  // Fast shelf + database
  const hit = site.owned.shelf > 0 ? config.shelfHitShare * site.shelfWarmth : 0;
  const dbLoad = through * (1 - hit);
  const slow = findEffect(site, "slowDb") ? attacks.slowDb.strength : 1;
  const dbCapacity = (config.dbCapacity + site.owned.backupDb * config.dbPerBackup) * slow * dt;
  const dbPass = dbLoad > 0 ? Math.min(1, dbCapacity / dbLoad) : 1;

  const served = through * hit + dbLoad * dbPass;
  const lost = people - served;
  const losses: Record<Part, number> = {
    door: people - peopleIn,
    servers: peopleIn - through,
    shelf: 0,
    db: dbLoad * (1 - dbPass),
  };
  const worst = (Object.keys(losses) as Part[]).reduce((a, b) => (losses[b] > losses[a] ? b : a));

  site.totals.served += served;
  site.totals.lost += lost;
  site.flow = {
    ...site.flow,
    served,
    lost,
    servedShare: people > 0 ? served / people : 1,
    utilization: capacity > 0 ? Math.min(1, demand / capacity) : demand > 0 ? 1 : 0,
    passShare: {
      door: people > 0 ? peopleIn / people : 1,
      servers: serverPass,
      shelf: site.owned.shelf > 0 ? site.shelfWarmth : 1,
      db: dbPass,
    },
    bottleneck: losses[worst] > people * 0.03 ? worst : null,
  };

  // Health → crash
  site.health += (healthTarget(site.flow.servedShare, config) - site.health) * Math.min(1, config.healthEasePerSec * dt);
  if (site.health <= config.crashBelow) {
    site.health = 0;
    site.crashTicksLeft = toTicks(config.crashSec, config);
    site.critical = false;
    site.totals.crashes++;
    events.push({ side, type: "crashed" });
  }

  // Income
  const earned = served * config.incomePerPerson * (comeback ? config.comebackBoost : 1);
  site.coins += earned;
  site.totals.coinsEarned += earned;
}

function payUpkeep(site: SiteState, side: Side, { config }: MatchSetup, events: SimEvent[]): void {
  site.coins -= upkeepPerSec(site, config) / config.tickRate;
  if (site.coins >= 0) return;
  site.coins = 0;
  if (site.switchOffTicks > 0) return;

  // Can't pay: switch off the newest server, then defences.
  site.switchOffTicks = config.tickRate;
  const healthy = site.servers.filter((u) => u.meltedTicksLeft === 0);
  if (healthy.length > config.minServers) {
    const last = site.servers.lastIndexOf(healthy[healthy.length - 1]!);
    site.servers.splice(last, 1);
  } else {
    const id = SWITCH_OFF_ORDER.find((d) => site.owned[d] > 0);
    if (!id) return;
    site.owned[id]--;
  }
  events.push({ side, type: "serverSwitchedOff" });
}

function updateAlerts(site: SiteState, side: Side, config: SimConfig, events: SimEvent[]): void {
  if (site.crashTicksLeft > 0) return;
  if (!site.critical && site.health < config.criticalBelow) {
    site.critical = true;
    events.push({ side, type: "critical" });
  } else if (site.critical && site.health > config.recoveredAbove) {
    site.critical = false;
    events.push({ side, type: "recovered" });
  }
}

export type StepOptions = {
  /** Buy phase: apply purchases only; the clock and the crowd stand still. */
  paused?: boolean;
};

/**
 * Advance the duel by one tick. Pure: returns a new state and the events that
 * happened; the input state is not modified.
 */
export function step(prev: DuelState, actions: readonly Action[], setup: MatchSetup, opts: StepOptions = {}): StepResult {
  const events: SimEvent[] = [];
  const { config } = setup;

  if (prev.phase === "ended") {
    for (const a of actions) events.push({ side: a.side, type: "rejected", kind: a.kind, item: a.item, reason: "ended", by: a.by });
    return { state: prev, events };
  }

  const s: DuelState = { ...prev, rushes: prev.rushes, sites: { 1: cloneSite(prev.sites[1]), 2: cloneSite(prev.sites[2]) } };
  const paused = opts.paused ?? false;

  for (const a of actions) applyAction(s, a, setup, paused, events);
  if (paused) return { state: s, events };

  for (const side of SIDES) tickTimers(s.sites[side], side, setup, events);

  s.crowdRate = sharedCrowd(s, setup);

  // Comeback: decided from scores before this tick, so the order of sides never matters.
  const scores = { 1: siteScore(s.sites[1], config), 2: siteScore(s.sites[2], config) };
  for (const side of SIDES) {
    const mine = scores[side];
    const theirs = scores[other(side)];
    const comeback = theirs > 0 && mine < theirs * (1 - config.comebackGap);
    flowSite(s.sites[side], side, s.crowdRate, comeback, setup, events);
  }

  for (const side of SIDES) {
    payUpkeep(s.sites[side], side, setup, events);
    updateAlerts(s.sites[side], side, config, events);
  }

  for (const r of s.rushes) {
    for (const side of SIDES) {
      if (r.startTick === s.tick) events.push({ side, type: "rushStarted" });
      if (r.endTick === s.tick) events.push({ side, type: "rushEnded" });
    }
  }

  s.tick++;
  if (s.tick >= s.durationTicks) {
    s.phase = "ended";
    for (const side of SIDES) events.push({ side, type: "ended" });
  }
  return { state: s, events };
}
