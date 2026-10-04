import type { Side, SimEvent } from "../sim/index.js";
import type { Awards, Leaderboards, MatchView, RoomView, ScreenMatch } from "../types/contracts.js";

/**
 * How services push updates to a room's PCs. Implemented by the socket
 * layer, so services never import Socket.IO and stay easy to test.
 */
export interface Broadcaster {
  room(view: RoomView): void;
  /** Each side gets its own view (the opponent's coins stay hidden). */
  match(code: string, side: Side, view: MatchView): void;
  matchEvents(code: string, events: SimEvent[]): void;
  /** To big screens and admin pages (players only see their own place). */
  leaderboard(boards: Leaderboards): void;
  /** To big screens only. */
  awards(awards: Awards): void;
  screenMatches(matches: ScreenMatch[]): void;
}
