import type { Side } from "../sim/index.js";
import type { ScreenMatch, ScreenSnapshot } from "../types/contracts.js";
import type { Broadcaster } from "./broadcaster.js";
import type { MatchService } from "./match.service.js";
import type { ResultService } from "./result.service.js";
import { sideOf, type RoomService } from "./room.service.js";

const SHOWN_PHASES = ["vote", "themePick", "briefing", "buy", "live", "roundResult"] as const;
type ShownPhase = (typeof SHOWN_PHASES)[number];
const shown = (phase: string): phase is ShownPhase => (SHOWN_PHASES as readonly string[]).includes(phase);

/**
 * Staff pages (/live, /leaderboard, /admin): every match in progress, pushed
 * a few times a second, plus boards and awards on sign-in. Which match the
 * projector shows is decided on /live itself.
 */
export class ScreenService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly rooms: RoomService,
    private readonly matches: MatchService,
    private readonly results: ResultService,
    private readonly notify: Broadcaster,
    private readonly totalRounds: () => number,
  ) {}

  /** Every match in progress, newest round state first-class: both sites, never coins. */
  live(): ScreenMatch[] {
    const out: ScreenMatch[] = [];
    for (const room of this.rooms.all()) {
      if (!shown(room.phase) || !room.format) continue;
      const spec = room.phase === "buy" || room.phase === "live" ? this.matches.spectate(room.code) : null;
      const view = this.rooms.view(room, this.totalRounds());
      const team = (side: Side) => ({
        name: view.teamNames[side],
        players: room.players.filter((p) => p.slot !== null && sideOf(p.slot) === side).map((p) => p.name),
        total: Math.round(room.rounds.reduce((sum, r) => sum + r.scores[side].total, 0) + (spec?.sites[side].score ?? 0)),
        roundsWon: room.rounds.filter((r) => r.winner === side).length,
      });
      out.push({
        code: room.code,
        format: room.format,
        theme: room.theme,
        phase: room.phase,
        round: room.round,
        totalRounds: this.totalRounds(),
        secondsLeft: spec?.phase === "live" ? Math.ceil(spec.timeLeftSec) : view.secondsLeft,
        teams: { 1: team(1), 2: team(2) },
        sites: spec?.sites ?? null,
      });
    }
    return out;
  }

  async snapshot(): Promise<ScreenSnapshot> {
    const [boards, awards] = await Promise.all([this.results.boards(), this.results.awards()]);
    return { boards, awards, matches: this.live() };
  }

  start(everyMs = 250): void {
    this.timer ??= setInterval(() => this.notify.screenMatches(this.live()), everyMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
