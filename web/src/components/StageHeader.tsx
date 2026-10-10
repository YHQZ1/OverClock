import type { ReactNode } from "react";
import { SoundToggle } from "../audio/SoundToggle";
import { ClubMark } from "./ClubMark";

/** The strip every screen shares: club logo + wordmark · what this screen is · sound. */
export function StageHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 bg-bg px-6 py-3 sm:px-8">
      <div className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[0.06em] uppercase">
        <ClubMark />
        <span className="h-5 w-0.5 bg-line-strong" aria-hidden />
        Overclock
      </div>
      <h1 className="font-display text-[clamp(1.5rem,3.4vh,2.25rem)] leading-none font-extrabold tracking-[0.01em] uppercase">{title}</h1>
      <div className="flex items-center justify-end gap-5">
        {right && <span className="hidden font-display text-base font-bold tracking-[0.14em] text-ink/60 uppercase md:inline">{right}</span>}
        <SoundToggle />
      </div>
    </header>
  );
}
