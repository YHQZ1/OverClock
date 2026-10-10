import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDemo } from "../../src/services/demo.js";
import { ATTACKS } from "../../src/sim/index.js";

const { recording, summary } = buildDemo();

describe("the demo match", () => {
  it("shows every attack, and at least one being stopped", () => {
    const shown = new Set(recording.frames.flatMap((f) => f.flights.map((x) => x.attack)));
    expect([...shown].sort()).toEqual([...ATTACKS].sort());
    expect(summary.blocked.length).toBeGreaterThan(0);
    expect(summary.landed.length).toBeGreaterThan(0);
  });

  it("tells a true story: a surge hurts a site with no spare counters, and adding them helps", () => {
    const blue = (t: number) => recording.frames.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).sites[1];
    expect(blue(9.4).servedShare).toBeLessThan(0.8); // the wave hits
    expect(blue(12).servedShare).toBeGreaterThan(0.9); // the extra counters caught up
  });

  it("is recorded in time order with a caption near the start and the end", () => {
    const times = recording.frames.map((f) => f.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(recording.captions[0]!.at).toBe(0);
    expect(recording.captions.at(-1)!.at).toBeLessThan(recording.durationSec);
  });

  it("matches the file the web app plays — re-record with `pnpm --filter @overclock/server demo` after rule changes", () => {
    const file = new URL("../../../web/src/game/demo.json", import.meta.url);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(recording);
  });
});
