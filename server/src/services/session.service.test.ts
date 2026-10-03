import { describe, expect, it } from "vitest";
import type { GameTiming } from "../config/game.js";
import type { SessionView } from "../types/contracts.js";
import type { Broadcaster } from "./broadcaster.js";
import { MatchService } from "./match.service.js";
import { SessionService } from "./session.service.js";
import { TeamService } from "./team.service.js";

const TIMING: GameTiming = { countdownSec: 0, tickMs: 100, abandonAfterMs: 120_000, sweepEveryMs: 10_000 };

function setup() {
  let now = 1_000_000;
  const clock = () => now;
  const sessions: SessionView[] = [];
  const notify: Broadcaster = { session: (v) => sessions.push(v), match: () => {}, matchEvents: () => {} };
  const teams = new TeamService(clock);
  const matches = new MatchService(notify, TIMING);
  const service = new SessionService(teams, matches, notify, TIMING, clock);
  return { teams, matches, service, sessions, advance: (ms: number) => (now += ms) };
}

describe("abandoned teams", () => {
  it("are removed once everyone has been gone long enough", () => {
    const { teams, matches, service, advance } = setup();
    const { team, player } = service.createTeam("Night Owls", "Priya");
    service.start(team.code, player.id);
    expect(matches.isRunning(team.code)).toBe(true);

    service.setConnected(team.code, player.id, false);
    advance(119_000);
    service.sweep();
    expect(teams.get(team.code)).toBeDefined();

    advance(2_000);
    service.sweep();
    expect(teams.get(team.code)).toBeUndefined();
    expect(matches.isRunning(team.code)).toBe(false);
  });

  it("are kept while at least one player is connected", () => {
    const { teams, service, advance } = setup();
    const { team, player } = service.createTeam("Night Owls", "Priya");
    service.joinTeam(team.code, "Rahul");
    service.setConnected(team.code, player.id, false);
    advance(10 * 60_000);
    service.sweep();
    expect(teams.get(team.code)).toBeDefined();
  });

  it("restart the clock when someone comes back", () => {
    const { teams, service, advance } = setup();
    const { team, player } = service.createTeam("Night Owls", "Priya");
    service.setConnected(team.code, player.id, false);
    advance(100_000);
    service.rejoinTeam(team.code, player.token);
    service.setConnected(team.code, player.id, false);
    advance(100_000);
    service.sweep();
    expect(teams.get(team.code)).toBeDefined();
  });
});

describe("leaving", () => {
  it("deletes the team when the last player leaves", () => {
    const { teams, service } = setup();
    const { team, player } = service.createTeam("Night Owls", "Priya");
    service.leaveTeam(team.code, player.id);
    expect(teams.get(team.code)).toBeUndefined();
  });
});
