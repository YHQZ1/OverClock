import { ClubMark } from "../../components/ClubMark";
import type { RoomView, ThemeId } from "@server/types/contracts.js";
import { SoundToggle } from "../../audio/SoundToggle";
import { cx } from "../../components/ui";
import { useShortcuts } from "../../hooks/useShortcut";
import { voteTheme } from "../../socket/api";
import { ThemeLogo } from "../../themes/ThemeLogo";
import { THEME_IDS, THEME_INFO } from "../../themes/themes";
import type { CSSProperties } from "react";

/**
 * Pick the app: a wall of four posters, each in the app's own colours, with the
 * moment everyone opened it at once as the hero. Votes raise the panel from the
 * bottom; yours is stamped.
 */
export function VoteScreen({ room, playerId }: { room: RoomView; playerId: string }) {
  const mine = room.votes[playerId];
  const vote = (theme: ThemeId) => void voteTheme(theme);
  useShortcuts(Object.fromEntries(THEME_IDS.map((id) => [THEME_INFO[id].key, () => vote(id)])));

  const voters = new Map<ThemeId, string[]>();
  for (const [pid, theme] of Object.entries(room.votes)) {
    const name = room.players.find((p) => p.id === pid)?.name ?? "?";
    voters.set(theme, [...(voters.get(theme) ?? []), name]);
  }
  const voted = Object.keys(room.votes).length;

  return (
    <div className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)] bg-bg">
      <header className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-6 px-6 pt-4 pb-3.5 sm:px-8">
        <div className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[0.06em] uppercase">
          <ClubMark />
          Overclock
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3.8vh,2.5rem)] leading-none font-extrabold tracking-[0.01em] uppercase">
          Pick the app
          <span className="ml-3.5 hidden text-[0.45em] font-medium tracking-normal text-ink/45 normal-case md:inline">most votes wins · ties are random</span>
        </h1>
        <div className="flex items-baseline justify-end gap-5">
          <span className="hidden text-[0.8125rem] text-muted sm:inline">
            {voted} of {room.players.length} voted
          </span>
          <b className="font-display text-[clamp(1.75rem,3.8vh,2.5rem)] leading-none font-extrabold tabular-nums">0:{String(room.secondsLeft ?? 0).padStart(2, "0")}</b>
          <SoundToggle />
        </div>
      </header>

      <main className="poster-wall flex min-h-0">
        {THEME_IDS.map((id) => {
          const info = THEME_INFO[id];
          const p = info.poster;
          const who = voters.get(id) ?? [];
          const style = {
            "--c": p.bg,
            "--fg": p.fg,
            "--deep": p.deep,
            "--timec": p.timeColor ?? p.fg,
            "--share": voted ? who.length / Math.max(1, room.players.length) : 0,
          } as CSSProperties;
          return (
            <button
              key={id}
              type="button"
              onClick={() => vote(id)}
              style={style}
              data-mine={mine === id ? "" : undefined}
              className={cx("poster", `motif-${p.motif}`)}
              aria-pressed={mine === id}
            >
              <span className="poster-fill" />
              <span className="poster-top">
                <span className="poster-key">{info.key}</span>
                <span className="poster-cat">{info.category}</span>
              </span>
              <span className="poster-body">
                <span className="poster-time">
                  <span>{p.time[0]}</span>
                  <span className={p.time[1].length > 2 ? "sub" : undefined}>{p.time[1]}</span>
                </span>
                <span className="poster-rush">
                  <small>People arriving</small>
                  <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden>
                    <polyline points={p.rush} />
                  </svg>
                </span>
                <span className="poster-who">
                  <span className={cx("poster-tag", info.logoStyle === "tile" && "tile")}>
                    <ThemeLogo theme={id} className="max-h-full max-w-full" textColor={p.bg} textClassName="font-display text-center text-[1.25rem] font-extrabold" />
                  </span>
                  <span className="poster-name">{info.name}</span>
                </span>
                <span className="poster-moment">{p.moment}</span>
              </span>
              <span className="poster-bottom">
                <span className="poster-count">{who.length}</span>
                <span className="poster-voters">
                  {who.map((n) => (
                    <span key={n} className="block">
                      {n}
                    </span>
                  ))}
                </span>
              </span>
              <span className="poster-stamp">Your vote</span>
            </button>
          );
        })}
      </main>
    </div>
  );
}
