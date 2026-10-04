import type { ReactNode } from "react";
import { SoundToggle } from "../audio/SoundToggle";

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line px-10">
      <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
        <span className="size-2.5 bg-accent" aria-hidden />
        Overclock
      </div>
      <div className="flex items-center gap-6">
        {right && <div className="text-[13px] text-muted">{right}</div>}
        <SoundToggle />
      </div>
    </header>
  );
}
