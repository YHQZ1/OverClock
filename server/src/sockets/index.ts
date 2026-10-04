import type { Server } from "socket.io";
import type { Broadcaster } from "../services/broadcaster.js";
import type { Services } from "../services/index.js";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "../types/contracts.js";
import { registerPlayerHandlers, roomChannel, sideChannel } from "./player.handlers.js";
import { SCREEN_CHANNEL, registerScreenHandlers } from "./screen.handlers.js";

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Broadcaster backed by Socket.IO rooms: one channel per room, one per side. */
export function socketBroadcaster(io: IoServer): Broadcaster {
  return {
    room: (view) => io.to(roomChannel(view.code)).emit("room:state", view),
    match: (code, side, view) => io.to(sideChannel(code, side)).emit("match:state", view),
    matchEvents: (code, events) => io.to(roomChannel(code)).emit("match:event", events),
    leaderboard: (boards) => io.emit("leaderboard:update", boards),
    awards: (awards) => io.to(SCREEN_CHANNEL).emit("screen:awards", awards),
    screenMatches: (matches) => io.to(SCREEN_CHANNEL).emit("screen:matches", matches),
  };
}

export function attachSockets(io: IoServer, services: Services): void {
  io.on("connection", (socket) => {
    registerPlayerHandlers(socket, services);
    registerScreenHandlers(socket, services);
  });
}
