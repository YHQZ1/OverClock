import type { ScreenMatch } from "@server/types/contracts.js";
import { describe, expect, it } from "vitest";
import { ROTATE_MS, advance, type Rotation } from "../../src/staff/rotation";

const match = (code: string, playing = true) => ({ code, sites: playing ? {} : null }) as ScreenMatch;
const start: Rotation = { featured: null, pinned: null, switchAt: 0 };

describe("/live rotation", () => {
  it("shows the first match, then moves on every 10 seconds — preferring matches in play", () => {
    const ms = [match("BBBB"), match("AAAA"), match("CCCC", false)];
    let r = advance(start, ms, 0);
    expect(r.featured).toBe("AAAA");
    expect(advance(r, ms, ROTATE_MS - 1).featured).toBe("AAAA");
    r = advance(r, ms, ROTATE_MS);
    expect(r.featured).toBe("BBBB");
    expect(advance(r, ms, ROTATE_MS * 2).featured).toBe("AAAA"); // CCCC is between rounds
  });

  it("rotates through briefings and breaks when nothing is in play", () => {
    const ms = [match("AAAA", false), match("BBBB", false)];
    const r = advance(start, ms, 0);
    expect(advance(r, ms, ROTATE_MS).featured).toBe("BBBB");
  });

  it("keeps a clicked match for its 10 seconds, even if it's between rounds", () => {
    const ms = [match("AAAA"), match("CCCC", false)];
    const clicked: Rotation = { featured: "CCCC", pinned: null, switchAt: 5 + ROTATE_MS };
    expect(advance(clicked, ms, 6000).featured).toBe("CCCC");
    expect(advance(clicked, ms, 5 + ROTATE_MS).featured).toBe("AAAA");
  });

  it("holds a pinned match until it ends, then rotates again", () => {
    const pinned: Rotation = { featured: "BBBB", pinned: "BBBB", switchAt: 0 };
    expect(advance(pinned, [match("AAAA"), match("BBBB")], ROTATE_MS * 5)).toMatchObject({ featured: "BBBB", pinned: "BBBB" });
    expect(advance(pinned, [match("AAAA")], ROTATE_MS * 5)).toMatchObject({ featured: "AAAA", pinned: null });
  });

  it("shows nothing with no matches", () => {
    expect(advance(start, [], 0).featured).toBeNull();
  });
});
