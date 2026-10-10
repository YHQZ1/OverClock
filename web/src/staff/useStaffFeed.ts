import type { Awards, Leaderboards, ScreenMatch, ScreenSnapshot } from "@server/types/contracts.js";
import { useEffect, useState } from "react";
import { request } from "../socket/api";
import { socket } from "../socket/socket";
import { clearToken, getToken } from "./auth";

export type StaffFeed = {
  connected: boolean;
  /** False when there is no sign-in, or once the server rejects it (expired, or the server restarted). */
  signedIn: boolean;
  /** True once the first snapshot has arrived — before that there is nothing real to show. */
  ready: boolean;
  boards: Leaderboards | null;
  awards: Awards | null;
  /** Every match in progress, a few times a second. */
  matches: ScreenMatch[];
};

/** Subscribes this tab as staff; re-subscribes after every reconnect. */
export function useStaffFeed(): StaffFeed {
  const [feed, setFeed] = useState<StaffFeed>({ connected: false, signedIn: getToken() !== null, ready: false, boards: null, awards: null, matches: [] });

  useEffect(() => {
    const watch = async () => {
      setFeed((f) => ({ ...f, connected: true }));
      const token = getToken();
      const res = token ? await request<ScreenSnapshot>("screen:watch", { token }) : null;
      if (res?.ok) setFeed({ connected: true, signedIn: true, ready: true, ...res.data });
      else if (!res || res.error === "Please sign in again.") {
        clearToken();
        setFeed((f) => ({ ...f, signedIn: false }));
      }
    };
    const onDisconnect = () => setFeed((f) => ({ ...f, connected: false }));
    const onBoards = (boards: Leaderboards) => setFeed((f) => ({ ...f, boards }));
    const onAwards = (awards: Awards) => setFeed((f) => ({ ...f, awards }));
    const onMatches = (matches: ScreenMatch[]) => setFeed((f) => ({ ...f, matches }));

    socket.on("connect", watch);
    socket.on("disconnect", onDisconnect);
    socket.on("leaderboard:update", onBoards);
    socket.on("screen:awards", onAwards);
    socket.on("screen:matches", onMatches);
    socket.connect();
    return () => {
      socket.off("connect", watch);
      socket.off("disconnect", onDisconnect);
      socket.off("leaderboard:update", onBoards);
      socket.off("screen:awards", onAwards);
      socket.off("screen:matches", onMatches);
      socket.disconnect();
    };
  }, []);

  return feed;
}
