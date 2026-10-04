// The shop: everything a team can buy, use or send. Ids are code names;
// player-facing names live in the web app (never tech terms on screen).

export const DEFENCES = ["server", "splitter", "bouncer", "shelf", "backupDb", "secondRoute"] as const;
export const UTILITIES = ["repair", "shield", "overclock", "instantBackup"] as const;
export const ATTACKS = ["surge", "bots", "cutRoute", "slowDb", "meltdown", "flush"] as const;

export type DefenceId = (typeof DEFENCES)[number];
export type UtilityId = (typeof UTILITIES)[number];
export type AttackId = (typeof ATTACKS)[number];
export type ItemId = DefenceId | UtilityId | AttackId;

/** Kept on the site; costs upkeep every second. */
export type DefenceSpec = { price: number; upkeepPerSec: number; max: number };

/** One use; short cooldown so it can't be chained. */
export type UtilitySpec = { price: number; cooldownSec: number; durationSec: number; amount: number };

/**
 * Sent at the other team: announced `warningSec` before it lands, then lasts
 * `durationSec`. `strength` means something per attack (see engine).
 */
export type AttackSpec = { price: number; cooldownSec: number; warningSec: number; durationSec: number; strength: number };

export type Catalogue = {
  defences: Record<DefenceId, DefenceSpec>;
  utilities: Record<UtilityId, UtilitySpec>;
  attacks: Record<AttackId, AttackSpec>;
};

// Starting values — tuned by bots and playtests (docs/BALANCE.md).
// Rule of thumb: an attack costs about what its counter costs.
export const DEFAULT_CATALOGUE: Catalogue = {
  defences: {
    server: { price: 60, upkeepPerSec: 1, max: 40 },
    splitter: { price: 220, upkeepPerSec: 2, max: 1 },
    bouncer: { price: 200, upkeepPerSec: 2, max: 1 },
    shelf: { price: 200, upkeepPerSec: 2, max: 1 },
    backupDb: { price: 200, upkeepPerSec: 2, max: 2 },
    secondRoute: { price: 180, upkeepPerSec: 1.5, max: 1 },
  },
  utilities: {
    repair: { price: 220, cooldownSec: 15, durationSec: 0, amount: 35 }, // +health
    shield: { price: 180, cooldownSec: 10, durationSec: 15, amount: 1 }, // blocks the next attack
    overclock: { price: 160, cooldownSec: 20, durationSec: 10, amount: 1.6 }, // server speed ×
    instantBackup: { price: 160, cooldownSec: 10, durationSec: 0, amount: 0 }, // restores melted servers
  },
  attacks: {
    surge: { price: 220, cooldownSec: 12, warningSec: 3, durationSec: 10, strength: 1.7 }, // crowd ×
    bots: { price: 240, cooldownSec: 15, warningSec: 3, durationSec: 12, strength: 1 }, // bots per normal visitor
    cutRoute: { price: 260, cooldownSec: 18, warningSec: 3, durationSec: 6, strength: 1 }, // offline (1s with a second route)
    slowDb: { price: 220, cooldownSec: 15, warningSec: 3, durationSec: 12, strength: 0.5 }, // database speed ×
    meltdown: { price: 280, cooldownSec: 20, warningSec: 3, durationSec: 12, strength: 0.4 }, // share of servers melted
    flush: { price: 160, cooldownSec: 12, warningSec: 3, durationSec: 6, strength: 1 }, // shelf cold this long, then re-warms
  },
};

export const isDefence = (id: string): id is DefenceId => (DEFENCES as readonly string[]).includes(id);
export const isUtility = (id: string): id is UtilityId => (UTILITIES as readonly string[]).includes(id);
export const isAttack = (id: string): id is AttackId => (ATTACKS as readonly string[]).includes(id);
