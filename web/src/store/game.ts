import { create } from "zustand";
import type { SimEvent } from "@server/sim/index.js";
import type { MatchView, SessionView } from "@server/types/contracts.js";
import { describe, type FeedItem } from "../game/feed";

const FEED_SIZE = 3;

type GameStore = {
  connected: boolean;
  /** True while a saved seat is being restored after a refresh. */
  restoring: boolean;
  playerId: string | null;
  session: SessionView | null;
  match: MatchView | null;
  /** Latest feedback lines, newest first. */
  feed: FeedItem[];
  /** Health once per second of the round (index = second). */
  healthHistory: number[];

  setConnected: (connected: boolean) => void;
  setRestoring: (restoring: boolean) => void;
  seat: (playerId: string, session: SessionView) => void;
  setSession: (session: SessionView) => void;
  setMatch: (match: MatchView) => void;
  pushEvents: (events: SimEvent[]) => void;
  clear: () => void;
};

let nextFeedId = 1;

/** Latest server snapshot. The web app never simulates — it only displays this. */
export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  restoring: false,
  playerId: null,
  session: null,
  match: null,
  feed: [],
  healthHistory: [],

  setConnected: (connected) => set({ connected }),
  setRestoring: (restoring) => set({ restoring }),
  seat: (playerId, session) => set({ playerId, session, match: null, feed: [], healthHistory: [] }),
  setSession: (session) => set((s) => (s.session && s.session.code !== session.code ? s : { session })),

  setMatch: (match) =>
    set((s) => {
      // A new round (tick went backwards) starts from an empty history and feed.
      const fresh = s.match !== null && match.tick < s.match.tick;
      const second = Math.floor(match.durationSec - match.timeLeftSec);
      const base = fresh ? [] : s.healthHistory;
      if (base.length > second) return { match };

      const healthHistory = [...base];
      while (healthHistory.length <= second) healthHistory.push(match.health);
      return fresh ? { match, healthHistory, feed: [] } : { match, healthHistory };
    }),

  pushEvents: (events) =>
    set((s) => {
      const lines = events.map(describe).filter((x): x is Omit<FeedItem, "id"> => x !== null);
      if (lines.length === 0) return s;
      const items = lines.map((l) => ({ ...l, id: nextFeedId++ })).reverse();
      return { feed: [...items, ...s.feed].slice(0, FEED_SIZE) };
    }),

  clear: () => set({ playerId: null, session: null, match: null, feed: [], healthHistory: [], restoring: false }),
}));
