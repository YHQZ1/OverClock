import { describe, expect, it } from "vitest";
import { currentAlert } from "../../src/game/alert";
import { match, site } from "./fixtures";

const effect = (kind: string) => [{ kind, secondsLeft: 5, share: 0.5 }] as never;

describe("alert bar", () => {
  it("is calm when nothing is wrong", () => {
    expect(currentAlert(match())).toMatchObject({ level: "calm", title: "All calm" });
  });

  it("explains the buy phase", () => {
    expect(currentAlert(match({ phase: "buy" })).title).toBe("Buy phase");
  });

  it("puts a crash above everything", () => {
    const a = currentAlert(match({ me: { downSecondsLeft: 5, blind: true }, incoming: [{ id: 1, attack: "bots", secondsLeft: 2 }] }));
    expect(a).toMatchObject({ id: "down", level: "bad", hint: "Back in 5s — nobody can get in" });
  });

  it("names the counter for an incoming attack", () => {
    const a = currentAlert(match({ incoming: [{ id: 7, attack: "wrongTurn", secondsLeft: 2.2 }] }));
    expect(a.title).toBe("Wrong Turn incoming in 3s");
    expect(a.hint).toBe("Counter: Lock your address or Shield");
  });

  it("warns about the nearest of several incoming attacks", () => {
    const a = currentAlert(
      match({
        incoming: [
          { id: 1, attack: "surge", secondsLeft: 2.5 },
          { id: 2, attack: "jam", secondsLeft: 0.8 },
        ],
      }),
    );
    expect(a.title).toBe("Jam their controls incoming in 1s");
  });

  it("covers the attacks you can't see coming", () => {
    expect(currentAlert(match({ me: { blind: true } })).title).toBe("You’re blindfolded!");
    expect(currentAlert(match({ me: { effects: effect("jam") } })).title).toBe("Your controls are jammed!");
    expect(currentAlert(match({ me: { effects: effect("wrongTurn") } })).title).toBe("Your visitors are going to them!");
  });

  it("says why servers are struggling — and what fixes it", () => {
    const struggling = { parts: { door: "ok", servers: "failing", shelf: "none", db: "ok" } } as const;
    const wrecked = site().servers.map((s, i) => ({ ...s, state: i < 2 ? ("wrecked" as const) : s.state }));
    expect(currentAlert(match({ me: { ...struggling, servers: wrecked } })).hint).toMatch(/Instant backup/);
    expect(currentAlert(match({ me: { ...struggling, effects: effect("slowServers") } })).hint).toMatch(/Overclock/);
    expect(currentAlert(match({ me: { ...struggling, effects: effect("breakSplitter") } })).hint).toMatch(/splitter/);
    expect(currentAlert(match({ me: struggling })).title).toBe("People can’t get in!");
  });

  it("points at bots and a slow database", () => {
    expect(currentAlert(match({ me: { botShare: 0.8, parts: { door: "failing", servers: "ok", shelf: "none", db: "ok" } } })).title).toBe(
      "Bots are flooding in!",
    );
    expect(currentAlert(match({ me: { parts: { door: "ok", servers: "ok", shelf: "none", db: "strained" } } }))).toMatchObject({
      level: "warn",
      title: "Database is slow!",
    });
  });

  it("nudges you to sell idle servers when calm", () => {
    const idle = site().servers.map((s, i) => ({ ...s, state: i < 3 ? ("idle" as const) : s.state }));
    expect(currentAlert(match({ me: { servers: idle } })).hint).toBe("3 servers idle — sell them to save coins (Shift+1)");
  });

  it("tells you when they're down", () => {
    expect(currentAlert(match({ them: site({ downSecondsLeft: 4 }) })).title).toBe("Their site is down!");
  });
});
