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
export type Phase = "room" | "vote" | "themePick" | "briefing" | "buy" | "live" | "roundResult" | "final";

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
  /** side = the team that left; null when the organisers ended it. */
  endedEarly: { side: Side; reason: "left" } | { side: null; reason: "admin" } | null;
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
  phase: "vote" | "themePick" | "briefing" | "buy" | "live" | "roundResult";
  round: number;
  totalRounds: number;
  /** Clock: the live round's time left, else the phase timer. */
  secondsLeft: number | null;
  teams: Record<Side, { name: string; players: string[]; /** Completed rounds plus the round in play. */ total: number; roundsWon: number }>;
  /** Both sites while a round is running (buy or live); null between rounds. */
  sites: Record<Side, SiteView> | null;
};

export type ScreenSnapshot = { boards: Leaderboards; awards: Awards; matches: ScreenMatch[] };

/** A leaderboard row as the admin sees it: hidden ones included. */
export type AdminEntry = Omit<LeaderboardEntry, "rank"> & { rank: number | null; hidden: boolean };
export type AdminBoards = Record<Format, AdminEntry[]>;

/** A live room as the admin sees it. */
export type AdminRoom = {
  code: string;
  phase: Phase;
  format: Format | null;
  theme: ThemeId | null;
  round: number;
  players: { name: string; slot: Slot | null; connected: boolean }[];
  teamNames: Record<Side, string>;
};

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
  /** Players who've finished the briefing steps. */
  briefed: string[];
  round: number;
  totalRounds: number;
  /** Countdown for timed phases (vote, theme pick, buy, round result). The briefing's cap is never shown. */
  secondsLeft: number | null;
  rounds: RoundSummary[];
  final: FinalSummary | null;
};

// ---------- live duel ----------

export type PartStatus = "ok" | "strained" | "failing";
export type ServerState = "booting" | "busy" | "idle" | "wrecked" | "down";
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
};

export type ShopItemView = {
  id: ItemId;
  kind: "defence" | "utility" | "attack";
  price: number;
  /** Defences: working + setting up (servers: all of them). */
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
  me: SiteView & { coins: number; incomePerSec: number };
  /** The opponent's site — their coins stay hidden. */
  them: SiteView;
  shop: ShopItemView[];
  incoming: AttackInFlight[];
  outgoing: AttackInFlight[];
};

// ---------- demo match ----------

/** One moment of the scripted demo: both sites and the attacks in flight. Side 1 is drawn on the left. */
export type DemoFrame = {
  /** Seconds since the demo began. */
  t: number;
  sites: [SiteView, SiteView];
  flights: { id: number; attack: AttackId; secondsLeft: number; /** The side it's flying at. */ side: Side }[];
};

/** A line shown while the demo plays. `{bots}` etc. are filled with the theme's card names. */
export type DemoCaption = { at: number; text: string; focus: "left" | "right" | "both" };

/** The scripted match shown in the briefing — recorded from the real engine (docs/GAME.md → The demo match). */
export type DemoRecording = { durationSec: number; fps: number; frames: DemoFrame[]; captions: DemoCaption[] };

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
  /** Big screen and admin page: sign this connection in with a staff token, then get everything. */
  "screen:watch": (payload: { token: string }, ack: Ack<ScreenSnapshot>) => void;
  "admin:rooms": (payload: Record<string, never>, ack: Ack<AdminRoom[]>) => void;
  /** Show the next / previous match, or a given one. */
  "admin:endRoom": (payload: { code: string }, ack: Ack<null>) => void;
  /** Move a room stuck in the briefing on to round 1. */
  "admin:skipBriefing": (payload: { code: string }, ack: Ack<null>) => void;
  /** Every saved entry, hidden ones included (newest scores first). */
  "admin:boards": (payload: Record<string, never>, ack: Ack<AdminBoards>) => void;
  "admin:hide": (payload: { matchId: string; side: Side; hidden: boolean }, ack: Ack<null>) => void;
  /** Wipe every saved result. `confirm` must be "RESET". */
  "admin:resetBoards": (payload: { confirm: string }, ack: Ack<null>) => void;
}

export interface ServerToClientEvents {
  "room:state": (room: RoomView) => void;
  "match:state": (match: MatchView) => void;
  "match:event": (events: SimEvent[]) => void;
  /** Big screens and admin pages, whenever a match is saved. */
  "leaderboard:update": (boards: Leaderboards) => void;
  /** Staff pages only, a few times a second: every match in progress. */
  "screen:matches": (matches: ScreenMatch[]) => void;
  "screen:awards": (awards: Awards) => void;
}

/** Per-socket data: who this connection is. */
export type SocketData = { code: string | null; playerId: string | null; side: Side | null; /** Signed in as staff. */ admin: boolean };
