import type { AckResponse, GameActionPayload, JoinResult, Slot, ThemeId } from "@server/types/contracts.js";
import { useGameStore } from "../store/game";
import { clearSeat, saveSeat } from "./seat";
import { socket } from "./socket";

const TIMEOUT_MS = 6000;
const UNREACHABLE = "Can’t reach the game right now. Check the connection and try again.";

type Acked =
  | "room:create"
  | "room:join"
  | "room:rejoin"
  | "room:leave"
  | "room:slot"
  | "room:ready"
  | "room:teamName"
  | "vote:theme"
  | "briefing:continue"
  | "screen:watch"
  | "admin:rooms"
  | "admin:boards"
  | "admin:endRoom"
  | "admin:skipBriefing"
  | "admin:hide"
  | "admin:resetBoards";

export async function request<T>(event: Acked, payload: object): Promise<AckResponse<T>> {
  try {
    const timed = socket.timeout(TIMEOUT_MS);
    const emit = timed.emitWithAck.bind(timed) as (e: string, p: object) => Promise<AckResponse<T>>;
    return await emit(event, payload);
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}

/** Resolve to an error message to show, or null on success. */
const errorOf = (res: AckResponse<unknown>) => (res.ok ? null : res.error);

function takeSeat({ playerId, token, room }: JoinResult): void {
  saveSeat({ code: room.code, token, playerId });
  useGameStore.getState().seat(playerId, room);
}

export async function createRoom(playerName: string): Promise<string | null> {
  const res = await request<JoinResult>("room:create", { playerName });
  if (res.ok) takeSeat(res.data);
  return errorOf(res);
}

export async function joinRoom(code: string, playerName: string): Promise<string | null> {
  const res = await request<JoinResult>("room:join", { code, playerName });
  if (res.ok) takeSeat(res.data);
  return errorOf(res);
}

export async function rejoinRoom(code: string, token: string): Promise<boolean> {
  const res = await request<JoinResult>("room:rejoin", { code, token });
  if (res.ok) takeSeat(res.data);
  return res.ok;
}

/** Leave and forget this PC's seat (also "Done — next players"). */
export async function leaveRoom(): Promise<void> {
  await request<null>("room:leave", {});
  clearSeat();
  useGameStore.getState().clear();
}

export const pickSlot = async (slot: Slot) => errorOf(await request<null>("room:slot", { slot }));
export const setReady = async (ready: boolean) => errorOf(await request<null>("room:ready", { ready }));
export const setTeamName = async (name: string) => errorOf(await request<null>("room:teamName", { name }));
export const voteTheme = async (theme: ThemeId) => errorOf(await request<null>("vote:theme", { theme }));
export const continueBriefing = async () => errorOf(await request<null>("briefing:continue", {}));

export function sendAction(action: GameActionPayload): void {
  socket.emit("game:action", action);
}
