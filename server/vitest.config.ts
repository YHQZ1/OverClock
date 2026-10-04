import { defineConfig } from "vitest/config";

// Test projects, run separately or together:
//   unit         — pure logic: engine rules, scoring, services, views, validators (fast)
//   integration  — a real server with real Socket.IO clients (a few seconds)
//   balance      — bots play thousands of matches to check game balance (slower)
// The load test (tests/load) is a standalone script, not part of Vitest.
export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      { test: { name: "integration", include: ["tests/integration/**/*.test.ts"], testTimeout: 30_000 } },
      { test: { name: "balance", include: ["tests/balance/**/*.test.ts"], testTimeout: 120_000 } },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/scripts/**", "src/server.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
