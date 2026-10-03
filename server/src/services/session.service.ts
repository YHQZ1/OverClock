import type { GameTiming } from "../config/game.js";
import type { Action } from "../sim/index.js";
import { UserError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type { Broadcaster } from "./broadcaster.js";
import type { MatchResult, MatchService } from "./match.service.js";
import type { Seat, Team, TeamService } from "./team.service.js";

/**
 * The session phase machine — the server decides which screen every PC shows.
 * For now: lobby → countdown → playing (one round) → final.
 * Tutorial, intros, breaks and rounds 2–3 arrive in Milestone 7.
 */
export class SessionService {
  private readonly countdowns = new Map<string, NodeJS.Timeout>();
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    private readonly teams: TeamService,
    private readonly matches: MatchService,
    private readonly notify: Broadcaster,
    private readonly timing: GameTiming,
    private readonly now: () => number = Date.now,
  ) {}

  createTeam(teamName: string, playerName: string): Seat {
    const seat = this.teams.create(teamName, playerName);
    logger.info("team created", { code: seat.team.code });
    this.publish(seat.team);
    return seat;
  }

  joinTeam(code: string, playerName: string): Seat {
    const seat = this.teams.join(code, playerName);
    this.publish(seat.team);
    return seat;
  }

  rejoinTeam(code: string, token: string): Seat {
    const seat = this.teams.rejoin(code, token);
    this.publish(seat.team);
    return seat;
  }

  leaveTeam(code: string, playerId: string): void {
    const stillExists = this.teams.leave(code, playerId);
    if (stillExists) this.publish(this.teams.require(code));
    else this.cleanup(code);
  }

  setConnected(code: string, playerId: string, connected: boolean): void {
    const team = this.teams.get(code);
    if (!team) return;
    this.teams.setConnected(team, playerId, connected);
    this.publish(team);
  }

  start(code: string, playerId: string): void {
    const team = this.teams.require(code);
    if (team.hostId !== playerId) throw new UserError("Only the host can start the game.");
    if (team.phase !== "lobby") throw new UserError("The game has already started.");

    if (this.timing.countdownSec <= 0) return this.beginRound(team);

    team.phase = "countdown";
    team.countdown = this.timing.countdownSec;
    this.publish(team);

    const timer = setInterval(() => {
      const current = this.teams.get(code);
      if (!current || current.phase !== "countdown") return this.clearCountdown(code);
      current.countdown = (current.countdown ?? 1) - 1;
      if (current.countdown <= 0) {
        this.clearCountdown(code);
        this.beginRound(current);
      } else {
        this.publish(current);
      }
    }, 1000);
    this.countdowns.set(code, timer);
  }

  action(code: string, playerId: string, action: Action): void {
    const team = this.teams.get(code);
    if (!team || team.phase !== "playing") return;
    if (!team.players.some((p) => p.id === playerId)) return;
    this.matches.queue(code, action);
  }

  /** Drop teams whose players have all been gone too long. Nothing is recorded. */
  sweep(): void {
    const cutoff = this.now() - this.timing.abandonAfterMs;
    for (const team of this.teams.all()) {
      if (team.allGoneSince !== null && team.allGoneSince <= cutoff) {
        logger.info("team abandoned", { code: team.code, phase: team.phase });
        this.teams.delete(team.code);
        this.cleanup(team.code);
      }
    }
  }

  startSweeper(): void {
    this.sweeper ??= setInterval(() => this.sweep(), this.timing.sweepEveryMs);
  }

  stop(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
    for (const code of this.countdowns.keys()) this.clearCountdown(code);
  }

  private beginRound(team: Team): void {
    team.phase = "playing";
    team.countdown = null;
    this.publish(team);
    this.matches.start(team.code, (result) => this.finishRound(team.code, result));
  }

  private finishRound(code: string, result: MatchResult): void {
    const team = this.teams.get(code);
    if (!team) return;
    team.phase = "final";
    team.result = result.score;
    logger.info("round finished", { code, score: result.score.total, seed: result.seed, actions: result.log.length });
    this.publish(team);
  }

  private cleanup(code: string): void {
    this.clearCountdown(code);
    this.matches.stop(code);
  }

  private clearCountdown(code: string): void {
    const timer = this.countdowns.get(code);
    if (timer) clearInterval(timer);
    this.countdowns.delete(code);
  }

  private publish(team: Team): void {
    this.notify.session(this.teams.view(team));
  }
}
