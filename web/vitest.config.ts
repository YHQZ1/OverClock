import { defineConfig } from "vitest/config";

// Web unit tests: pure display logic (alerts, feed text, store). No browser needed —
// real-browser checks live in /e2e (Playwright).
export default defineConfig({
  test: {
    name: "web",
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
