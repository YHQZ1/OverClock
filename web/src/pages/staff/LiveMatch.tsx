import type { ScreenMatch, Side } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { cx } from "../../components/ui";
import { LiveMap } from "../../game/LiveMap";
import { ThemeLogo } from "../../themes/ThemeLogo";
import { THEME_INFO, accentVars, capitalise, wordsFor } from "../../themes/themes";

/* One match, big, for the projector: both teams with live scores, health
   and maps, in the match's theme. Sized in vh to read from across the room. */

export const n = (x: number) => x.toLocaleString("en-IN");
export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Shown in place of the maps when no round is running. */
const WAITING: Record<ScreenMatch["phase"], string> = {
  vote: "Picking the site…",
  briefing: "Reading the briefing…",
  buy: "",
  live: "",
  roundResult: "Next round soon…",
};

export const PHASE_LINE: Record<ScreenMatch["phase"], string> = {
  vote: "Picking the site",
  briefing: "Reading the briefing",
  buy: "Buy phase",
  live: "Live",
  roundResult: "Round over",
};

export function Featured({ match, action }: { match: ScreenMatch; /** e.g. the Pin button */ action?: ReactNode }) {
  const words = wordsFor(match.theme);
  const labels = { crowd: capitalise(words.visitors), ...words.parts };
  const leader = match.teams[1].total === match.teams[2].total ? null : match.teams[1].total > match.teams[2].total ? 1 : 2;

  return (
    <div
      key={match.code}
      className="flex min-h-0 flex-1 animate-rise-in flex-col"
      style={match.theme ? accentVars(match.theme) : undefined}
    >
      <div className="flex items-center justify-between border-b border-line px-[2.5vw] py-[1.6vh]">
        <div className="flex items-center gap-4">
          {match.theme && <ThemeLogo theme={match.theme} className="h-[4vh]" fallback="none" />}
          <div>
            <p className="text-[2.6vh] font-semibold text-accent">{match.theme ? THEME_INFO[match.theme].name : "Overclock"}</p>
            <p className="text-[1.7vh] text-muted">
              {match.format} · room {match.code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[2vw]">
          {action}
          <div className="text-right">
            <p className="text-[1.7vh] text-muted">
              {match.round > 0 ? `Round ${match.round} of ${match.totalRounds} · ` : ""}
              {PHASE_LINE[match.phase]}
            </p>
            <p className="text-[5vh] leading-none font-semibold tabular-nums">
              {match.secondsLeft !== null ? clock(match.secondsLeft) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2">
        {([1, 2] as const).map((side) => (
          <TeamPanel key={side} match={match} side={side} leading={leader === side} labels={labels} />
        ))}
      </div>
    </div>
  );
}

function TeamPanel({
  match,
  side,
  leading,
  labels,
}: {
  match: ScreenMatch;
  side: Side;
  leading: boolean;
  labels: Parameters<typeof LiveMap>[0]["labels"];
}) {
  const team = match.teams[side];
  const site = match.sites?.[side];
  const health = site?.health ?? null;
  const players = team.players.join(" · ");
  return (
    <div className="grid min-h-0 min-w-0 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] items-center gap-[2vw] px-[2.5vw] py-[1.5vh] not-first:border-t not-first:border-line">
      <div className="min-w-0">
        <p className="truncate text-[3.4vh] font-semibold tracking-[-0.02em]">{team.name}</p>
        {players !== team.name && <p className="truncate text-[1.7vh] text-muted">{players}</p>}
        <div className="mt-[1.2vh] flex items-baseline gap-4">
          <span
            className={cx("text-[7vh] leading-none font-semibold tracking-[-0.05em] tabular-nums", leading ? "text-accent" : "text-ink")}
          >
            {n(team.total)}
          </span>
          <span className={cx("text-[1.8vh] whitespace-nowrap", team.roundsWon > 0 ? "text-accent" : "text-faint")}>
            {team.roundsWon} of {match.totalRounds} rounds won
          </span>
        </div>
        <div className="mt-[1.4vh]">
          <div className="flex justify-between text-[1.6vh] text-muted">
            <span>Health</span>
            <span className={cx("tabular-nums", site?.downSecondsLeft != null && "font-semibold text-bad")}>
              {site?.downSecondsLeft != null ? `DOWN · back in ${site.downSecondsLeft}s` : health !== null ? health : "—"}
            </span>
          </div>
          <div className="mt-1 h-[0.8vh] bg-line">
            <span
              className={cx(
                "block h-full transition-[width] duration-300 ease-linear",
                health === null ? "" : health >= 60 ? "bg-ok" : health >= 25 ? "bg-warn" : "bg-bad",
              )}
              style={{ width: `${health ?? 0}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid h-full min-h-0 place-items-center">
        {site ? <LiveMap site={site} labels={labels} /> : <p className="text-[2vh] text-faint">{WAITING[match.phase]}</p>}
      </div>
    </div>
  );
}

export function NoMatches() {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-3 text-center">
      <p className="text-[6vh] font-semibold tracking-[-0.04em]">No matches right now</p>
      <p className="text-[2.4vh] text-muted">Grab a PC, make a room and challenge someone.</p>
    </div>
  );
}
