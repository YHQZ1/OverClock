import type { RoomView, Side, SiteScore } from "@server/types/contracts.js";
import { StageHeader } from "../../components/StageHeader";
import { cx } from "../../components/ui";
import { THEME_INFO, capitalise, posterVars, wordsFor } from "../../themes/themes";

const n = (x: number) => x.toLocaleString();

/** Between rounds: who won it, in the app's colour, with what each team did. */
export function RoundResultScreen({ room, mySide }: { room: RoomView; mySide: Side | null }) {
  const last = room.rounds.at(-1);
  if (!last) return null;
  const isLast = last.round >= room.totalRounds;
  const headline =
    last.winner === null ? "It’s a draw" : last.winner === mySide ? "You won the round!" : `${room.teamNames[last.winner]} won the round`;
  const motif = THEME_INFO[room.theme ?? "bookmyshow"].poster.motif;

  return (
    <div className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)_auto] bg-bg">
      <StageHeader title={`Round ${last.round} of ${room.totalRounds}`} right={`${isLast ? "Final results" : `Round ${last.round + 1}`} in ${room.secondsLeft ?? 0}s`} />

      <main style={posterVars(room.theme)} className={cx("relative grid min-h-0 content-center overflow-hidden px-6 py-[2vh] sm:px-[6vw]", `motif-${motif}`)}>
        <h2 className="relative font-display text-[clamp(3rem,11vh,7rem)] leading-[0.86] font-extrabold uppercase">{headline}</h2>
        <div className="relative mt-[3vh] grid gap-x-[4vw] gap-y-6 sm:grid-cols-2">
          {([1, 2] as const).map((side) => (
            <TeamResult
              key={side}
              name={room.teamNames[side]}
              score={last.scores[side]}
              won={last.winner === side}
              lost={last.winner !== null && last.winner !== side}
              you={side === mySide}
              visitors={capitalise(wordsFor(room.theme).visitors)}
            />
          ))}
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 bg-bg px-6 py-3 sm:px-8">
        <p className="font-display text-xl font-bold tracking-[0.04em] uppercase">
          Scores so far —{" "}
          {([1, 2] as const)
            .map((side) => `${room.teamNames[side]}: ${n(room.rounds.reduce((sum, r) => sum + r.scores[side].total, 0))}`)
            .join(" · ")}
        </p>
      </footer>
    </div>
  );
}

function TeamResult({ name, score, won, lost, you, visitors }: { name: string; score: SiteScore; won: boolean; lost: boolean; you: boolean; visitors: string }) {
  const rows: [string, string][] = [
    [`${visitors} served`, `+${n(score.served)}`],
    ["Turned away", `−${n(score.lostPenalty)}`],
    ["Attacks sent", String(score.attacksSent)],
    ["Attacks blocked", String(score.attacksBlocked)],
    ["Times the site went down", String(score.crashes)],
  ];
  return (
    <section className={cx(lost && "opacity-65")}>
      <p className="flex items-center gap-3 font-display text-[1.375rem] font-extrabold tracking-[0.1em] uppercase">
        {name}
        {you && <span className="opacity-70">(you)</span>}
        {won && <span className="bg-bg px-2 py-0.5 text-base tracking-[0.12em] text-ink">Won</span>}
      </p>
      <p className="font-display text-[clamp(3.5rem,13vh,8rem)] leading-[0.85] font-extrabold tabular-nums">{n(score.total)}</p>
      <dl className="mt-3 grid border-t-[3px] border-current">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b-[3px] border-current/30 py-1.5 font-display text-xl font-bold tracking-[0.02em] uppercase">
            <dt className="opacity-80">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
