import { alertBar, duel, expect, test, waitForLive } from "./helpers";

test.describe("the duel", () => {
  test("two players play a whole match, and Done clears the PC", async ({ browser, errors }) => {
    const { a, b } = await duel(browser, errors);

    // Buy phase: the shop works and the feed says who bought what.
    await a.keyboard.press("1");
    await expect(a.getByText("You bought Game server")).toBeVisible(); // Miniclip's words: duel() votes 3

    await waitForLive(a);
    await expect(a.getByRole("img", { name: "Live map of the site" }).first()).toBeVisible();

    // Three rounds play out to the final screen on both PCs.
    for (const page of [a, b]) {
      await expect(page.getByText("Match over")).toBeVisible({ timeout: 120_000 });
      await expect(page.getByRole("button", { name: /Done — next players/ })).toBeVisible();
    }

    // Done → back home; a refresh must not drop this PC into the old room.
    await a.getByRole("button", { name: /Done — next players/ }).click();
    await expect(a.getByRole("heading", { name: "Create a room" })).toBeVisible();
    await a.reload();
    await expect(a.getByRole("heading", { name: "Create a room" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("attacks are announced, then land: jam freezes their shop, blindfold darkens their map", async ({ browser, errors }) => {
    const { a, b } = await duel(browser, errors);
    await waitForLive(a);

    // Priya jams Rahul: he gets a warning, then his shop locks.
    await a.keyboard.press("l");
    await expect(alertBar(b)).toContainText("Freeze their controller incoming");
    await expect(b.getByText("Controls jammed", { exact: true })).toBeVisible();
    await expect(alertBar(b)).toContainText("Your controls are jammed!");

    // Rahul (500 coins) blindfolds Priya once his shop is back.
    await expect(b.getByText("Controls jammed", { exact: true })).toBeHidden({ timeout: 10_000 });
    await b.keyboard.press("j");
    await expect(alertBar(a)).toContainText("You’re blindfolded!");
    await expect(a.getByText("Your map and alerts are dark for a few seconds")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a refreshed PC lands straight back in the live round", async ({ browser, errors }) => {
    const { a, b } = await duel(browser, errors);
    await waitForLive(b);
    await b.reload();
    await expect(b.getByRole("img", { name: "Live map of the site" }).first()).toBeVisible();
    await expect(b.getByText("Their score")).toBeVisible();
    await expect(a.getByText("Their score")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
