import type { ItemId, MatchView } from "@server/types/contracts.js";
import { DEFAULT_WORDS, type ThemeWords } from "../themes/themes";
import { ATTACK_INFO, ITEM_INFO } from "./items";

export type AlertLevel = "calm" | "notice" | "warn" | "bad";

/**
 * What's wrong, and what to do about it — one alert at a time, worst first.
 * `press` is the card worth pressing right now: the hand makes it glow, and
 * the hint names its key ("Press 2 — Robot check").
 */
export type Alert = { id: string; level: AlertLevel; title: string; hint: string; press?: ItemId };

const keyOf = (id: ItemId) => ITEM_INFO[id].key.toUpperCase();

export function currentAlert(m: MatchView, words: ThemeWords = DEFAULT_WORDS): Alert {
  const me = m.me;
  const n = words.names;
  const servers = words.parts.servers.toLowerCase();
  const has = (kind: string) => me.effects.some((e) => e.kind === kind);

  /** Can this card be pressed right now? */
  const usable = (id: ItemId) => {
    const card = m.shop.find((c) => c.id === id);
    if (!card || !card.affordable || card.cooldown > 0) return false;
    return card.kind !== "defence" || card.owned < card.max;
  };
  const firstUsable = (...ids: ItemId[]) => ids.find(usable);
  /** "Press 2 — Robot check", or what it would take if it isn't pressable yet. */
  const pressHint = (id: ItemId | undefined, fallback: string) => (id ? `Press ${keyOf(id)} — ${n[id]}` : fallback);

  if (m.phase === "buy") {
    const intro = words.rounds[Math.min(m.round, 3) - 1] ?? `Round ${m.round}`;
    return { id: "buy", level: "notice", title: `Get ready · ${intro}`, hint: `Build before the ${words.visitors} arrive — the cards stay open all round` };
  }
  if (me.downSecondsLeft !== null) {
    return { id: "down", level: "bad", title: "Your site is down!", hint: `Back in ${me.downSecondsLeft}s — ${words.downLine}` };
  }
  if (has("jam")) {
    return { id: "jam", level: "bad", title: "Your cards are frozen!", hint: `${n.shield} stops the next freeze — raise it before it lands` };
  }

  const next = [...m.incoming].sort((a, b) => a.secondsLeft - b.secondsLeft)[0];
  if (next) {
    const counters = ATTACK_INFO[next.attack].counter;
    // A kept defence that already cuts this attack down (a server isn't one — more are always better).
    const ready = counters.find((id) => id !== "server" && m.shop.find((c) => c.id === id)?.kind === "defence" && m.shop.find((c) => c.id === id)!.owned > 0);
    const press = ready ? undefined : firstUsable(...counters);
    return {
      id: `incoming-${next.id}`,
      level: ready ? "warn" : "bad",
      title: `${n[next.attack]} incoming in ${Math.ceil(next.secondsLeft)}s`,
      hint: ready ? `You’re ready — ${n[ready]} will cut it down` : pressHint(press, `Counter: ${counters.map((id) => n[id]).join(" or ")}`),
      press,
    };
  }

  if (has("wrongTurn")) {
    return { id: "wrongturn", level: "bad", title: `Your ${words.visitors} are walking to them!`, hint: `${n.lockAddress} (${keyOf("lockAddress")}) stops this next time` };
  }
  if ((me.parts.door === "failing" || me.parts.door === "strained") && me.botShare > 0.1) {
    const press = firstUsable("bouncer", "shield");
    return { id: "bots", level: "bad", title: "Bots are flooding the line!", hint: pressHint(press, `${n.bouncer} or ${n.shield}`), press };
  }
  if (me.parts.servers === "failing" || me.parts.servers === "strained") {
    const wrecked = me.servers.some((s) => s.state === "wrecked");
    const starting = me.servers.some((s) => s.state === "booting");
    const press = wrecked ? firstUsable("instantBackup") : starting ? firstUsable("overclock") : firstUsable("server", "overclock");
    const hint = wrecked
      ? pressHint(press, `${words.parts.servers} wrecked — ${n.instantBackup} brings them back`)
      : starting
        ? `New ${servers} are starting…${press ? ` or press ${keyOf(press)} — ${n[press]}` : ""}`
        : pressHint(press, `Add ${servers}, or use ${n.overclock}`);
    return {
      id: `servers-${me.parts.servers}`,
      level: me.parts.servers === "failing" ? "bad" : "warn",
      title: me.parts.servers === "failing" ? words.crowded : `${words.parts.servers} are struggling`,
      hint,
      press,
    };
  }
  if (me.critical) {
    const press = firstUsable("repair");
    return { id: "critical", level: "bad", title: "Health critical!", hint: pressHint(press, "Fix the red part"), press };
  }
  if (m.them.downSecondsLeft !== null) return { id: "them-down", level: "notice", title: "Their site is down!", hint: "Push while they’re rebooting" };

  return { id: "calm", level: "calm", title: "All calm", hint: "Everyone’s getting in — maybe it’s time to attack" };
}
