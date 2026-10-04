import type { GameTiming } from "../config/game.js";
import { AdminService } from "./admin.service.js";
import type { Broadcaster } from "./broadcaster.js";
import { MatchService } from "./match.service.js";
import { ResultService } from "./result.service.js";
import { MemoryResultStore, type ResultStore } from "./result.store.js";
import { Metrics } from "./metrics.js";
import { RoomService } from "./room.service.js";
import { ScreenService } from "./screen.service.js";
import { SessionService, type SessionDeps } from "./session.service.js";

export type ServiceOptions = {
  metrics?: Metrics;
  /** Where results are saved; memory by default. */
  store?: ResultStore;
  /** Staff sign-in for /admin, /live and /leaderboard (passcode "admin" if not given). */
  admin?: AdminService;
};

export function createServices(notify: Broadcaster, timing: GameTiming, deps: SessionDeps = {}, options: ServiceOptions = {}) {
  const metrics = options.metrics ?? new Metrics();
  const store = options.store ?? new MemoryResultStore();
  const admin = options.admin ?? new AdminService("admin", deps.now);
  const rooms = new RoomService(deps.now);
  const matches = new MatchService(notify, timing, metrics);
  const results = new ResultService(store, notify);
  const sessions = new SessionService(rooms, matches, notify, timing, { ...deps, results });
  const screen = new ScreenService(rooms, matches, results, notify, () => sessions.totalRounds);
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
    screen,
    admin,
    start() {
      metrics.start();
      screen.start();
      matches.startLoop();
      sessions.startSweeper();
    },
    stop() {
      metrics.stop();
      screen.stop();
      matches.stopLoop();
      sessions.stop();
    },
  };
}

export type Services = ReturnType<typeof createServices>;
