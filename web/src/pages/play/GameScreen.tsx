import type { MatchView } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { TopBar } from "../../components/TopBar";
import { Frame, Label, cx } from "../../components/ui";
import { currentAlert, type AlertLevel } from "../../game/alert";
import type { Tone } from "../../game/feed";
import { HealthTimeline } from "../../game/HealthTimeline";
import { LiveMap } from "../../game/LiveMap";
import { useShortcut } from "../../hooks/useShortcut";
import { sendAction } from "../../socket/api";
import { useGameStore } from "../../store/game";
import { MessageScreen } from "./CountdownScreen";

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

function Stat({ label, value, tone, children }: { label: string; value: string; tone?: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col px-10 pt-3.5 pb-4 not-first:border-l not-first:border-line">
      <Label>{label}</Label>
      <span className={cx("text-[clamp(26px,5vh,38px)] leading-tight font-semibold tracking-[-0.04em] tabular-nums", tone)}>
        {value}
      </span>
      {children}
    </div>
  );
}

function Hud({ match }: { match: MatchView }) {
  return (
    <div className="grid grid-cols-4 border-b border-line">
      <Stat label="Health" value={String(match.health)} tone={match.health < 25 ? "text-bad" : undefined}>
        <Meter pct={match.health} className={levelBg(match.health)} />
      </Stat>
      <Stat label="Budget" value={match.budget.toLocaleString()} tone={match.budget < 0 ? "text-bad" : undefined}>
        <span className="text-xs text-muted">−{match.spendPerSec} every second</span>
      </Stat>
      <Stat label="Score" value={match.score.toLocaleString()}>
        <span className="truncate text-xs text-muted">
          {match.served.toLocaleString()} got in · {match.lost.toLocaleString()} turned away
        </span>
      </Stat>
      <Stat label="Time left" value={clock(match.timeLeftSec)}>
        <Meter pct={(match.timeLeftSec / match.durationSec) * 100} className="bg-faint" />
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

function AlertBar({ match }: { match: MatchView }) {
  const alert = currentAlert(match);
  const style = ALERT_STYLE[alert.level];
  return (
    <div className={cx("flex items-center gap-4 border-b px-10 py-3", style.bar)} role="status" aria-live="polite">
      {/* key → replays the flash whenever the alert changes */}
      <div key={alert.id} className="flex animate-flash items-baseline gap-4">
        <span className={cx("size-2.5 shrink-0 self-center", style.mark)} aria-hidden />
        <span className="text-[17px] font-semibold tracking-[-0.01em]">{alert.title}</span>
        <span className={cx("text-[15px]", style.hint)}>{alert.hint}</span>
      </div>
    </div>
  );
}

// ---------- controls ----------

const CONTROL =
  "relative flex h-[68px] cursor-pointer items-center justify-between overflow-hidden border px-[22px] text-xl font-semibold tracking-[-0.02em] transition-colors duration-150 active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";

const TONE_TEXT: Record<Tone, string> = { neutral: "text-muted", good: "text-ok", warn: "text-warn", bad: "text-bad" };
const TONE_MARK: Record<Tone, string> = { neutral: "bg-faint", good: "bg-ok", warn: "bg-warn", bad: "bg-bad" };

function Legend({ match }: { match: MatchView }) {
  const count = (state: string) => match.servers.filter((s) => s.state === state).length;
  const down = count("down");
  const items = down
    ? [{ n: down, label: "down", mark: "border border-bad bg-bad/25" }]
    : [
        { n: count("busy"), label: "busy", mark: "bg-ink" },
        { n: count("idle"), label: "idle", mark: "border border-dashed border-faint" },
        { n: count("booting"), label: "starting", mark: "border border-accent bg-accent/60" },
      ];
  return (
    <div className="flex gap-5 text-sm text-muted">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <span className={cx("size-3", it.mark)} aria-hidden />
          <span className="font-semibold text-ink tabular-nums">{it.n}</span> {it.label}
        </span>
      ))}
    </div>
  );
}

function Controls({ match, down }: { match: MatchView; down: boolean }) {
  const feed = useGameStore((s) => s.feed);
  const add = () => !down && sendAction("addServer");
  const remove = () => !down && sendAction("removeServer");
  useShortcut("2", add);
  useShortcut("1", remove);

  return (
    <aside className="flex min-h-0 flex-col border-l border-line">
      <div className="flex flex-col gap-3 px-8 pt-6">
        <button
          type="button"
          className={cx(
            CONTROL,
            "border-accent bg-accent text-on-accent hover:enabled:border-accent-hover hover:enabled:bg-accent-hover [&_kbd]:border-on-accent/25 [&_kbd]:text-on-accent/65",
          )}
          disabled={down || match.budget <= 0}
          onClick={add}
        >
          {/* Cooldown sweeps away from the right edge */}
          <span
            className="absolute inset-y-0 right-0 bg-black/35 transition-[width] duration-100 ease-linear"
            style={{ width: `${match.addCooldown * 100}%` }}
          />
          <span className="relative">+ Servers</span>
          <kbd className="relative">2</kbd>
        </button>
        <button
          type="button"
          className={cx(CONTROL, "border-line-strong bg-surface hover:enabled:border-faint hover:enabled:bg-raised")}
          disabled={down || match.servers.length <= 1}
          onClick={remove}
        >
          <span className="relative">– Server</span>
          <kbd className="relative">1</kbd>
        </button>
      </div>

      <div className="mt-5 border-t border-line px-8 py-4">
        <Legend match={match} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-line px-8 py-4">
        <Label>What just happened</Label>
        <ul className="mt-2.5 grid gap-2">
          {feed.length === 0 && <li className="text-sm text-faint">Nothing yet — keep an eye on the servers.</li>}
          {feed.map((item, i) => (
            <li
              key={item.id}
              className={cx("flex animate-slide-in items-center gap-2.5 text-sm", TONE_TEXT[item.tone], i > 0 && "opacity-60")}
            >
              <span className={cx("size-1.5 shrink-0", TONE_MARK[item.tone])} aria-hidden />
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-line px-8 py-4 text-[13px] text-muted">
        More servers let more people in, but every server costs money each second.
      </p>
    </aside>
  );
}

// ---------- screen ----------

export function GameScreen({ match }: { match: MatchView | null }) {
  const history = useGameStore((s) => s.healthHistory);
  if (!match) return <MessageScreen right="Round 1" message="Loading the round…" />;
  const down = match.downSecondsLeft !== null;

  return (
    <Frame>
      <TopBar right="Round 1" />

      <main className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
        <Hud match={match} />
        <AlertBar match={match} />

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(340px,28%)]">
          <section className="relative flex min-h-0 min-w-0 flex-col">
            <div className="grid min-h-0 flex-1 place-items-center px-10 py-3">
              <LiveMap match={match} />
            </div>
            <div className="border-t border-line px-10 pt-2.5 pb-3">
              <Label>Health this round</Label>
              <div className="mt-1.5">
                <HealthTimeline history={history} durationSec={match.durationSec} />
              </div>
            </div>

            {down && (
              <div className="absolute inset-0 grid place-content-center justify-items-center bg-bg/70" role="alert">
                <p className="text-[clamp(44px,9vh,80px)] font-semibold tracking-[-0.04em] text-bad">The site is down</p>
                <p className="mt-1 text-lg text-muted">Rebooting in {match.downSecondsLeft}s — nobody can get in</p>
              </div>
            )}
          </section>

          <Controls match={match} down={down} />
        </div>
      </main>
    </Frame>
  );
}
