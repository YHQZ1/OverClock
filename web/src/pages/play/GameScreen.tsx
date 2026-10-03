import type { MatchView, PartStatus } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { TopBar } from "../../components/TopBar";
import { Frame, Label, cx } from "../../components/ui";
import { useShortcut } from "../../hooks/useShortcut";
import { sendAction } from "../../socket/api";
import { MessageScreen } from "./CountdownScreen";

// Basic live screen for Milestone 2: proves the shared match works end to end.
// Milestone 3 turns this into the real game screen (map, alerts rhythm, juice).

const clock = (sec: number) => {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const healthLevel = (h: number): PartStatus => (h >= 60 ? "ok" : h >= 25 ? "strained" : "failing");

const SIGNAL_BG: Record<PartStatus, string> = { ok: "bg-ok", strained: "bg-warn", failing: "bg-bad" };

function Alert({ match }: { match: MatchView }) {
  const base = "border-b px-10 py-3.5 text-[15px] font-semibold";
  const failing = cx(base, "animate-alarm border-bad bg-bad/12 text-bad");
  if (match.downSecondsLeft !== null) return <div className={failing}>Site is down — back in {match.downSecondsLeft}s</div>;
  if (match.critical) return <div className={failing}>Health critical — act now!</div>;
  if (match.rush) return <div className={cx(base, "border-warn bg-warn/10 text-warn")}>Too many people!</div>;
  return <div className={cx(base, "border-line text-faint")}>All calm</div>;
}

function Stat({ label, value, negative = false, children }: { label: string; value: string; negative?: boolean; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-10 pt-5 pb-[22px] not-first:border-l not-first:border-line">
      <Label>{label}</Label>
      <span
        className={cx(
          "text-[clamp(32px,6vh,48px)] leading-[1.1] font-semibold tracking-[-0.04em] tabular-nums",
          negative && "text-bad",
        )}
      >
        {value}
      </span>
      {children}
    </div>
  );
}

const CONTROL =
  "relative flex h-[72px] cursor-pointer items-center justify-between overflow-hidden border px-[22px] text-xl font-semibold tracking-[-0.02em] transition-colors duration-150 active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";

export function GameScreen({ match }: { match: MatchView | null }) {
  const down = match?.downSecondsLeft != null;
  const add = () => !down && sendAction("addServer");
  const remove = () => !down && sendAction("removeServer");
  useShortcut("2", add);
  useShortcut("1", remove);

  if (!match) return <MessageScreen right="Round 1" message="Loading the round…" />;

  const busy = match.servers.filter((s) => s.state === "busy").length;
  const idle = match.servers.filter((s) => s.state === "idle").length;
  const booting = match.servers.length - busy - idle;

  return (
    <Frame>
      <TopBar right={`Round 1 · ${clock(match.timeLeftSec)}`} />

      <main className="relative grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(360px,30%)]">
        <section className="flex min-w-0 flex-col">
          <Alert match={match} />

          <div className="grid grid-cols-3 border-b border-line">
            <Stat label="Health" value={String(match.health)}>
              <div className="mt-1.5 h-1.5 bg-line">
                <span
                  className={cx("block h-full transition-[width] duration-200 ease-linear", SIGNAL_BG[healthLevel(match.health)])}
                  style={{ width: `${match.health}%` }}
                />
              </div>
            </Stat>
            <Stat label="Budget" value={match.budget.toLocaleString()} negative={match.budget < 0}>
              <span className="text-[13px] text-muted">−{match.spendPerSec}/s</span>
            </Stat>
            <Stat label="Score" value={match.score.toLocaleString()}>
              <span className="text-[13px] text-muted">
                {match.served.toLocaleString()} served · {match.lost.toLocaleString()} turned away
              </span>
            </Stat>
          </div>

          <div className="flex-1 px-10 py-6">
            <div className="mb-[18px] flex items-center gap-3">
              <span className={cx("size-2.5", SIGNAL_BG[match.serversStatus])} aria-hidden />
              <h2 className="text-lg font-semibold tracking-[-0.02em]">Servers</h2>
              <Label>
                {busy} busy · {idle} idle{booting > 0 ? ` · ${booting} starting` : ""}
              </Label>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,44px)] gap-2">
              {match.servers.map((s) => (
                <li
                  key={s.id}
                  title={s.state}
                  className={cx(
                    "relative h-14 w-11 overflow-hidden border",
                    s.state === "busy" && "border-muted bg-ink",
                    s.state === "idle" && "border-dashed border-line-strong",
                    s.state === "booting" && "border-line-strong",
                  )}
                >
                  {s.state === "booting" && (
                    <span
                      className="absolute inset-x-0 bottom-0 bg-accent transition-[height] duration-100 ease-linear"
                      style={{ height: `${s.bootProgress * 100}%` }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="flex flex-col gap-3 border-l border-line px-8 py-7">
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
          <p className="mt-2 text-sm text-muted">
            Add servers when people are being turned away. Remove idle ones — they still cost money.
          </p>
        </aside>

        {down && (
          <div className="absolute inset-0 z-[2] grid place-content-center justify-items-center bg-bg/80" role="alert">
            <p className="text-[clamp(48px,10vh,88px)] font-semibold tracking-[-0.04em] text-bad">Site is down</p>
            <p className="mt-1 text-lg text-muted">Rebooting in {match.downSecondsLeft}s…</p>
          </div>
        )}
      </main>
    </Frame>
  );
}
