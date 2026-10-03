// Seeded RNG (mulberry32). The generator state is a plain number that lives
// in the match state, so the same seed always yields the same game.

export type RngState = number;

/** Next float in [0, 1) plus the advanced generator state. */
export function nextFloat(state: RngState): [value: number, next: RngState] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Float in [min, max). */
export function nextRange(state: RngState, min: number, max: number): [value: number, next: RngState] {
  const [v, next] = nextFloat(state);
  return [min + v * (max - min), next];
}

/** Normalise any integer seed into a generator state. */
export function seedRng(seed: number): RngState {
  return seed | 0;
}
