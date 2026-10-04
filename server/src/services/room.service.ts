import { MAX_PLAYERS, type ThemeId } from "../config/game.js";
import type { Side } from "../sim/index.js";
import type { CanStart, FinalSummary, Format, Phase, RoomView, RoundSummary, Slot } from "../types/contracts.js";
import { playerId, rejoinToken, teamCode } from "../utils/codes.js";
import { UserError } from "../utils/errors.js";

export type Player = {
  id: string;
  name: string;
  token: string;
  connected: boolean;
  slot: Slot | null;
  ready: boolean;
};

export type Room = {
  code: string;
  players: Player[];
  /** Custom team names; null = default from the players' names. */
  teamNames: Record<Side, string | null>;
  phase: Phase;
  format: Format | null;
  votes: Map<string, ThemeId>;
  theme: ThemeId | null;
  round: number;
  /** When the current timed phase ends (ms since epoch), or null. */
  phaseEndsAt: number | null;
  rounds: RoundSummary[];
  final: FinalSummary | null;
  /** When the last connected player dropped; null while anyone is connected. */
  allGoneSince: number | null;
  /** Mid-match: when each side last had nobody connected. */
  sideGoneSince: Record<Side, number | null>;
};

export type Seat = { room: Room; player: Player };

export const SLOTS: readonly Slot[] = [1, 2, 3, 4];
export const sideOf = (slot: Slot): Side => (slot <= 2 ? 1 : 2);

/** Rooms, players, slots, ready flags and rejoin tokens. In memory only. */
export class RoomService {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly now: () => number = Date.now) {}

  create(playerName: string): Seat {
    let code = teamCode();
    while (this.rooms.has(code)) code = teamCode();
    const player = this.newPlayer(playerName, 1);
    const room: Room = {
      code,
      players: [player],
      teamNames: { 1: null, 2: null },
      phase: "room",
      format: null,
      votes: new Map(),
      theme: null,
      round: 0,
      phaseEndsAt: null,
      rounds: [],
      final: null,
      allGoneSince: null,
      sideGoneSince: { 1: null, 2: null },
    };
    this.rooms.set(code, room);
    return { room, player };
  }

  join(code: string, playerName: string): Seat {
    const room = this.require(code);
    if (room.phase !== "room") throw new UserError("That match has already started.");
    if (room.players.length >= MAX_PLAYERS) throw new UserError(`That room is full (${MAX_PLAYERS} players).`);
    const player = this.newPlayer(playerName, this.freeSlot(room));
    room.players.push(player);
    room.allGoneSince = null;
    return { room, player };
  }

  rejoin(code: string, token: string): Seat {
    const room = this.rooms.get(code);
    const player = room?.players.find((p) => p.token === token);
    if (!room || !player) throw new UserError("Your room is no longer here.");
    this.setConnected(room, player.id, true);
    return { room, player };
  }

  /** Remove a player. Returns false if the room is now empty and was deleted. */
  leave(code: string, id: string): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    room.players = room.players.filter((p) => p.id !== id);
    room.votes.delete(id);
    if (room.players.length === 0) {
      this.rooms.delete(code);
      return false;
    }
    this.refreshPresence(room);
    return true;
  }

  setSlot(room: Room, id: string, slot: Slot): void {
    if (room.phase !== "room") throw new UserError("Slots are locked once the match starts.");
    const player = this.requirePlayer(room, id);
    if (player.slot === slot) return;
    if (room.players.some((p) => p.slot === slot)) throw new UserError("That slot is taken.");
    player.slot = slot;
    player.ready = false; // changing side means confirming again
  }

  setReady(room: Room, id: string, ready: boolean): void {
    if (room.phase !== "room") return;
    const player = this.requirePlayer(room, id);
    if (ready && player.slot === null) throw new UserError("Pick a slot first.");
    player.ready = ready;
  }

  setTeamName(room: Room, id: string, name: string): void {
    if (room.phase !== "room") throw new UserError("Team names are locked once the match starts.");
    const player = this.requirePlayer(room, id);
    if (player.slot === null) throw new UserError("Pick a slot first.");
    room.teamNames[sideOf(player.slot)] = name;
  }

  setConnected(room: Room, id: string, connected: boolean): void {
    const player = room.players.find((p) => p.id === id);
    if (!player) return;
    player.connected = connected;
    this.refreshPresence(room);
  }

  /** Can the match start now — and if not, why not (shown in the room). */
  canStart(room: Room): CanStart {
    const n = room.players.length;
    if (n < 2) return { ok: false, reason: "Waiting for an opponent — share the code." };
    if (n === 3) return { ok: false, reason: "3 players — you need 2 (1v1) or 4 (2v2)." };
    if (room.players.some((p) => p.slot === null)) return { ok: false, reason: "Everyone needs a slot." };
    const left = room.players.filter((p) => sideOf(p.slot!) === 1).length;
    if (left !== n / 2) return { ok: false, reason: n === 2 ? "Pick opposite teams." : "2v2 needs two players on each team." };
    if (room.players.some((p) => !p.ready)) return { ok: false, reason: "Waiting for everyone to be ready." };
    return { ok: true, format: n === 2 ? "1v1" : "2v2" };
  }

  playersOn(room: Room, side: Side): Player[] {
    return room.players.filter((p) => p.slot !== null && sideOf(p.slot) === side);
  }

  teamName(room: Room, side: Side): string {
    const custom = room.teamNames[side];
    if (custom) return custom;
    const names = this.playersOn(room, side).map((p) => p.name);
    return names.length ? names.join(" & ") : `Team ${side}`;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  require(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new UserError("No room with that code.");
    return room;
  }

  requirePlayer(room: Room, id: string): Player {
    const player = room.players.find((p) => p.id === id);
    if (!player) throw new UserError("You're not in this room.");
    return player;
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  all(): Room[] {
    return [...this.rooms.values()];
  }

  view(room: Room, totalRounds: number): RoomView {
    const secondsLeft = room.phaseEndsAt === null ? null : Math.max(0, Math.ceil((room.phaseEndsAt - this.now()) / 1000));
    return {
      code: room.code,
      phase: room.phase,
      format: room.format,
      players: room.players.map((p) => ({ id: p.id, name: p.name, slot: p.slot, ready: p.ready, connected: p.connected })),
      teamNames: { 1: this.teamName(room, 1), 2: this.teamName(room, 2) },
      canStart: this.canStart(room),
      votes: Object.fromEntries(room.votes),
      theme: room.theme,
      round: room.round,
      totalRounds,
      secondsLeft,
      rounds: room.rounds,
      final: room.final,
    };
  }

  private freeSlot(room: Room): Slot | null {
    // Fill the emptier team first so a 1v1 lines up without anyone clicking.
    const left = SLOTS.filter((s) => sideOf(s) === 1 && !room.players.some((p) => p.slot === s));
    const right = SLOTS.filter((s) => sideOf(s) === 2 && !room.players.some((p) => p.slot === s));
    const leftCount = 2 - left.length;
    const rightCount = 2 - right.length;
    const preferred = rightCount <= leftCount ? [...right, ...left] : [...left, ...right];
    return preferred[0] ?? null;
  }

  private newPlayer(name: string, slot: Slot | null): Player {
    return { id: playerId(), name, token: rejoinToken(), connected: true, slot, ready: false };
  }

  private refreshPresence(room: Room): void {
    const anyone = room.players.some((p) => p.connected);
    if (anyone) room.allGoneSince = null;
    else room.allGoneSince ??= this.now();
    for (const side of [1, 2] as const) {
      const here = this.playersOn(room, side).some((p) => p.connected);
      if (here) room.sideGoneSince[side] = null;
      else room.sideGoneSince[side] ??= this.now();
    }
  }
}
