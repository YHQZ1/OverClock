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
  type Part,
  type RejectReason,
  type Side,
  type SimEvent,
  type SiteState,
  type StepResult,
} from "./types.js";

/** Everything fixed for one round. */
export type MatchSetup = { scenario: Scenario; config: SimConfig };

function newSite({ scenario }: MatchSetup): SiteState {
  return {
    servers: Array.from({ length: scenario.startServers }, (_, id) => ({ id, bootTicksLeft: 0, meltedTicksLeft: 0 })),
    nextServerId: scenario.startServers,
    serversBought: 0,
    owned: { bouncer: 0, lockAddress: 0 },
    setups: [],
    coins: scenario.startCoins,
    health: 100,
    crashTicksLeft: 0,
    critical: false,
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
      passShare: { door: 1, servers: 1 },
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

/** What an item costs this side right now (repeats and extra servers cost more). */
export function priceOf(site: SiteState, item: ItemId, config: SimConfig): number {
  if (isAttack(item)) {
    const same = site.attacksUsed[item] ?? 0;
    const total = site.totals.attacksSent;
    return Math.round(config.items.attacks[item].price * (1 + config.attackPriceStep * same + config.attackFatigueStep * total));
  }
  if (isUtility(item)) return config.items.utilities[item].price;
  const spec = config.items.defences[item];
  return spec.price + (item === "server" ? spec.priceStep * site.serversBought : 0);
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
  if (findEffect(site, "jam")) return reject("jammed");

  switch (a.kind) {
    case "buy": {
      if (!isDefence(a.item)) return reject("wrongKind");
      const spec = config.items.defences[a.item];
      const extra = a.item;
      const count =
        extra === "server" ? site.servers.length : site.owned[extra] + site.setups.filter((x) => x.item === extra).length;
      if (count >= spec.max) return reject("max");
      if (!pay(priceOf(site, a.item, config))) return reject("coins");
      if (a.item === "server") {
        site.serversBought++;
        site.servers.push({
          id: site.nextServerId++,
          bootTicksLeft: paused ? 0 : toTicks(config.bootSec, config),
          meltedTicksLeft: 0,
        });
        site.totals.peakServers = Math.max(site.totals.peakServers, site.servers.length);
      } else if (paused) {
        site.owned[a.item]++;
      } else {
        site.setups.push({ item: a.item, ticksLeft: toTicks(config.setupSec, config) });
      }
      events.push({ side: a.side, type: "bought", item: a.item, by: a.by });
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

    // Not a kind the game has (selling was removed) — never trust a client.
    default:
      return reject("wrongKind");
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
    case "jam":
      addEffect(target, attack, ticks);
      break;
    // Has a matching defence that cuts it to a blip.
    case "wrongTurn":
      addEffect(target, attack, target.owned.lockAddress > 0 ? toTicks(1, config) : ticks);
      break;
    case "destroy": {
      const online = target.servers.filter((u) => u.bootTicksLeft === 0 && u.meltedTicksLeft === 0);
      const count = Math.min(spec.strength, online.length);
      for (const u of online.slice(-count)) u.meltedTicksLeft = ticks;
      events.push({ side, type: "serversMelted", count });
      break;
    }
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

  for (const x of site.setups) x.ticksLeft--;
  for (const done of site.setups.filter((x) => x.ticksLeft <= 0)) {
    site.owned[done.item]++;
    events.push({ side, type: "defenceReady", item: done.item });
  }
  site.setups = site.setups.filter((x) => x.ticksLeft > 0);
  if (site.regroupTicks > 0) site.regroupTicks--;

  for (const inc of site.incoming) inc.ticksUntil--;
  const landing = site.incoming.filter((i) => i.ticksUntil <= 0);
  site.incoming = site.incoming.filter((i) => i.ticksUntil > 0);
  for (const inc of landing) landAttack(site, side, inc.attack, setup, events);
}

/**
 * Real visitors heading to each site this tick: the shared crowd, a Crowd
 * surge on top, and Wrong Turn moving a share from one site to the other.
 */
function visitorRates(s: DuelState, { config }: MatchSetup): Record<Side, number> {
  const { attacks } = config.items;
  const base = (side: Side) => {
    const surge = findEffect(s.sites[side], "surge");
    return s.crowdRate * (surge ? 1 + (attacks.surge.strength - 1) * rampOf(surge, config) : 1);
  };
  const stolen = (side: Side) => {
    const wrong = findEffect(s.sites[side], "wrongTurn");
    return wrong ? base(side) * attacks.wrongTurn.strength * rampOf(wrong, config) : 0;
  };
  return {
    1: base(1) - stolen(1) + stolen(2),
    2: base(2) - stolen(2) + stolen(1),
  };
}

function flowSite(site: SiteState, side: Side, peopleRate: number, comeback: boolean, setup: MatchSetup, events: SimEvent[]): void {
  const { config } = setup;
  const dt = 1 / config.tickRate;
  const { attacks, utilities } = config.items;

  const botsEffect = findEffect(site, "bots");
  site.flow.peopleRate = peopleRate;
  site.flow.botRate = botsEffect ? peopleRate * attacks.bots.strength * rampOf(botsEffect, config) : 0;
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

  // Gate (+ Bouncer)
  const bouncer = site.owned.bouncer > 0;
  const botsIn = bots * (bouncer ? 1 - config.bouncerBotBlock : 1);
  const peopleIn = people * (bouncer ? 1 - config.bouncerFalsePositive : 1);

  // Servers (+ Overclock): the only capacity limit — what they can't take gives up.
  const boost = findEffect(site, "overclock") ? utilities.overclock.amount : 1;
  const capacity = onlineServers(site) * config.serverCapacity * boost * dt;
  const demand = peopleIn + botsIn;
  const serverPass = demand > 0 ? Math.min(1, capacity / demand) : 1;

  const served = peopleIn * serverPass;
  const lost = people - served;
  const losses: Record<Part, number> = { door: people - peopleIn, servers: peopleIn - served };
  const worst = (Object.keys(losses) as Part[]).reduce((a, b) => (losses[b] > losses[a] ? b : a));

  site.totals.served += served;
  site.totals.lost += lost;
  site.flow = {
    ...site.flow,
    served,
    lost,
    servedShare: people > 0 ? served / people : 1,
    utilization: capacity > 0 ? Math.min(1, demand / capacity) : demand > 0 ? 1 : 0,
    passShare: { door: people > 0 ? peopleIn / people : 1, servers: serverPass },
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
  const visitors = visitorRates(s, setup);
  for (const side of SIDES) {
    const mine = scores[side];
    const theirs = scores[other(side)];
    const comeback = theirs > 0 && mine < theirs * (1 - config.comebackGap);
    flowSite(s.sites[side], side, visitors[side], comeback, setup, events);
  }

  for (const side of SIDES) updateAlerts(s.sites[side], side, config, events);

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
