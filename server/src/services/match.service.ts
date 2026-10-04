import type { GameTiming } from "../config/game.js";
import {
  DEFAULT_CONFIG,
  SIDES,
  createDuel,
  roundResult,
  step,
  type Action,
  type ActionLog,
  type DuelState,
  type MatchSetup,
  type RoundResult,
  type Scenario,
  type Side,
} from "../sim/index.js";
import type { MatchView, SiteView } from "../types/contracts.js";
import { matchSeed } from "../utils/codes.js";
import type { Broadcaster } from "./broadcaster.js";
import type { Metrics } from "./metrics.js";
import { siteView, toMatchView } from "./match.view.js";

/** Presses beyond this per tick are dropped — nobody clicks that fast. */
const MAX_QUEUED_ACTIONS = 16;

export type RoundEnd = { seed: number; log: ActionLog; result: RoundResult; state: DuelState };

type LiveRound = {
  setup: MatchSetup;
  seed: number;
  round: number;
  phase: "buy" | "live";
  state: DuelState;
  queue: Action[];
  log: ActionLog;
  onEnd: (end: RoundEnd) => void;
};

/** Live rounds: owns duel state in memory and drives the 10 Hz loop. */
export class MatchService {
  private readonly rounds = new Map<string, LiveRound>();
  private loop: NodeJS.Timeout | null = null;

  constructor(
    private readonly notify: Broadcaster,
    private readonly timing: GameTiming,
    private readonly metrics?: Metrics,
  ) {}

  /** Set up a round in its buy phase: purchases apply, the clock waits. */
  start(code: string, round: number, scenario: Scenario, onEnd: LiveRound["onEnd"], seed = matchSeed()): void {
    const setup: MatchSetup = { scenario, config: DEFAULT_CONFIG };
    const live: LiveRound = { setup, seed, round, phase: "buy", state: createDuel(setup, seed), queue: [], log: [], onEnd };
    this.rounds.set(code, live);
    this.broadcast(code, live);
  }

  /** Buy phase over — the crowd arrives. */
  goLive(code: string): void {
    const live = this.rounds.get(code);
    if (live) live.phase = "live";
  }

  queue(code: string, action: Action): void {
    const live = this.rounds.get(code);
    if (live && live.queue.length < MAX_QUEUED_ACTIONS) live.queue.push(action);
  }

  stop(code: string): void {
    this.rounds.delete(code);
  }

  isRunning(code: string): boolean {
    return this.rounds.has(code);
  }

  count(): number {
    return this.rounds.size;
  }

  view(code: string, side: Side): MatchView | null {
    const live = this.rounds.get(code);
    return live ? toMatchView(live.state, side, live.setup, { round: live.round, phase: live.phase }) : null;
  }

  /** Both sites for a big screen — no coins, no blindfold masking. */
  spectate(code: string): { round: number; phase: "buy" | "live"; timeLeftSec: number; sites: Record<Side, SiteView> } | null {
    const live = this.rounds.get(code);
    if (!live) return null;
    const { state, setup } = live;
    return {
      round: live.round,
      phase: live.phase,
      timeLeftSec: Math.max(0, (state.durationTicks - state.tick) / setup.config.tickRate),
      sites: { 1: siteView(state.sites[1], setup), 2: siteView(state.sites[2], setup) },
    };
  }

  /** Advance every round by one tick (buy phase: purchases only) and broadcast. */
  tickAll(): void {
    const started = performance.now();
    this.tickRounds();
    this.metrics?.recordTick(performance.now() - started);
  }

  private tickRounds(): void {
    for (const [code, live] of this.rounds) {
      const actions = live.queue;
      live.queue = [];
      const paused = live.phase === "buy";
      for (const action of actions) live.log.push({ tick: paused ? -1 : live.state.tick, action });

      const { state, events } = step(live.state, actions, live.setup, { paused });
      live.state = state;
      this.broadcast(code, live);
      if (events.length > 0) this.notify.matchEvents(code, events);

      if (state.phase === "ended") {
        this.rounds.delete(code);
        live.onEnd({ seed: live.seed, log: live.log, result: roundResult(state, live.setup.config), state });
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

  private broadcast(code: string, live: LiveRound): void {
    for (const side of SIDES) {
      this.notify.match(code, side, toMatchView(live.state, side, live.setup, { round: live.round, phase: live.phase }));
    }
  }
}
