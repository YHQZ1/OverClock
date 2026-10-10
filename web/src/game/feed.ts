import type { Side, SimEvent } from "@server/types/contracts.js";
import { DEFAULT_WORDS, type ThemeWords } from "../themes/themes";

export type Tone = "neutral" | "good" | "warn" | "bad";
export type FeedItem = { id: number; text: string; tone: Tone };

const REJECTED: Partial<Record<string, string>> = {
  coins: "Not enough coins",
  cooldown: "Still recharging",
  max: "You already have the most you can",
  none: "Nothing to do that to",
  min: "You need to keep at least one",
  paused: "Wait for the round to start",
  jammed: "Your controls are jammed",
  down: "Your site is down",
};

/**
 * Engine events → short lines from this team's point of view. `me` is the
 * player's name: their own rejected presses get explained, teammates' don't.
 */
export function describe(event: SimEvent, mySide: Side, me: string, words: ThemeWords = DEFAULT_WORDS): Omit<FeedItem, "id"> | null {
  const mine = event.side === mySide;
  const n = words.names;
  const servers = words.parts.servers.toLowerCase();
  const who = (by?: string) => (by && by !== me ? by : "You");

  switch (event.type) {
    case "bought":
      return mine ? { text: `${who(event.by)} bought ${n[event.item]}`, tone: "neutral" } : null;
    case "sold":
      return mine ? { text: `${who(event.by)} sold ${n[event.item]}`, tone: "neutral" } : null;
    case "used":
      return mine ? { text: `${who(event.by)} used ${n[event.item]}`, tone: "good" } : null;
    case "attackSent":
      return mine ? { text: `${who(event.by)} sent ${n[event.attack]} →`, tone: "good" } : null;
    case "attackIncoming":
      return mine ? { text: `${n[event.attack]} incoming!`, tone: "bad" } : null;
    case "attackLanded":
      return mine
        ? { text: `${n[event.attack]} hit you`, tone: "bad" }
        : { text: `${n[event.attack]} hit them`, tone: "good" };
    case "attackBlocked":
      return mine
        ? { text: `Blocked their ${n[event.attack]}`, tone: "good" }
        : { text: `They blocked your ${n[event.attack]}`, tone: "warn" };
    case "rejected": {
      if (!mine || (event.by && event.by !== me)) return null;
      const why = REJECTED[event.reason];
      return why ? { text: `${why} — ${n[event.item]}`, tone: "warn" } : null;
    }
    case "defenceReady":
      return mine ? { text: `${n[event.item]} is ready`, tone: "good" } : null;
    case "serversMelted":
      return mine ? { text: `${event.count} ${servers} wrecked`, tone: "bad" } : { text: `Wrecked ${event.count} of their ${servers}`, tone: "good" };
    case "serversRestored":
      return mine ? { text: `Wrecked ${servers} are back`, tone: "good" } : null;
    case "crashed":
      return mine ? { text: "Your site went down", tone: "bad" } : { text: "Their site went down!", tone: "good" };
    case "rebooted":
      return mine ? { text: "Back online", tone: "good" } : null;
    case "critical":
      return mine ? { text: "Health critical!", tone: "bad" } : null;
    case "recovered":
      return mine ? { text: "Recovered!", tone: "good" } : null;
    case "rushStarted":
      return mine ? { text: words.rush, tone: "warn" } : null;
    default:
      return null;
  }
}
