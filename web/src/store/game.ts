import { create } from "zustand";
import type { AttackId, ItemId, MatchView, RoomView, Side, SimEvent } from "@server/types/contracts.js";
import { describe, type FeedItem, type Tone } from "../game/feed";
import { loadSeat } from "../socket/seat";
import { wordsFor } from "../themes/themes";

const FEED_SIZE = 3;

/** A full-width callout for a big moment: "BLOCKED!", "You crashed their site!". */
export type Banner = { id: number; text: string; tone: Tone };

/** What this team did this match — the reveal highlights these. */
export type Usage = { used: ItemId[]; hitBy: AttackId[] };
const NO_USAGE: Usage = { used: [], hitBy: [] };

type GameStore = {
  connected: boolean;
  /** True while a saved seat is being restored after a refresh. */
  restoring: boolean;
  playerId: string | null;
  room: RoomView | null;
  match: MatchView | null;
  /** Latest feedback lines, newest first. */
  feed: FeedItem[];
  /** The latest big moment; the screen shows it for a couple of seconds. */
  banner: Banner | null;
  /** Items this team bought, used or sent, and attacks that hit it, across the match. */
  usage: Usage;

  setConnected: (connected: boolean) => void;
  setRestoring: (restoring: boolean) => void;
  seat: (playerId: string, room: RoomView) => void;
  setRoom: (room: RoomView) => void;
  setMatch: (match: MatchView) => void;
  pushEvents: (events: SimEvent[]) => void;
  clear: () => void;
};

let nextFeedId = 1;
let nextBannerId = 1;

/** The big-moment callout for one event, from this team's point of view. */
function bannerFor(e: SimEvent, mySide: Side, words: ReturnType<typeof wordsFor>): Omit<Banner, "id"> | null {
  const mine = e.side === mySide;
  switch (e.type) {
    case "crashed":
      return mine ? { text: "Your site is down!", tone: "bad" } : { text: "You crashed their site!", tone: "good" };
    case "attackBlocked":
      return mine ? { text: "BLOCKED!", tone: "good" } : { text: "They blocked it", tone: "warn" };
    case "attackLanded":
      return mine ? { text: `${words.names[e.attack]} hit you!`, tone: "bad" } : { text: "Direct hit!", tone: "good" };
    case "rebooted":
      return mine ? { text: "Back online!", tone: "good" } : null;
    default:
      return null;
  }
}

/** Latest server snapshot. The web app never simulates — it only displays this. */
export const useGameStore = create<GameStore>((set, get) => ({
  connected: false,
  // A saved seat means a refresh mid-room: start in "restoring" so the landing page never flashes first.
  restoring: loadSeat() !== null,
  playerId: null,
  room: null,
  match: null,
  feed: [],
  banner: null,
  usage: NO_USAGE,

  setConnected: (connected) => set({ connected }),
  setRestoring: (restoring) => set({ restoring }),
  seat: (playerId, room) => set({ playerId, room, match: null, feed: [], banner: null, usage: NO_USAGE }),
  setRoom: (room) => set((s) => (s.room && s.room.code !== room.code ? s : { room })),

  setMatch: (match) =>
    set((s) => {
      // A new round starts from an empty feed.
      const fresh = !s.match || match.round !== s.match.round;
      return fresh ? { match, feed: [], banner: null } : { match };
    }),

  pushEvents: (events) => {
    const { match, room, playerId } = get();
    const side: Side | undefined = match?.side;
    if (!side) return;
    const me = room?.players.find((p) => p.id === playerId)?.name ?? "";
    const words = wordsFor(room?.theme);

    const used = new Set(get().usage.used);
    const hitBy = new Set(get().usage.hitBy);
    for (const e of events) {
      if (e.side !== side) continue;
      if (e.type === "bought" || e.type === "used") used.add(e.item);
      else if (e.type === "attackSent") used.add(e.attack);
      else if (e.type === "attackLanded") hitBy.add(e.attack);
    }
    if (used.size !== get().usage.used.length || hitBy.size !== get().usage.hitBy.length) set({ usage: { used: [...used], hitBy: [...hitBy] } });

    const big = events.map((e) => bannerFor(e, side, words)).filter((x): x is Omit<Banner, "id"> => x !== null);
    if (big.length > 0) set({ banner: { ...big[big.length - 1]!, id: nextBannerId++ } });

    const lines = events.map((e) => describe(e, side, me, words)).filter((x): x is Omit<FeedItem, "id"> => x !== null);
    if (lines.length === 0) return;
    const items = lines.map((l) => ({ ...l, id: nextFeedId++ })).reverse();
    set((s) => ({ feed: [...items, ...s.feed].slice(0, FEED_SIZE) }));
  },

  clear: () => set({ playerId: null, room: null, match: null, feed: [], banner: null, usage: NO_USAGE, restoring: false }),
}));
