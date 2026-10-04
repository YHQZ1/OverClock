// One match between two bots, round by round: who sent what, what landed, what was bought.
// Usage: pnpm --filter @overclock/server exec tsx src/scripts/diag.ts balanced rusher

import { BOTS, DEFAULT_CONFIG, ROUNDS, roundResult, runRound, type BotName } from "../sim/index.js";
const [a, b] = (process.argv.slice(2) as BotName[]);
const config = DEFAULT_CONFIG;
ROUNDS.forEach((scenario, i) => {
  const run = runRound({ scenario, config }, 7 + i, { 1: BOTS[a!](config), 2: BOTS[b!](config) });
  const r = roundResult(run.state, config);
  console.log(`\n${scenario.id}: ${a} ${r.scores[1].total} vs ${b} ${r.scores[2].total}`);
  for (const side of [1, 2] as const) {
    const s = r.scores[side]; const site = run.state.sites[side];
    console.log(`  side ${side}: served ${s.served} lost ${s.lost} crashes ${s.crashes} sent ${s.attacksSent} landedOnMe ${s.attacksLanded} blocked ${s.attacksBlocked} earned ${s.coinsEarned} coinsLeft ${Math.round(site.coins)} servers ${site.servers.length} owned ${JSON.stringify(site.owned)}`);
  }
  const counts: Record<string, number> = {};
  for (const { event } of run.events) if (event.type === "attackLanded" || event.type === "attackSent" || event.type === "bought" || event.type === "used") { const k = `${event.side}:${event.type}:${"attack" in event ? event.attack : event.item}`; counts[k] = (counts[k] ?? 0) + 1; }
  console.log("  ", JSON.stringify(counts));
});
