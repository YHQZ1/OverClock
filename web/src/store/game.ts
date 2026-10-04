import { create } from "zustand";
import type { MatchView, RoomView, Side, SimEvent } from "@server/types/contracts.js";
import { describe, type FeedItem } from "../game/feed";
import { wordsFor } from "../themes/themes";

const FEED_SIZE = 3;

type GameStore = {
  connected: boolean;
  /** True while a saved seat is being restored after a refresh. */
  restoring: boolean;
  playerId: string | null;
  room: RoomView | null;
  match: MatchView | null;
  /** Latest feedback lines, newest first. */
  feed: FeedItem[];
  /** Health once per second of the current round, for both sites. */
  history: Record<"me" | "them", number[]>;

  setConnected: (connected: boolean) => void;
  setRestoring: (restoring: boolean) => void;
  seat: (playerId: string, room: RoomView) => void;
  setRoom: (room: RoomView) => void;
  setMatch: (match: MatchView) => void;
  pushEvents: (events: SimEvent[]) => void;
  clear: () => void;
};

let nextFeedId = 1;
const EMPTY_HISTORY = { me: [], them: [] };

/** Latest server snapshot. The web app never simulates — it only displays this. */
export const useGameStore = create<GameStore>((set, get) => ({
  connected: false,
  restoring: false,
  playerId: null,
  room: null,
  match: null,
  feed: [],
  history: EMPTY_HISTORY,

  setConnected: (connected) => set({ connected }),
  setRestoring: (restoring) => set({ restoring }),
  seat: (playerId, room) => set({ playerId, room, match: null, feed: [], history: EMPTY_HISTORY }),
  setRoom: (room) => set((s) => (s.room && s.room.code !== room.code ? s : { room })),

  setMatch: (match) =>
    set((s) => {
      // A new round starts from an empty history and feed.
      const fresh = !s.match || match.round !== s.match.round;
      const second = Math.floor(match.durationSec - match.timeLeftSec);
      const base = fresh ? EMPTY_HISTORY : s.history;
      if (match.phase === "buy" || base.me.length > second) return fresh ? { match, history: base, feed: [] } : { match };

      const history = { me: [...base.me], them: [...base.them] };
      while (history.me.length <= second) {
        history.me.push(match.me.health);
        history.them.push(match.them.health);
      }
      return fresh ? { match, history, feed: [] } : { match, history };
    }),

  pushEvents: (events) => {
    const { match, room, playerId } = get();
    const side: Side | undefined = match?.side;
    if (!side) return;
    const me = room?.players.find((p) => p.id === playerId)?.name ?? "";
    const words = wordsFor(room?.theme);
    const lines = events.map((e) => describe(e, side, me, words)).filter((x): x is Omit<FeedItem, "id"> => x !== null);
    if (lines.length === 0) return;
    const items = lines.map((l) => ({ ...l, id: nextFeedId++ })).reverse();
    set((s) => ({ feed: [...items, ...s.feed].slice(0, FEED_SIZE) }));
  },

  clear: () => set({ playerId: null, room: null, match: null, feed: [], history: EMPTY_HISTORY, restoring: false }),
}));
