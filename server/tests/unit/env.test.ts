import { describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/env.js";

describe("environment", () => {
  it("plays three rounds unless a developer asks for fewer", () => {
    expect(loadEnv({}).DEV_ROUNDS).toBe(3);
    expect(loadEnv({ DEV_ROUNDS: "1" }).DEV_ROUNDS).toBe(1);
  });

  it("rejects a round count that isn't 1–3", () => {
    expect(() => loadEnv({ DEV_ROUNDS: "0" })).toThrow(/DEV_ROUNDS/);
    expect(() => loadEnv({ DEV_ROUNDS: "4" })).toThrow(/DEV_ROUNDS/);
  });

  it("never allows a short match in production", () => {
    const prod = { NODE_ENV: "production", DATABASE_URL: "postgres://x:y@localhost:5432/z", ADMIN_PASSCODE: "a-real-passcode" };
    expect(loadEnv(prod).DEV_ROUNDS).toBe(3);
    expect(() => loadEnv({ ...prod, DEV_ROUNDS: "1" })).toThrow(/development only/);
  });
});
