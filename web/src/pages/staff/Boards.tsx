import type { Award, Awards, Format, LeaderboardEntry, Leaderboards } from "@server/types/contracts.js";
import { useEffect, useRef, useState } from "react";
import { cx } from "../../components/ui";
import { n } from "./LiveMatch";

const NEW_FOR_MS = 12_000;

/** Match ids that just appeared on a board, highlighted for a few seconds. */
function useNewEntries(rows: LeaderboardEntry[] | undefined): Set<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!rows) return;
    const ids = new Set(rows.map((r) => r.matchId));
    if (seen.current) {
      const added = [...ids].filter((id) => !seen.current!.has(id));
      if (added.length > 0) {
        setFresh(new Set(added));
        const t = setTimeout(() => setFresh(new Set()), NEW_FOR_MS);
        seen.current = ids;
        return () => clearTimeout(t);
      }
    }
    seen.current = ids;
  }, [rows]);
  return fresh;
}

export function Board({ format, boards }: { format: Format; boards: Leaderboards | null }) {
  const rows = boards?.[format];
  const fresh = useNewEntries(rows);
  return (
    <div className="flex min-h-0 flex-col px-[2.5vw] pt-[2.4vh] pb-[1.5vh]">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-[0.8vh]">
        <h2 className="font-display text-[7vh] leading-[0.85] font-extrabold uppercase">{format}</h2>
        <span className="font-display text-[2.4vh] font-bold tracking-[0.14em] text-muted uppercase">points</span>
      </div>
      {!rows ? (
        <p className="py-[1.5vh] font-display text-[2.6vh] font-bold text-faint uppercase">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-[2vh] font-display text-[3.4vh] font-bold tracking-[0.02em] text-faint uppercase">No {format} matches yet — be the first.</p>
      ) : (
        // Exactly 10 rows (the server's BOARD_SIZE) fit, whatever the projector's height.
        <ol className="grid min-h-0 flex-1 grid-rows-[repeat(10,minmax(0,1fr))]">
          {rows.map((r) => {
            const isNew = fresh.has(r.matchId);
            const first = r.rank === 1;
            return (
              <li
                key={`${r.matchId}-${r.side}`}
                className={cx(
                  "grid grid-cols-[5vw_minmax(0,1fr)_auto] items-center border-b-[3px] border-line-strong px-[0.8vw] font-display font-extrabold uppercase",
                  first ? "bg-accent text-on-accent" : r.rank <= 3 ? "text-ink" : "text-muted",
                  isNew && !first && "animate-flash bg-accent-dim text-accent",
                )}
              >
                <span className="text-[4vh] leading-none tabular-nums">{r.rank}</span>
                <span className="truncate text-[3.2vh] leading-none">
                  {r.team}
                  <span className={cx("ml-3 text-[2vh] font-bold tracking-[0.04em]", first ? "opacity-70" : "text-faint")}>vs {r.opponent}</span>
                  {isNew && <span className="ml-3 bg-bg px-[0.4vw] text-[1.8vh] tracking-[0.1em] text-ink">NEW</span>}
                </span>
                <span className="text-[3.6vh] leading-none tabular-nums">{n(r.points)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---------- awards ----------

const AWARDS: Record<keyof Awards, { title: string; block: string }> = {
  comeback: { title: "Comeback of the day", block: "bg-gdsc-yellow" },
  destroyer: { title: "Most destructive", block: "bg-gdsc-red" },
  unbreakable: { title: "Unbreakable", block: "bg-gdsc-blue" },
};

export function AwardsRow({ awards }: { awards: Awards | null }) {
  return (
    <div className="grid border-t-2 border-night-line sm:grid-cols-3">
      {(Object.keys(AWARDS) as (keyof Awards)[]).map((key) => (
        <AwardCard key={key} title={AWARDS[key].title} block={AWARDS[key].block} award={awards?.[key] ?? null} />
      ))}
    </div>
  );
}

function AwardCard({ title, block, award }: { title: string; block: string; award: Award | null }) {
  return (
    <div className={cx("min-w-0 border-night-line px-4 py-[1.6vh] text-bg not-first:border-t-2 sm:px-[1.4vw] sm:not-first:border-t-0 sm:not-first:border-l-2", award ? block : "bg-surface text-ink")}>
      <p className="font-display text-[2vh] font-extrabold tracking-[0.14em] uppercase opacity-80">{title}</p>
      <p className="mt-[0.2vh] truncate font-display text-[4.4vh] leading-none font-extrabold uppercase">{award ? award.team : "Up for grabs"}</p>
      <p className="line-clamp-2 font-display text-[2.2vh] leading-tight font-bold tracking-[0.02em] uppercase opacity-80">
        {award ? `${award.detail} (${award.format})` : "Play a match to claim it"}
      </p>
    </div>
  );
}
