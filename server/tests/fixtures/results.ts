import type { MatchRecord } from "../../src/services/result.store.js";

let n = 0;
/** A finished match where side 1 scored `a` points and side 2 `b`. */
export function record(a: number, b: number, format: "1v1" | "2v2" = "1v1"): MatchRecord {
  n++;
  const team = (side: 1 | 2, points: number, name: string) => ({
    side,
    name,
    players: [name],
    total: points - 1000,
    points,
    won: a === b ? null : (side === 1) === a > b,
    crashes: 0,
    downtimeSec: 0,
  });
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    code: "ABCD",
    format,
    theme: "bookmyshow",
    winner: a === b ? null : a > b ? 1 : 2,
    completedAt: new Date(1_800_000_000_000 + n * 1000),
    teams: [team(1, a, `Home ${n}`), team(2, b, `Away ${n}`)],
    rounds: [{ round: 1, seed: 7, winner: 1, scores: {} as never, log: [] }],
  };
}
