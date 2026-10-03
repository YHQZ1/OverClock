import type { MatchView } from "@server/types/contracts.js";

export type AlertLevel = "calm" | "notice" | "warn" | "bad";

/** What's wrong, and what to do about it — one alert at a time, worst first. */
export type Alert = { id: string; level: AlertLevel; title: string; hint: string };

export function currentAlert(m: MatchView): Alert {
  const idle = m.servers.filter((s) => s.state === "idle").length;
  const starting = m.servers.some((s) => s.state === "booting");

  if (m.downSecondsLeft !== null) {
    return { id: "down", level: "bad", title: "The site is down!", hint: `Rebooting — back in ${m.downSecondsLeft}s` };
  }
  if (m.serversStatus === "failing" || m.critical) {
    return {
      id: "failing",
      level: "bad",
      title: "People can’t get in!",
      hint: starting ? "New servers are starting — keep going" : "Add servers now",
    };
  }
  if (m.serversStatus === "strained") {
    return {
      id: "strained",
      level: "warn",
      title: m.rush ? "Too many people!" : "Servers are struggling",
      hint: starting ? "Help is on the way…" : "Add a server to let them in",
    };
  }
  if (m.rush) {
    return { id: "rush-ok", level: "notice", title: "A crowd is rushing in", hint: "You’re holding up — watch the servers" };
  }
  if (idle >= 2) {
    return {
      id: "idle",
      level: "notice",
      title: "All calm",
      hint: `${idle} servers are idle — remove them to save money`,
    };
  }
  return { id: "calm", level: "calm", title: "All calm", hint: "Everyone’s getting in" };
}
