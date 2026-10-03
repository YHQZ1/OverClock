// This tab's seat in a team, kept so a refresh can rejoin. sessionStorage is
// per tab (several tabs can test a team on one PC) and is cleared on Leave /
// "Done — next team", so a shared lab PC never lands in the previous team.

export type SavedSeat = { code: string; token: string; playerId: string };

const KEY = "overclock.seat";

export function loadSeat(): SavedSeat | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedSeat) : null;
  } catch {
    return null;
  }
}

export function saveSeat(seat: SavedSeat): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(seat));
  } catch {
    // Storage blocked: the game still works, a refresh just won't rejoin.
  }
}

export function clearSeat(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
