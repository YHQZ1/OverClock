import type { ScreenMatch } from "@server/types/contracts.js";
import { useEffect, useState } from "react";
import { ClubFooter } from "../../components/ClubFooter";
import { cx } from "../../components/ui";
import { useShortcut } from "../../hooks/useShortcut";
import { ThemeLogo } from "../../themes/ThemeLogo";
import { THEME_INFO } from "../../themes/themes";
import { ROTATE_MS, advance, type Rotation } from "../../staff/rotation";
import { StaffGate } from "../../staff/StaffGate";
import type { StaffFeed } from "../../staff/useStaffFeed";
import { Featured, NoMatches, PHASE_LINE, clock, n } from "./LiveMatch";
import { ProjectorHeader } from "./ProjectorHeader";

/* /live — the spectator view for the projector. Every match in progress in
   the sidebar; the one on screen is highlighted and switches every 10s unless
   pinned. Click a match to show it now; P pins / unpins. */

export function LivePage() {
  return <StaffGate title="Live matches">{(feed) => <Live feed={feed} />}</StaffGate>;
}

function useRotation(matches: ScreenMatch[]) {
  const [rot, setRot] = useState<Rotation>({ featured: null, pinned: null, switchAt: 0 });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setRot((r) => advance(r, matches, now)), [matches, now]);
  return {
    ...rot,
    /** 1 → 0 over the current match's 10 seconds. */
    left: rot.pinned ? 1 : Math.max(0, Math.min(1, (rot.switchAt - now) / ROTATE_MS)),
    show: (code: string) => setRot({ featured: code, pinned: null, switchAt: Date.now() + ROTATE_MS }),
    togglePin: () => setRot((r) => (r.pinned ? { ...r, pinned: null, switchAt: Date.now() + ROTATE_MS } : { ...r, pinned: r.featured })),
  };
}

function Live({ feed }: { feed: StaffFeed }) {
  const rot = useRotation(feed.matches);
  const featured = feed.matches.find((m) => m.code === rot.featured) ?? null;
  useShortcut("p", rot.togglePin);
  const sorted = [...feed.matches].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="grid h-screen min-h-[600px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-bg">
      <ProjectorHeader title="Live" connected={feed.connected} />
      <div className="grid md:min-h-0 md:grid-cols-[minmax(16rem,23vw)_minmax(0,1fr)]">
        <aside className="flex max-h-[40vh] flex-col border-t-2 border-night-line md:max-h-none md:min-h-0 md:border-r-2">
          <div className="flex items-baseline justify-between px-[1.4vw] pt-[2vh] pb-[1.2vh]">
            <h2 className="font-display text-[3vh] leading-none font-extrabold tracking-[0.04em] uppercase">Matches</h2>
            <span className="font-display text-[2.2vh] font-bold tracking-[0.1em] text-muted uppercase">{feed.matches.length} live</span>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto border-t-2 border-night-line">
            {sorted.map((m, i) => (
              <SidebarMatch
                key={m.code}
                stripe={STRIPES[i % STRIPES.length] ?? ""}
                match={m}
                active={m.code === rot.featured}
                pinned={m.code === rot.pinned}
                left={rot.left}
                onClick={() => rot.show(m.code)}
              />
            ))}
            {sorted.length === 0 && <li className="px-[1.4vw] py-[2vh] font-display text-[2.4vh] font-bold tracking-[0.04em] text-muted uppercase">Waiting for the first match…</li>}
          </ul>
          <p className="border-t-2 border-night-line px-[1.4vw] py-[1.4vh] font-display text-[1.9vh] font-bold tracking-[0.06em] text-muted uppercase">
            Every 10s · click to show · <kbd>P</kbd> pin
          </p>
        </aside>

        <main className="flex min-h-0 flex-col">
          {featured ? (
            <Featured
              match={featured}
              action={
                <button
                  type="button"
                  onClick={rot.togglePin}
                  className={cx(
                    "cursor-pointer border-[3px] px-[1vw] py-[0.6vh] font-display text-[2.2vh] font-extrabold tracking-[0.06em] uppercase transition-colors",
                    rot.pinned
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line-strong text-muted hover:border-ink hover:text-ink",
                  )}
                >
                  {rot.pinned ? "Pinned · unpin" : "Pin"}
                </button>
              }
            />
          ) : (
            <NoMatches />
          )}
        </main>
      </div>
      <ClubFooter />
    </div>
  );
}

/** The coloured edge of each match in the sidebar — one GDSC colour in turn. */
const STRIPES = ["border-l-gdsc-blue", "border-l-gdsc-red", "border-l-gdsc-yellow", "border-l-gdsc-green"];

function SidebarMatch({
  match,
  stripe,
  active,
  pinned,
  left,
  onClick,
}: {
  match: ScreenMatch;
  stripe: string;
  active: boolean;
  pinned: boolean;
  left: number;
  onClick: () => void;
}) {
  const playing = match.sites !== null;
  const status = [
    match.theme ? THEME_INFO[match.theme].name : null,
    match.round > 0 ? `R${match.round}` : null,
    PHASE_LINE[match.phase],
    match.phase === "live" && match.secondsLeft !== null ? clock(match.secondsLeft) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const [a, b] = [match.teams[1], match.teams[2]];
  return (
    <li className="border-b-2 border-night-line">
      <button
        type="button"
        onClick={onClick}
        className={cx(
          "relative block w-full cursor-pointer border-l-[0.7vh] py-[1.6vh] pr-[1.4vw] pl-[1vw] text-left transition-colors",
          active ? "border-l-bg" : stripe,
          active ? "bg-accent text-on-accent" : "hover:bg-surface",
          !playing && !active && "opacity-60",
        )}
      >
        <div className="flex items-center gap-[0.8vw]">
          {match.theme && <ThemeLogo theme={match.theme} className="h-[2.6vh]" fallback="none" />}
          <span className="min-w-0 flex-1 truncate font-display text-[2.8vh] leading-none font-extrabold tracking-[0.02em] uppercase">
            {a.name} <span className="font-bold opacity-60">vs</span> {b.name}
          </span>
          {pinned && <span className="bg-bg px-[0.4vw] font-display text-[1.7vh] font-extrabold tracking-[0.1em] text-ink">PINNED</span>}
        </div>
        <div className="mt-[0.6vh] flex items-baseline justify-between gap-2">
          <span className={cx("truncate font-display text-[2vh] font-bold tracking-[0.04em] uppercase", active ? "opacity-80" : "text-muted")}>{status}</span>
          <span className="shrink-0 font-display text-[2.6vh] font-extrabold tabular-nums">
            {n(a.total)} – {n(b.total)}
          </span>
        </div>
        {active && !pinned && (
          <span
            className="absolute bottom-0 left-0 h-[0.6vh] bg-bg transition-[width] duration-300 ease-linear"
            style={{ width: `${left * 100}%` }}
          />
        )}
      </button>
    </li>
  );
}
