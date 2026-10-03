import { MAX_PLAYERS } from "../config/game.js";
import type { ScoreBreakdown } from "../sim/index.js";
import type { Phase, SessionView } from "../types/contracts.js";
import { playerId, rejoinToken, teamCode } from "../utils/codes.js";
import { UserError } from "../utils/errors.js";

export type Player = {
  id: string;
  name: string;
  token: string;
  connected: boolean;
};

export type Team = {
  code: string;
  name: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  countdown: number | null;
  result: ScoreBreakdown | null;
  /** When the last connected player dropped; null while anyone is connected. */
  allGoneSince: number | null;
};

export type Seat = { team: Team; player: Player };

/** Teams, players, host and rejoin tokens. In memory only. */
export class TeamService {
  private readonly teams = new Map<string, Team>();

  constructor(private readonly now: () => number = Date.now) {}

  create(teamName: string, playerName: string): Seat {
    let code = teamCode();
    while (this.teams.has(code)) code = teamCode();

    const player = this.newPlayer(playerName);
    const team: Team = {
      code,
      name: teamName,
      hostId: player.id,
      players: [player],
      phase: "lobby",
      countdown: null,
      result: null,
      allGoneSince: null,
    };
    this.teams.set(code, team);
    return { team, player };
  }

  join(code: string, playerName: string): Seat {
    const team = this.require(code);
    if (team.phase !== "lobby") throw new UserError("That team has already started.");
    if (team.players.length >= MAX_PLAYERS) throw new UserError(`That team is full (${MAX_PLAYERS} players).`);

    const player = this.newPlayer(playerName);
    team.players.push(player);
    team.allGoneSince = null;
    return { team, player };
  }

  rejoin(code: string, token: string): Seat {
    const team = this.teams.get(code);
    const player = team?.players.find((p) => p.token === token);
    if (!team || !player) throw new UserError("Your team is no longer here.");
    this.setConnected(team, player.id, true);
    return { team, player };
  }

  /** Remove a player. Returns false if the team is now empty and was deleted. */
  leave(code: string, id: string): boolean {
    const team = this.teams.get(code);
    if (!team) return false;
    team.players = team.players.filter((p) => p.id !== id);
    if (team.players.length === 0) {
      this.teams.delete(code);
      return false;
    }
    if (team.hostId === id) team.hostId = team.players[0]!.id;
    this.refreshPresence(team);
    return true;
  }

  setConnected(team: Team, id: string, connected: boolean): void {
    const player = team.players.find((p) => p.id === id);
    if (!player) return;
    player.connected = connected;
    this.refreshPresence(team);
  }

  get(code: string): Team | undefined {
    return this.teams.get(code);
  }

  require(code: string): Team {
    const team = this.teams.get(code);
    if (!team) throw new UserError("No team with that code.");
    return team;
  }

  delete(code: string): void {
    this.teams.delete(code);
  }

  all(): Team[] {
    return [...this.teams.values()];
  }

  view(team: Team): SessionView {
    return {
      code: team.code,
      teamName: team.name,
      phase: team.phase,
      players: team.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.id === team.hostId,
        connected: p.connected,
      })),
      countdown: team.countdown,
      result: team.result,
    };
  }

  private newPlayer(name: string): Player {
    return { id: playerId(), name, token: rejoinToken(), connected: true };
  }

  private refreshPresence(team: Team): void {
    const anyone = team.players.some((p) => p.connected);
    if (anyone) team.allGoneSince = null;
    else team.allGoneSince ??= this.now();
  }
}
