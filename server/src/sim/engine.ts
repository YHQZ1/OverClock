import { toTicks, type SimConfig } from "./config.js";
import { nextFloat, nextRange, seedRng } from "./rng.js";
import type { Scenario } from "./scenario.js";
import { baseTrafficRate } from "./traffic.js";
import type { Action, MatchState, ScheduledEvent, ServerUnit, SimEvent, StepResult } from "./types.js";

/** Everything fixed for one match. */
export type MatchSetup = { scenario: Scenario; config: SimConfig };

export function createMatch({ scenario, config }: MatchSetup, seed: number): MatchState {
  let rng = seedRng(seed);

  let wavePhase: number;
  [wavePhase, rng] = nextRange(rng, 0, 2 * Math.PI);

  const schedule: ScheduledEvent[] = [];
  for (const ev of scenario.events) {
    let jitter: number;
    [jitter, rng] = nextRange(rng, -scenario.jitterSec, scenario.jitterSec);
    const startTick = toTicks(ev.atSec + jitter, config);
    schedule.push({
      kind: "rush",
      startTick,
      endTick: startTick + toTicks(ev.durationSec, config),
      rampTicks: toTicks(ev.rampSec, config),
      multiplier: ev.multiplier,
    });
  }

  const servers: ServerUnit[] = Array.from({ length: scenario.startServers }, (_, id) => ({ id, bootTicksLeft: 0 }));

  return {
    tick: 0,
    durationTicks: toTicks(scenario.durationSec, config),
    phase: "running",
    rng,
    wavePhase,
    servers,
    nextServerId: servers.length,
    addCooldownTicks: 0,
    budget: scenario.startBudget,
    health: 100,
    crashTicksLeft: 0,
    critical: false,
    trafficRate: 0,
    servedRatio: 1,
    utilization: 0,
    schedule,
    totals: {
      served: 0,
      lost: 0,
      crashes: 0,
      downtimeTicks: 0,
      idleServerTicks: 0,
      peakServers: servers.length,
    },
  };
}

function applyAction(s: MatchState, action: Action, config: SimConfig, events: SimEvent[]): void {
  const reject = (reason: Extract<SimEvent, { type: "actionRejected" }>["reason"]): void => {
    events.push({ type: "actionRejected", action: action.type, reason });
  };

  if (s.crashTicksLeft > 0) return reject("crashed");

  switch (action.type) {
    case "addServer": {
      if (s.addCooldownTicks > 0) return reject("cooldown");
      if (s.budget <= 0) return reject("noBudget");
      if (s.servers.length >= config.maxServers) return reject("maxServers");
      const id = s.nextServerId++;
      s.servers.push({ id, bootTicksLeft: toTicks(config.bootSec, config) });
      s.addCooldownTicks = toTicks(config.addCooldownSec, config);
      s.totals.peakServers = Math.max(s.totals.peakServers, s.servers.length);
      events.push({ type: "serverAdded", id });
      return;
    }
    case "removeServer": {
      if (s.servers.length <= config.minServers) return reject("minServers");
      // Cancel a booting server first — it isn't serving anyone yet.
      let index = s.servers.length - 1;
      for (let i = s.servers.length - 1; i >= 0; i--) {
        if (s.servers[i]!.bootTicksLeft > 0) {
          index = i;
          break;
        }
      }
      const [removed] = s.servers.splice(index, 1);
      events.push({ type: "serverRemoved", id: removed!.id });
      return;
    }
  }
}

const healthTarget = (ratio: number, config: SimConfig): number => {
  const t = (ratio - config.healthZeroAt) / (config.healthFullAt - config.healthZeroAt);
  return Math.min(1, Math.max(0, t)) * 100;
};

/**
 * Advance the match by one tick. Pure: returns a new state and the events
 * that happened; the input state is not modified.
 */
export function step(prev: MatchState, actions: readonly Action[], { scenario, config }: MatchSetup): StepResult {
  const events: SimEvent[] = [];

  if (prev.phase === "ended") {
    for (const a of actions) events.push({ type: "actionRejected", action: a.type, reason: "ended" });
    return { state: prev, events };
  }

  const s: MatchState = {
    ...prev,
    servers: prev.servers.map((u) => ({ ...u })),
    totals: { ...prev.totals },
  };
  const dt = 1 / config.tickRate;

  // 1. Player actions
  for (const action of actions) applyAction(s, action, config, events);

  // 2. Timers
  if (s.addCooldownTicks > 0) s.addCooldownTicks--;
  for (const u of s.servers) {
    if (u.bootTicksLeft > 0 && --u.bootTicksLeft === 0) events.push({ type: "serverOnline", id: u.id });
  }

  // 3. Traffic
  let noise: number;
  [noise, s.rng] = nextFloat(s.rng);
  s.trafficRate = baseTrafficRate(s, scenario, config) * (1 + scenario.traffic.noiseAmp * (2 * noise - 1));
  const arrivals = s.trafficRate * dt;

  // 4. Serve — or not, while the system is down
  if (s.crashTicksLeft > 0) {
    s.totals.lost += arrivals;
    s.totals.downtimeTicks++;
    s.servedRatio = 0;
    s.utilization = 0;
    if (--s.crashTicksLeft === 0) {
      s.health = config.rebootHealth;
      events.push({ type: "rebooted" });
    }
  } else {
    const online = s.servers.filter((u) => u.bootTicksLeft === 0).length;
    const capacity = online * config.capacityPerServer * dt;
    const served = Math.min(arrivals, capacity);

    s.totals.served += served;
    s.totals.lost += arrivals - served;
    s.servedRatio = arrivals > 0 ? served / arrivals : 1;
    s.utilization = capacity > 0 ? served / capacity : 0;
    s.totals.idleServerTicks += online * (1 - s.utilization);

    const target = healthTarget(s.servedRatio, config);
    s.health += (target - s.health) * Math.min(1, config.healthEasePerSec * dt);

    if (s.health <= config.crashBelow) {
      s.health = 0;
      s.crashTicksLeft = toTicks(config.crashSec, config);
      s.critical = false;
      s.totals.crashes++;
      events.push({ type: "crashed" });
    }
  }

  // 5. Running costs (booting servers cost too)
  s.budget -= s.servers.length * config.serverCostPerSec * dt;

  // 6. Alerts
  if (s.crashTicksLeft === 0) {
    if (!s.critical && s.health < config.criticalBelow) {
      s.critical = true;
      events.push({ type: "critical" });
    } else if (s.critical && s.health > config.recoveredAbove) {
      s.critical = false;
      events.push({ type: "recovered" });
    }
  }
  for (const ev of s.schedule) {
    if (ev.startTick === s.tick) events.push({ type: "rushStarted" });
    if (ev.endTick === s.tick) events.push({ type: "rushEnded" });
  }

  // 7. Clock
  s.tick++;
  if (s.tick >= s.durationTicks) {
    s.phase = "ended";
    events.push({ type: "ended" });
  }

  return { state: s, events };
}
