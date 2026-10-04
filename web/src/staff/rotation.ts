import type { ScreenMatch } from "@server/types/contracts.js";

/** How long each match stays on /live before moving on (unless pinned). */
export const ROTATE_MS = 10_000;

export type Rotation = { featured: string | null; pinned: string | null; switchAt: number };

/** Matches worth rotating through: those with a round in play if any, else all; in a stable order. */
export function rotationOrder(matches: readonly ScreenMatch[]): string[] {
  const playing = matches.filter((m) => m.sites !== null);
  return (playing.length > 0 ? playing : matches).map((m) => m.code).sort();
}

/** Move the rotation on: keep a pin while its match lasts, replace a vanished match, switch when due. */
export function advance(r: Rotation, matches: readonly ScreenMatch[], now: number): Rotation {
  const exists = (code: string | null) => code !== null && matches.some((m) => m.code === code);
  const pinned = exists(r.pinned) ? r.pinned : null;
  if (pinned) return { featured: pinned, pinned, switchAt: r.switchAt };

  const order = rotationOrder(matches);
  if (order.length === 0) return { featured: null, pinned: null, switchAt: now + ROTATE_MS };
  // Showing a match that's still around (e.g. clicked, but between rounds) — keep it until its time is up.
  if (exists(r.featured) && now < r.switchAt) return { ...r, pinned: null };
  const at = r.featured ? order.indexOf(r.featured) : -1;
  const next = at === -1 && !exists(r.featured) ? order[0]! : order[(at + 1) % order.length]!;
  return { featured: next, pinned: null, switchAt: now + ROTATE_MS };
}
