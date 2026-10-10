import {
  ATTACKS,
  DEFENCES,
  UTILITIES,
  other,
  priceOf,
  siteScore,
  type DuelState,
  type MatchSetup,
  type Part,
  type Side,
  type SiteState,
} from "../sim/index.js";
import type { MatchView, PartStatus, ServerSlotView, ShopItemView, SiteView } from "../types/contracts.js";

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

const statusOf = (pass: number): PartStatus => (pass >= 0.95 ? "ok" : pass >= 0.7 ? "strained" : "failing");

/** One site as anyone may see it (the opponent, or a big screen): no coins, never masked. */
export function siteView(site: SiteState, { scenario, config }: MatchSetup): SiteView {
  const tick = config.tickRate;
  const down = site.crashTicksLeft > 0;
  const online = site.servers.filter((u) => u.bootTicksLeft === 0 && u.meltedTicksLeft === 0).length;
  let busyLeft = Math.ceil(site.flow.utilization * online - 1e-9);
  const servers: ServerSlotView[] = site.servers.map((u) => {
    if (u.meltedTicksLeft > 0) return { id: u.id, state: "wrecked", progress: r1(u.meltedTicksLeft / (config.items.attacks.destroy.durationSec * tick)) };
    if (u.bootTicksLeft > 0) return { id: u.id, state: "booting", progress: r1(1 - u.bootTicksLeft / (config.bootSec * tick)) };
    if (down) return { id: u.id, state: "down", progress: 1 };
    return { id: u.id, state: busyLeft-- > 0 ? "busy" : "idle", progress: 1 };
  });

  const pass = site.flow.passShare;
  const parts: Record<Part, PartStatus> = down
    ? { door: "failing", servers: "failing" }
    : { door: statusOf(pass.door), servers: statusOf(pass.servers) };

  return {
    health: Math.round(site.health),
    score: Math.round(siteScore(site, config)),
    served: Math.round(site.totals.served),
    lost: Math.round(site.totals.lost),
    critical: site.critical,
    downSecondsLeft: down ? Math.ceil(site.crashTicksLeft / tick) : null,
    servers,
    owned: { ...site.owned },
    settingUp: site.setups.map((s) => s.item),
    parts,
    bottleneck: down ? null : site.flow.bottleneck,
    crowd: r2(site.flow.peopleRate / scenario.traffic.baseRate),
    servedShare: r2(site.flow.servedShare),
    botShare: site.flow.peopleRate > 0 ? r2(site.flow.botRate / site.flow.peopleRate) : 0,
    effects: site.effects.map((e) => ({
      kind: e.kind,
      secondsLeft: Math.ceil(e.ticksLeft / tick),
      share: r2(e.ticksLeft / e.totalTicks),
    })),
  };
}

function shopView(site: SiteState, { config }: MatchSetup): ShopItemView[] {
  const { defences, utilities, attacks } = config.items;
  const tick = config.tickRate;
  const coins = site.coins;
  return [
    ...DEFENCES.map((id): ShopItemView => {
      const owned = id === "server" ? site.servers.length : site.owned[id] + site.setups.filter((s) => s.item === id).length;
      const price = priceOf(site, id, config);
      return { id, kind: "defence", price, owned, max: defences[id].max, cooldown: 0, affordable: coins >= price && owned < defences[id].max };
    }),
    ...UTILITIES.map((id): ShopItemView => {
      const price = priceOf(site, id, config);
      const left = site.cooldowns[id] ?? 0;
      return { id, kind: "utility", price, owned: 0, max: 1, cooldown: r2(left / (utilities[id].cooldownSec * tick)), affordable: coins >= price };
    }),
    ...ATTACKS.map((id): ShopItemView => {
      const price = priceOf(site, id, config);
      const own = (site.cooldowns[id] ?? 0) / (attacks[id].cooldownSec * tick);
      const regroup = site.regroupTicks / (config.attackRegroupSec * tick);
      return { id, kind: "attack", price, owned: 0, max: 1, cooldown: r2(Math.max(own, regroup)), affordable: coins >= price };
    }),
  ];
}

/** Engine state → what one side may see. Hidden numbers stay on the server. */
export function toMatchView(
  state: DuelState,
  side: Side,
  setup: MatchSetup,
  meta: { round: number; phase: "buy" | "live" },
): MatchView {
  const { scenario, config } = setup;
  const me = state.sites[side];
  const them = state.sites[other(side)];
  const tick = config.tickRate;
  const income = me.flow.served * config.incomePerPerson * tick;

  return {
    side,
    round: meta.round,
    phase: meta.phase,
    timeLeftSec: Math.max(0, (state.durationTicks - state.tick) / tick),
    durationSec: scenario.durationSec,
    me: {
      ...siteView(me, setup),
      coins: Math.floor(me.coins),
      incomePerSec: Math.round(income),
    },
    them: siteView(them, setup),
    shop: shopView(me, setup),
    incoming: me.incoming.map((i) => ({ id: i.id, attack: i.attack, secondsLeft: r1(i.ticksUntil / tick) })),
    outgoing: them.incoming.map((i) => ({ id: i.id, attack: i.attack, secondsLeft: r1(i.ticksUntil / tick) })),
  };
}
