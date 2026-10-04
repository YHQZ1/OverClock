// The shop: everything a team can buy, use or send. Ids are code names;
// player-facing names live in the web app (never tech terms on screen).

export const DEFENCES = ["server", "splitter", "bouncer", "shelf", "backupDb", "lockAddress", "backupMonitor"] as const;
export const UTILITIES = ["repair", "shield", "overclock", "instantBackup"] as const;
export const ATTACKS = [
  "surge",
  "bots",
  "slowDb",
  "destroy",
  "slowServers",
  "breakSplitter",
  "blindfold",
  "wrongTurn",
  "jam",
] as const;

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
    lockAddress: { price: 160, upkeepPerSec: 1.5, max: 1 },
    backupMonitor: { price: 140, upkeepPerSec: 1, max: 1 },
  },
  utilities: {
    repair: { price: 220, cooldownSec: 15, durationSec: 0, amount: 35 }, // +health
    shield: { price: 180, cooldownSec: 10, durationSec: 15, amount: 1 }, // blocks the next attack
    overclock: { price: 160, cooldownSec: 20, durationSec: 10, amount: 1.6 }, // server speed ×
    instantBackup: { price: 160, cooldownSec: 10, durationSec: 0, amount: 0 }, // repairs wrecked servers
  },
  attacks: {
    surge: { price: 220, cooldownSec: 12, warningSec: 3, durationSec: 10, strength: 1.7 }, // real crowd ×
    bots: { price: 240, cooldownSec: 15, warningSec: 3, durationSec: 12, strength: 0.8 }, // bots per real visitor
    slowDb: { price: 220, cooldownSec: 15, warningSec: 3, durationSec: 12, strength: 0.5 }, // database speed ×
    destroy: { price: 280, cooldownSec: 18, warningSec: 3, durationSec: 10, strength: 2 }, // servers wrecked
    slowServers: { price: 220, cooldownSec: 15, warningSec: 3, durationSec: 12, strength: 0.7 }, // server speed ×
    breakSplitter: { price: 200, cooldownSec: 15, warningSec: 3, durationSec: 10, strength: 0.3 }, // servers past 2 work at ×
    blindfold: { price: 180, cooldownSec: 15, warningSec: 3, durationSec: 8, strength: 1 }, // map + alerts dark
    wrongTurn: { price: 240, cooldownSec: 18, warningSec: 3, durationSec: 10, strength: 0.45 }, // share of their visitors sent to you
    jam: { price: 240, cooldownSec: 20, warningSec: 3, durationSec: 5, strength: 1 }, // their shop frozen
  },
};

export const isDefence = (id: string): id is DefenceId => (DEFENCES as readonly string[]).includes(id);
export const isUtility = (id: string): id is UtilityId => (UTILITIES as readonly string[]).includes(id);
export const isAttack = (id: string): id is AttackId => (ATTACKS as readonly string[]).includes(id);
