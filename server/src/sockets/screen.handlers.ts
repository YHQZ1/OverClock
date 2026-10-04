import type { Services } from "../services/index.js";
import type { Ack, ScreenSnapshot } from "../types/contracts.js";
import { logger } from "../utils/logger.js";
import type { PlayerSocket } from "./player.handlers.js";

/** Big screens listen here for matches in progress and awards. */
export const SCREEN_CHANNEL = "screen";

export function registerScreenHandlers(socket: PlayerSocket, { screen }: Services): void {
  socket.on("screen:watch", async (_payload, ack) => {
    const reply: Ack<ScreenSnapshot> = typeof ack === "function" ? ack : () => {};
    void socket.join(SCREEN_CHANNEL);
    try {
      reply({ ok: true, data: await screen.snapshot() });
    } catch (err) {
      logger.error("screen snapshot failed", { err: String(err) });
      reply({ ok: false, error: "The leaderboard is unavailable right now." });
    }
  });
}
