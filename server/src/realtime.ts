import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { DEFAULT_TIMING, type GameTiming } from "./config/game.js";
import { createServices, type ServiceOptions } from "./services/index.js";
import type { SessionDeps } from "./services/session.service.js";
import { attachSockets, socketBroadcaster, type IoServer } from "./sockets/index.js";

/** Socket.IO + services wired together on an HTTP server. */
export function createRealtime(http: HttpServer, timing: GameTiming = DEFAULT_TIMING, deps: SessionDeps = {}, options: ServiceOptions = {}) {
  const io: IoServer = new Server(http, { serveClient: false });
  const services = createServices(socketBroadcaster(io), timing, deps, options);
  attachSockets(io, services);
  services.start();

  return {
    io,
    services,
    async close() {
      services.stop();
      await io.close();
      await services.results.close();
    },
  };
}
