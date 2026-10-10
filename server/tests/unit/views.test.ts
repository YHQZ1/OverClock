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

  it("show a site's wrecked servers and frozen controls to everyone", () => {
    let s = createDuel(setup, 1);
    s = { ...s, sites: { 1: { ...s.sites[1], coins: 5000 }, 2: s.sites[2] } };
    s = step(s, [{ side: 1, kind: "attack", item: "destroy" }], setup).state;
    s = run(s, toTicks(DEFAULT_CONFIG.items.attacks.destroy.warningSec, DEFAULT_CONFIG) + 1);

    for (const side of [1, 2] as const) {
      const view = toMatchView(s, side, setup, live);
      const victim = side === 2 ? view.me : view.them;
      expect(victim.servers.filter((u) => u.state === "wrecked")).toHaveLength(2);
    }
  });

  it("list every shop item with its price, cooldown and affordability", () => {
    const view = toMatchView(createDuel(setup, 1), 1, setup, { round: 1, phase: "buy" });
    expect(view.shop.filter((i) => i.kind === "defence")).toHaveLength(3);
    expect(view.shop.filter((i) => i.kind === "utility")).toHaveLength(4);
    expect(view.shop.filter((i) => i.kind === "attack")).toHaveLength(5);
    const server = view.shop.find((i) => i.id === "server")!;
    expect(server).toMatchObject({ owned: ROUNDS[0]!.startServers, affordable: true, cooldown: 0 });
  });

  it("show what selling a defence would give back, and nothing for cards that can't be sold", () => {
    let s = createDuel(setup, 1);
    s = { ...s, sites: { ...s.sites, 1: { ...s.sites[1], coins: 1000 } } };
    const none = toMatchView(s, 1, setup, { round: 1, phase: "buy" }).shop;
    expect(none.find((i) => i.id === "bouncer")!.refund).toBe(0); // not owned yet
    expect(none.find((i) => i.id === "surge")!.refund).toBe(0);
    expect(none.find((i) => i.id === "server")!.refund).toBeGreaterThan(0); // starts with spare servers

    s = step(s, [{ side: 1, kind: "buy", item: "bouncer" }], setup, { paused: true }).state;
    const owned = toMatchView(s, 1, setup, { round: 1, phase: "buy" }).shop.find((i) => i.id === "bouncer")!;
    expect(owned.refund).toBe(setup.config.items.defences.bouncer.price * setup.config.sellRefund);
  });

  it("show the attacker its attacks in flight", () => {
    let s = createDuel(setup, 1);
    s = step(s, [{ side: 1, kind: "attack", item: "surge" }], setup).state;
    expect(toMatchView(s, 1, setup, live).outgoing).toEqual([expect.objectContaining({ attack: "surge" })]);
    expect(toMatchView(s, 2, setup, live).incoming).toEqual([expect.objectContaining({ attack: "surge" })]);
  });
});
