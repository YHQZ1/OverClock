import { describe, expect, it } from "vitest";
import {
  BOTS,
  DEFAULT_CONFIG,
  ROUNDS,
  createDuel,
  priceOf,
  replay,
  runRound,
  step,
  toTicks,
  type Action,
  type DuelState,
  type ItemId,
  type MatchSetup,
  type Side,
} from "../../src/sim/index.js";

const config = DEFAULT_CONFIG;
const setup: MatchSetup = { scenario: ROUNDS[0]!, config };
const t = (sec: number) => toTicks(sec, config);

const buy = (side: Side, item: ItemId): Action => ({ side, kind: "buy", item });
const sell = (side: Side, item: ItemId): Action => ({ side, kind: "sell", item });
const use = (side: Side, item: ItemId): Action => ({ side, kind: "use", item });
const attack = (side: Side, item: ItemId): Action => ({ side, kind: "attack", item });

function run(state: DuelState, ticks: number, actions: Action[] = []): DuelState {
  state = step(state, actions, setup).state;
  for (let i = 1; i < ticks; i++) state = step(state, [], setup).state;
  return state;
}
const rich = (state: DuelState, coins = 5000): DuelState => ({
  ...state,
  sites: { 1: { ...state.sites[1], coins }, 2: { ...state.sites[2], coins } },
});

describe("fair start", () => {
  it("both sites start identical and see the same crowd", () => {
    const s = run(createDuel(setup, 3), t(20));
    expect(s.sites[1].totals.served).toBeCloseTo(s.sites[2].totals.served, 6);
    expect(s.sites[1].coins).toBeCloseTo(s.sites[2].coins, 6);
  });

  it("same seed + same actions ⇒ identical round, including the buy phase", () => {
    const policies = { 1: BOTS.balanced(config), 2: BOTS.humanSlow(config) };
    const a = runRound(setup, 11, policies);
    expect(a.log.some((l) => l.tick === -1)).toBe(true);
    expect(replay(setup, 11, a.log)).toEqual(a.state);
  });

  it("step never modifies its input", () => {
    const before = rich(createDuel(setup, 1));
    const copy = structuredClone(before);
    step(before, [buy(1, "server"), attack(2, "bots"), buy(1, "bouncer")], setup);
    expect(before).toEqual(copy);
  });
});

describe("shop", () => {
  it("servers start up, other defences set up, both cost coins", () => {
    let s = rich(createDuel(setup, 1));
    s = step(s, [buy(1, "server"), buy(1, "bouncer")], setup).state;
    const site = s.sites[1];
    expect(site.totals.coinsSpent).toBe(priceOf(site, "server", config) + priceOf(site, "bouncer", config));
    expect(site.servers.at(-1)!.bootTicksLeft).toBeGreaterThan(0);
    expect(site.owned.bouncer).toBe(0);
    expect(site.setups).toHaveLength(1);

    s = run(s, t(config.setupSec));
    expect(s.sites[1].owned.bouncer).toBe(1);
    expect(s.sites[1].servers.every((u) => u.bootTicksLeft === 0)).toBe(true);
  });

  it("is instant during the buy phase, and the clock stands still", () => {
    const s = step(rich(createDuel(setup, 1)), [buy(1, "server"), buy(1, "lockAddress")], setup, { paused: true }).state;
    expect(s.tick).toBe(0);
    expect(s.sites[1].owned.lockAddress).toBe(1);
    expect(s.sites[1].servers.at(-1)!.bootTicksLeft).toBe(0);
  });

  it("refuses attacks and utilities during the buy phase", () => {
    const { events } = step(rich(createDuel(setup, 1)), [attack(1, "surge"), use(1, "shield")], setup, { paused: true });
    expect(events.filter((e) => e.type === "rejected" && e.reason === "paused")).toHaveLength(2);
  });

  it("sells for a partial refund and keeps at least one server", () => {
    let s = createDuel(setup, 1);
    const coins = s.sites[1].coins;
    s = step(s, [sell(1, "server")], setup).state;
    expect(s.sites[1].servers).toHaveLength(ROUNDS[0]!.startServers - 1);
    expect(s.sites[1].coins).toBeGreaterThan(coins + config.items.defences.server.price * config.sellRefund - 1);

    s = { ...s, sites: { ...s.sites, 1: { ...s.sites[1], servers: [{ id: 0, bootTicksLeft: 0, meltedTicksLeft: 0 }] } } };
    expect(step(s, [sell(1, "server")], setup).events).toContainEqual(
      expect.objectContaining({ type: "rejected", reason: "min" }),
    );
  });

  it("explains why a purchase fails", () => {
    const broke = { ...createDuel(setup, 1) };
    broke.sites = { ...broke.sites, 1: { ...broke.sites[1], coins: 10 } };
    const reasons = step(broke, [buy(1, "splitter"), sell(1, "bouncer"), use(1, "instantBackup")], setup).events.map(
      (e) => e.type === "rejected" && e.reason,
    );
    expect(reasons).toEqual(["coins", "none", "none"]);
  });
});

describe("attacks", () => {
  it("are announced, then land after the warning", () => {
    const s0 = rich(createDuel(setup, 1));
    const sent = step(s0, [attack(1, "surge")], setup);
    expect(sent.events).toContainEqual(expect.objectContaining({ side: 2, type: "attackIncoming", attack: "surge" }));
    // The warning runs from the tick it was sent: 3s = 30 ticks in total.
    let s = run(sent.state, t(config.items.attacks.surge.warningSec) - 2);
    expect(s.sites[2].effects.find((e) => e.kind === "surge")).toBeUndefined();
    s = run(s, 1);
    expect(s.sites[2].effects.find((e) => e.kind === "surge")).toBeDefined();
  });

  it("make attackers regroup and cost more each time", () => {
    let s = rich(createDuel(setup, 1));
    const first = priceOf(s.sites[1], "surge", config);
    s = step(s, [attack(1, "surge")], setup).state;
    expect(step(s, [attack(1, "bots")], setup).events).toContainEqual(
      expect.objectContaining({ type: "rejected", reason: "cooldown" }),
    );
    expect(priceOf(s.sites[1], "surge", config)).toBeGreaterThan(first);
  });

  it("bounce off a shield", () => {
    let s = rich(createDuel(setup, 1));
    s = step(s, [attack(1, "destroy"), use(2, "shield")], setup).state;
    s = run(s, t(config.items.attacks.destroy.warningSec) + 1);
    expect(s.sites[2].servers.every((u) => u.meltedTicksLeft === 0)).toBe(true);
    expect(s.sites[2].totals.attacksBlocked).toBe(1);
  });

  it("destroy wrecks two servers; instant backup brings them back", () => {
    let s = rich(createDuel(setup, 1));
    s = run(s, t(config.items.attacks.destroy.warningSec) + 1, [attack(1, "destroy")]);
    expect(s.sites[2].servers.filter((u) => u.meltedTicksLeft > 0)).toHaveLength(2);
    expect(s.sites[2].servers.some((u) => u.meltedTicksLeft > 0)).toBe(true);
    s = step(s, [use(2, "instantBackup")], setup).state;
    expect(s.sites[2].servers.every((u) => u.meltedTicksLeft === 0)).toBe(true);
  });
});

describe("new attacks", () => {
  const land = (item: ItemId, prep: (s: DuelState) => DuelState = (s) => s) => {
    const s = prep(rich(createDuel(setup, 1)));
    return run(s, t(config.items.attacks.surge.warningSec) + 1, [attack(1, item)]);
  };

  it("wrong turn sends their visitors to you", () => {
    const s = run(land("wrongTurn"), t(3));
    expect(s.sites[1].flow.peopleRate).toBeGreaterThan(s.sites[2].flow.peopleRate * 1.5);
  });

  it("a locked address stops wrong turn after a blip", () => {
    const locked = (s: DuelState) => step(s, [buy(2, "lockAddress")], setup, { paused: true }).state;
    const s = run(land("wrongTurn", locked), t(2));
    expect(s.sites[1].flow.peopleRate).toBeCloseTo(s.sites[2].flow.peopleRate, 5);
  });

  it("jam freezes their shop", () => {
    const s = land("jam");
    expect(step(s, [buy(2, "server")], setup).events).toContainEqual(
      expect.objectContaining({ side: 2, type: "rejected", reason: "jammed" }),
    );
  });

  it("slowing their servers lets fewer people in", () => {
    const busy = (s: DuelState) => ({ ...s, crowdRate: 200 });
    const slowed = run(land("slowServers", busy), t(3));
    expect(slowed.sites[2].flow.servedShare).toBeLessThan(slowed.sites[1].flow.servedShare);
  });

  it("a traffic splitter shrugs off being knocked out", () => {
    const withSplitter = (s: DuelState) => step(s, [buy(2, "splitter")], setup, { paused: true }).state;
    const s = land("breakSplitter", withSplitter);
    expect(s.sites[2].effects.find((e) => e.kind === "breakSplitter")!.ticksLeft).toBeLessThanOrEqual(t(2));
  });

  it("a backup monitor shortens a blindfold to a blip", () => {
    const monitored = (s: DuelState) => step(s, [buy(2, "backupMonitor")], setup, { paused: true }).state;
    expect(land("blindfold").sites[2].effects.find((e) => e.kind === "blindfold")!.ticksLeft).toBeGreaterThan(t(5));
    expect(land("blindfold", monitored).sites[2].effects.find((e) => e.kind === "blindfold")!.ticksLeft).toBeLessThanOrEqual(t(1));
  });

  it("every attack makes all attacks pricier for the round", () => {
    let s = rich(createDuel(setup, 1));
    const before = priceOf(s.sites[1], "bots", config);
    s = step(s, [attack(1, "surge")], setup).state;
    expect(priceOf(s.sites[1], "bots", config)).toBeGreaterThan(before);
  });
});

describe("crash, reboot and money", () => {
  it("a crashed site locks buttons, reboots protected", () => {
    const s0 = rich(createDuel(setup, 1));
    const dying = { ...s0, sites: { ...s0.sites, 2: { ...s0.sites[2], health: 1.01, servers: [{ id: 0, bootTicksLeft: 0, meltedTicksLeft: 0 }] } } };
    const crashed = step(dying, [], setup);
    expect(crashed.events).toContainEqual({ side: 2, type: "crashed" });
    expect(step(crashed.state, [buy(2, "server")], setup).events).toContainEqual(
      expect.objectContaining({ type: "rejected", reason: "down" }),
    );
    const back = run(crashed.state, t(config.crashSec));
    expect(back.sites[2].health).toBe(config.rebootHealth);
    expect(back.sites[2].effects.some((e) => e.kind === "protected")).toBe(true);
  });

  it("can't pay upkeep → the newest server switches off", () => {
    const s0 = createDuel(setup, 1);
    const servers = Array.from({ length: 30 }, (_, id) => ({ id, bootTicksLeft: 0, meltedTicksLeft: 0 })); // more upkeep than income
    const broke = { ...s0, sites: { ...s0.sites, 1: { ...s0.sites[1], coins: 0, servers } } };
    const { events, state } = step(broke, [], setup);
    expect(events).toContainEqual({ side: 1, type: "serverSwitchedOff" });
    expect(state.sites[1].servers).toHaveLength(29);
    expect(state.sites[1].coins).toBe(0);
  });
});
