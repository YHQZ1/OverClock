import type { GameTiming } from "../config/game.js";
import type { Broadcaster } from "./broadcaster.js";
import { MatchService } from "./match.service.js";
import { RoomService } from "./room.service.js";
import { SessionService, type SessionDeps } from "./session.service.js";

export function createServices(notify: Broadcaster, timing: GameTiming, deps: SessionDeps = {}) {
  const rooms = new RoomService(deps.now);
  const matches = new MatchService(notify, timing);
  const sessions = new SessionService(rooms, matches, notify, timing, deps);
  return {
    rooms,
    matches,
    sessions,
    start() {
      matches.startLoop();
      sessions.startSweeper();
    },
    stop() {
      matches.stopLoop();
      sessions.stop();
    },
  };
}

export type Services = ReturnType<typeof createServices>;
