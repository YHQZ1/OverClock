import type { AckResponse, GameActionPayload, JoinResult } from "@server/types/contracts.js";
import { useGameStore } from "../store/game";
import { clearSeat, saveSeat } from "./seat";
import { socket } from "./socket";

const TIMEOUT_MS = 6000;
const UNREACHABLE = "Can’t reach the game right now. Check the connection and try again.";

type Acked = "team:create" | "team:join" | "team:rejoin" | "team:leave" | "session:start";

async function request<T>(event: Acked, payload: object): Promise<AckResponse<T>> {
  try {
    const timed = socket.timeout(TIMEOUT_MS);
    const emit = timed.emitWithAck.bind(timed) as (e: string, p: object) => Promise<AckResponse<T>>;
    return await emit(event, payload);
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}

function takeSeat({ playerId, token, session }: JoinResult): void {
  saveSeat({ code: session.code, token, playerId });
  useGameStore.getState().seat(playerId, session);
}

/** Each returns an error message to show, or null on success. */

export async function createTeam(teamName: string, playerName: string): Promise<string | null> {
  const res = await request<JoinResult>("team:create", { teamName, playerName });
  if (!res.ok) return res.error;
  takeSeat(res.data);
  return null;
}

export async function joinTeam(code: string, playerName: string): Promise<string | null> {
  const res = await request<JoinResult>("team:join", { code, playerName });
  if (!res.ok) return res.error;
  takeSeat(res.data);
  return null;
}

export async function rejoinTeam(code: string, token: string): Promise<boolean> {
  const res = await request<JoinResult>("team:rejoin", { code, token });
  if (res.ok) takeSeat(res.data);
  return res.ok;
}

/** Leave the team and forget this PC's seat (also used by "Done — next team"). */
export async function leaveTeam(): Promise<void> {
  await request<null>("team:leave", {});
  clearSeat();
  useGameStore.getState().clear();
}

export async function startGame(): Promise<string | null> {
  const res = await request<null>("session:start", {});
  return res.ok ? null : res.error;
}

export function sendAction(action: GameActionPayload["action"]): void {
  socket.emit("game:action", { action });
}
