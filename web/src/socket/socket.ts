import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@server/types/contracts.js";

/** The one Socket.IO connection. Same origin: Vite proxies it in dev. */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({ autoConnect: false });
