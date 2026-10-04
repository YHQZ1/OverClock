import type { RoomView, Side } from "@server/types/contracts.js";
import { useState } from "react";
import { TopBar } from "../../components/TopBar";
import { Button, Frame, Label, SPLIT, cx } from "../../components/ui";
import { Leaderboard } from "../../game/Leaderboard";
import { useShortcut } from "../../hooks/useShortcut";

type Props = { room: RoomView; mySide: Side | null; onDone: () => Promise<void> };

const n = (x: number) => x.toLocaleString();

export function FinalScreen({ room, mySide, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const final = room.final;
  const done = () => {
    if (leaving) return;
    setLeaving(true);
    void onDone();
  };
  useShortcut("Enter", done);
  if (!final) return null;

  const winner = final.winner;
  const headline = final.endedEarly
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
          {room.format && (
            <Leaderboard
              className="flex-1"
              format={room.format}
              matchId={final.recorded ? final.matchId : undefined}
              mine={
                final.recorded && mySide
                  ? { side: mySide, rank: final.ranks?.[mySide] ?? null, team: room.teamNames[mySide], points: Math.round(final.points[mySide]) }
                  : null
              }
            />
          )}
          <p className="text-sm text-muted">
            Leaderboard points count your score plus half of your opponent’s — beating a strong team is worth more.
          </p>
          <p className="text-sm text-muted">Thanks for playing! This PC goes back to the start for the next players.</p>
          <Button variant="primary" block disabled={leaving} onClick={done}>
            Done — next players <kbd>Enter</kbd>
          </Button>
        </aside>
      </main>
    </Frame>
  );
}
