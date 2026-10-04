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

  test("/live follows the match, /leaderboard gets both teams after it; players see only their place", async ({ browser, errors }) => {
    // One projector machine: sign in once, both staff pages share it.
    const projector = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const live = await projector.newPage();
    live.on("pageerror", (err) => errors.push(`live pageerror: ${err.message}`));
    await live.goto("/live");
    await live.getByLabel("Passcode").fill("admin"); // the test server's default staff passcode
    await live.keyboard.press("Enter");
    await expect(live.getByRole("heading", { name: "Matches" })).toBeVisible();
    const board = await projector.newPage();
    await board.goto("/leaderboard");
    await expect(board.getByRole("heading", { name: "1v1" })).toBeVisible(); // already signed in

    const { a, code } = await duel(browser, errors);
    await waitForLive(a);
    await expect(live.getByText(`1v1 · room ${code}`)).toBeVisible(); // featured, in its theme
    await expect(live.getByRole("button", { name: /Priya\s+vs\s+Rahul/ })).toBeVisible(); // in the sidebar

    await expect(a.getByText("Match over")).toBeVisible({ timeout: 120_000 });
    await expect(board.getByText("vs Rahul").first()).toBeVisible({ timeout: 10_000 });
    await expect(a.getByText(/Your place on the 1v1 leaderboard/)).toBeVisible();
    await expect(a.getByText(/^#\d+$/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("an organiser ends a stuck room from /admin, and the players are told", async ({ browser, errors }) => {
    const { a, code } = await duel(browser, errors);
    const admin = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    admin.on("pageerror", (err) => errors.push(`admin pageerror: ${err.message}`));
    await admin.goto("/admin");
    await admin.getByLabel("Passcode").fill("admin");
    await admin.keyboard.press("Enter");
    const row = admin.getByRole("listitem").filter({ hasText: code });
    await expect(row).toBeVisible();
    admin.once("dialog", (d) => void d.accept());
    await row.getByRole("button", { name: "End" }).click();
    await expect(a.getByText("The organisers ended this match")).toBeVisible();
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
