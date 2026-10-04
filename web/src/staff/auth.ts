// Staff sign-in for /admin, /live and /leaderboard. The token lives in this browser's
// localStorage — staff machines only (the projector PC, an organiser's laptop
// or phone), never a player's lab PC, which is why it isn't sessionStorage.

const KEY = "overclock.staff";

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
}

/** Resolves to an error message to show, or null once signed in. */
export async function signIn(passcode: string): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    const body = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !body.token) return body.error ?? "Couldn’t sign in.";
    try {
      localStorage.setItem(KEY, body.token);
    } catch {
      return "This browser won’t store the sign-in. Allow site data and try again.";
    }
    return null;
  } catch {
    return "Can’t reach the game right now. Check the connection and try again.";
  }
}
