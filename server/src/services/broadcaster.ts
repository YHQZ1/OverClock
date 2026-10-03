import type { SimEvent } from "../sim/index.js";
import type { MatchView, SessionView } from "../types/contracts.js";

/**
 * How services push updates to a team's PCs. Implemented by the socket
 * layer, so services never import Socket.IO and stay easy to test.
 */
export interface Broadcaster {
  session(view: SessionView): void;
  match(code: string, view: MatchView): void;
  matchEvents(code: string, events: SimEvent[]): void;
}
