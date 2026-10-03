// Bot players for balance testing (docs/BALANCE.md). Each factory returns a
// fresh Policy, since some bots keep memory (reaction delay, pacing).

import { toTicks, type SimConfig } from "./config.js";
import type { Policy } from "./run.js";
import type { Action, MatchState } from "./types.js";

const ADD: Action = { type: "addServer" };
const REMOVE: Action = { type: "removeServer" };

const online = (s: MatchState) => s.servers.filter((u) => u.bootTicksLeft === 0).length;
const booting = (s: MatchState) => s.servers.length - online(s);

/** Never presses anything. Must crash and score far lower. */
export const idleBot = (): Policy => () => [];

/** Presses + SERVERS whenever it can. Must lose to attentive play (waste). */
export const spamBot = (): Policy => (s) => (s.addCooldownTicks === 0 && s.budget > 0 ? [ADD] : []);

/** Never adds servers; trims any it thinks are idle to bank budget. Must lose (people lost). */
export function stingyBot(config: SimConfig): Policy {
  let nextRemoveTick = 0;
  return (s) => {
    if (s.tick < nextRemoveTick || s.utilization > 0.7) return [];
    nextRemoveTick = s.tick + toTicks(1, config);
    return [REMOVE];
  };
}

/** Reads hidden metrics and reacts instantly. The practical upper bound. */
export function sensibleBot(config: SimConfig): Policy {
  let nextRemoveTick = 0;
  return (s) => {
    const need = (headroom: number) => Math.ceil((s.trafficRate * headroom) / config.capacityPerServer);
    if (s.servers.length < need(1.1)) return s.addCooldownTicks === 0 ? [ADD] : [];
    if (s.servers.length > need(1.35) && booting(s) === 0 && s.tick >= nextRemoveTick) {
      nextRemoveTick = s.tick + toTicks(1, config);
      return [REMOVE];
    }
    return [];
  };
}

type Seen = { servedRatio: number; utilization: number; online: number };

/**
 * Plays only from what the UI shows (people turned away, busy/idle/booting
 * servers) and reacts after a human-like delay.
 */
export function humanBot(config: SimConfig, reactionSec: number): Policy {
  const delay = toTicks(reactionSec, config);
  const memory: Seen[] = [];
  let nextRemoveTick = 0;

  return (s) => {
    memory.push({ servedRatio: s.servedRatio, utilization: s.utilization, online: online(s) });
    if (memory.length <= delay) return [];
    const seen = memory.shift()!;

    // Struggling (people turned away): add more, but don't flood the rack with boots.
    if (seen.servedRatio < 0.98) {
      return s.addCooldownTicks === 0 && booting(s) < 3 ? [ADD] : [];
    }

    // Calm with visibly idle servers: trim one at a time.
    const busy = Math.ceil(seen.utilization * seen.online - 1e-9);
    const idle = seen.online - busy;
    if (idle >= 2 && booting(s) === 0 && s.tick >= nextRemoveTick) {
      nextRemoveTick = s.tick + toTicks(1.5, config);
      return [REMOVE];
    }
    return [];
  };
}

export const BOTS = {
  idle: (_config: SimConfig) => idleBot(),
  spam: (_config: SimConfig) => spamBot(),
  stingy: stingyBot,
  sensible: sensibleBot,
  humanFast: (config: SimConfig) => humanBot(config, 0.5),
  humanSlow: (config: SimConfig) => humanBot(config, 1.5),
} satisfies Record<string, (config: SimConfig) => Policy>;

export type BotName = keyof typeof BOTS;
