import type { SimEvent } from "@server/sim/index.js";

export type Tone = "neutral" | "good" | "warn" | "bad";
export type FeedItem = { id: number; text: string; tone: Tone };

/** Engine events → short, player-friendly feedback lines. Null = not worth a line. */
export function describe(event: SimEvent): Omit<FeedItem, "id"> | null {
  switch (event.type) {
    case "serverAdded":
      return { text: "+1 server starting…", tone: "neutral" };
    case "serverOnline":
      return { text: "Server ready", tone: "good" };
    case "serverRemoved":
      return { text: "Server removed — saving money", tone: "neutral" };
    case "rushStarted":
      return { text: "A crowd is rushing in!", tone: "warn" };
    case "rushEnded":
      return { text: "The rush is over", tone: "neutral" };
    case "critical":
      return { text: "Health critical!", tone: "bad" };
    case "recovered":
      return { text: "Recovered!", tone: "good" };
    case "crashed":
      return { text: "The site went down", tone: "bad" };
    case "rebooted":
      return { text: "Back online", tone: "good" };
    case "actionRejected":
      switch (event.reason) {
        case "noBudget":
          return { text: "Out of budget — can’t add servers", tone: "bad" };
        case "minServers":
          return { text: "You need at least one server", tone: "warn" };
        case "maxServers":
          return { text: "No room for more servers", tone: "warn" };
        default:
          return null; // cooldown / down: the button already shows it
      }
    case "ended":
      return null;
  }
}
