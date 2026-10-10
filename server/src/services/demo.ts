// The demo match shown in the briefing: two scripted bot teams play one short
// match through the real engine, so what players watch is always true to the
// rules. Recorded to a timeline (web/src/game/demo.json) by
// `pnpm --filter @overclock/server demo` — the web app never runs the engine.

import {
  DEFAULT_CONFIG,
  createDuel,
  step,
  toTicks,
  type Action,
  type AttackId,
  type MatchSetup,
  type Scenario,
  type Side,
  type SimEvent,
} from "../sim/index.js";
import type { DemoCaption, DemoFrame, DemoRecording } from "../types/contracts.js";
import { siteView } from "./match.view.js";

const SCENARIO: Scenario = {
  id: "demo",
  durationSec: 54,
  startServers: 4,
  startCoins: 5000, // scripted: every purchase goes through
  traffic: { baseRate: 100, growth: 0, waveAmp: 0.04, wavePeriodSec: 20, noiseAmp: 0.02 },
  rushes: [],
  jitterSec: 0,
};

const SETUP: MatchSetup = { scenario: SCENARIO, config: DEFAULT_CONFIG };
const SEED = 7;
const FPS = 5;

/** Side 1 is "Red" (left), side 2 is "Blue" (right). Every attack lands once and every counter shows. */
const SCRIPT: { at: number; side: Side; kind: Action["kind"]; item: Action["item"] }[] = [
  { at: -1, side: 2, kind: "buy", item: "bouncer" }, // built ahead, in the buy phase
  { at: 4, side: 1, kind: "attack", item: "surge" },
  { at: 8, side: 2, kind: "buy", item: "server" },
  { at: 8, side: 2, kind: "buy", item: "server" },
  { at: 13, side: 2, kind: "attack", item: "bots" },
  { at: 17, side: 1, kind: "buy", item: "bouncer" },
  { at: 22, side: 1, kind: "attack", item: "bots" }, // Blue's bouncer turns them away
  { at: 30, side: 2, kind: "attack", item: "destroy" },
  { at: 35, side: 1, kind: "use", item: "instantBackup" },
  { at: 38, side: 1, kind: "attack", item: "wrongTurn" },
  { at: 43.5, side: 2, kind: "buy", item: "lockAddress" },
  { at: 46, side: 2, kind: "attack", item: "jam" },
  { at: 47, side: 1, kind: "use", item: "shield" }, // raised before the freeze lands
];

const CAPTIONS: DemoCaption[] = [
  { at: 0, text: "Two teams run the same app. People line up — every person served earns coins.", focus: "both" },
  { at: 4, text: "Red sends {surge}!", focus: "both" },
  { at: 7, text: "A wave of extra {visitors} hits Blue — the line grows and people give up.", focus: "right" },
  { at: 8.5, text: "Blue adds more {servers} (key 1) — the line shrinks.", focus: "right" },
  { at: 13, text: "Blue sends {bots} at Red!", focus: "both" },
  { at: 16.5, text: "Fake {visitors} clog Red’s line, so real ones give up.", focus: "left" },
  { at: 18, text: "Red builds a {bouncer} (key 2) to turn bots away.", focus: "left" },
  { at: 22, text: "Red sends {bots} back at Blue…", focus: "both" },
  { at: 25, text: "…but Blue built a {bouncer} first — the bots are turned away!", focus: "right" },
  { at: 30, text: "Blue sends {destroy}!", focus: "both" },
  { at: 33.5, text: "Two of Red’s {servers} are wrecked.", focus: "left" },
  { at: 35.5, text: "{instantBackup} (key R) brings them straight back.", focus: "left" },
  { at: 38, text: "Red sends {wrongTurn}!", focus: "both" },
  { at: 41, text: "Blue’s {visitors} walk over to Red — Blue has no {lockAddress}.", focus: "right" },
  { at: 44, text: "{lockAddress} (key 3) stops it happening again.", focus: "right" },
  { at: 46, text: "Blue sends {jam} — Red’s cards would freeze…", focus: "both" },
  { at: 49.5, text: "…but Red raised {shield} (key W) first. BLOCKED!", focus: "left" },
  { at: 52, text: "That’s the game — now it’s your turn!", focus: "both" },
];

const round1 = (x: number) => Math.round(x * 10) / 10;

export type DemoSummary = {
  /** Attacks that took effect, and attacks something stopped. */
  landed: AttackId[];
  blocked: AttackId[];
};

export function buildDemo(): { recording: DemoRecording; summary: DemoSummary } {
  const byTick = new Map<number, Action[]>();
  for (const s of SCRIPT) {
    const tick = s.at < 0 ? -1 : toTicks(s.at, DEFAULT_CONFIG);
    byTick.set(tick, [...(byTick.get(tick) ?? []), { side: s.side, kind: s.kind, item: s.item }]);
  }

  let state = createDuel(SETUP, SEED);
  state = step(state, byTick.get(-1) ?? [], SETUP, { paused: true }).state;

  const frames: DemoFrame[] = [];
  const events: SimEvent[] = [];
  const every = Math.round(DEFAULT_CONFIG.tickRate / FPS);
  while (state.phase === "running") {
    if (state.tick % every === 0) {
      frames.push({
        t: round1(state.tick / DEFAULT_CONFIG.tickRate),
        sites: [siteView(state.sites[1], SETUP), siteView(state.sites[2], SETUP)],
        flights: ([1, 2] as const).flatMap((side) =>
          state.sites[side].incoming.map((i) => ({
            id: i.id,
            attack: i.attack,
            secondsLeft: round1(i.ticksUntil / DEFAULT_CONFIG.tickRate),
            side,
          })),
        ),
      });
    }
    const result = step(state, byTick.get(state.tick) ?? [], SETUP);
    events.push(...result.events);
    state = result.state;
  }

  const attacksOf = (type: "attackLanded" | "attackBlocked") =>
    events.flatMap((e) => (e.type === type ? [e.attack] : []));
  return {
    recording: { durationSec: SCENARIO.durationSec, fps: FPS, frames, captions: CAPTIONS },
    summary: { landed: attacksOf("attackLanded"), blocked: attacksOf("attackBlocked") },
  };
}
