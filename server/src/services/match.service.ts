import type { GameTiming } from "../config/game.js";
import {
  DEFAULT_CONFIG,
  ROUND_1,
  createMatch,
  scoreOf,
  step,
  type Action,
  type ActionLog,
  type MatchSetup,
  type MatchState,
  type ScoreBreakdown,
} from "../sim/index.js";
import type { MatchView } from "../types/contracts.js";
import { matchSeed } from "../utils/codes.js";
import type { Broadcaster } from "./broadcaster.js";
import { toMatchView } from "./match.view.js";

/** Presses beyond this per tick are dropped — nobody clicks that fast. */
const MAX_QUEUED_ACTIONS = 10;

export type MatchResult = { seed: number; log: ActionLog; score: ScoreBreakdown; state: MatchState };

type LiveMatch = {
  seed: number;
  state: MatchState;
  queue: Action[];
  log: ActionLog;
  onEnd: (result: MatchResult) => void;
};

/** Live rounds: owns match state in memory and drives the 10 Hz loop. */
export class MatchService {
  private readonly matches = new Map<string, LiveMatch>();
  private loop: NodeJS.Timeout | null = null;

  constructor(
    private readonly notify: Broadcaster,
    private readonly timing: GameTiming,
    private readonly setup: MatchSetup = { scenario: ROUND_1, config: DEFAULT_CONFIG },
  ) {}

  start(code: string, onEnd: LiveMatch["onEnd"], seed = matchSeed()): void {
    const state = createMatch(this.setup, seed);
    this.matches.set(code, { seed, state, queue: [], log: [], onEnd });
    this.notify.match(code, toMatchView(state, this.setup));
  }

  queue(code: string, action: Action): void {
    const match = this.matches.get(code);
    if (match && match.queue.length < MAX_QUEUED_ACTIONS) match.queue.push(action);
  }

  stop(code: string): void {
    this.matches.delete(code);
  }

  isRunning(code: string): boolean {
    return this.matches.has(code);
  }

  view(code: string): MatchView | null {
    const match = this.matches.get(code);
    return match ? toMatchView(match.state, this.setup) : null;
  }

  /** Advance every live match by one tick and broadcast. */
  tickAll(): void {
    for (const [code, match] of this.matches) {
      const actions = match.queue;
      match.queue = [];
      for (const action of actions) match.log.push({ tick: match.state.tick, action });

      const { state, events } = step(match.state, actions, this.setup);
      match.state = state;

      this.notify.match(code, toMatchView(state, this.setup));
      if (events.length > 0) this.notify.matchEvents(code, events);

      if (state.phase === "ended") {
        this.matches.delete(code);
        match.onEnd({ seed: match.seed, log: match.log, score: scoreOf(state, this.setup.config), state });
      }
    }
  }

  startLoop(): void {
    this.loop ??= setInterval(() => this.tickAll(), this.timing.tickMs);
  }

  stopLoop(): void {
    if (this.loop) clearInterval(this.loop);
    this.loop = null;
  }
}
