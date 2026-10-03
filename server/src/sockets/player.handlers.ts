import type { Socket } from "socket.io";
import type { ZodType } from "zod";
import type { MatchService } from "../services/match.service.js";
import type { SessionService } from "../services/session.service.js";
import type { Seat, TeamService } from "../services/team.service.js";
import type {
  Ack,
  ClientToServerEvents,
  JoinResult,
  ServerToClientEvents,
  SocketData,
} from "../types/contracts.js";
import { UserError, userMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import {
  createTeamSchema,
  emptySchema,
  gameActionSchema,
  joinTeamSchema,
  rejoinSchema,
  startSessionSchema,
} from "../validators/socket.schemas.js";

export type PlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export type Services = { teams: TeamService; sessions: SessionService; matches: MatchService };

export const teamRoom = (code: string) => `team:${code}`;

/** Validate → run → ack. Unknown errors are logged and hidden from players. */
function handle<P, T>(schema: ZodType<P>, payload: unknown, ack: unknown, run: (data: P) => T): void {
  const reply = typeof ack === "function" ? (ack as Ack<T>) : () => {};
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    reply({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." });
    return;
  }
  try {
    reply({ ok: true, data: run(parsed.data) });
  } catch (err) {
    if (!(err instanceof UserError)) logger.error("socket handler failed", { err: String(err) });
    reply({ ok: false, error: userMessage(err) });
  }
}

export function registerPlayerHandlers(socket: PlayerSocket, { teams, sessions, matches }: Services): void {
  socket.data.code = null;
  socket.data.playerId = null;

  const seated = (): { code: string; playerId: string } => {
    const { code, playerId } = socket.data;
    if (!code || !playerId) throw new UserError("You're not in a team.");
    return { code, playerId };
  };

  const sit = ({ team, player }: Seat): JoinResult => {
    if (socket.data.code && socket.data.code !== team.code) void socket.leave(teamRoom(socket.data.code));
    socket.data.code = team.code;
    socket.data.playerId = player.id;
    void socket.join(teamRoom(team.code));
    return { playerId: player.id, token: player.token, session: teams.view(team) };
  };

  const stand = () => {
    if (socket.data.code) void socket.leave(teamRoom(socket.data.code));
    socket.data.code = null;
    socket.data.playerId = null;
  };

  socket.on("team:create", (payload, ack) =>
    handle(createTeamSchema, payload, ack, (p) => sit(sessions.createTeam(p.teamName, p.playerName))),
  );

  socket.on("team:join", (payload, ack) =>
    handle(joinTeamSchema, payload, ack, (p) => sit(sessions.joinTeam(p.code, p.playerName))),
  );

  socket.on("team:rejoin", (payload, ack) =>
    handle(rejoinSchema, payload, ack, (p) => {
      const result = sit(sessions.rejoinTeam(p.code, p.token));
      const live = matches.view(p.code);
      if (live) socket.emit("match:state", live);
      return result;
    }),
  );

  socket.on("team:leave", (payload, ack) =>
    handle(emptySchema, payload ?? {}, ack, () => {
      const { code, playerId } = seated();
      stand();
      sessions.leaveTeam(code, playerId);
      return null;
    }),
  );

  socket.on("session:start", (payload, ack) =>
    handle(startSessionSchema, payload ?? {}, ack, () => {
      const { code, playerId } = seated();
      sessions.start(code, playerId);
      return null;
    }),
  );

  socket.on("game:action", (payload) => {
    const parsed = gameActionSchema.safeParse(payload);
    const { code, playerId } = socket.data;
    if (!parsed.success || !code || !playerId) return;
    sessions.action(code, playerId, { type: parsed.data.action });
  });

  socket.on("disconnect", () => {
    const { code, playerId } = socket.data;
    if (code && playerId) sessions.setConnected(code, playerId, false);
  });
}
