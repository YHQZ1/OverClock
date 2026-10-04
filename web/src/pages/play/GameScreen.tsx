import type { EffectKind, MatchView, RoomView, ShopItemView, SiteView } from "@server/types/contracts.js";
import { useState, type ReactNode } from "react";
import { TopBar } from "../../components/TopBar";
import { Frame, Label, cx } from "../../components/ui";
import { currentAlert, type AlertLevel } from "../../game/alert";
import type { Tone } from "../../game/feed";
import { HealthTimeline } from "../../game/HealthTimeline";
import { DEFENCE_INFO, ITEM_INFO } from "../../game/items";
import { LiveMap } from "../../game/LiveMap";
import { sfx } from "../../audio/sfx";
import { useShortcut, useShortcuts } from "../../hooks/useShortcut";
import { sendAction } from "../../socket/api";
import { useGameStore } from "../../store/game";
import { capitalise, itemHint, wordsFor, type ThemeWords } from "../../themes/themes";
import { MessageScreen } from "./MessageScreen";

const clock = (sec: number) => {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const levelBg = (pct: number) => (pct >= 60 ? "bg-ok" : pct >= 25 ? "bg-warn" : "bg-bad");

// ---------- HUD ----------

function Meter({ pct, className }: { pct: number; className: string }) {
  return (
    <div className="mt-1.5 h-1 bg-line">
      <span
        className={cx("block h-full transition-[width] duration-200 ease-linear", className)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

function Stat({ label, value, tone, extra, children }: { label: string; value: string; tone?: string; extra?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col px-6 pt-3 pb-3.5 not-first:border-l not-first:border-line">
      <Label>{label}</Label>
      <span className="flex items-baseline gap-3">
        <span className={cx("text-[clamp(22px,4.4vh,34px)] leading-tight font-semibold tracking-[-0.04em] tabular-nums", tone)}>
          {value}
        </span>
        {extra}
      </span>
      {children}
    </div>
  );
}

/** "+18" floating up beside the coins once a second, so income is felt, not just read. */
function CoinPop({ match }: { match: MatchView }) {
  const earned = Math.round(match.me.incomePerSec);
  if (match.phase !== "live" || earned <= 0 || match.me.downSecondsLeft !== null) return null;
  return (
    <span key={Math.ceil(match.timeLeftSec)} className="animate-coin-pop text-lg font-semibold text-accent tabular-nums" aria-hidden>
      +{earned}
    </span>
  );
}

function Hud({ match, room }: { match: MatchView; room: RoomView }) {
  const { me, them } = match;
  const ours = room.teamNames[match.side];
  const theirs = room.teamNames[match.side === 1 ? 2 : 1];
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_1fr_1fr] border-b border-line">
      <Stat label={`${ours} · health`} value={String(me.health)} tone={me.health < 25 ? "text-bad" : undefined}>
        <Meter pct={me.health} className={levelBg(me.health)} />
      </Stat>
      <Stat label="Coins" value={me.coins.toLocaleString()} tone="text-accent" extra={<CoinPop match={match} />}>
        <span className="truncate text-xs text-muted">
          +{me.incomePerSec}/s · −{me.upkeepPerSec}/s upkeep
        </span>
      </Stat>
      <Stat label="Our score" value={me.score.toLocaleString()}>
        <span className="truncate text-xs text-muted">
          {me.served.toLocaleString()} in · {me.lost.toLocaleString()} turned away
        </span>
      </Stat>
      <div className="flex flex-col items-center justify-center border-l border-line bg-surface px-7">
        <Label>{match.phase === "buy" ? "Buy phase" : `Round ${match.round}`}</Label>
        <span className="text-[clamp(26px,5vh,38px)] leading-tight font-semibold tabular-nums">
          {match.phase === "buy" ? `${room.secondsLeft ?? 0}s` : clock(match.timeLeftSec)}
        </span>
      </div>
      <Stat label={`${theirs} · health`} value={String(them.health)} tone="text-muted">
        <Meter pct={them.health} className="bg-faint" />
      </Stat>
      <Stat label="Their score" value={them.score.toLocaleString()} tone="text-muted">
        <span className="text-xs text-faint">{me.score >= them.score ? "You’re ahead" : "You’re behind"}</span>
      </Stat>
    </div>
  );
}

// ---------- alert bar ----------

const ALERT_STYLE: Record<AlertLevel, { bar: string; mark: string; hint: string }> = {
  calm: { bar: "border-line text-muted", mark: "bg-ok", hint: "text-faint" },
  notice: { bar: "border-line text-ink", mark: "bg-accent", hint: "text-muted" },
  warn: { bar: "border-warn bg-warn/10 text-warn", mark: "bg-warn", hint: "text-warn/80" },
  bad: { bar: "animate-alarm border-bad bg-bad/12 text-bad", mark: "bg-bad", hint: "text-bad/85" },
};

function AlertBar({ match, words }: { match: MatchView; words: ThemeWords }) {
  const alert = currentAlert(match, words);
  const style = ALERT_STYLE[alert.level];
  return (
    <div className={cx("flex items-center gap-4 border-b px-10 py-2.5", style.bar)} role="status" aria-live="polite">
      <div key={alert.id} className="flex animate-flash items-baseline gap-4">
        <span className={cx("size-2.5 shrink-0 self-center", style.mark)} aria-hidden />
        <span className="text-[17px] font-semibold tracking-[-0.01em]">{alert.title}</span>
        <span className={cx("text-[15px]", style.hint)}>{alert.hint}</span>
      </div>
    </div>
  );
}

// ---------- map area ----------

/** What's happening to a site right now, in this world's words. */
function effectName(w: ThemeWords, kind: EffectKind): string {
  const n = w.names;
  switch (kind) {
    case "slowDb":
      return `${w.parts.db} slowed`;
    case "slowServers":
      return `${w.parts.servers} slowed`;
    case "breakSplitter":
      return `${n.splitter} knocked out`;
    case "blindfold":
      return "Blacked out";
    case "wrongTurn":
      return `${capitalise(w.visitors)} diverted`;
    case "jam":
      return "Controls jammed";
    case "protected":
      return "Rebooted — protected";
    default:
      return n[kind];
  }
}
const HELPFUL: EffectKind[] = ["shield", "overclock", "protected"];

function EffectChips({ site, outgoing, words }: { site: SiteView; outgoing?: MatchView["outgoing"]; words: ThemeWords }) {
  return (
    <div className="flex min-h-7 flex-wrap items-center gap-2">
      {site.effects.map((e) => (
        <span
          key={e.kind}
          className={cx(
            "flex items-center gap-2 border px-2 py-0.5 text-xs font-medium",
            HELPFUL.includes(e.kind) ? "border-accent/60 text-accent" : "border-bad/60 text-bad",
          )}
        >
          {effectName(words, e.kind)} <span className="tabular-nums opacity-70">{e.secondsLeft}s</span>
        </span>
      ))}
      {outgoing?.map((o) => (
        <span key={o.id} className="flex items-center gap-2 border border-ok/60 px-2 py-0.5 text-xs font-medium text-ok">
          {words.names[o.attack]} → lands in {Math.ceil(o.secondsLeft)}s
        </span>
      ))}
    </div>
  );
}

function MapArea({ match, words }: { match: MatchView; words: ThemeWords }) {
  const [focus, setFocus] = useState<"me" | "them">("me");
  const history = useGameStore((s) => s.history);
  const flip = (to?: "me" | "them") => {
    setFocus((f) => to ?? (f === "me" ? "them" : "me"));
    sfx.tab();
  };
  useShortcut("tab", () => flip());
  const shown = focus === "me" ? match.me : match.them;
  const other = focus === "me" ? match.them : match.me;
  const down = match.me.downSecondsLeft !== null;

  return (
    <section className="relative flex min-h-0 min-w-0 flex-col">
      <div className="flex items-center gap-5 px-10 pt-3">
        <div className="flex border border-line-strong text-sm">
          {(["me", "them"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => flip(f)}
              className={cx("cursor-pointer px-3.5 py-1.5 font-medium", focus === f ? "bg-raised text-ink" : "text-muted hover:text-ink")}
            >
              {f === "me" ? "Our site" : "Their site"}
            </button>
          ))}
        </div>
        <span className="text-xs text-faint">
          <kbd>Tab</kbd> to switch
        </span>
        <div className="ml-auto">
          <EffectChips site={shown} outgoing={focus === "them" ? match.outgoing : undefined} words={words} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 place-items-center px-10 py-2">
        <LiveMap site={shown} labels={{ crowd: capitalise(words.visitors), ...words.parts }} />
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-6 border-t border-line px-10 py-2.5">
        <div>
          <Label>Health this round — us above, them below</Label>
          <div className="mt-1">
            <HealthTimeline me={history.me} them={history.them} durationSec={match.durationSec} />
          </div>
        </div>
        <button type="button" onClick={() => flip()} className="w-[220px] cursor-pointer text-left">
          <Label>{focus === "me" ? "Their site" : "Our site"} · health {other.health}</Label>
          <LiveMap site={other} compact />
        </button>
      </div>

      {down && (
        <div className="absolute inset-0 grid place-content-center justify-items-center bg-bg/70" role="alert">
          <p className="text-[clamp(44px,9vh,80px)] font-semibold tracking-[-0.04em] text-bad">Your site is down</p>
          <p className="mt-1 text-lg text-muted">
            Back in {match.me.downSecondsLeft}s — {words.downLine}
          </p>
        </div>
      )}
    </section>
  );
}

// ---------- shop ----------

type Tab = "defence" | "attack" | "utility";
const TABS: { id: Tab; label: string; keys: string }[] = [
  { id: "defence", label: "Defend", keys: "1–7" },
  { id: "attack", label: "Attack", keys: "A–L" },
  { id: "utility", label: "Boost", keys: "Q–R" },
];

function press(item: ShopItemView) {
  const kind = item.kind === "defence" ? "buy" : item.kind === "utility" ? "use" : "attack";
  sendAction({ kind, item: item.id } as Parameters<typeof sendAction>[0]);
}

function ShopRow({ item, locked, words }: { item: ShopItemView; locked: boolean; words: ThemeWords }) {
  const info = ITEM_INFO[item.id];
  const maxed = item.kind === "defence" && item.owned >= item.max;
  const coolingDown = item.cooldown > 0;
  const disabled = locked || !item.affordable || maxed || coolingDown;
  const canSell = item.kind === "defence" && item.owned > (item.id === "server" ? 1 : 0);

  return (
    <div className="group relative flex items-stretch border-b border-line">
      <button
        type="button"
        onClick={() => press(item)}
        disabled={disabled}
        className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 overflow-hidden py-[5px] pr-2 pl-6 text-left transition-colors enabled:hover:bg-surface disabled:cursor-not-allowed"
      >
        {coolingDown && (
          <span className="absolute inset-y-0 left-0 bg-raised" style={{ width: `${item.cooldown * 100}%` }} aria-hidden />
        )}
        <kbd className="relative">{info.key.toUpperCase()}</kbd>
        <span className={cx("relative min-w-0 flex-1", disabled && "opacity-45")}>
          <span className="block truncate text-sm font-medium">
            {words.names[item.id]}
            {item.kind === "defence" && item.owned > 0 && <span className="ml-2 text-xs font-normal text-accent">×{item.owned}</span>}
          </span>
          <span className="block truncate text-[11px] leading-tight text-faint">{itemHint(words, item.id)}</span>
        </span>
        <span className={cx("relative text-sm font-semibold tabular-nums", item.affordable ? "text-ink" : "text-bad/80")}>
          {maxed ? "max" : item.price}
        </span>
      </button>
      {item.kind === "defence" && (
        <button
          type="button"
          onClick={() => sendAction({ kind: "sell", item: item.id as keyof typeof DEFENCE_INFO })}
          disabled={locked || !canSell}
          title={`Sell (Shift+${info.key})`}
          className="w-14 cursor-pointer border-l border-line text-xs text-muted transition-colors enabled:hover:bg-surface enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          Sell
        </button>
      )}
    </div>
  );
}

const TONE_TEXT: Record<Tone, string> = { neutral: "text-muted", good: "text-ok", warn: "text-warn", bad: "text-bad" };
const TONE_MARK: Record<Tone, string> = { neutral: "bg-faint", good: "bg-ok", warn: "bg-warn", bad: "bg-bad" };

function Shop({ match, words }: { match: MatchView; words: ThemeWords }) {
  const [tab, setTab] = useState<Tab>("defence");
  const feed = useGameStore((s) => s.feed);
  const jam = match.me.effects.find((e) => e.kind === "jam");
  const locked = match.me.downSecondsLeft !== null || jam !== undefined;

  // Every item keeps its shortcut, whichever tab is open.
  const bindings: Record<string, () => void> = {};
  for (const item of match.shop) {
    const info = ITEM_INFO[item.id];
    bindings[info.key] = () => press(item);
    if (info.sellKey) bindings[info.sellKey] = () => sendAction({ kind: "sell", item: item.id as keyof typeof DEFENCE_INFO });
  }
  useShortcuts(bindings, { enabled: !locked });

  const items = match.shop.filter((i) => i.kind === tab);
  const incoming = match.incoming.length > 0;

  return (
    <aside className="flex min-h-0 flex-col border-l border-line">
      <div className="grid grid-cols-3 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              "relative cursor-pointer px-3 py-2 text-left transition-colors not-first:border-l not-first:border-line",
              tab === t.id ? "bg-surface text-ink" : "text-muted hover:text-ink",
            )}
          >
            {tab === t.id && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden />}
            <span className="block text-sm font-semibold">
              {t.label}
              {t.id === "utility" && incoming && <span className="ml-1.5 inline-block size-1.5 bg-bad align-middle" />}
            </span>
            <span className="text-[11px] text-faint">{t.keys}</span>
          </button>
        ))}
      </div>

      <div className="relative min-h-0 overflow-y-auto">
        {items.map((item) => (
          <ShopRow key={item.id} item={item} locked={locked} words={words} />
        ))}
        {jam && (
          <div className="absolute inset-0 grid place-content-center justify-items-center bg-bg/85" role="alert">
            <p className="text-2xl font-semibold tracking-[-0.02em] text-bad">Controls jammed</p>
            <p className="mt-1 text-sm text-muted">Back in {jam.secondsLeft}s</p>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col border-t border-line px-6 py-2.5">
        <Label>What just happened</Label>
        <ul className="mt-1.5 grid gap-1 overflow-hidden">
          {feed.length === 0 && <li className="text-sm text-faint">Nothing yet.</li>}
          {feed.map((item, i) => (
            <li key={item.id} className={cx("flex animate-slide-in items-center gap-2.5 text-sm", TONE_TEXT[item.tone], i > 1 && "opacity-60")}>
              <span className={cx("size-1.5 shrink-0", TONE_MARK[item.tone])} aria-hidden />
              <span className="truncate">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

// ---------- screen ----------

export function GameScreen({ room, match }: { room: RoomView; match: MatchView | null }) {
  if (!match) return <MessageScreen right={`Round ${room.round}`} message="Setting up the round…" />;
  const words = wordsFor(room.theme);

  return (
    <Frame>
      <TopBar theme={room.theme} right={`Round ${match.round} of ${room.totalRounds}`} />
      <main className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
        <Hud match={match} room={room} />
        <AlertBar match={match} words={words} />
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(360px,30%)]">
          <MapArea match={match} words={words} />
          <Shop match={match} words={words} />
        </div>
      </main>
    </Frame>
  );
}

