import type { MatchView, RoomView } from "@server/types/contracts.js";
import { SoundToggle } from "../../audio/SoundToggle";
import { cx } from "../../components/ui";

const clock = (sec: number) => {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const levelBg = (pct: number) => (pct >= 60 ? "bg-ok" : pct >= 25 ? "bg-warn" : "bg-bad");

function Team({ name, health, mine, align }: { name: string; health: number; mine: boolean; align: "left" | "right" }) {
  return (
    <div className={cx("min-w-0", align === "right" && "text-right")}>
      <div className={cx("flex items-baseline gap-3", align === "right" && "flex-row-reverse")}>
        <span className={cx("truncate font-display text-[clamp(1.25rem,3.4vh,1.875rem)] leading-none font-extrabold uppercase", !mine && "opacity-70")}>{name}</span>
        <span className={cx("font-display text-[clamp(1.625rem,4.4vh,2.5rem)] leading-none font-extrabold tabular-nums", health < 25 && "text-bad")}>{health}</span>
      </div>
      <div className={cx("mt-1.5 flex h-3 bg-line-strong", align === "right" && "justify-end")}>
        <i className={cx("block h-full transition-[width] duration-300 ease-linear", mine ? levelBg(health) : "bg-faint")} style={{ width: `${Math.max(0, Math.min(100, health))}%` }} />
      </div>
    </div>
  );
}

/**
 * The scoreboard: both teams' health, the round clock, and a tug-of-war bar
 * showing who's ahead right now — the whole duel in one glance.
 */
export function ScoreBar({ match, room }: { match: MatchView; room: RoomView }) {
  const { me, them } = match;
  const ours = room.teamNames[match.side];
  const theirs = room.teamNames[match.side === 1 ? 2 : 1];

  // 0 → 1, where 0.5 is level.
  const total = Math.max(1, Math.abs(me.score) + Math.abs(them.score));
  const share = 0.5 + Math.max(-0.5, Math.min(0.5, ((me.score - them.score) / total) * 1.4));

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-7 bg-bg px-5 pt-2.5 pb-3 sm:px-7">
      <Team name={ours} health={me.health} mine align="left" />
      <div className="text-center leading-[0.9]">
        <small className="mb-0.5 flex items-center justify-center gap-3 font-display text-[0.8125rem] font-bold tracking-[0.18em] text-ink/60 uppercase">
          {match.phase === "buy" ? "Get ready" : `Round ${match.round} of ${room.totalRounds}`}
          <SoundToggle />
        </small>
        <b className="font-display text-[clamp(2.5rem,7vh,4rem)] font-extrabold tabular-nums">
          {match.phase === "buy" ? `${room.secondsLeft ?? 0}s` : clock(match.timeLeftSec)}
        </b>
      </div>
      <Team name={theirs} health={them.health} mine={false} align="right" />

      <div className="col-span-3 flex items-center gap-3.5">
        <span className="w-[4.5rem] font-display text-xl font-extrabold tabular-nums">{me.score.toLocaleString()}</span>
        <div className="relative h-3.5 flex-1 bg-line-strong" role="img" aria-label={me.score === them.score ? "Level" : me.score > them.score ? "You’re ahead" : "You’re behind"}>
          <i className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500 ease-out" style={{ width: `${share * 100}%` }} />
          <i className="absolute inset-y-[-3px] left-1/2 w-[3px] bg-paper" />
        </div>
        <span className="w-[4.5rem] text-right font-display text-xl font-extrabold tabular-nums opacity-70">{them.score.toLocaleString()}</span>
      </div>
    </header>
  );
}
