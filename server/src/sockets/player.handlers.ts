import type { Socket } from "socket.io";
import type { ZodType } from "zod";
import type { Services } from "../services/index.js";
import { sideOf, type Seat } from "../services/room.service.js";
import type { Side } from "../sim/index.js";
import type { Ack, ClientToServerEvents, JoinResult, ServerToClientEvents, SocketData } from "../types/contracts.js";
import { UserError, userMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import {
  createRoomSchema,
  emptySchema,
  gameActionSchema,
  joinRoomSchema,
  readySchema,
  rejoinSchema,
  slotSchema,
  teamNameSchema,
  voteSchema,
} from "../validators/socket.schemas.js";

export type PlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export const roomChannel = (code: string) => `room:${code}`;
export const sideChannel = (code: string, side: Side) => `room:${code}:side:${side}`;

/** Validate → run → ack. Unknown errors are logged and hidden from players. */
function handle<P, T>(schema: ZodType<P>, payload: unknown, ack: unknown, run: (data: P) => T): void {
  const reply = typeof ack === "function" ? (ack as Ack<T>) : () => {};
  const parsed = schema.safeParse(payload ?? {});
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

export function registerPlayerHandlers(socket: PlayerSocket, { rooms, sessions, matches }: Services): void {
  socket.data = { code: null, playerId: null, side: null };

  const seated = (): { code: string; playerId: string } => {
    const { code, playerId } = socket.data;
    if (!code || !playerId) throw new UserError("You're not in a room.");
    return { code, playerId };
  };

  /** Keep this socket in its room's channel and its side's channel. */
  const syncChannels = () => {
    const { code, playerId } = socket.data;
    const player = code ? rooms.get(code)?.players.find((p) => p.id === playerId) : undefined;
    const side = player?.slot ? sideOf(player.slot) : null;
    if (code && socket.data.side !== side) {
      if (socket.data.side) void socket.leave(sideChannel(code, socket.data.side));
      if (side) void socket.join(sideChannel(code, side));
    }
    socket.data.side = side;
  };

  const sit = ({ room, player }: Seat): JoinResult => {
    if (socket.data.code && socket.data.code !== room.code) stand();
    socket.data.code = room.code;
    socket.data.playerId = player.id;
    void socket.join(roomChannel(room.code));
    syncChannels();
    return { playerId: player.id, token: player.token, room: rooms.view(room, sessions.totalRounds) };
  };

  const stand = () => {
    const { code, side } = socket.data;
    if (code) {
      void socket.leave(roomChannel(code));
      if (side) void socket.leave(sideChannel(code, side));
    }
    socket.data = { code: null, playerId: null, side: null };
  };

  socket.on("room:create", (payload, ack) =>
    handle(createRoomSchema, payload, ack, (p) => sit(sessions.createRoom(p.playerName))),
  );

  socket.on("room:join", (payload, ack) =>
    handle(joinRoomSchema, payload, ack, (p) => sit(sessions.joinRoom(p.code, p.playerName))),
  );

  socket.on("room:rejoin", (payload, ack) =>
    handle(rejoinSchema, payload, ack, (p) => {
      const result = sit(sessions.rejoinRoom(p.code, p.token));
      const live = socket.data.side ? matches.view(p.code, socket.data.side) : null;
      if (live) socket.emit("match:state", live);
      return result;
    }),
  );

  socket.on("room:leave", (payload, ack) =>
    handle(emptySchema, payload, ack, () => {
      const { code, playerId } = seated();
      stand();
      sessions.leaveRoom(code, playerId);
      return null;
    }),
  );

  socket.on("room:slot", (payload, ack) =>
    handle(slotSchema, payload, ack, (p) => {
      const { code, playerId } = seated();
      sessions.setSlot(code, playerId, p.slot);
      syncChannels();
      return null;
    }),
  );

  socket.on("room:ready", (payload, ack) =>
    handle(readySchema, payload, ack, (p) => {
      const { code, playerId } = seated();
      sessions.setReady(code, playerId, p.ready);
      return null;
    }),
  );

  socket.on("room:teamName", (payload, ack) =>
    handle(teamNameSchema, payload, ack, (p) => {
      const { code, playerId } = seated();
      sessions.setTeamName(code, playerId, p.name);
      return null;
    }),
  );

  socket.on("briefing:continue", (payload, ack) =>
    handle(emptySchema, payload, ack, () => {
      const { code, playerId } = seated();
      sessions.continueBriefing(code, playerId);
      return null;
    }),
  );

  socket.on("vote:theme", (payload, ack) =>
    handle(voteSchema, payload, ack, (p) => {
      const { code, playerId } = seated();
      sessions.vote(code, playerId, p.theme);
      return null;
    }),
  );

  socket.on("game:action", (payload) => {
    const parsed = gameActionSchema.safeParse(payload);
    const { code, playerId } = socket.data;
    if (!parsed.success || !code || !playerId) return;
    sessions.game(code, playerId, parsed.data);
  });

  socket.on("disconnect", async () => {
    const { code, playerId } = socket.data;
    if (!code || !playerId) return;
    // A flaky network can reconnect (and rejoin) before the old connection's close
    // arrives — then the player is still here and must not be marked gone.
    const sockets = await socket.nsp.in(roomChannel(code)).fetchSockets();
    if (sockets.some((s) => s.id !== socket.id && s.data.playerId === playerId)) return;
    sessions.setConnected(code, playerId, false);
  });
}
