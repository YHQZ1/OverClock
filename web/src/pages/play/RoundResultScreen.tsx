import type { RoomView, Side, SiteScore } from "@server/types/contracts.js";
import { TopBar } from "../../components/TopBar";
import { Frame, Label, cx } from "../../components/ui";
import { capitalise, wordsFor } from "../../themes/themes";

const n = (x: number) => x.toLocaleString();

export function RoundResultScreen({ room, mySide }: { room: RoomView; mySide: Side | null }) {
  const last = room.rounds.at(-1);
  if (!last) return null;
  const isLast = last.round >= room.totalRounds;
  const headline =
    last.winner === null ? "It’s a draw" : last.winner === mySide ? "You won the round!" : `${room.teamNames[last.winner]} won the round`;

  return (
    <Frame>
      <TopBar theme={room.theme} right={`Round ${last.round} of ${room.totalRounds}`} />
      <main className="flex min-h-0 flex-col">
        <div className="flex items-end justify-between border-b border-line px-10 pt-[clamp(20px,5vh,48px)] pb-6">
          <div>
            <Label>Round {last.round} result</Label>
            <h1
              className={cx(
                "mt-2 text-[clamp(40px,8vh,72px)] leading-none font-semibold tracking-[-0.045em]",
                last.winner === mySide && "text-accent",
              )}
            >
              {headline}
            </h1>
          </div>
          <p className="pb-1 text-muted">
            {isLast ? "Final results" : `Round ${last.round + 1}`} in <span className="font-semibold text-ink tabular-nums">{room.secondsLeft ?? 0}s</span>
          </p>
        </div>

        <div className="grid flex-1 grid-cols-2">
          {([1, 2] as const).map((side) => (
            <TeamResult
              key={side}
              name={room.teamNames[side]}
              score={last.scores[side]}
              won={last.winner === side}
              you={side === mySide}
              visitors={capitalise(wordsFor(room.theme).visitors)}
            />
          ))}
        </div>

        <div className="border-t border-line px-10 py-4 text-sm text-muted">
          Scores so far —{" "}
          {([1, 2] as const)
            .map((side) => `${room.teamNames[side]}: ${n(room.rounds.reduce((sum, r) => sum + r.scores[side].total, 0))}`)
            .join(" · ")}
        </div>
      </main>
    </Frame>
  );
}

function TeamResult({ name, score, won, you, visitors }: { name: string; score: SiteScore; won: boolean; you: boolean; visitors: string }) {
  const rows: [string, string][] = [
    [`${visitors} served`, `+${n(score.served)}`],
    ["Turned away", `−${n(score.lostPenalty)}`],
    ["Attacks sent", String(score.attacksSent)],
    ["Attacks blocked", String(score.attacksBlocked)],
    ["Times the site went down", String(score.crashes)],
  ];
  return (
    <section className="px-10 py-8 not-first:border-l not-first:border-line">
      <Label>
        {name}
        {you && " (you)"}
      </Label>
      <p className={cx("mt-2 text-[clamp(48px,10vh,88px)] leading-none font-semibold tracking-[-0.05em] tabular-nums", won ? "text-accent" : "text-muted")}>
        {n(score.total)}
      </p>
      <dl className="mt-6 grid max-w-[440px] border-t border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-line py-2.5">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
