import { THEMES, type GameTiming, type ThemeId } from "../config/game.js";
import { ROUNDS, matchPoints, matchTotals, other, type Scenario, type Side } from "../sim/index.js";
import type { GameActionPayload, Phase, Slot } from "../types/contracts.js";
import { UserError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type { Broadcaster } from "./broadcaster.js";
import type { MatchService, RoundEnd } from "./match.service.js";
import { sideOf, type Room, type RoomService, type Seat } from "./room.service.js";

export type SessionDeps = {
  rounds?: readonly Scenario[];
  now?: () => number;
  /** Used only to break theme-vote ties. */
  random?: () => number;
};

const MATCH_PHASES: readonly Phase[] = ["vote", "buy", "live", "roundResult"];

/**
 * The room phase machine — the server decides which screen every PC shows:
 * room → vote → (buy → live → roundResult) × 3 → final.
 */
export class SessionService {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private sweeper: NodeJS.Timeout | null = null;
  private readonly scenarios: readonly Scenario[];
  private readonly now: () => number;
  private readonly random: () => number;

  constructor(
    private readonly rooms: RoomService,
    private readonly matches: MatchService,
    private readonly notify: Broadcaster,
    private readonly timing: GameTiming,
    deps: SessionDeps = {},
  ) {
    this.scenarios = deps.rounds ?? ROUNDS;
    this.now = deps.now ?? Date.now;
    this.random = deps.random ?? Math.random;
  }

  // ---------- seats ----------

  createRoom(playerName: string): Seat {
    const seat = this.rooms.create(playerName);
    logger.info("room created", { code: seat.room.code });
    this.publish(seat.room);
    return seat;
  }

  joinRoom(code: string, playerName: string): Seat {
    const seat = this.rooms.join(code, playerName);
    this.publish(seat.room);
    return seat;
  }

  rejoinRoom(code: string, token: string): Seat {
    const seat = this.rooms.rejoin(code, token);
    this.publish(seat.room);
    return seat;
  }

  leaveRoom(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    const slot = room.players.find((p) => p.id === playerId)?.slot ?? null;
    if (!this.rooms.leave(code, playerId)) return this.cleanup(code);

    // Mid-match, a team with nobody left forfeits.
    if (slot !== null && MATCH_PHASES.includes(room.phase)) {
      const side = sideOf(slot);
      if (this.rooms.playersOn(room, side).length === 0) return this.finish(room, side);
    }
    this.publish(room);
  }

  setConnected(code: string, playerId: string, connected: boolean): void {
    const room = this.rooms.get(code);
    if (!room) return;
    this.rooms.setConnected(room, playerId, connected);
    this.publish(room);
  }

  // ---------- room ----------

  setSlot(code: string, playerId: string, slot: Slot): void {
    const room = this.rooms.require(code);
    this.rooms.setSlot(room, playerId, slot);
    this.publish(room);
  }

  setReady(code: string, playerId: string, ready: boolean): void {
    const room = this.rooms.require(code);
    this.rooms.setReady(room, playerId, ready);
    const check = this.rooms.canStart(room);
    if (room.phase === "room" && check.ok) {
      room.format = check.format;
      logger.info("match starting", { code, format: check.format });
      return this.startVote(room);
    }
    this.publish(room);
  }

  setTeamName(code: string, playerId: string, name: string): void {
    const room = this.rooms.require(code);
    this.rooms.setTeamName(room, playerId, name);
    this.publish(room);
  }

  // ---------- vote ----------

  vote(code: string, playerId: string, theme: ThemeId): void {
    const room = this.rooms.require(code);
    if (room.phase !== "vote") throw new UserError("Voting has closed.");
    this.rooms.requirePlayer(room, playerId);
    room.votes.set(playerId, theme);
    if (room.players.every((p) => room.votes.has(p.id))) return this.finishVote(room);
    this.publish(room);
  }

  private startVote(room: Room): void {
    room.phase = "vote";
    room.votes.clear();
    this.schedule(room, this.timing.voteSec, () => this.finishVote(room));
  }

  private finishVote(room: Room): void {
    if (room.phase !== "vote") return;
    room.theme = this.pickTheme(room);
    this.startRound(room, 1);
  }

  /** Most votes wins; any tie at the top (or no votes) is settled at random. */
  private pickTheme(room: Room): ThemeId {
    const counts = new Map<ThemeId, number>();
    for (const theme of room.votes.values()) counts.set(theme, (counts.get(theme) ?? 0) + 1);
    const top = Math.max(0, ...counts.values());
    const tied = top === 0 ? [...THEMES] : [...counts].filter(([, n]) => n === top).map(([t]) => t);
    return tied[Math.floor(this.random() * tied.length)] ?? tied[0]!;
  }

  // ---------- rounds ----------

  private startRound(room: Room, n: number): void {
    room.phase = "buy";
    room.round = n;
    this.matches.start(room.code, n, this.scenarios[n - 1]!, (end) => this.endRound(room.code, end));
    this.schedule(room, this.timing.buySec, () => {
      if (room.phase !== "buy") return;
      room.phase = "live";
      room.phaseEndsAt = null;
      this.matches.goLive(room.code);
      this.publish(room);
    });
  }

  private endRound(code: string, end: RoundEnd): void {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "live") return;
    room.rounds.push({ round: room.round, ...end.result });
    logger.info("round finished", { code, round: room.round, seed: end.seed, actions: end.log.length, winner: end.result.winner });
    room.phase = "roundResult";
    this.schedule(room, this.timing.resultSec, () => {
      if (room.round < this.scenarios.length) this.startRound(room, room.round + 1);
      else this.finish(room);
    });
  }

  game(code: string, playerId: string, payload: GameActionPayload): void {
    const room = this.rooms.get(code);
    if (!room || (room.phase !== "buy" && room.phase !== "live")) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.slot) return;
    this.matches.queue(code, { side: sideOf(player.slot), kind: payload.kind, item: payload.item, by: player.name });
  }

  /** End the match. `forfeitedBy` = a side that left early: the match isn't recorded. */
  private finish(room: Room, forfeitedBy?: Side): void {
    this.clearTimer(room.code);
    this.matches.stop(room.code);
    const { totals, winner: byScore } = matchTotals(room.rounds);
    const winner = forfeitedBy ? other(forfeitedBy) : byScore;
    room.phase = "final";
    room.phaseEndsAt = null;
    room.final = {
      totals,
      winner,
      points: {
        1: matchPoints(totals[1].total, totals[2].total, winner === 1),
        2: matchPoints(totals[2].total, totals[1].total, winner === 2),
      },
      recorded: !forfeitedBy,
      endedEarly: forfeitedBy ? { side: forfeitedBy, reason: "left" } : null,
    };
    logger.info("match finished", { code: room.code, winner, forfeit: forfeitedBy ?? null });
    this.publish(room);
  }

  // ---------- housekeeping ----------

  /** Abandon empty rooms; forfeit a team that's been gone too long mid-match. */
  sweep(): void {
    const now = this.now();
    for (const room of this.rooms.all()) {
      if (room.allGoneSince !== null && now - room.allGoneSince >= this.timing.abandonAfterMs) {
        logger.info("room abandoned", { code: room.code, phase: room.phase });
        this.rooms.delete(room.code);
        this.cleanup(room.code);
        continue;
      }
      if (!MATCH_PHASES.includes(room.phase)) continue;
      for (const side of [1, 2] as const) {
        const since = room.sideGoneSince[side];
        if (since !== null && now - since >= this.timing.sideGoneMs) {
          this.finish(room, side);
          break;
        }
      }
    }
  }

  startSweeper(): void {
    this.sweeper ??= setInterval(() => this.sweep(), this.timing.sweepEveryMs);
  }

  stop(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
    for (const code of [...this.timers.keys()]) this.clearTimer(code);
  }

  get totalRounds(): number {
    return this.scenarios.length;
  }

  /** Run `done` after `sec` seconds, publishing the countdown every second. */
  private schedule(room: Room, sec: number, done: () => void): void {
    this.clearTimer(room.code);
    if (sec <= 0) {
      room.phaseEndsAt = null;
      return done();
    }
    room.phaseEndsAt = this.now() + sec * 1000;
    this.publish(room);
    let shown = sec;
    const timer = setInterval(() => {
      if (this.rooms.get(room.code) !== room) return this.clearTimer(room.code);
      const left = Math.ceil((room.phaseEndsAt! - this.now()) / 1000);
      if (left <= 0) {
        this.clearTimer(room.code);
        room.phaseEndsAt = null;
        done();
      } else if (left !== shown) {
        shown = left; // publish once per visible second
        this.publish(room);
      }
    }, 100);
    this.timers.set(room.code, timer);
  }

  private clearTimer(code: string): void {
    const timer = this.timers.get(code);
    if (timer) clearInterval(timer);
    this.timers.delete(code);
  }

  private cleanup(code: string): void {
    this.clearTimer(code);
    this.matches.stop(code);
  }

  private publish(room: Room): void {
    this.notify.room(this.rooms.view(room, this.scenarios.length));
  }
}
