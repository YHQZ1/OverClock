import type { AttackId, DefenceId, ItemId, UtilityId } from "@server/types/contracts.js";

/** Player-facing words for every shop item — never technical terms (those wait for the reveal). */
export type ItemInfo = { name: string; hint: string; key: string; sellKey?: string };

export const DEFENCE_INFO: Record<DefenceId, ItemInfo> = {
  server: { name: "Server", hint: "Lets more people in. Starts in 2s.", key: "1", sellKey: "shift+1" },
  splitter: { name: "Traffic splitter", hint: "Every server pulls its weight.", key: "2", sellKey: "shift+2" },
  bouncer: { name: "Bouncer", hint: "Keeps bots out — and a few real people.", key: "3", sellKey: "shift+3" },
  shelf: { name: "Fast shelf", hint: "Answers popular requests itself.", key: "4", sellKey: "shift+4" },
  backupDb: { name: "Backup database", hint: "More room in the database.", key: "5", sellKey: "shift+5" },
  lockAddress: { name: "Lock your address", hint: "Nobody can send your visitors elsewhere.", key: "6", sellKey: "shift+6" },
  backupMonitor: { name: "Backup monitor", hint: "You can’t be blindfolded.", key: "7", sellKey: "shift+7" },
};

export const UTILITY_INFO: Record<UtilityId, ItemInfo> = {
  repair: { name: "Emergency repair", hint: "+35 health right now.", key: "q" },
  shield: { name: "Shield", hint: "Blocks the next attack (15s).", key: "w" },
  overclock: { name: "Overclock", hint: "Servers 60% faster for 10s.", key: "e" },
  instantBackup: { name: "Instant backup", hint: "Wrecked servers back now.", key: "r" },
};

export const ATTACK_INFO: Record<AttackId, ItemInfo & { counter: string }> = {
  surge: { name: "Crowd surge", hint: "Floods them with extra real visitors.", key: "a", counter: "Servers or Overclock" },
  bots: { name: "Bot army", hint: "Floods them with fake visitors.", key: "s", counter: "Bouncer or Shield" },
  slowDb: { name: "Slow their database", hint: "Their database crawls for a while.", key: "d", counter: "Backup database or Fast shelf" },
  destroy: { name: "Destroy servers", hint: "Wrecks two of their servers.", key: "f", counter: "Instant backup or Shield" },
  slowServers: { name: "Slow their servers", hint: "All their servers run slower.", key: "g", counter: "Overclock or Shield" },
  breakSplitter: { name: "Knock out their splitter", hint: "Traffic piles onto two servers.", key: "h", counter: "Traffic splitter or Shield" },
  blindfold: { name: "Blindfold", hint: "Their map and alerts go dark.", key: "j", counter: "Backup monitor or Shield" },
  wrongTurn: { name: "Wrong Turn", hint: "Sends their visitors to you.", key: "k", counter: "Lock your address or Shield" },
  jam: { name: "Jam their controls", hint: "Their shop freezes for 5s.", key: "l", counter: "Shield — before it lands" },
};

export const ITEM_INFO: Record<ItemId, ItemInfo> = { ...DEFENCE_INFO, ...UTILITY_INFO, ...ATTACK_INFO };
