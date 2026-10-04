import { createRoom, expect, player, test } from "./helpers";

test.describe("home", () => {
  test("shows the pitch and both ways in", async ({ browser, errors }) => {
    const page = await player(browser, errors);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Keep yours alive.");
    await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Join a room" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the quiet Staff link asks for the passcode — no leaderboard for players", async ({ browser, errors }) => {
    const page = await player(browser, errors);
    await page.getByRole("link", { name: "Staff" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByLabel("Passcode")).toBeVisible();
    for (const staffPage of ["/live", "/leaderboard"]) {
      await page.goto(staffPage);
      await expect(page.getByLabel("Passcode")).toBeVisible(); // the projector pages are staff-only too
    }
    expect(errors).toEqual([]);
  });

  test("explains form mistakes in plain words", async ({ browser, errors }) => {
    const page = await player(browser, errors);
    await page.getByRole("heading", { name: "Create a room" }).click();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toHaveText("Tell us your name.");

    await page.keyboard.press("Escape");
    await page.getByRole("heading", { name: "Join a room" }).click();
    await page.getByLabel("Room code").fill("ZQZQ");
    await page.getByLabel("Your name").fill("Rahul");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toHaveText("No room with that code.");
    expect(errors).toEqual([]);
  });

  test("a room explains why it can't start yet", async ({ browser, errors }) => {
    const page = await player(browser, errors);
    await createRoom(page, "Priya");
    await expect(page.getByText("Waiting for an opponent — share the code.")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
