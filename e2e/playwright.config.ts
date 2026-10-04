import { defineConfig, devices } from "@playwright/test";

// End-to-end: real Chromium against a real server and the real web app.
// Starts its own fast-round server and web app on separate ports, so it never
// collides with a dev server you already have running.
const SERVER_PORT = 3300;
const WEB_PORT = 5300;

export default defineConfig({
  testDir: "./tests",
  timeout: 150_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // tests share one game server; keep runs predictable
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1366, height: 680 }, // a lab PC with the browser bar showing
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 680 } } }],
  webServer: [
    {
      command: "pnpm --filter @overclock/server exec tsx src/server.ts",
      cwd: "..",
      url: `http://localhost:${SERVER_PORT}/api/health`,
      env: { PORT: String(SERVER_PORT), FAST_ROUNDS: "1", FAST_ROUND_SEC: "25", NODE_ENV: "test" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm --filter @overclock/web exec vite --port ${WEB_PORT} --strictPort`,
      cwd: "..",
      url: `http://localhost:${WEB_PORT}/play`,
      env: { OVERCLOCK_SERVER: `http://localhost:${SERVER_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
