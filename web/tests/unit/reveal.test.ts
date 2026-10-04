import { describe, expect, it } from "vitest";
import { ITEM_INFO } from "../../src/game/items";
import { DECODED, PARTS_DECODED, THEME_REVEAL } from "../../src/game/reveal";
import { THEME_IDS } from "../../src/themes/themes";

describe("what you actually built", () => {
  it("decodes every shop item with a real name, an explanation and an example", () => {
    for (const id of Object.keys(ITEM_INFO) as (keyof typeof ITEM_INFO)[]) {
      expect(DECODED[id].real, id).toBeTruthy();
      expect(DECODED[id].what.length, id).toBeGreaterThan(30);
      expect(DECODED[id].example, id).toBeTruthy();
    }
  });

  it("names every part of the map, and has a story and three apps to build for every theme", () => {
    expect(PARTS_DECODED.map((p) => p.part)).toEqual(["crowd", "door", "servers", "shelf", "db"]);
    for (const t of THEME_IDS) {
      expect(THEME_REVEAL[t].headline, t).toBeTruthy();
      expect(THEME_REVEAL[t].build, t).toHaveLength(3);
    }
  });
});
