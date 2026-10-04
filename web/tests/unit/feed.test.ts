import { describe, expect, it } from "vitest";
import { describe as line } from "../../src/game/feed";

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
    expect(line({ side: 1, type: "rejected", kind: "buy", item: "splitter", reason: "coins", by: "Priya" }, 1, "Priya")?.text).toBe(
      "Not enough coins — Traffic splitter",
    );
    expect(line({ side: 1, type: "rejected", kind: "use", item: "shield", reason: "jammed", by: "Priya" }, 1, "Priya")?.text).toBe(
      "Your controls are jammed — Shield",
    );
    expect(line({ side: 1, type: "rejected", kind: "buy", item: "server", reason: "coins", by: "Rahul" }, 1, "Priya")).toBeNull();
  });

  it("never use technical terms", () => {
    const texts = [
      line({ side: 1, type: "attackIncoming", attack: "bots", inSec: 3 }, 1, "P"),
      line({ side: 1, type: "attackLanded", attack: "breakSplitter" }, 1, "P"),
      line({ side: 1, type: "serversMelted", count: 2 }, 1, "P"),
      line({ side: 1, type: "defenceReady", item: "backupMonitor" }, 1, "P"),
    ].map((l) => l?.text ?? "");
    for (const t of texts) expect(t).not.toMatch(/ddos|load balancer|dns|cache|cpu|latency/i);
  });
});
