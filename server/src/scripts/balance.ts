// Bot balance report: plays every bot over many seeds and prints a table.
// Usage: pnpm --filter @overclock/server balance [runs]

import { BOTS, DEFAULT_CONFIG, ROUND_1, runMatch, scoreOf, type BotName, type MatchSetup } from "../sim/index.js";

const runs = Number(process.argv[2] ?? 200);
const setup: MatchSetup = { scenario: ROUND_1, config: DEFAULT_CONFIG };

type Row = {
  bot: BotName;
  score: number;
  min: number;
  max: number;
  served: number;
  lost: number;
  budget: number;
  crashes: number;
  downtime: number;
  idleSec: number;
  peak: number;
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const rows: Row[] = (Object.keys(BOTS) as BotName[]).map((bot) => {
  const results = Array.from({ length: runs }, (_, seed) => {
    const { state } = runMatch(setup, seed + 1, BOTS[bot](setup.config));
    return { state, score: scoreOf(state, setup.config) };
  });
  const totals = results.map((r) => r.score.total);
  return {
    bot,
    score: avg(totals),
    min: Math.min(...totals),
    max: Math.max(...totals),
    served: avg(results.map((r) => r.score.served)),
    lost: avg(results.map((r) => r.score.lost)),
    budget: avg(results.map((r) => r.score.budgetSaved)),
    crashes: avg(results.map((r) => r.state.totals.crashes)),
    downtime: avg(results.map((r) => r.score.downtimeSec)),
    idleSec: avg(results.map((r) => r.state.totals.idleServerTicks / setup.config.tickRate)),
    peak: avg(results.map((r) => r.state.totals.peakServers)),
  };
});

const n = (x: number, digits = 0) => x.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const best = Math.max(...rows.map((r) => r.score));

console.log(`\n${setup.scenario.id} · ${runs} seeds per bot\n`);
console.log("| Bot | Avg score | vs best | Min | Max | Served | Lost | Budget left | Crashes | Downtime s | Idle server-s | Peak servers |");
console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const r of rows) {
  console.log(
    `| ${r.bot} | ${n(r.score)} | ${n((r.score / best) * 100)}% | ${n(r.min)} | ${n(r.max)} | ${n(r.served)} | ${n(r.lost)} | ${n(r.budget)} | ${n(r.crashes, 2)} | ${n(r.downtime, 1)} | ${n(r.idleSec)} | ${n(r.peak, 1)} |`,
  );
}
console.log();
