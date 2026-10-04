// How much each attack swings the score, per coin, against an undefended site.
// Usage: pnpm --filter @overclock/server exec tsx src/scripts/attackvalue.ts
import { ATTACKS, DEFAULT_CONFIG, ROUNDS, priceOf, roundResult, runRound, toTicks, type AttackId, type Policy } from "../sim/index.js";

const config = DEFAULT_CONFIG;
const setup = { scenario: { ...ROUNDS[1]!, rushes: [] }, config };
const at = toTicks(30, config);
const none: Policy = () => [];
const swing = (attack: AttackId | null) => {
  const attacker: Policy = (s, side, phase) => (attack && phase === "live" && s.tick === at ? [{ side, kind: "attack", item: attack }] : []);
  const r = roundResult(runRound(setup, 3, { 1: attacker, 2: none }).state, config);
  return r.scores[1].total - r.scores[2].total;
};
const base = swing(null);
console.log("| Attack | Price | Score swing | Swing per coin |\n|---|---:|---:|---:|");
for (const a of ATTACKS) {
  const d = swing(a) - base;
  const price = config.items.attacks[a].price;
  console.log(`| ${a} | ${price} | ${Math.round(d)} | ${(d / price).toFixed(1)} |`);
}
void priceOf;
