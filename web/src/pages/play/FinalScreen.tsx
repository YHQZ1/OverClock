import type { RoomView, Side } from "@server/types/contracts.js";
import { useEffect, useState } from "react";
import { TopBar } from "../../components/TopBar";
import { Button, Frame, Label, SPLIT, cx } from "../../components/ui";
import { useShortcut } from "../../hooks/useShortcut";

/** How long the result stays up before "What you actually built". */
export const REVEAL_AFTER_SEC = 8;

type Props = { room: RoomView; mySide: Side | null; onNext: () => void };

const n = (x: number) => x.toLocaleString();

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

  return (
    <Frame>
      <TopBar theme={room.theme} right={`${room.format ?? ""} · final`} />
      <main className={SPLIT}>
        <section className="flex min-w-0 flex-col">
          <div className="px-10 pt-[clamp(24px,5vh,56px)] pb-6">
            <Label>Match over</Label>
            <h1
              className={cx(
                "mt-2 text-[clamp(48px,10vh,96px)] leading-none font-semibold tracking-[-0.05em]",
                winner !== null && winner === mySide && "text-accent",
              )}
            >
              {headline}
            </h1>
            {!final.recorded && <p className="mt-3 text-muted">This match ended early, so it won’t go on the leaderboard.</p>}
          </div>

          <div className="grid flex-1 grid-cols-2 border-t border-line">
            {([1, 2] as const).map((side) => (
              <div key={side} className="px-10 py-6 not-first:border-l not-first:border-line">
                <Label>
                  {room.teamNames[side]}
                  {side === mySide && " (you)"}
                </Label>
                <p
                  className={cx(
                    "mt-1 text-[clamp(40px,8vh,72px)] leading-none font-semibold tracking-[-0.05em] tabular-nums",
                    winner === side ? "text-accent" : "text-muted",
                  )}
                >
                  {n(final.totals[side].total)}
                </p>
                <dl className="mt-5 grid max-w-[420px] border-t border-line text-sm">
                  {room.rounds.map((r) => (
                    <div key={r.round} className="flex justify-between border-b border-line py-2">
                      <dt className="text-muted">
                        Round {r.round}
                        {r.winner === side && <span className="ml-2 text-accent">won</span>}
                      </dt>
                      <dd className="font-semibold tabular-nums">{n(r.scores[side].total)}</dd>
                    </div>
                  ))}
                  {final.recorded && (
                    <div className="flex justify-between border-b border-line py-2">
                      <dt className="text-muted">Leaderboard points</dt>
                      <dd className="font-semibold tabular-nums text-accent">{n(final.points[side])}</dd>
                    </div>
                  )}
                  {final.recorded && (
                    <div className="flex justify-between py-2">
                      <dt className="text-muted">Place on the {room.format} board</dt>
                      <dd className="font-semibold tabular-nums">{final.ranks ? `#${final.ranks[side]}` : "…"}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4 border-l border-line px-8 py-7">
          {final.recorded && mySide && (
            <div className="flex flex-1 flex-col justify-center">
              <Label>Your place on the {room.format} leaderboard</Label>
              <p className="mt-2 text-[clamp(72px,16vh,140px)] leading-none font-semibold tracking-[-0.05em] text-accent tabular-nums">
                {final.ranks ? `#${final.ranks[mySide]}` : "…"}
              </p>
              <p className="mt-3 text-muted">Check the big screen to see who’s on top.</p>
            </div>
          )}
          <p className="text-sm text-muted">
            Leaderboard points count your score plus half of your opponent’s — beating a strong team is worth more.
          </p>
          <Button variant="primary" block onClick={onNext}>
            What you actually built <span className="font-normal tabular-nums opacity-70">in {left}s</span> <kbd>Enter</kbd>
          </Button>
        </aside>
      </main>
    </Frame>
  );
}
