import type { Server } from "socket.io";
import type { Broadcaster } from "../services/broadcaster.js";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "../types/contracts.js";
import { registerPlayerHandlers, teamRoom, type Services } from "./player.handlers.js";

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Broadcaster backed by Socket.IO rooms (one room per team). */
export function socketBroadcaster(io: IoServer): Broadcaster {
  return {
    session: (view) => io.to(teamRoom(view.code)).emit("session:state", view),
    match: (code, view) => io.to(teamRoom(code)).emit("match:state", view),
    matchEvents: (code, events) => io.to(teamRoom(code)).emit("match:event", events),
  };
}

export function attachSockets(io: IoServer, services: Services): void {
  io.on("connection", (socket) => registerPlayerHandlers(socket, services));
}
