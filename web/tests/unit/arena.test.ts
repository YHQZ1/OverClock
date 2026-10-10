import { describe, expect, it } from "vitest";
import { lineLength } from "../../src/game/arena/Arena";
import { slotXY, unitBox, unitCentre, SLOTS } from "../../src/game/arena/scene";
import { site } from "./fixtures";

describe("arena: what the picture shows", () => {
  it("draws a short line when everyone's getting in, and a long one when people can't", () => {
    const calm = lineLength(site({ crowd: 1, servedShare: 1 }));
    const jammed = lineLength(site({ crowd: 1.8, servedShare: 0.5 }));
    expect(calm).toBeLessThanOrEqual(6);
    expect(jammed).toBeGreaterThan(calm);
  });

  it("never draws more chips than the conduit holds, or fewer than a couple", () => {
    expect(lineLength(site({ crowd: 5, servedShare: 0 }))).toBe(SLOTS);
    expect(lineLength(site({ crowd: 0, servedShare: 1 }))).toBeGreaterThanOrEqual(2);
  });

  it("fills the racks left to right, four to a rack, top to bottom", () => {
    const a = unitBox("left", 0), b = unitBox("left", 1), c = unitBox("left", 4);
    expect(b.x).toBe(a.x);
    expect(b.y).toBeGreaterThan(a.y);
    expect(c.x).toBeGreaterThan(a.x);
    expect(c.y).toBe(a.y);
    const [cx, cy] = unitCentre("left", 0);
    expect(cx).toBeCloseTo(a.x + a.w / 2);
    expect(cy).toBeCloseTo(a.y + a.h / 2);
  });

  it("lines up the queue on the side of the room nearest the aisle", () => {
    const [lx] = slotXY("left", 3), [lx0] = slotXY("left", 0);
    const [rx] = slotXY("right", 3), [rx0] = slotXY("right", 0);
    expect(lx).toBeGreaterThan(lx0); // the left room's line runs right, towards the middle
    expect(rx).toBeLessThan(rx0); // the right room's line runs left
  });
});
