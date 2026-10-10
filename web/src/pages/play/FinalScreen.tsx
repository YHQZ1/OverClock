import type { RoomView, Side } from "@server/types/contracts.js";
import { useEffect, useState } from "react";
import { Button, cx } from "../../components/ui";
import { StageHeader } from "../../components/StageHeader";
import { useShortcut } from "../../hooks/useShortcut";
import { THEME_INFO, posterVars } from "../../themes/themes";

/** How long the result stays up before "What you actually built". */
export const REVEAL_AFTER_SEC = 8;

type Props = { room: RoomView; mySide: Side | null; onNext: () => void };

const n = (x: number) => x.toLocaleString();

/** The match result: the winner huge, in the app's colour, and where you landed on the board. */
export function FinalScreen({ room, mySide, onNext }: Props) {
  const final = room.final;
  const [left, setLeft] = useState(REVEAL_AFTER_SEC);
  useEffect(() => {
    if (left <= 0) return onNext();
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onNext]);
  useShortcut("Enter", onNext);
  if (!final) return null;

  const winner = final.winner;
  const headline = final.endedEarly?.reason === "admin"
    ? "The organisers ended this match"
    : final.endedEarly
      ? final.endedEarly.side === mySide
        ? "Your team left the match"
        : `${room.teamNames[final.endedEarly.side]} left the match`
      : winner === null
        ? "It’s a draw!"
        : winner === mySide
          ? "You win!"
          : `${room.teamNames[winner]} won the match`;
  const motif = THEME_INFO[room.theme ?? "bookmyshow"].poster.motif;

  return (
    <div className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)_auto] bg-bg">
      <StageHeader title="Match over" right={`${room.format ?? ""} · final`} />

      <main style={posterVars(room.theme)} className={cx("relative grid min-h-0 content-center overflow-hidden px-6 py-[2vh] sm:px-[6vw] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-[4vw]", `motif-${motif}`)}>
        <div className="relative min-w-0">
          <h2 className="font-display text-[clamp(3.5rem,13vh,8.5rem)] leading-[0.84] font-extrabold uppercase">{headline}</h2>
          {!final.recorded && <p className="mt-3 font-medium">This match ended early, so it won’t go on the leaderboard.</p>}

          <div className="mt-[3vh] grid gap-x-[3vw] gap-y-5 sm:grid-cols-2">
            {([1, 2] as const).map((side) => (
              <section key={side} className={cx(winner !== side && winner !== null && "opacity-65")}>
                <p className="font-display text-[1.375rem] font-extrabold tracking-[0.1em] uppercase">
                  {room.teamNames[side]}
                  {side === mySide && <span className="ml-2 opacity-70">(you)</span>}
                </p>
                <p className="font-display text-[clamp(3rem,10vh,6rem)] leading-[0.85] font-extrabold tabular-nums">{n(final.totals[side].total)}</p>
                <dl className="mt-3 grid border-t-[3px] border-current">
                  {room.rounds.map((r) => (
                    <div key={r.round} className="flex justify-between border-b-[3px] border-current/30 py-1.5 font-display text-xl font-bold tracking-[0.02em] uppercase">
                      <dt className="opacity-80">
                        Round {r.round}
                        {r.winner === side && <span className="ml-2 bg-bg px-1.5 text-base text-ink">won</span>}
                      </dt>
                      <dd className="tabular-nums">{n(r.scores[side].total)}</dd>
                    </div>
                  ))}
                  {final.recorded && (
                    <div className="flex justify-between border-b-[3px] border-current/30 py-1.5 font-display text-xl font-bold tracking-[0.02em] uppercase">
                      <dt className="opacity-80">Leaderboard points</dt>
                      <dd className="tabular-nums">{n(final.points[side])}</dd>
                    </div>
                  )}
                </dl>
              </section>
            ))}
          </div>
        </div>

        {final.recorded && mySide && (
          <aside className="relative mt-[3vh] border-t-[3px] border-current pt-[2vh] lg:mt-0 lg:border-t-0 lg:border-l-[3px] lg:pt-0 lg:pl-[3vw]">
            <p className="font-display text-[1.125rem] font-extrabold tracking-[0.14em] uppercase opacity-80">Your place on the {room.format} leaderboard</p>
            <p className="font-display text-[clamp(5rem,22vh,13rem)] leading-[0.8] font-extrabold tabular-nums">{final.ranks ? `#${final.ranks[mySide]}` : "…"}</p>
            <p className="mt-3 max-w-[28ch] font-medium">Check the big screen to see who’s on top.</p>
            <p className="mt-4 max-w-[34ch] text-sm font-medium opacity-80">
              Leaderboard points count your score plus half of your opponent’s — beating a strong team is worth more.
            </p>
          </aside>
        )}
      </main>

      <footer className="flex items-center justify-end bg-bg px-6 py-3 sm:px-8">
        <Button variant="primary" className="w-full sm:w-[28rem]" onClick={onNext}>
          What you actually built <span className="font-normal tabular-nums opacity-70">in {left}s</span> <kbd>Enter</kbd>
        </Button>
      </footer>
    </div>
  );
}
