import type { Awards, Leaderboards, ScreenMatch, ScreenSnapshot } from "@server/types/contracts.js";
import { useEffect, useState } from "react";
import { request } from "../../socket/api";
import { socket } from "../../socket/socket";

export type ScreenFeed = {
  connected: boolean;
  boards: Leaderboards | null;
  awards: Awards | null;
  matches: ScreenMatch[];
};

/** Subscribes this tab as a big screen; re-subscribes after every reconnect. */
export function useScreenFeed(): ScreenFeed {
  const [feed, setFeed] = useState<ScreenFeed>({ connected: false, boards: null, awards: null, matches: [] });

  useEffect(() => {
    const watch = async () => {
      setFeed((f) => ({ ...f, connected: true }));
      const res = await request<ScreenSnapshot>("screen:watch", {});
      if (res.ok) setFeed({ connected: true, ...res.data });
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
