import type { GameTiming } from "../config/game.js";
import type { MatchSetup } from "../sim/index.js";
import type { Broadcaster } from "./broadcaster.js";
import { MatchService } from "./match.service.js";
import { SessionService } from "./session.service.js";
import { TeamService } from "./team.service.js";

export function createServices(notify: Broadcaster, timing: GameTiming, setup?: MatchSetup) {
  const teams = new TeamService();
  const matches = new MatchService(notify, timing, setup);
  const sessions = new SessionService(teams, matches, notify, timing);
  return {
    teams,
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
