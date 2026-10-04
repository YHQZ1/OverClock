// Duel balance report: every bot plays every bot over many seeds and all
// three rounds. Usage: pnpm --filter @overclock/server balance [seeds]

import { BOTS, DEFAULT_CONFIG, ROUNDS, matchTotals, roundResult, runRound, type BotName, type RoundResult } from "../sim/index.js";

const seeds = Number(process.argv[2] ?? 40);
const config = DEFAULT_CONFIG;
const names = Object.keys(BOTS) as BotName[];

function playMatch(a: BotName, b: BotName, seed: number) {
  const rounds: RoundResult[] = ROUNDS.map((scenario, i) => {
    const { state } = runRound({ scenario, config }, seed * 10 + i, { 1: BOTS[a](config), 2: BOTS[b](config) });
    return roundResult(state, config);
  });
  return { rounds, ...matchTotals(rounds) };
}

type Cell = { wins: number; draws: number; score: number; crashes: number; attacks: number };
const table = new Map<string, Cell>();
const record = new Map<BotName, { wins: number; games: number; score: number }>();
for (const n of names) record.set(n, { wins: 0, games: 0, score: 0 });

for (const a of names) {
  for (const b of names) {
    const cell: Cell = { wins: 0, draws: 0, score: 0, crashes: 0, attacks: 0 };
    for (let seed = 1; seed <= seeds; seed++) {
      const m = playMatch(a, b, seed);
      if (m.winner === 1) cell.wins++;
      else if (m.winner === null) cell.draws++;
      cell.score += m.totals[1].total;
      cell.crashes += m.totals[1].crashes;
      cell.attacks += m.rounds.reduce((s, r) => s + r.scores[1].attacksSent, 0);
      if (a !== b) {
        const ra = record.get(a)!;
        ra.games++;
        ra.score += m.totals[1].total;
        if (m.winner === 1) ra.wins++;
      }
    }
    table.set(`${a}|${b}`, cell);
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const n = (x: number) => Math.round(x).toLocaleString("en-US");

console.log(`\nDuel · 3 rounds · ${seeds} seeds per pairing\n`);
console.log("Win rate of ROW vs COLUMN (mirror = row wins as side 1)\n");
console.log(`| | ${names.join(" | ")} |`);
console.log(`|---|${names.map(() => "---:").join("|")}|`);
for (const a of names) {
  console.log(`| **${a}** | ${names.map((b) => pct(table.get(`${a}|${b}`)!.wins / seeds)).join(" | ")} |`);
}

console.log("\n| Bot | Win rate vs others | Avg match score | Avg crashes / match | Attacks / match |");
console.log("|---|---:|---:|---:|---:|");
for (const a of names) {
  const r = record.get(a)!;
  const cells = names.filter((b) => b !== a).map((b) => table.get(`${a}|${b}`)!);
  const crashes = cells.reduce((s, c) => s + c.crashes, 0) / (cells.length * seeds);
  const attacks = cells.reduce((s, c) => s + c.attacks, 0) / (cells.length * seeds);
  console.log(`| ${a} | ${pct(r.wins / r.games)} | ${n(r.score / r.games)} | ${crashes.toFixed(2)} | ${attacks.toFixed(1)} |`);
}
console.log();
