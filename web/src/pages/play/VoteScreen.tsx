import type { RoomView, ThemeId } from "@server/types/contracts.js";
import { TopBar } from "../../components/TopBar";
import { Frame, Label, cx } from "../../components/ui";
import { useShortcuts } from "../../hooks/useShortcut";
import { voteTheme } from "../../socket/api";
import { ThemeLogo } from "../../themes/ThemeLogo";
import { THEME_IDS, THEME_INFO, accentVars } from "../../themes/themes";

export function VoteScreen({ room, playerId }: { room: RoomView; playerId: string }) {
  const mine = room.votes[playerId];
  const vote = (theme: ThemeId) => void voteTheme(theme);
  useShortcuts(Object.fromEntries(THEME_IDS.map((id) => [THEME_INFO[id].key, () => vote(id)])));

  const counts = new Map<ThemeId, string[]>();
  for (const [pid, theme] of Object.entries(room.votes)) {
    const name = room.players.find((p) => p.id === pid)?.name ?? "?";
    counts.set(theme, [...(counts.get(theme) ?? []), name]);
  }
  const voted = Object.keys(room.votes).length;

  return (
    <Frame>
      <TopBar right={`${room.teamNames[1]} vs ${room.teamNames[2]}`} />
      <main className="flex flex-col lg:min-h-0">
        <div className="flex items-end justify-between border-b border-line px-4 sm:px-6 lg:px-10 pt-[clamp(1.25rem,5vh,3rem)] pb-6">
          <div>
            <Label>Everyone votes · most votes wins · ties are random</Label>
            <h1 className="mt-2 text-[clamp(2.5rem,7vh,4rem)] leading-none font-semibold tracking-[-0.045em]">Pick the site</h1>
          </div>
          <div className="text-right">
            <p className="text-[clamp(2.5rem,7vh,4rem)] leading-none font-semibold tabular-nums">{room.secondsLeft ?? 0}</p>
            <Label>
              {voted} of {room.players.length} voted
            </Label>
          </div>
        </div>

        <div className="grid flex-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {THEME_IDS.map((id) => {
            const info = THEME_INFO[id];
            const voters = counts.get(id) ?? [];
            const chosen = mine === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => vote(id)}
                style={accentVars(id)}
                className={cx(
                  "group relative flex cursor-pointer flex-col justify-between gap-6 px-4 py-8 text-left transition-colors sm:px-6 lg:px-8",
                  chosen ? "bg-bg" : "bg-bg hover:bg-surface",
                )}
              >
                {chosen && <span className="absolute inset-0 bg-accent-dim" aria-hidden />}
                <span className={cx("absolute inset-x-0 top-0 bg-accent transition-[height]", chosen ? "h-1" : "h-0.5 opacity-60")} aria-hidden />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <kbd>{info.key}</kbd>
                    {chosen && <span className="text-[0.8125rem] font-medium text-accent">Your vote</span>}
                  </div>
                  <div className="mt-8 flex h-12 items-center">
                    <ThemeLogo theme={id} className="h-full max-w-full" fallback="none" />
                  </div>
                  <h2 className="mt-5 text-[clamp(1.625rem,4.4vh,2.25rem)] leading-tight font-semibold tracking-[-0.03em]">{info.name}</h2>
                  <p className="mt-2 max-w-[34ch] text-[0.9375rem] leading-snug text-muted">{info.about}</p>
                  <p className="mt-4 text-[0.9375rem] font-medium text-accent">{info.blurb}</p>
                </div>
                <div className="relative">
                  <p className="text-[clamp(2rem,6vh,3.25rem)] leading-none font-semibold tabular-nums">{voters.length}</p>
                  <p className="mt-2 min-h-5 truncate text-sm text-faint">{voters.join(", ") || "No votes yet"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </Frame>
  );
}
