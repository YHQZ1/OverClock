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
      <main className="flex min-h-0 flex-col">
        <div className="flex items-end justify-between border-b border-line px-10 pt-[clamp(20px,5vh,48px)] pb-6">
          <div>
            <Label>Everyone votes · most votes wins · ties are random</Label>
            <h1 className="mt-2 text-[clamp(40px,7vh,64px)] leading-none font-semibold tracking-[-0.045em]">Pick the site</h1>
          </div>
          <div className="text-right">
            <p className="text-[clamp(40px,7vh,64px)] leading-none font-semibold tabular-nums">{room.secondsLeft ?? 0}</p>
            <Label>
              {voted} of {room.players.length} voted
            </Label>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-4">
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
                  "group relative flex cursor-pointer flex-col justify-between border-line px-8 py-8 text-left transition-colors not-first:border-l",
                  chosen ? "bg-accent-dim" : "hover:bg-surface",
                )}
              >
                <span className={cx("absolute inset-x-0 top-0 bg-accent transition-[height]", chosen ? "h-1" : "h-0.5 opacity-60")} aria-hidden />
                <div>
                  <div className="flex items-center justify-between">
                    <kbd>{info.key}</kbd>
                    {chosen && <span className="text-[13px] font-medium text-accent">Your vote</span>}
                  </div>
                  <div className="mt-8 flex h-12 items-center">
                    <ThemeLogo theme={id} className="h-full max-w-full" fallback="none" />
                  </div>
                  <h2 className="mt-5 text-[clamp(26px,4.4vh,36px)] leading-tight font-semibold tracking-[-0.03em]">{info.name}</h2>
                  <p className="mt-2 max-w-[34ch] text-[15px] leading-snug text-muted">{info.about}</p>
                  <p className="mt-4 text-[15px] font-medium text-accent">{info.blurb}</p>
                </div>
                <div>
                  <p className="text-[clamp(32px,6vh,52px)] leading-none font-semibold tabular-nums">{voters.length}</p>
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
