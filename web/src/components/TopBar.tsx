import type { ThemeId } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { SoundToggle } from "../audio/SoundToggle";
import { ThemeLogo } from "../themes/ThemeLogo";
import { THEME_INFO } from "../themes/themes";

export function TopBar({ right, theme }: { right?: ReactNode; theme?: ThemeId | null }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 bg-bg px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 font-display text-xl font-extrabold tracking-[0.06em] uppercase">
        <span className="size-3.5 bg-accent" aria-hidden />
        Overclock
        {theme && (
          <>
            <span className="mx-1 h-5 w-0.5 bg-line-strong" aria-hidden />
            <span className="hidden truncate text-accent sm:inline">{THEME_INFO[theme].name}</span>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-6">
        {right && <div className="hidden text-[0.8125rem] whitespace-nowrap text-muted md:block">{right}</div>}
        <SoundToggle />
      </div>
    </header>
  );
}
