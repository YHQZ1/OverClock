import { describe, expect, it } from "vitest";
import { toMatchView } from "../../src/services/match.view.js";
import { DEFAULT_CONFIG, ROUNDS, createDuel, step, toTicks, type DuelState, type MatchSetup } from "../../src/sim/index.js";

const setup: MatchSetup = { scenario: ROUNDS[0]!, config: DEFAULT_CONFIG };
const live = { round: 1, phase: "live" as const };

function run(state: DuelState, ticks: number): DuelState {
  for (let i = 0; i < ticks; i++) state = step(state, [], setup).state;
  return state;
}

describe("match views", () => {
  it("give each side its own coins and hide the opponent's", () => {
    const s = run(createDuel(setup, 1), 10);
    const view = toMatchView(s, 1, setup, live);
    expect(view.side).toBe(1);
    expect(view.me.coins).toBeGreaterThan(0);
    expect("coins" in view.them).toBe(false);
  });

  it("never expose raw traffic numbers — only relative crowd and shares", () => {
    const view = toMatchView(run(createDuel(setup, 1), 10), 2, setup, live);
    expect(view.me.crowd).toBeGreaterThan(0.5);
    expect(view.me.crowd).toBeLessThan(2);
    expect(view.me.servedShare).toBeLessThanOrEqual(1);
    expect(JSON.stringify(view)).not.toMatch(/peopleRate|botRate|trafficRate/);
  });

  it("black out a blindfolded side's own map and warnings — but not for the opponent", () => {
    let s = createDuel(setup, 1);
    s = { ...s, sites: { 1: { ...s.sites[1], coins: 5000 }, 2: s.sites[2] } };
    s = step(s, [{ side: 1, kind: "attack", item: "blindfold" }], setup).state;
    s = step(s, [{ side: 1, kind: "attack", item: "bots" }], setup).state; // regrouping — rejected, fine
    s = run(s, toTicks(3, DEFAULT_CONFIG));

    const victim = toMatchView(s, 2, setup, live);
    expect(victim.me.blind).toBe(true);
    expect(Object.values(victim.me.parts).every((p) => p === "hidden")).toBe(true);
    expect(victim.me.servers.every((u) => u.state === "unknown")).toBe(true);
    expect(victim.incoming).toEqual([]);

    const attacker = toMatchView(s, 1, setup, live);
    expect(attacker.them.blind).toBe(false);
    expect(attacker.them.parts.servers).not.toBe("hidden");
  });

  it("list every shop item with its price, cooldown and affordability", () => {
    const view = toMatchView(createDuel(setup, 1), 1, setup, { round: 1, phase: "buy" });
    expect(view.shop.filter((i) => i.kind === "defence")).toHaveLength(7);
    expect(view.shop.filter((i) => i.kind === "utility")).toHaveLength(4);
    expect(view.shop.filter((i) => i.kind === "attack")).toHaveLength(9);
    const server = view.shop.find((i) => i.id === "server")!;
    expect(server).toMatchObject({ owned: ROUNDS[0]!.startServers, affordable: true, cooldown: 0 });
  });

  it("show the attacker its attacks in flight", () => {
    let s = createDuel(setup, 1);
    s = step(s, [{ side: 1, kind: "attack", item: "surge" }], setup).state;
    expect(toMatchView(s, 1, setup, live).outgoing).toEqual([expect.objectContaining({ attack: "surge" })]);
    expect(toMatchView(s, 2, setup, live).incoming).toEqual([expect.objectContaining({ attack: "surge" })]);
  });
});
