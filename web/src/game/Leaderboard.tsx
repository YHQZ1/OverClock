import type { Format, Leaderboards } from "@server/types/contracts.js";
import { useEffect } from "react";
import { cx } from "../components/ui";
import { useGameStore } from "../store/game";

/** Load the boards once if the server hasn't pushed them yet; live updates arrive over the socket. */
export function useBoards(): Leaderboards | null {
  const boards = useGameStore((s) => s.boards);
  useEffect(() => {
    if (useGameStore.getState().boards) return;
    const ctrl = new AbortController();
    fetch("/api/leaderboard", { signal: ctrl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<Leaderboards>) : null))
      .then((b) => b && !useGameStore.getState().boards && useGameStore.getState().setBoards(b))
      .catch(() => {}); // the board is a bonus — the socket update will fill it in
    return () => ctrl.abort();
  }, []);
  return boards;
}

type Props = {
  format: Format;
  /** Rows from this match are highlighted; `mine` marks the player's own team. */
  matchId?: string;
  mine?: { side: number; rank: number | null; team: string; points: number } | null;
  className?: string;
};

const n = (x: number) => x.toLocaleString();

export function Leaderboard({ format, matchId, mine, className }: Props) {
  const boards = useBoards();
  const rows = boards?.[format] ?? [];
  const shown = rows.some((r) => r.matchId === matchId && r.side === mine?.side);

  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <span className="text-sm font-semibold">Leaderboard · {format}</span>
        <span className="text-xs text-faint">points</span>
      </div>
      {boards === null ? (
        <p className="py-3 text-sm text-faint">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-3 text-sm text-faint">No matches yet — be the first.</p>
      ) : (
        <ol className="min-h-0 overflow-hidden">
          {rows.map((r) => {
            const ours = r.matchId === matchId && r.side === mine?.side;
            const theirs = r.matchId === matchId && !ours;
            return (
              <li
                key={`${r.matchId}-${r.side}`}
                className={cx(
                  "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline border-b border-line py-1.5 text-sm",
                  ours && "bg-accent-dim text-accent",
                  theirs && "text-ink",
                  !ours && !theirs && "text-muted",
                )}
              >
                <span className="pl-1 tabular-nums">{r.rank}</span>
                <span className="truncate">
                  {r.team}
                  {ours && <span className="ml-2 text-xs">you</span>}
                </span>
                <span className="pr-1 font-semibold tabular-nums">{n(r.points)}</span>
              </li>
            );
          })}
          {mine && mine.rank !== null && !shown && (
            <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline border-b border-line bg-accent-dim py-1.5 text-sm text-accent">
              <span className="pl-1 tabular-nums">{mine.rank}</span>
              <span className="truncate">
                {mine.team} <span className="ml-1 text-xs">you</span>
              </span>
              <span className="pr-1 font-semibold tabular-nums">{n(mine.points)}</span>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
