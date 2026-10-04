import type { MatchView, SiteView } from "@server/types/contracts.js";

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
    owned: { splitter: 0, bouncer: 0, shelf: 0, backupDb: 0, lockAddress: 0, backupMonitor: 0 },
    settingUp: [],
    parts: { door: "ok", servers: "ok", shelf: "none", db: "ok" },
    bottleneck: null,
    crowd: 1,
    servedShare: 1,
    botShare: 0,
    effects: [],
    blind: false,
    ...overrides,
  };
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
    shop: [],
    incoming: [],
    outgoing: [],
    ...rest,
    me: { ...site(), coins: 500, incomePerSec: 12, upkeepPerSec: 4, ...me },
  };
}
