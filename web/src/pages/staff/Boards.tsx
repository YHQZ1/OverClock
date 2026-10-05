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
    <div className="flex min-h-0 flex-col px-[2.5vw] pt-[3vh] pb-[1.5vh]">
      <div className="flex items-baseline justify-between border-b border-line pb-[0.8vh]">
        <h2 className="text-[3.4vh] font-semibold tracking-[-0.03em]">{format}</h2>
        <span className="text-[1.8vh] text-faint">points</span>
      </div>
      {!rows ? (
        <p className="py-[1.5vh] text-[1.9vh] text-faint">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-[2vh] text-[2.4vh] text-faint">No {format} matches yet — be the first.</p>
      ) : (
        // Exactly 10 rows (the server's BOARD_SIZE) fit, whatever the projector's height.
        <ol className="grid min-h-0 flex-1 grid-rows-[repeat(10,minmax(0,1fr))]">
          {rows.map((r) => {
            const isNew = fresh.has(r.matchId);
            return (
              <li
                key={`${r.matchId}-${r.side}`}
                className={cx(
                  "grid grid-cols-[4vw_minmax(0,1fr)_auto] items-center border-b border-line px-[0.6vw] text-[2.5vh]",
                  r.rank === 1 ? "text-ink" : "text-muted",
                  isNew && "animate-flash bg-accent-dim text-accent",
                )}
              >
                <span className={cx("tabular-nums", r.rank === 1 && "font-semibold text-accent")}>{r.rank}</span>
                <span className="truncate">
                  <span className={cx(r.rank <= 3 && "font-medium text-ink", isNew && "text-accent")}>{r.team}</span>
                  <span className="ml-3 text-[1.9vh] text-faint">vs {r.opponent}</span>
                  {isNew && <span className="ml-2 text-[1.4vh] font-semibold">NEW</span>}
                </span>
                <span className="font-semibold tabular-nums">{n(r.points)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---------- awards ----------

const AWARD_TITLES: Record<keyof Awards, string> = {
  comeback: "Comeback of the day",
  destroyer: "Most destructive",
  unbreakable: "Unbreakable",
};

export function AwardsRow({ awards }: { awards: Awards | null }) {
  return (
    <div className="grid border-t border-line sm:grid-cols-3">
      {(Object.keys(AWARD_TITLES) as (keyof Awards)[]).map((key) => (
        <AwardCard key={key} title={AWARD_TITLES[key]} award={awards?.[key] ?? null} />
      ))}
    </div>
  );
}

function AwardCard({ title, award }: { title: string; award: Award | null }) {
  return (
    <div className="min-w-0 border-line px-4 py-[1.6vh] not-first:border-t sm:px-[1.2vw] sm:not-first:border-t-0 sm:not-first:border-l">
      <p className="text-[1.5vh] text-faint">{title}</p>
      <p className={cx("mt-[0.4vh] truncate text-[2.1vh] font-semibold", award ? "text-accent" : "text-faint")}>
        {award ? award.team : "Up for grabs"}
      </p>
      <p className="line-clamp-2 text-[1.5vh] leading-snug text-muted">
        {award ? `${award.detail} (${award.format})` : "Play a match to claim it"}
      </p>
    </div>
  );
}
