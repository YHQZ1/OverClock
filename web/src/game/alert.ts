import type { MatchView } from "@server/types/contracts.js";
import { ATTACK_INFO } from "./items";

export type AlertLevel = "calm" | "notice" | "warn" | "bad";

/** What's wrong, and what to do about it — one alert at a time, worst first. */
export type Alert = { id: string; level: AlertLevel; title: string; hint: string };

export function currentAlert(m: MatchView): Alert {
  const me = m.me;
  const has = (kind: string) => me.effects.some((e) => e.kind === kind);

  if (m.phase === "buy") {
    return { id: "buy", level: "notice", title: "Buy phase", hint: "Build before the crowd arrives — the shop stays open all round" };
  }
  if (me.downSecondsLeft !== null) {
    return { id: "down", level: "bad", title: "Your site is down!", hint: `Back in ${me.downSecondsLeft}s — nobody can get in` };
  }

  if (me.blind) return { id: "blind", level: "bad", title: "You’re blindfolded!", hint: "A Backup monitor stops this next time" };
  if (has("jam")) return { id: "jam", level: "bad", title: "Your controls are jammed!", hint: "Raise a Shield before the next one lands" };

  const next = [...m.incoming].sort((a, b) => a.secondsLeft - b.secondsLeft)[0];
  if (next) {
    const info = ATTACK_INFO[next.attack];
    return {
      id: `incoming-${next.id}`,
      level: "bad",
      title: `${info.name} incoming in ${Math.ceil(next.secondsLeft)}s`,
      hint: `Counter: ${info.counter}`,
    };
  }

  if (has("wrongTurn")) {
    return { id: "wrongturn", level: "bad", title: "Your visitors are going to them!", hint: "Lock your address stops this next time" };
  }
  if ((me.parts.door === "failing" || me.parts.door === "strained") && me.botShare > 0.1) {
    return { id: "bots", level: "bad", title: "Bots are flooding in!", hint: "Get a Bouncer, or use a Shield" };
  }
  if (me.parts.servers === "failing" || me.parts.servers === "strained") {
    const wrecked = me.servers.some((s) => s.state === "wrecked");
    const starting = me.servers.some((s) => s.state === "booting");
    const hint = wrecked
      ? "Servers wrecked — Instant backup brings them back"
      : has("breakSplitter")
        ? "Your splitter is knocked out — own one and it fails over in 2s"
        : has("slowServers")
          ? "Your servers are slowed — Overclock cancels it"
          : starting
            ? "New servers are starting…"
            : "Add servers, or Overclock";
    return {
      id: `servers-${me.parts.servers}`,
      level: me.parts.servers === "failing" ? "bad" : "warn",
      title: me.parts.servers === "failing" ? "People can’t get in!" : "Servers are struggling",
      hint,
    };
  }
  if (me.parts.db === "failing" || me.parts.db === "strained") {
    return {
      id: `db-${me.parts.db}`,
      level: me.parts.db === "failing" ? "bad" : "warn",
      title: "Database is slow!",
      hint: "Backup database or Fast shelf",
    };
  }
  if (me.critical) return { id: "critical", level: "bad", title: "Health critical!", hint: "Emergency repair, or fix the red part" };
  if (m.them.downSecondsLeft !== null) return { id: "them-down", level: "notice", title: "Their site is down!", hint: "Push while they’re rebooting" };

  const idle = me.servers.filter((s) => s.state === "idle").length;
  if (idle >= 2) {
    return { id: "idle", level: "notice", title: "All calm", hint: `${idle} servers idle — sell them to save coins (Shift+1)` };
  }
  return { id: "calm", level: "calm", title: "All calm", hint: "Everyone’s getting in — maybe it’s time to attack" };
}
