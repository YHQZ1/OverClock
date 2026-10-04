import { useEffect } from "react";

const APP = "Overclock";

/** The browser tab's title: "Leaderboard · Overclock", or just "Overclock". */
export function useTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP;
  }, [title]);
}
