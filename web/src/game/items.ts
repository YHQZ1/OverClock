import type { AttackId, DefenceId, ItemId, UtilityId } from "@server/types/contracts.js";

/** Player-facing words for every shop item — never technical terms (those wait for the reveal). */
export type ItemInfo = { name: string; hint: string; key: string; sellKey?: string };

export const DEFENCE_INFO: Record<DefenceId, ItemInfo> = {
  server: { name: "Server", hint: "Lets more people in. Starts in 2s.", key: "1", sellKey: "shift+1" },
  splitter: { name: "Traffic splitter", hint: "Every server pulls its weight.", key: "2", sellKey: "shift+2" },
  bouncer: { name: "Bouncer", hint: "Keeps bots out — and a few real people.", key: "3", sellKey: "shift+3" },
  shelf: { name: "Fast shelf", hint: "Answers popular requests itself.", key: "4", sellKey: "shift+4" },
  backupDb: { name: "Backup database", hint: "More room in the database.", key: "5", sellKey: "shift+5" },
  secondRoute: { name: "Second route", hint: "A cut connection won’t take you offline.", key: "6", sellKey: "shift+6" },
};

export const UTILITY_INFO: Record<UtilityId, ItemInfo> = {
  repair: { name: "Emergency repair", hint: "+35 health right now.", key: "q" },
  shield: { name: "Shield", hint: "Blocks the next attack (15s).", key: "w" },
  overclock: { name: "Overclock", hint: "Servers 60% faster for 10s.", key: "e" },
  instantBackup: { name: "Instant backup", hint: "Melted servers back now.", key: "r" },
};

export const ATTACK_INFO: Record<AttackId, ItemInfo & { counter: string }> = {
  surge: { name: "Crowd surge", hint: "Floods them with extra people.", key: "a", counter: "Servers or Overclock" },
  bots: { name: "Bot army", hint: "Fills their site with fake visitors.", key: "s", counter: "Bouncer or Shield" },
  cutRoute: { name: "Cut a route", hint: "Knocks them offline for a few seconds.", key: "d", counter: "Second route or Shield" },
  slowDb: { name: "Slow their database", hint: "Their database crawls for a while.", key: "f", counter: "Backup database or Fast shelf" },
  meltdown: { name: "Server meltdown", hint: "Melts some of their servers.", key: "g", counter: "Instant backup or Shield" },
  flush: { name: "Flush their shelf", hint: "Empties their Fast shelf.", key: "h", counter: "Backup database" },
};

export const ITEM_INFO: Record<ItemId, ItemInfo> = { ...DEFENCE_INFO, ...UTILITY_INFO, ...ATTACK_INFO };
