import type { ThemeId } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { SoundToggle } from "../audio/SoundToggle";
import { ThemeLogo } from "../themes/ThemeLogo";
import { THEME_INFO } from "../themes/themes";

export function TopBar({ right, theme }: { right?: ReactNode; theme?: ThemeId | null }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-line px-4 sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-2.5 text-[0.9375rem] font-semibold tracking-[-0.01em]">
        <span className="size-2.5 bg-accent" aria-hidden />
        Overclock
        {theme && (
          <>
            <span className="mx-2 h-5 w-px bg-line-strong" aria-hidden />
            <ThemeLogo theme={theme} className="h-5 max-w-[7.5rem]" fallback="none" />
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
