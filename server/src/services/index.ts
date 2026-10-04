import type { GameTiming } from "../config/game.js";
import type { Broadcaster } from "./broadcaster.js";
import { MatchService } from "./match.service.js";
import { ResultService } from "./result.service.js";
import { MemoryResultStore, type ResultStore } from "./result.store.js";
import { Metrics } from "./metrics.js";
import { RoomService } from "./room.service.js";
import { SessionService, type SessionDeps } from "./session.service.js";

export function createServices(
  notify: Broadcaster,
  timing: GameTiming,
  deps: SessionDeps = {},
  metrics = new Metrics(),
  store: ResultStore = new MemoryResultStore(),
) {
  const rooms = new RoomService(deps.now);
  const matches = new MatchService(notify, timing, metrics);
  const results = new ResultService(store, notify);
  const sessions = new SessionService(rooms, matches, notify, timing, { ...deps, results });
  metrics.setGauges(() => {
    const all = rooms.all();
    return { rooms: all.length, players: all.reduce((n, r) => n + r.players.length, 0), liveMatches: matches.count() };
  });
  return {
    metrics,
    rooms,
    matches,
    sessions,
    results,
    start() {
      metrics.start();
      matches.startLoop();
      sessions.startSweeper();
    },
    stop() {
      metrics.stop();
      matches.stopLoop();
      sessions.stop();
    },
  };
}

export type Services = ReturnType<typeof createServices>;
