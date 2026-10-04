import { describe, expect, it } from "vitest";
import { AdminService } from "../../src/services/admin.service.js";

describe("staff sign-in", () => {
  it("gives a token for the right passcode only", () => {
    const admin = new AdminService("secret-pass");
    expect(() => admin.login("nope", "pc1")).toThrow("Wrong passcode.");
    const token = admin.login("secret-pass", "pc1");
    expect(admin.isValid(token)).toBe(true);
    expect(admin.isValid("made-up")).toBe(false);
  });

  it("locks a PC out for a minute after 5 wrong tries — other PCs unaffected", () => {
    let now = 0;
    const admin = new AdminService("secret-pass", () => now);
    for (let i = 0; i < 5; i++) expect(() => admin.login("guess", "pc1")).toThrow("Wrong passcode.");
    expect(() => admin.login("secret-pass", "pc1")).toThrow(/Too many wrong tries/);
    expect(admin.isValid(admin.login("secret-pass", "pc2"))).toBe(true);
    now += 61_000;
    expect(admin.isValid(admin.login("secret-pass", "pc1"))).toBe(true);
  });

  it("expires sessions after a fest day", () => {
    let now = 0;
    const admin = new AdminService("secret-pass", () => now);
    const token = admin.login("secret-pass", "pc1");
    now += 17 * 60 * 60 * 1000;
    expect(admin.isValid(token)).toBe(false);
  });
});
