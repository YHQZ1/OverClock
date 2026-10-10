import { test as base, expect, type Browser, type Page } from "@playwright/test";

/** Every page fails its test on an uncaught error or a console error. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({}, use) => {
    await use([]);
  },
});
export { expect };

/** A player is a separate browser context — its own tab, its own seat. */
export async function player(browser: Browser, errors: string[]): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 680 } });
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  await page.goto("/play");
  return page;
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.getByRole("heading", { name: "Create a room" }).click();
  await page.getByLabel("Your name").fill(name);
  await page.keyboard.press("Enter");
  const codeBox = page.locator('[aria-label^="Room code "]');
  await expect(codeBox).toBeVisible();
  return (await codeBox.getAttribute("aria-label"))!.replace("Room code ", "").replace(/ /g, "");
}

export async function joinRoom(page: Page, code: string, name: string): Promise<void> {
  await page.getByRole("heading", { name: "Join a room" }).click();
  await page.getByLabel("Room code").fill(code);
  await page.getByLabel("Your name").fill(name);
  await page.keyboard.press("Enter");
  await expect(page.locator('[aria-label^="Room code "]')).toBeVisible();
}

/** Two players in a room, both ready, both voted — returns once round 1 is live. */
export async function duel(browser: Browser, errors: string[]) {
  const a = await player(browser, errors);
  const b = await player(browser, errors);
  const code = await createRoom(a, "Alpha");
  await joinRoom(b, code, "Bravo");
  await a.keyboard.press("r");
  await b.keyboard.press("r");
  await expect(a.getByRole("heading", { name: "Pick the app" })).toBeVisible();
  await a.keyboard.press("3"); // Spotify
  await b.keyboard.press("3");
  await expect(a.getByRole("heading", { name: "Spotify it is!" })).toBeVisible();
  // The briefing, at each player's own pace: four steps and the demo; Enter moves on.
  await expect(a.getByRole("heading", { name: "How to play" })).toBeVisible();
  for (const title of ["Attacks", "Defences", "Boosts", "Watch a match"]) {
    await a.keyboard.press("Enter");
    await expect(a.getByRole("heading", { name: title })).toBeVisible();
  }
  await a.keyboard.press("Enter"); // "I'm ready"
  await expect(a.getByText(/Waiting for Bravo/)).toBeVisible();
  await b.keyboard.press("Enter");
  await b.keyboard.press("Enter");
  await b.keyboard.press("Enter");
  await b.keyboard.press("Enter");
  await b.keyboard.press("Enter");
  await expect(a.getByRole("status")).toContainText("Get ready");
  return { a, b, code };
}

/** The arena: both sites side by side. */
export const arena = (page: Page) => page.getByRole("img", { name: /versus/ });

export const alertBar = (page: Page) => page.getByRole("status");

export async function waitForLive(page: Page): Promise<void> {
  await expect(alertBar(page)).not.toContainText("Get ready", { timeout: 15_000 });
}
