import type { AttackId, DefenceId, ItemId, UtilityId } from "@server/types/contracts.js";

/**
 * Keys and default player-facing words for every shop item — never technical
 * terms (those wait for the reveal). Each theme renames items (themes.ts);
 * hints are templates filled with the theme's words — {visitors}, {servers}, {db}.
 */
export type ItemInfo = { name: string; hint: string; key: string; sellKey?: string };

export const DEFENCE_INFO: Record<DefenceId, ItemInfo> = {
  server: { name: "Server", hint: "Lets more {visitors} in. Starts in 2s.", key: "1", sellKey: "shift+1" },
  splitter: { name: "Traffic splitter", hint: "Keeps all your {servers} equally busy.", key: "2", sellKey: "shift+2" },
  bouncer: { name: "Bouncer", hint: "Keeps bots out — and a few real {visitors}.", key: "3", sellKey: "shift+3" },
  shelf: { name: "Fast shelf", hint: "Serves the most popular stuff instantly.", key: "4", sellKey: "shift+4" },
  backupDb: { name: "Backup database", hint: "More room in your {db}.", key: "5", sellKey: "shift+5" },
  lockAddress: { name: "Lock your address", hint: "Nobody can send your {visitors} elsewhere.", key: "6", sellKey: "shift+6" },
  backupMonitor: { name: "Backup monitor", hint: "Your map can’t be blacked out.", key: "7", sellKey: "shift+7" },
};

export const UTILITY_INFO: Record<UtilityId, ItemInfo> = {
  repair: { name: "Emergency repair", hint: "+35 health right now.", key: "q" },
  shield: { name: "Shield", hint: "Blocks the next attack (15s).", key: "w" },
  overclock: { name: "Overclock", hint: "Your {servers} run 60% faster for 10s.", key: "e" },
  instantBackup: { name: "Instant backup", hint: "Wrecked {servers} back now.", key: "r" },
};

/** `counter`: the items that beat this attack, best first. */
export const ATTACK_INFO: Record<AttackId, ItemInfo & { counter: ItemId[] }> = {
  surge: { name: "Crowd surge", hint: "Floods them with extra real {visitors}.", key: "a", counter: ["server", "overclock"] },
  bots: { name: "Bot army", hint: "Floods them with fake {visitors}.", key: "s", counter: ["bouncer", "shield"] },
  slowDb: { name: "Slow their database", hint: "Slows their {db} to a crawl.", key: "d", counter: ["backupDb", "shelf"] },
  destroy: { name: "Destroy servers", hint: "Wrecks two of their {servers}.", key: "f", counter: ["instantBackup", "shield"] },
  slowServers: { name: "Slow their servers", hint: "All their {servers} run slower.", key: "g", counter: ["overclock", "shield"] },
  breakSplitter: { name: "Knock out their splitter", hint: "Their {visitors} pile onto two {servers}.", key: "h", counter: ["splitter", "shield"] },
  blindfold: { name: "Blindfold", hint: "Their map and alerts go dark.", key: "j", counter: ["backupMonitor", "shield"] },
  wrongTurn: { name: "Wrong Turn", hint: "Sends their {visitors} to you.", key: "k", counter: ["lockAddress", "shield"] },
  jam: { name: "Jam their controls", hint: "Their shop freezes for 5s.", key: "l", counter: ["shield"] },
};

export const ITEM_INFO: Record<ItemId, ItemInfo> = { ...DEFENCE_INFO, ...UTILITY_INFO, ...ATTACK_INFO };

export const DEFAULT_NAMES = Object.fromEntries(Object.entries(ITEM_INFO).map(([id, info]) => [id, info.name])) as Record<ItemId, string>;
