// Real-time contract between server and clients. The web app imports this
// file with `import type` only.

import type { ThemeId } from "../config/game.js";
import type {
  AttackId,
  DefenceId,
  EffectKind,
  ExtraDefenceId,
  ItemId,
  MatchTotals,
  Part,
  Side,
  SimEvent,
  SiteScore,
  UtilityId,
} from "../sim/index.js";
import type {
  CreateRoomPayload,
  GameActionPayload,
  JoinRoomPayload,
  ReadyPayload,
  RejoinPayload,
  SlotPayload,
  TeamNamePayload,
  VotePayload,
} from "../validators/socket.schemas.js";

export type {
  AttackId,
  CreateRoomPayload,
  DefenceId,
  EffectKind,
  ExtraDefenceId,
  GameActionPayload,
  ItemId,
  JoinRoomPayload,
  Part,
  ReadyPayload,
  RejoinPayload,
  Side,
  SimEvent,
  SiteScore,
  SlotPayload,
  TeamNamePayload,
  ThemeId,
  UtilityId,
  VotePayload,
};

export type Slot = 1 | 2 | 3 | 4;
export type Format = "1v1" | "2v2";
export type Phase = "room" | "vote" | "briefing" | "buy" | "live" | "roundResult" | "final";

// ---------- room ----------

export type PlayerView = {
  id: string;
  name: string;
  slot: Slot | null;
  ready: boolean;
  connected: boolean;
};

export type CanStart = { ok: true; format: Format } | { ok: false; reason: string };

export type RoundSummary = { round: number; scores: Record<Side, SiteScore>; winner: Side | null };

export type FinalSummary = {
  /** The id it's saved under; marks this match's rows on the leaderboard. */
  matchId: string;
  totals: MatchTotals;
  winner: Side | null;
  /** Leaderboard points per side. */
  points: Record<Side, number>;
  /** False when the match ended early (e.g. a team left) — nothing goes on the leaderboard. */
  recorded: boolean;
  endedEarly: { side: Side; reason: "left" } | null;
  /** Each team's place on its board, once the result is saved (null until then). */
  ranks: Record<Side, number> | null;
};

// ---------- leaderboard ----------

/** One team's result in one match. Every match is a one-off, so teams appear once per match played. */
export type LeaderboardEntry = {
  rank: number;
  matchId: string;
  side: Side;
  team: string;
  players: string[];
  points: number;
  total: number;
  /** null = draw. */
  won: boolean | null;
  opponent: string;
  theme: ThemeId;
  /** ISO time. */
  at: string;
};

export type Leaderboards = Record<Format, LeaderboardEntry[]>;

// ---------- big screen ----------

/** A fun award on the big screen, from saved matches. */
export type Award = { team: string; format: Format; detail: string; matchId: string };
export type Awards = {
  /** Won from the furthest behind. */
  comeback: Award | null;
  /** Most attacks landed in one match. */
  destroyer: Award | null;
  /** Highest score without ever going down. */
  unbreakable: Award | null;
};

/** A match in progress as the big screen sees it — both sites, never anyone's coins. */
export type ScreenMatch = {
  code: string;
  format: Format;
  theme: ThemeId | null;
  phase: "vote" | "briefing" | "buy" | "live" | "roundResult";
  round: number;
  totalRounds: number;
  /** Clock: the live round's time left, else the phase timer. */
  secondsLeft: number | null;
  teams: Record<Side, { name: string; players: string[]; /** Completed rounds plus the round in play. */ total: number; roundsWon: number }>;
  /** Both sites while a round is running (buy or live); null between rounds. */
  sites: Record<Side, SiteView> | null;
};

export type ScreenSnapshot = { boards: Leaderboards; awards: Awards; matches: ScreenMatch[] };

/** Everything a PC needs to decide which screen to show. Same for the whole room. */
export type RoomView = {
  code: string;
  phase: Phase;
  format: Format | null;
  players: PlayerView[];
  teamNames: Record<Side, string>;
  canStart: CanStart;
  /** playerId → theme, during and after the vote. */
  votes: Record<string, ThemeId>;
  theme: ThemeId | null;
  /** Players who've read the briefing and pressed Continue. */
  briefed: string[];
  round: number;
  totalRounds: number;
  /** Countdown for timed phases (vote, buy, round result). */
  secondsLeft: number | null;
  rounds: RoundSummary[];
  final: FinalSummary | null;
};

// ---------- live duel ----------

/** "hidden" = this side is blindfolded and can't see it. */
export type PartStatus = "ok" | "strained" | "failing" | "none" | "hidden";
export type ServerState = "booting" | "busy" | "idle" | "wrecked" | "down" | "unknown";
export type ServerSlotView = { id: number; state: ServerState; progress: number };

export type EffectView = { kind: EffectKind; secondsLeft: number; share: number };

/** One site as anyone may see it. */
export type SiteView = {
  health: number;
  score: number;
  served: number;
  lost: number;
  critical: boolean;
  downSecondsLeft: number | null;
  servers: ServerSlotView[];
  owned: Record<ExtraDefenceId, number>;
  settingUp: ExtraDefenceId[];
  parts: Record<Part, PartStatus>;
  bottleneck: Part | null;
  /** Crowd size relative to normal (1 = usual). Drives the map, never shown as a number. */
  crowd: number;
  /** 0 → 1 share of real visitors getting in. */
  servedShare: number;
  /** Bots relative to real visitors (0 = none). */
  botShare: number;
  effects: EffectView[];
  /** This side is blindfolded: its own map and alerts are dark. */
  blind: boolean;
};

export type ShopItemView = {
  id: ItemId;
  kind: "defence" | "utility" | "attack";
  price: number;
  /** Defences: working + setting up. */
  owned: number;
  max: number;
  /** 0 → 1 of cooldown remaining (attacks include the regroup wait). */
  cooldown: number;
  affordable: boolean;
};

export type AttackInFlight = { id: number; attack: AttackId; secondsLeft: number };

/** Player-safe snapshot of the duel for one side, sent 10×/sec. */
export type MatchView = {
  side: Side;
  round: number;
  phase: "buy" | "live";
  timeLeftSec: number;
  durationSec: number;
  me: SiteView & { coins: number; incomePerSec: number; upkeepPerSec: number };
  /** The opponent's site — their coins stay hidden. */
  them: SiteView;
  shop: ShopItemView[];
  incoming: AttackInFlight[];
  outgoing: AttackInFlight[];
};

// ---------- messages ----------

export type JoinResult = { playerId: string; token: string; room: RoomView };

export type AckResponse<T> = { ok: true; data: T } | { ok: false; error: string };
export type Ack<T> = (res: AckResponse<T>) => void;

export interface ClientToServerEvents {
  "room:create": (payload: CreateRoomPayload, ack: Ack<JoinResult>) => void;
  "room:join": (payload: JoinRoomPayload, ack: Ack<JoinResult>) => void;
  "room:rejoin": (payload: RejoinPayload, ack: Ack<JoinResult>) => void;
  "room:leave": (payload: Record<string, never>, ack: Ack<null>) => void;
  "room:slot": (payload: SlotPayload, ack: Ack<null>) => void;
  "room:ready": (payload: ReadyPayload, ack: Ack<null>) => void;
  "room:teamName": (payload: TeamNamePayload, ack: Ack<null>) => void;
  "vote:theme": (payload: VotePayload, ack: Ack<null>) => void;
  "briefing:continue": (payload: Record<string, never>, ack: Ack<null>) => void;
  "game:action": (payload: GameActionPayload) => void;
  /** The big screen: subscribe to boards, awards and matches in progress. */
  "screen:watch": (payload: Record<string, never>, ack: Ack<ScreenSnapshot>) => void;
}

export interface ServerToClientEvents {
  "room:state": (room: RoomView) => void;
  "match:state": (match: MatchView) => void;
  "match:event": (events: SimEvent[]) => void;
  /** Sent to every connected PC whenever a match is saved. */
  "leaderboard:update": (boards: Leaderboards) => void;
  /** Big screens only. */
  "screen:matches": (matches: ScreenMatch[]) => void;
  "screen:awards": (awards: Awards) => void;
}

/** Per-socket data: who this connection is. */
export type SocketData = { code: string | null; playerId: string | null; side: Side | null };
