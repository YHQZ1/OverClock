import { describe, expect, it } from "vitest";
import { BOTS, DEFAULT_CONFIG, ROUND_1, createMatch, replay, runMatch, step, toTicks, type MatchSetup, type MatchState } from "./index.js";
import { nextFloat, seedRng } from "./rng.js";

const setup: MatchSetup = { scenario: ROUND_1, config: DEFAULT_CONFIG };
const ADD = { type: "addServer" } as const;
const REMOVE = { type: "removeServer" } as const;

/** Step `n` ticks with no actions. */
function idle(state: MatchState, n: number): MatchState {
  for (let i = 0; i < n; i++) state = step(state, [], setup).state;
  return state;
}

describe("rng", () => {
  it("repeats the same sequence for the same seed", () => {
    const seq = (seed: number) => {
      let s = seedRng(seed);
      return Array.from({ length: 5 }, () => {
        let v: number;
        [v, s] = nextFloat(s);
        return v;
      });
    };
    expect(seq(42)).toEqual(seq(42));
    expect(seq(42)).not.toEqual(seq(43));
    for (const v of seq(7)) expect(v >= 0 && v < 1).toBe(true);
  });
});

describe("createMatch", () => {
  it("resolves event timing from the seed", () => {
    expect(createMatch(setup, 1).schedule).toEqual(createMatch(setup, 1).schedule);
    expect(createMatch(setup, 1).schedule).not.toEqual(createMatch(setup, 2).schedule);
  });

  it("keeps every event within its jitter window", () => {
    for (let seed = 1; seed <= 50; seed++) {
      createMatch(setup, seed).schedule.forEach((ev, i) => {
        const nominal = toTicks(ROUND_1.events[i]!.atSec, DEFAULT_CONFIG);
        expect(Math.abs(ev.startTick - nominal)).toBeLessThanOrEqual(toTicks(ROUND_1.jitterSec, DEFAULT_CONFIG));
      });
    }
  });
});

describe("step", () => {
  it("does not modify the input state", () => {
    const before = createMatch(setup, 1);
    const snapshot = structuredClone(before);
    step(before, [ADD, REMOVE], setup);
    expect(before).toEqual(snapshot);
  });

  it("brings a new server online after the boot time", () => {
    let { state, events } = step(createMatch(setup, 1), [ADD], setup);
    expect(events).toContainEqual({ type: "serverAdded", id: 4 });

    const bootTicks = toTicks(DEFAULT_CONFIG.bootSec, DEFAULT_CONFIG);
    state = idle(state, bootTicks - 2);
    expect(state.servers.find((u) => u.id === 4)!.bootTicksLeft).toBeGreaterThan(0);

    const last = step(state, [], setup);
    expect(last.events).toContainEqual({ type: "serverOnline", id: 4 });
    expect(last.state.servers.find((u) => u.id === 4)!.bootTicksLeft).toBe(0);
  });

  it("enforces the + SERVERS cooldown", () => {
    const first = step(createMatch(setup, 1), [ADD], setup);
    const second = step(first.state, [ADD], setup);
    expect(second.events).toContainEqual({ type: "actionRejected", action: "addServer", reason: "cooldown" });

    const later = step(idle(second.state, toTicks(DEFAULT_CONFIG.addCooldownSec, DEFAULT_CONFIG)), [ADD], setup);
    expect(later.events).toContainEqual({ type: "serverAdded", id: 5 });
  });

  it("refuses to add servers with no budget left", () => {
    const broke = { ...createMatch(setup, 1), budget: 0 };
    expect(step(broke, [ADD], setup).events).toContainEqual({
      type: "actionRejected",
      action: "addServer",
      reason: "noBudget",
    });
  });

  it("cancels a booting server before removing an online one", () => {
    const added = step(createMatch(setup, 1), [ADD], setup).state;
    const { state, events } = step(added, [REMOVE], setup);
    expect(events).toContainEqual({ type: "serverRemoved", id: 4 });
    expect(state.servers.every((u) => u.bootTicksLeft === 0)).toBe(true);
  });

  it("never goes below the minimum number of servers", () => {
    const one = { ...createMatch(setup, 1), servers: [{ id: 0, bootTicksLeft: 0 }] };
    expect(step(one, [REMOVE], setup).events).toContainEqual({
      type: "actionRejected",
      action: "removeServer",
      reason: "minServers",
    });
  });

  it("drains budget for running and booting servers", () => {
    const start = createMatch(setup, 1);
    const after = step(start, [ADD], setup).state;
    const perTick = DEFAULT_CONFIG.serverCostPerSec / DEFAULT_CONFIG.tickRate;
    expect(start.budget - after.budget).toBeCloseTo(5 * perTick);
  });

  it("crashes at zero health, locks buttons, then reboots", () => {
    const dying = { ...createMatch(setup, 1), health: 1.02, servers: [{ id: 0, bootTicksLeft: 0 }] };
    const crashed = step(dying, [], setup);
    expect(crashed.events).toContainEqual({ type: "crashed" });
    expect(crashed.state.health).toBe(0);
    expect(crashed.state.totals.crashes).toBe(1);

    expect(step(crashed.state, [ADD], setup).events).toContainEqual({
      type: "actionRejected",
      action: "addServer",
      reason: "crashed",
    });

    const crashTicks = toTicks(DEFAULT_CONFIG.crashSec, DEFAULT_CONFIG);
    const almost = idle(crashed.state, crashTicks - 1);
    expect(almost.crashTicksLeft).toBe(1);
    const back = step(almost, [], setup);
    expect(back.events).toContainEqual({ type: "rebooted" });
    expect(back.state.health).toBe(DEFAULT_CONFIG.rebootHealth);
    expect(back.state.totals.downtimeTicks).toBe(crashTicks);
  });

  it("serves nobody while the system is down", () => {
    const down = { ...createMatch(setup, 1), crashTicksLeft: 10 };
    const { state } = step(down, [], setup);
    expect(state.totals.served).toBe(0);
    expect(state.totals.lost).toBeGreaterThan(0);
  });

  it("ends after the round length and rejects late actions", () => {
    const ended = idle(createMatch(setup, 1), toTicks(ROUND_1.durationSec, DEFAULT_CONFIG));
    expect(ended.phase).toBe("ended");
    expect(step(ended, [ADD], setup).events).toEqual([{ type: "actionRejected", action: "addServer", reason: "ended" }]);
  });
});

describe("determinism", () => {
  it("same seed + same bot ⇒ identical match", () => {
    const a = runMatch(setup, 9, BOTS.humanFast(DEFAULT_CONFIG));
    const b = runMatch(setup, 9, BOTS.humanFast(DEFAULT_CONFIG));
    expect(a.state).toEqual(b.state);
    expect(a.log).toEqual(b.log);
  });

  it("replaying the action log reproduces the match exactly", () => {
    for (const bot of ["humanSlow", "sensible", "spam"] as const) {
      const run = runMatch(setup, 3, BOTS[bot](DEFAULT_CONFIG));
      expect(run.log.length).toBeGreaterThan(0);
      expect(replay(setup, 3, run.log)).toEqual(run.state);
    }
  });
});
