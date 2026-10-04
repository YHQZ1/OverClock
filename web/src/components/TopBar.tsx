import type { ThemeId } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { SoundToggle } from "../audio/SoundToggle";
import { ThemeLogo } from "../themes/ThemeLogo";
import { THEME_INFO } from "../themes/themes";

export function TopBar({ right, theme }: { right?: ReactNode; theme?: ThemeId | null }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line px-10">
      <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
        <span className="size-2.5 bg-accent" aria-hidden />
        Overclock
        {theme && (
          <>
            <span className="mx-2 h-5 w-px bg-line-strong" aria-hidden />
            <ThemeLogo theme={theme} className="h-5 max-w-[120px]" fallback="none" />
            <span className="text-accent">{THEME_INFO[theme].name}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-6">
        {right && <div className="text-[13px] text-muted">{right}</div>}
        <SoundToggle />
      </div>
    </header>
  );
}
