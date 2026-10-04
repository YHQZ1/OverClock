import type { Side, SimEvent } from "@server/types/contracts.js";
import { ATTACK_INFO, ITEM_INFO } from "./items";

export type Tone = "neutral" | "good" | "warn" | "bad";
export type FeedItem = { id: number; text: string; tone: Tone };

const REJECTED: Partial<Record<string, string>> = {
  coins: "Not enough coins",
  cooldown: "Still recharging",
  max: "You already have the most you can",
  min: "You need at least one server",
  none: "Nothing to do that to",
  paused: "Wait for the round to start",
  down: "Your site is down",
};

/**
 * Engine events → short lines from this team's point of view. `me` is the
 * player's name: their own rejected presses get explained, teammates' don't.
 */
export function describe(event: SimEvent, mySide: Side, me: string): Omit<FeedItem, "id"> | null {
  const mine = event.side === mySide;
  const who = (by?: string) => (by && by !== me ? by : "You");

  switch (event.type) {
    case "bought":
      return mine ? { text: `${who(event.by)} bought ${ITEM_INFO[event.item].name}`, tone: "neutral" } : null;
    case "sold":
      return mine ? { text: `${who(event.by)} sold ${ITEM_INFO[event.item].name}`, tone: "neutral" } : null;
    case "used":
      return mine ? { text: `${who(event.by)} used ${ITEM_INFO[event.item].name}`, tone: "good" } : null;
    case "attackSent":
      return mine ? { text: `${who(event.by)} sent ${ATTACK_INFO[event.attack].name} →`, tone: "good" } : null;
    case "attackIncoming":
      return mine ? { text: `${ATTACK_INFO[event.attack].name} incoming!`, tone: "bad" } : null;
    case "attackLanded":
      return mine
        ? { text: `${ATTACK_INFO[event.attack].name} hit you`, tone: "bad" }
        : { text: `${ATTACK_INFO[event.attack].name} hit them`, tone: "good" };
    case "attackBlocked":
      return mine
        ? { text: `Blocked their ${ATTACK_INFO[event.attack].name}`, tone: "good" }
        : { text: `They blocked your ${ATTACK_INFO[event.attack].name}`, tone: "warn" };
    case "rejected": {
      if (!mine || (event.by && event.by !== me)) return null;
      const why = REJECTED[event.reason];
      return why ? { text: `${why} — ${ITEM_INFO[event.item].name}`, tone: "warn" } : null;
    }
    case "defenceReady":
      return mine ? { text: `${ITEM_INFO[event.item].name} is ready`, tone: "good" } : null;
    case "serverSwitchedOff":
      return mine ? { text: "Out of coins — something switched off", tone: "bad" } : null;
    case "serversMelted":
      return mine ? { text: `${event.count} servers melted`, tone: "bad" } : { text: "Their servers melted", tone: "good" };
    case "serversRestored":
      return mine ? { text: "Melted servers are back", tone: "good" } : null;
    case "crashed":
      return mine ? { text: "Your site went down", tone: "bad" } : { text: "Their site went down!", tone: "good" };
    case "rebooted":
      return mine ? { text: "Back online", tone: "good" } : null;
    case "critical":
      return mine ? { text: "Health critical!", tone: "bad" } : null;
    case "recovered":
      return mine ? { text: "Recovered!", tone: "good" } : null;
    case "rushStarted":
      return mine ? { text: "A rush is coming in", tone: "warn" } : null;
    default:
      return null;
  }
}
