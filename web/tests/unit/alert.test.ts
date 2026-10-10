import { describe, expect, it } from "vitest";
import { currentAlert } from "../../src/game/alert";
import { THEME_INFO } from "../../src/themes/themes";
import { match, shop, site } from "./fixtures";

const effect = (kind: string) => [{ kind, secondsLeft: 5, share: 0.5 }] as never;

describe("alert", () => {
  it("is calm when nothing is wrong", () => {
    expect(currentAlert(match())).toMatchObject({ level: "calm", title: "All calm" });
  });

  it("explains the buy phase", () => {
    expect(currentAlert(match({ phase: "buy" })).title).toBe("Get ready · Round 1");
  });

  it("puts a crash above everything", () => {
    const a = currentAlert(match({ me: { downSecondsLeft: 5 }, incoming: [{ id: 1, attack: "bots", secondsLeft: 2 }] }));
    expect(a).toMatchObject({ id: "down", level: "bad", hint: "Back in 5s — nobody can get in" });
  });

  describe("an incoming attack", () => {
    it("names the card to press, and its key", () => {
      const a = currentAlert(match({ incoming: [{ id: 7, attack: "wrongTurn", secondsLeft: 2.2 }] }));
      expect(a.title).toBe("Steal visitors incoming in 3s");
      expect(a.hint).toBe("Press 3 — Verified link");
      expect(a.press).toBe("lockAddress");
    });

    it("says you're ready when a kept defence already cuts it down", () => {
      const a = currentAlert(match({ shop: shop({ lockAddress: { owned: 1 } }), incoming: [{ id: 7, attack: "wrongTurn", secondsLeft: 2 }] }));
      expect(a).toMatchObject({ level: "warn", hint: "You’re ready — Verified link will cut it down" });
      expect(a.press).toBeUndefined();
    });

    it("falls back to the next counter when the first can't be afforded", () => {
      const a = currentAlert(match({ shop: shop({ bouncer: { affordable: false } }), incoming: [{ id: 1, attack: "bots", secondsLeft: 2 }] }));
      expect(a.press).toBe("shield");
      expect(a.hint).toBe("Press W — Shield");
    });

    it("prefers a new server for a surge, then Overclock when servers are maxed", () => {
      const surge = { id: 1, attack: "surge" as const, secondsLeft: 2 };
      expect(currentAlert(match({ incoming: [surge] })).press).toBe("server");
      expect(currentAlert(match({ shop: shop({ server: { owned: 12 } }), incoming: [surge] })).press).toBe("overclock");
    });

    it("warns about the nearest of several", () => {
      const a = currentAlert(
        match({
          incoming: [
            { id: 1, attack: "surge", secondsLeft: 2.5 },
            { id: 2, attack: "jam", secondsLeft: 0.8 },
          ],
        }),
      );
      expect(a.title).toBe("Freeze their controls incoming in 1s");
      expect(a.press).toBe("shield");
    });
  });

  it("covers what's already happening to you", () => {
    expect(currentAlert(match({ me: { effects: effect("jam") } })).title).toBe("Your cards are frozen!");
    expect(currentAlert(match({ me: { effects: effect("wrongTurn") } })).title).toBe("Your visitors are walking to them!");
  });

  it("says why servers are struggling — and which key fixes it", () => {
    const struggling = { parts: { door: "ok", servers: "failing" } } as const;
    const wrecked = site().servers.map((s, i) => ({ ...s, state: i < 2 ? ("wrecked" as const) : s.state }));
    expect(currentAlert(match({ me: { ...struggling, servers: wrecked } }))).toMatchObject({ hint: "Press R — Instant backup", press: "instantBackup" });
    const crowded = currentAlert(match({ me: struggling }));
    expect(crowded).toMatchObject({ title: "People can’t get in!", hint: "Press 1 — Server", press: "server" });
  });

  it("points at bots", () => {
    const a = currentAlert(match({ me: { botShare: 0.8, parts: { door: "failing", servers: "ok" } } }));
    expect(a).toMatchObject({ title: "Bots are flooding the line!", hint: "Press 2 — Bouncer", press: "bouncer" });
  });

  it("points at repair when health is critical", () => {
    expect(currentAlert(match({ me: { critical: true } }))).toMatchObject({ title: "Health critical!", press: "repair" });
  });

  it("tells you when they're down", () => {
    expect(currentAlert(match({ them: site({ downSecondsLeft: 4 }) })).title).toBe("Their site is down!");
  });

  it("speaks the theme's words", () => {
    const failing = { parts: { door: "ok", servers: "failing" } } as const;

    const bms = THEME_INFO.bookmyshow.words;
    expect(currentAlert(match({ phase: "buy", round: 3 }), bms).title).toBe("Get ready · Last tickets");
    expect(currentAlert(match({ me: failing }), bms).title).toBe("Fans are stuck in the queue!");
    expect(currentAlert(match({ me: { effects: effect("wrongTurn") } }), bms).title).toBe("Your fans are walking to them!");
    expect(currentAlert(match({ me: { downSecondsLeft: 3 } }), bms).hint).toBe("Back in 3s — no one’s getting tickets");
    const bots = currentAlert(match({ incoming: [{ id: 1, attack: "bots", secondsLeft: 2 }] }), bms);
    expect(bots.title).toBe("Scalper bots incoming in 2s");
    expect(bots.hint).toBe("Press 2 — Robot check");

    expect(currentAlert(match({ me: failing }), THEME_INFO.gpay.words).title).toBe("Payments are stuck on “processing”!");
    expect(currentAlert(match({ incoming: [{ id: 1, attack: "wrongTurn", secondsLeft: 2 }] }), THEME_INFO.gpay.words).title).toBe(
      "Fake QR code incoming in 2s",
    );
  });
});
