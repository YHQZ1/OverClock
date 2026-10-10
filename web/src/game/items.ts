import type { AttackId, DefenceId, ItemId, UtilityId } from "@server/types/contracts.js";

/**
 * Keys and default player-facing words for the 12 cards — never technical
 * terms (those wait for the reveal). Each theme renames the cards
 * (themes.ts); key, icon and position never change. Hints are templates
 * filled with the theme's words: {visitors}, {servers}, {server}.
 */
export type ItemInfo = { name: string; hint: string; key: string };

export const DEFENCE_INFO: Record<DefenceId, ItemInfo> = {
  server: { name: "Server", hint: "One more {server} — more {visitors} get in.", key: "1" },
  bouncer: { name: "Bouncer", hint: "Turns bots away at the gate — and a few real {visitors}.", key: "2" },
  lockAddress: { name: "Verified link", hint: "Nobody can send your {visitors} to a fake link.", key: "3" },
};

export const UTILITY_INFO: Record<UtilityId, ItemInfo> = {
  repair: { name: "Emergency repair", hint: "+35 health right now.", key: "q" },
  shield: { name: "Shield", hint: "Blocks the next attack (15s).", key: "w" },
  overclock: { name: "Overclock", hint: "Your {servers} work 60% faster for 10s.", key: "e" },
  instantBackup: { name: "Instant backup", hint: "Wrecked {servers} come straight back.", key: "r" },
};

/** `counter`: the cards that beat this attack, best first. */
export const ATTACK_INFO: Record<AttackId, ItemInfo & { counter: ItemId[] }> = {
  surge: { name: "Crowd surge", hint: "A wave of extra real {visitors} hits them.", key: "a", counter: ["server", "overclock"] },
  bots: { name: "Bot army", hint: "Fake {visitors} clog up their line.", key: "s", counter: ["bouncer", "shield"] },
  destroy: { name: "Wreck servers", hint: "Wrecks two of their {servers}.", key: "d", counter: ["instantBackup", "shield"] },
  wrongTurn: { name: "Steal visitors", hint: "Their {visitors} walk over to you.", key: "f", counter: ["lockAddress", "shield"] },
  jam: { name: "Freeze their controls", hint: "Their cards freeze for 5s.", key: "g", counter: ["shield"] },
};

export const ITEM_INFO: Record<ItemId, ItemInfo> = { ...DEFENCE_INFO, ...UTILITY_INFO, ...ATTACK_INFO };

export const DEFAULT_NAMES = Object.fromEntries(Object.entries(ITEM_INFO).map(([id, info]) => [id, info.name])) as Record<ItemId, string>;

/** Seconds between an attack being sent and landing — the flight time on the arena. */
export const WARNING_SEC = 3;
