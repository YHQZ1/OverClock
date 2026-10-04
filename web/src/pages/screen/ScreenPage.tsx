import type { Award, Awards, Format, LeaderboardEntry, Leaderboards, ScreenMatch, Side } from "@server/types/contracts.js";
import { useEffect, useRef, useState } from "react";
import { cx } from "../../components/ui";
import { LiveMap } from "../../game/LiveMap";
import { ThemeLogo } from "../../themes/ThemeLogo";
import { THEME_INFO, accentVars, capitalise, wordsFor } from "../../themes/themes";
import { useScreenFeed } from "./useScreenFeed";

/* The big screen on the projector: the match in progress (rotating), both
   leaderboards and the fun awards. No buttons — it runs itself and
   reconnects on its own. Sized in vh so it reads from across the room. */

const ROTATE_MS = 20_000;
const NEW_FOR_MS = 12_000;
const n = (x: number) => x.toLocaleString("en-IN");
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function ScreenPage() {
  const feed = useScreenFeed();
  const featured = useFeatured(feed.matches);

  return (
    <div className="grid h-screen min-h-[600px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <header className="flex h-[7vh] min-h-12 items-center justify-between border-b border-line px-[2.5vw]">
        <div className="flex items-center gap-3 text-[2.4vh] font-semibold tracking-[-0.01em]">
          <span className="size-[1.4vh] bg-accent" aria-hidden />
          Overclock
          <span className="font-normal text-muted">· SymbiTech</span>
        </div>
        <div className="flex items-center gap-8 text-[1.9vh] text-muted">
          <span>
            Flood theirs. Keep yours <span className="text-accent">alive.</span> Play at any PC.
          </span>
          <span className={cx("flex items-center gap-2", feed.connected ? "text-muted" : "text-bad")}>
            <span className={cx("size-[1vh]", feed.connected ? "bg-ok" : "animate-blink bg-bad")} aria-hidden />
            {feed.connected ? `${feed.matches.length} ${feed.matches.length === 1 ? "match" : "matches"} live` : "Reconnecting…"}
          </span>
        </div>
      </header>

      <main className="grid min-h-0 grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col">
          {featured ? <Featured match={featured} /> : <NoMatches />}
          <OtherMatches matches={feed.matches} featured={featured?.code} />
        </section>
        <aside className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto] border-l border-line">
          <Board format="1v1" boards={feed.boards} />
          <Board format="2v2" boards={feed.boards} />
          <AwardsRow awards={feed.awards} />
        </aside>
      </main>
    </div>
  );
}

// ---------- featured match ----------

/** Rotate through matches with a round in play; stay put while there's only one. */
function useFeatured(matches: ScreenMatch[]): ScreenMatch | null {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, []);
  const playing = matches.filter((m) => m.sites !== null);
  const pool = playing.length > 0 ? playing : matches;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => a.code.localeCompare(b.code))[index % pool.length]!;
}

const PHASE_LINE: Record<ScreenMatch["phase"], string> = {
  vote: "Picking the site",
  buy: "Buy phase",
  live: "Live",
  roundResult: "Round over",
};

function Featured({ match }: { match: ScreenMatch }) {
  const words = wordsFor(match.theme);
  const labels = { crowd: capitalise(words.visitors), ...words.parts };
  const leader = match.teams[1].total === match.teams[2].total ? null : match.teams[1].total > match.teams[2].total ? 1 : 2;

  return (
    <div
      key={match.code}
      className="flex min-h-0 flex-1 animate-rise-in flex-col"
      style={match.theme ? accentVars(match.theme) : undefined}
    >
      <div className="flex items-center justify-between border-b border-line px-[2.5vw] py-[1.6vh]">
        <div className="flex items-center gap-4">
          {match.theme && <ThemeLogo theme={match.theme} className="h-[4vh]" fallback="none" />}
          <div>
            <p className="text-[2.6vh] font-semibold text-accent">{match.theme ? THEME_INFO[match.theme].name : "Overclock"}</p>
            <p className="text-[1.7vh] text-muted">
              {match.format} · room {match.code}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[1.7vh] text-muted">
            {match.round > 0 ? `Round ${match.round} of ${match.totalRounds} · ` : ""}
            {PHASE_LINE[match.phase]}
          </p>
          <p className="text-[5vh] leading-none font-semibold tabular-nums">
            {match.secondsLeft !== null ? clock(match.secondsLeft) : "—"}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2">
        {([1, 2] as const).map((side) => (
          <TeamPanel key={side} match={match} side={side} leading={leader === side} labels={labels} />
        ))}
      </div>
    </div>
  );
}

function TeamPanel({
  match,
  side,
  leading,
  labels,
}: {
  match: ScreenMatch;
  side: Side;
  leading: boolean;
  labels: Parameters<typeof LiveMap>[0]["labels"];
}) {
  const team = match.teams[side];
  const site = match.sites?.[side];
  const health = site?.health ?? null;
  const players = team.players.join(" · ");
  return (
    <div className="grid min-h-0 min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] items-center gap-[2vw] px-[2.5vw] py-[1.5vh] not-first:border-t not-first:border-line">
      <div className="min-w-0">
        <p className="truncate text-[3.4vh] font-semibold tracking-[-0.02em]">{team.name}</p>
        {players !== team.name && <p className="truncate text-[1.7vh] text-muted">{players}</p>}
        <div className="mt-[1.2vh] flex items-baseline gap-4">
          <span
            className={cx("text-[7vh] leading-none font-semibold tracking-[-0.05em] tabular-nums", leading ? "text-accent" : "text-ink")}
          >
            {n(team.total)}
          </span>
          <span className={cx("text-[1.8vh] whitespace-nowrap", team.roundsWon > 0 ? "text-accent" : "text-faint")}>
            {team.roundsWon} of {match.totalRounds} rounds won
          </span>
        </div>
        <div className="mt-[1.4vh]">
          <div className="flex justify-between text-[1.6vh] text-muted">
            <span>Health</span>
            <span className={cx("tabular-nums", site?.downSecondsLeft != null && "font-semibold text-bad")}>
              {site?.downSecondsLeft != null ? `DOWN · back in ${site.downSecondsLeft}s` : health !== null ? health : "—"}
            </span>
          </div>
          <div className="mt-1 h-[0.8vh] bg-line">
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
      <div className="grid h-full min-h-0 place-items-center">
        {site ? <LiveMap site={site} labels={labels} /> : <p className="text-[2vh] text-faint">Next round soon…</p>}
      </div>
    </div>
  );
}

function NoMatches() {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-3 text-center">
      <p className="text-[6vh] font-semibold tracking-[-0.04em]">No matches right now</p>
      <p className="text-[2.4vh] text-muted">Grab a PC, make a room and challenge someone.</p>
    </div>
  );
}

function OtherMatches({ matches, featured }: { matches: ScreenMatch[]; featured: string | undefined }) {
  const others = matches.filter((m) => m.code !== featured);
  if (others.length === 0) return null;
  return (
    <div className="flex gap-[1.5vw] overflow-hidden border-t border-line px-[2.5vw] py-[1.4vh] text-[1.7vh]">
      <span className="shrink-0 text-faint">Also playing</span>
      {others.map((m) => (
        <span key={m.code} className="shrink-0 truncate text-muted">
          <span className="text-ink">{m.teams[1].name}</span> vs <span className="text-ink">{m.teams[2].name}</span>
          {m.theme ? ` · ${THEME_INFO[m.theme].name}` : ""} · R{m.round || 1}
        </span>
      ))}
    </div>
  );
}

// ---------- leaderboards ----------

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

function Board({ format, boards }: { format: Format; boards: Leaderboards | null }) {
  const rows = boards?.[format];
  const fresh = useNewEntries(rows);
  return (
    <div className="flex min-h-0 flex-col px-[2vw] pt-[2vh] pb-[1vh] not-first:border-t not-first:border-line">
      <div className="flex items-baseline justify-between border-b border-line pb-[0.8vh]">
        <h2 className="text-[2.6vh] font-semibold tracking-[-0.02em]">Leaderboard · {format}</h2>
        <span className="text-[1.5vh] text-faint">points</span>
      </div>
      {!rows ? (
        <p className="py-[1.5vh] text-[1.9vh] text-faint">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-[1.5vh] text-[1.9vh] text-faint">No {format} matches yet — be the first.</p>
      ) : (
        // Exactly 10 rows (the server's BOARD_SIZE) fit, whatever the projector's height.
        <ol className="grid min-h-0 flex-1 grid-rows-[repeat(10,minmax(0,1fr))]">
          {rows.map((r) => {
            const isNew = fresh.has(r.matchId);
            return (
              <li
                key={`${r.matchId}-${r.side}`}
                className={cx(
                  "grid grid-cols-[3.2vw_minmax(0,1fr)_auto] items-center border-b border-line text-[1.85vh]",
                  r.rank === 1 ? "text-ink" : "text-muted",
                  isNew && "animate-flash bg-accent-dim text-accent",
                )}
              >
                <span className={cx("tabular-nums", r.rank === 1 && "font-semibold text-accent")}>{r.rank}</span>
                <span className="truncate">
                  <span className={cx(r.rank <= 3 && "font-medium text-ink", isNew && "text-accent")}>{r.team}</span>
                  <span className="ml-2 text-[1.5vh] text-faint">vs {r.opponent}</span>
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

function AwardsRow({ awards }: { awards: Awards | null }) {
  return (
    <div className="grid grid-cols-3 border-t border-line">
      {(Object.keys(AWARD_TITLES) as (keyof Awards)[]).map((key) => (
        <AwardCard key={key} title={AWARD_TITLES[key]} award={awards?.[key] ?? null} />
      ))}
    </div>
  );
}

function AwardCard({ title, award }: { title: string; award: Award | null }) {
  return (
    <div className="min-w-0 px-[1.2vw] py-[1.6vh] not-first:border-l not-first:border-line">
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
