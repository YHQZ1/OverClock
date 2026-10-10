import type { ItemId, MatchView, ShopItemView, SiteView } from "@server/types/contracts.js";

/** A calm, healthy site; override what a test cares about. */
export function site(overrides: Partial<SiteView> = {}): SiteView {
  return {
    health: 100,
    score: 1000,
    served: 1000,
    lost: 0,
    critical: false,
    downSecondsLeft: null,
    servers: [0, 1, 2, 3].map((id) => ({ id, state: "busy" as const, progress: 1 })),
    owned: { bouncer: 0, lockAddress: 0 },
    settingUp: [],
    parts: { door: "ok", servers: "ok" },
    bottleneck: null,
    crowd: 1,
    servedShare: 1,
    botShare: 0,
    effects: [],
    ...overrides,
  };
}

const KIND: Record<ItemId, ShopItemView["kind"]> = {
  server: "defence",
  bouncer: "defence",
  lockAddress: "defence",
  repair: "utility",
  shield: "utility",
  overclock: "utility",
  instantBackup: "utility",
  surge: "attack",
  bots: "attack",
  destroy: "attack",
  wrongTurn: "attack",
  jam: "attack",
};

/** All 12 cards, affordable and ready; `patch` overrides single cards by id. */
export function shop(patch: Partial<Record<ItemId, Partial<ShopItemView>>> = {}): ShopItemView[] {
  return (Object.keys(KIND) as ItemId[]).map((id) => ({
    id,
    kind: KIND[id],
    price: 100,
    owned: id === "server" ? 4 : 0,
    max: id === "server" ? 12 : 1,
    cooldown: 0,
    affordable: true,
    refund: 0,
    ...patch[id],
  }));
}

export function match(overrides: Partial<Omit<MatchView, "me">> & { me?: Partial<MatchView["me"]> } = {}): MatchView {
  const { me, ...rest } = overrides;
  return {
    side: 1,
    round: 1,
    phase: "live",
    timeLeftSec: 60,
    durationSec: 90,
    them: site(),
    shop: shop(),
    incoming: [],
    outgoing: [],
    ...rest,
    me: { ...site(), coins: 500, incomePerSec: 12, ...me },
  };
}
