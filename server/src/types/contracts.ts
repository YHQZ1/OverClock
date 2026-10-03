// Real-time contract between server and clients. The web app imports this
// file with `import type` only.

import type { ScoreBreakdown, SimEvent } from "../sim/index.js";
import type {
  CreateTeamPayload,
  GameActionPayload,
  JoinTeamPayload,
  RejoinPayload,
  StartSessionPayload,
} from "../validators/socket.schemas.js";

export type { CreateTeamPayload, GameActionPayload, JoinTeamPayload, RejoinPayload, StartSessionPayload };

export type Phase = "lobby" | "countdown" | "playing" | "final";

export type PlayerView = {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
};

/** Everything a PC needs to decide which screen to show. Same for the whole team. */
export type SessionView = {
  code: string;
  teamName: string;
  phase: Phase;
  players: PlayerView[];
  /** Seconds left while phase is "countdown". */
  countdown: number | null;
  /** Round result once phase is "final". */
  result: ScoreBreakdown | null;
};

export type ServerSlotView = {
  id: number;
  state: "booting" | "busy" | "idle" | "down";
  /** 0 → 1 while booting. */
  bootProgress: number;
};

/** How a part of the app is doing — drives green / yellow / red on the map. */
export type PartStatus = "ok" | "strained" | "failing";

/** Player-safe snapshot of a live match, sent 10×/sec. */
export type MatchView = {
  tick: number;
  timeLeftSec: number;
  durationSec: number;
  health: number;
  budget: number;
  startBudget: number;
  /** Budget spent per second right now. */
  spendPerSec: number;
  /** Live score: served − lost penalty (budget is added at the end). */
  score: number;
  served: number;
  lost: number;
  servers: ServerSlotView[];
  serversStatus: PartStatus;
  /** 0 → 1, fraction of the + SERVERS cooldown still remaining. */
  addCooldown: number;
  /** Seconds until reboot while the system is down, else null. */
  downSecondsLeft: number | null;
  critical: boolean;
  rush: boolean;
  /** Crowd size relative to normal (1 = usual, 2.5 = rush). Drives the map, never shown as a number. */
  crowd: number;
  /** 0 → 1 share of arriving people who got in this moment. */
  servedShare: number;
};

export type JoinResult = {
  playerId: string;
  token: string;
  session: SessionView;
};

export type AckResponse<T> = { ok: true; data: T } | { ok: false; error: string };
export type Ack<T> = (res: AckResponse<T>) => void;

export interface ClientToServerEvents {
  "team:create": (payload: CreateTeamPayload, ack: Ack<JoinResult>) => void;
  "team:join": (payload: JoinTeamPayload, ack: Ack<JoinResult>) => void;
  "team:rejoin": (payload: RejoinPayload, ack: Ack<JoinResult>) => void;
  "team:leave": (payload: Record<string, never>, ack: Ack<null>) => void;
  "session:start": (payload: StartSessionPayload, ack: Ack<null>) => void;
  "game:action": (payload: GameActionPayload) => void;
}

export interface ServerToClientEvents {
  "session:state": (session: SessionView) => void;
  "match:state": (match: MatchView) => void;
  "match:event": (events: SimEvent[]) => void;
}

/** Per-socket data: who this connection is. */
export type SocketData = {
  code: string | null;
  playerId: string | null;
};
