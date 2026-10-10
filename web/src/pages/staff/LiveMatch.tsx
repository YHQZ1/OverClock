import type { ScreenMatch, Side } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { cx } from "../../components/ui";
import { Arena } from "../../game/arena/Arena";
import { ThemeLogo } from "../../themes/ThemeLogo";
import { THEME_INFO, accentVars, wordsFor } from "../../themes/themes";

/* One match, big, for the projector: both teams with live scores, health
   and maps, in the match's theme. Sized in vh to read from across the room. */

export const n = (x: number) => x.toLocaleString("en-IN");
export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Shown in place of the maps when no round is running. */
const WAITING: Record<ScreenMatch["phase"], string> = {
  vote: "Picking the app…",
  themePick: "And the winner is…",
  briefing: "Reading the briefing…",
  buy: "",
  live: "",
  roundResult: "Next round soon…",
};

export const PHASE_LINE: Record<ScreenMatch["phase"], string> = {
  vote: "Picking the app",
  themePick: "Theme picked",
  briefing: "Reading the briefing",
  buy: "Buy phase",
  live: "Live",
  roundResult: "Round over",
};

export function Featured({ match, action }: { match: ScreenMatch; /** e.g. the Pin button */ action?: ReactNode }) {
  const words = wordsFor(match.theme);
  const leader = match.teams[1].total === match.teams[2].total ? null : match.teams[1].total > match.teams[2].total ? 1 : 2;

  return (
    <div
      key={match.code}
      className="flex min-h-0 flex-1 animate-rise-in flex-col"
      style={match.theme ? accentVars(match.theme) : undefined}
    >
      <div className="flex items-center justify-between border-b-4 border-black px-[2.5vw] py-[1.2vh]">
        <div className="flex items-center gap-4">
          {match.theme && <ThemeLogo theme={match.theme} className="h-[4vh]" fallback="none" />}
          <div>
            <p className="font-display text-[4.2vh] leading-none font-extrabold tracking-[0.02em] text-accent uppercase">{match.theme ? THEME_INFO[match.theme].name : "Overclock"}</p>
            <p className="font-display text-[2.2vh] font-bold tracking-[0.08em] text-muted uppercase">
              {match.format} · room {match.code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[2vw]">
          {action}
          <div className="text-right">
            <p className="font-display text-[2.2vh] font-bold tracking-[0.08em] text-muted uppercase">
              {match.round > 0 ? `Round ${match.round} of ${match.totalRounds} · ` : ""}
              {PHASE_LINE[match.phase]}
            </p>
            <p className="font-display text-[7vh] leading-none font-extrabold tabular-nums">
              {match.secondsLeft !== null ? clock(match.secondsLeft) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
        <div className="grid min-h-0 place-items-center px-[1.5vw] py-[1vh]">
          {match.sites ? (
            <Arena
              theme={match.theme}
              words={words}
              left={match.sites[1]}
              right={match.sites[2]}
              leftName={match.teams[1].name}
              rightName={match.teams[2].name}
            />
          ) : (
            <p className="font-display text-[4.6vh] font-extrabold tracking-[0.04em] text-faint uppercase">{WAITING[match.phase]}</p>
          )}
        </div>
        <div className="grid grid-cols-2 border-t-4 border-black">
          {([1, 2] as const).map((side) => (
            <TeamPanel key={side} match={match} side={side} leading={leader === side} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamPanel({ match, side, leading }: { match: ScreenMatch; side: Side; leading: boolean }) {
  const team = match.teams[side];
  const site = match.sites?.[side];
  const health = site?.health ?? null;
  const players = team.players.join(" · ");
  return (
    <div className="min-w-0 px-[2.5vw] py-[1.4vh] not-first:border-l-4 not-first:border-black">
      <p className="truncate font-display text-[4.4vh] leading-none font-extrabold uppercase">{team.name}</p>
      {players !== team.name && <p className="truncate font-display text-[2.2vh] font-bold tracking-[0.04em] text-muted uppercase">{players}</p>}
      <div className="mt-[0.8vh] flex items-baseline gap-4">
        <span className={cx("font-display text-[9vh] leading-[0.85] font-extrabold tabular-nums", leading ? "text-accent" : "text-ink")}>
          {n(team.total)}
        </span>
        <span className={cx("font-display text-[2.4vh] font-bold tracking-[0.06em] whitespace-nowrap uppercase", team.roundsWon > 0 ? "text-accent" : "text-faint")}>
          {team.roundsWon} of {match.totalRounds} rounds won
        </span>
      </div>
      <div className="mt-[1vh]">
        <div className="flex justify-between font-display text-[2vh] font-bold tracking-[0.08em] text-muted uppercase">
          <span>Health</span>
          <span className={cx("tabular-nums", site?.downSecondsLeft != null && "font-semibold text-bad")}>
            {site?.downSecondsLeft != null ? `DOWN · back in ${site.downSecondsLeft}s` : health !== null ? health : "—"}
          </span>
        </div>
        <div className="mt-1 h-[1.2vh] bg-line-strong">
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
  );
}

export function NoMatches() {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-3 text-center">
      <p className="font-display text-[10vh] leading-none font-extrabold uppercase">No matches right now</p>
      <p className="font-display text-[3.4vh] font-bold tracking-[0.04em] text-muted uppercase">Grab a PC, make a room and challenge someone.</p>
    </div>
  );
}
