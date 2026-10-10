import { describe, expect, it } from "vitest";
import { describe as line } from "../../src/game/feed";
import { THEME_IDS, THEME_INFO, itemHint } from "../../src/themes/themes";
import { ITEM_INFO } from "../../src/game/items";

describe("feed lines", () => {
  it("speak from your team's point of view", () => {
    expect(line({ side: 1, type: "attackLanded", attack: "bots" }, 1, "Priya")).toEqual({ text: "Bot army hit you", tone: "bad" });
    expect(line({ side: 2, type: "attackLanded", attack: "bots" }, 1, "Priya")).toEqual({ text: "Bot army hit them", tone: "good" });
    expect(line({ side: 2, type: "crashed" }, 1, "Priya")).toEqual({ text: "Their site went down!", tone: "good" });
  });

  it("say who on your team spent the coins", () => {
    expect(line({ side: 1, type: "bought", item: "bouncer", by: "Priya" }, 1, "Priya")?.text).toBe("You bought Bouncer");
    expect(line({ side: 1, type: "bought", item: "bouncer", by: "Rahul" }, 1, "Priya")?.text).toBe("Rahul bought Bouncer");
    expect(line({ side: 2, type: "bought", item: "bouncer", by: "Aisha" }, 1, "Priya")).toBeNull(); // their shopping stays secret
  });

  it("explain your own failed presses, not your teammate's", () => {
    expect(line({ side: 1, type: "rejected", kind: "buy", item: "bouncer", reason: "coins", by: "Priya" }, 1, "Priya")?.text).toBe(
      "Not enough coins — Bouncer",
    );
    expect(line({ side: 1, type: "rejected", kind: "use", item: "shield", reason: "jammed", by: "Priya" }, 1, "Priya")?.text).toBe(
      "Your controls are jammed — Shield",
    );
    expect(line({ side: 1, type: "rejected", kind: "buy", item: "server", reason: "coins", by: "Rahul" }, 1, "Priya")).toBeNull();
  });

  it("never use technical terms", () => {
    const texts = [
      line({ side: 1, type: "attackIncoming", attack: "bots", inSec: 3 }, 1, "P"),
      line({ side: 1, type: "attackLanded", attack: "wrongTurn" }, 1, "P"),
      line({ side: 1, type: "serversMelted", count: 2 }, 1, "P"),
      line({ side: 1, type: "defenceReady", item: "lockAddress" }, 1, "P"),
    ].map((l) => l?.text ?? "");
    for (const t of texts) expect(t).not.toMatch(/ddos|load balancer|dns|cache|cpu|latency/i);
  });

  it("use the theme's names", () => {
    const w = THEME_INFO.gpay.words;
    expect(line({ side: 2, type: "attackLanded", attack: "wrongTurn" }, 1, "P", w)?.text).toBe("Fake QR code hit them");
    expect(line({ side: 1, type: "bought", item: "bouncer", by: "P" }, 1, "P", w)?.text).toBe("You bought Fraud check");
    expect(line({ side: 1, type: "serversMelted", count: 2 }, 1, "P", w)?.text).toBe("2 payment lanes wrecked");
  });

  it("give every theme a name for every item, and fill every hint", () => {
    for (const id of THEME_IDS) {
      const w = THEME_INFO[id].words;
      for (const item of Object.keys(ITEM_INFO) as (keyof typeof ITEM_INFO)[]) {
        expect(w.names[item], `${id} ${item}`).toBeTruthy();
        expect(itemHint(w, item)).not.toMatch(/[{}]/);
        expect(`${w.names[item]} ${itemHint(w, item)}`).not.toMatch(/ddos|load balancer|dns|cache|cpu|latency|rate limit/i);
      }
    }
  });

  it("keeps each card's key the same in every theme — only the name changes", () => {
    const keys = Object.entries(ITEM_INFO).map(([id, info]) => `${id}:${info.key}`);
    expect(new Set(keys.map((k) => k.split(":")[1])).size).toBe(keys.length); // no two cards share a key
    for (const id of THEME_IDS) {
      const names = Object.values(THEME_INFO[id].words.names);
      expect(new Set(names).size, `${id} has duplicate card names`).toBe(names.length);
    }
  });
});
