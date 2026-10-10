// The arena's geometry: one 1366×450 box, a server room on each side with an
// aisle between. Left is the viewer's own site on the live screen.

export type Where = "left" | "right";

export const VIEW_W = 1366;
export const VIEW_H = 450;
export const BW = 430; // a room's width
export const GROUND = 292;
export const BASES = {
  left: { x: 44, door: 259, dir: 1 },
  right: { x: 892, door: 1107, dir: -1 },
} as const;

export const RACK_Y = 104;
export const RACK_W = 118;
export const RACK_GAP = 16;
export const UNIT_H = 30;
export const UNIT_STEP = 34;
export const UNITS_PER_RACK = 4;
export const RACKS = 3;
export const TUBE_Y = 318; // the conduit the requests travel in
export const TUBE_LEN = 400;
export const SLOTS = 13;

export const other = (w: Where): Where => (w === "left" ? "right" : "left");

/** Where server `i` sits: racks fill left to right, top to bottom. */
export function unitBox(where: Where, i: number) {
  const r = Math.floor(i / UNITS_PER_RACK);
  const u = i % UNITS_PER_RACK;
  return { x: BASES[where].x + 20 + r * (RACK_W + RACK_GAP) + 8, y: RACK_Y + 12 + u * UNIT_STEP, w: RACK_W - 16, h: UNIT_H };
}
export function unitCentre(where: Where, i: number): [number, number] {
  const b = unitBox(where, i);
  return [b.x + b.w / 2, b.y + b.h / 2];
}

/** The i-th place in the line, counting from the gateway outwards. */
export function slotXY(where: Where, i: number): [number, number] {
  const b = BASES[where];
  return [b.door + b.dir * (62 + i * 26), TUBE_Y];
}

/** Stable 0 → 1 per number, so a chip keeps its look between frames. */
export const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
