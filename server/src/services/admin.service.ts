import { randomBytes, timingSafeEqual } from "node:crypto";
import { UserError } from "../utils/errors.js";

const SESSION_MS = 16 * 60 * 60 * 1000; // a fest day
const MAX_FAILS = 5;
const LOCKOUT_MS = 60 * 1000;

/**
 * Staff login for /admin, /live and /leaderboard: one passcode (ADMIN_PASSCODE), no
 * accounts. Wrong guesses are rate-limited per address; sessions are tokens
 * held in memory (a server restart logs staff out — they just sign in again).
 */
export class AdminService {
  private readonly sessions = new Map<string, number>(); // token → expires at
  private readonly fails = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    private readonly passcode: string,
    private readonly now: () => number = Date.now,
  ) {}

  login(passcode: string, from: string): string {
    const now = this.now();
    const f = this.fails.get(from);
    if (f && f.lockedUntil > now) {
      throw new UserError(`Too many wrong tries. Wait ${Math.ceil((f.lockedUntil - now) / 1000)}s.`);
    }
    if (!this.matches(passcode)) {
      const count = (f && f.lockedUntil <= now && f.count >= MAX_FAILS ? 0 : (f?.count ?? 0)) + 1;
      this.fails.set(from, { count, lockedUntil: count >= MAX_FAILS ? now + LOCKOUT_MS : 0 });
      throw new UserError("Wrong passcode.");
    }
    this.fails.delete(from);
    const token = randomBytes(24).toString("hex");
    this.sessions.set(token, now + SESSION_MS);
    return token;
  }

  isValid(token: unknown): boolean {
    if (typeof token !== "string") return false;
    const expires = this.sessions.get(token);
    if (expires === undefined) return false;
    if (expires <= this.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  private matches(passcode: string): boolean {
    const a = Buffer.from(passcode);
    const b = Buffer.from(this.passcode);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
