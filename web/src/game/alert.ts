import type { MatchView } from "@server/types/contracts.js";
import { DEFAULT_WORDS, counterText, type ThemeWords } from "../themes/themes";

export type AlertLevel = "calm" | "notice" | "warn" | "bad";

/** What's wrong, and what to do about it — one alert at a time, worst first. */
export type Alert = { id: string; level: AlertLevel; title: string; hint: string };

export function currentAlert(m: MatchView, words: ThemeWords = DEFAULT_WORDS): Alert {
  const me = m.me;
  const n = words.names;
  const servers = words.parts.servers;
  const has = (kind: string) => me.effects.some((e) => e.kind === kind);

  if (m.phase === "buy") {
    const intro = words.rounds[Math.min(m.round, 3) - 1] ?? `Round ${m.round}`;
    return { id: "buy", level: "notice", title: `Buy phase · ${intro}`, hint: `Build before the ${words.visitors} arrive — the shop stays open all round` };
  }
  if (me.downSecondsLeft !== null) {
    return { id: "down", level: "bad", title: "Your site is down!", hint: `Back in ${me.downSecondsLeft}s — ${words.downLine}` };
  }

  if (me.blind) return { id: "blind", level: "bad", title: "You’re blindfolded!", hint: `${n.backupMonitor} stops this next time` };
  if (has("jam")) return { id: "jam", level: "bad", title: "Your controls are jammed!", hint: `Use ${n.shield} before the next one lands` };

  const next = [...m.incoming].sort((a, b) => a.secondsLeft - b.secondsLeft)[0];
  if (next) {
    return {
      id: `incoming-${next.id}`,
      level: "bad",
      title: `${n[next.attack]} incoming in ${Math.ceil(next.secondsLeft)}s`,
      hint: `Counter: ${counterText(words, next.attack)}`,
    };
  }

  if (has("wrongTurn")) {
    return { id: "wrongturn", level: "bad", title: `Your ${words.visitors} are going to them!`, hint: `${n.lockAddress} stops this next time` };
  }
  if ((me.parts.door === "failing" || me.parts.door === "strained") && me.botShare > 0.1) {
    return { id: "bots", level: "bad", title: "Bots are flooding in!", hint: `Get ${n.bouncer}, or use ${n.shield}` };
  }
  if (me.parts.servers === "failing" || me.parts.servers === "strained") {
    const wrecked = me.servers.some((s) => s.state === "wrecked");
    const starting = me.servers.some((s) => s.state === "booting");
    const hint = wrecked
      ? `${servers} wrecked — ${n.instantBackup} brings them back`
      : has("breakSplitter")
        ? `Your ${n.splitter} is knocked out — owning one brings it back in 2s`
        : has("slowServers")
          ? `Your ${servers.toLowerCase()} are slowed — ${n.overclock} cancels it`
          : starting
            ? `New ${servers.toLowerCase()} are starting…`
            : `Add ${servers.toLowerCase()}, or ${n.overclock}`;
    return {
      id: `servers-${me.parts.servers}`,
      level: me.parts.servers === "failing" ? "bad" : "warn",
      title: me.parts.servers === "failing" ? words.crowded : `${servers} are struggling`,
      hint,
    };
  }
  if (me.parts.db === "failing" || me.parts.db === "strained") {
    return {
      id: `db-${me.parts.db}`,
      level: me.parts.db === "failing" ? "bad" : "warn",
      title: `${words.parts.db} can’t keep up!`,
      hint: `${n.backupDb} or ${n.shelf}`,
    };
  }
  if (me.critical) return { id: "critical", level: "bad", title: "Health critical!", hint: `${n.repair}, or fix the red part` };
  if (m.them.downSecondsLeft !== null) return { id: "them-down", level: "notice", title: "Their site is down!", hint: "Push while they’re rebooting" };

  const idle = me.servers.filter((s) => s.state === "idle").length;
  if (idle >= 2) {
    return { id: "idle", level: "notice", title: "All calm", hint: `${idle} ${servers.toLowerCase()} idle — sell them to save coins (Shift+1)` };
  }
  return { id: "calm", level: "calm", title: "All calm", hint: "Everyone’s getting in — maybe it’s time to attack" };
}
