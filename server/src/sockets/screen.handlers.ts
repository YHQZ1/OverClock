import type { ZodType } from "zod";
import type { Services } from "../services/index.js";
import type { Ack } from "../types/contracts.js";
import { UserError, userMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import {
  emptySchema,
  hideSchema,
  resetSchema,
  roomSchema,
  tokenSchema,
} from "../validators/socket.schemas.js";
import { handle, type PlayerSocket } from "./player.handlers.js";

/** Staff pages listen here for matches in progress, boards and awards. */
export const SCREEN_CHANNEL = "screen";

/** Like `handle`, for async work (database writes). */
function handleAsync<P, T>(schema: ZodType<P>, payload: unknown, ack: unknown, run: (data: P) => Promise<T>): void {
  const reply = typeof ack === "function" ? (ack as Ack<T>) : () => {};
  const parsed = schema.safeParse(payload ?? {});
  if (!parsed.success) return reply({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." });
  run(parsed.data).then(
    (data) => reply({ ok: true, data }),
    (err: unknown) => {
      if (!(err instanceof UserError)) logger.error("admin handler failed", { err: String(err) });
      reply({ ok: false, error: userMessage(err) });
    },
  );
}

/** Staff only: /admin, /live and /leaderboard. */
export function registerScreenHandlers(socket: PlayerSocket, { admin, screen, sessions, rooms, results }: Services): void {
  const staff = () => {
    if (!socket.data.admin) throw new UserError("Sign in as staff first.");
  };

  socket.on("screen:watch", (payload, ack) =>
    handleAsync(tokenSchema, payload, ack, async ({ token }) => {
      if (!admin.isValid(token)) throw new UserError("Please sign in again.");
      socket.data.admin = true;
      await socket.join(SCREEN_CHANNEL);
      return screen.snapshot();
    }),
  );

  socket.on("admin:rooms", (payload, ack) =>
    handle(emptySchema, payload, ack, () => {
      staff();
      return rooms.adminList();
    }),
  );
  socket.on("admin:endRoom", (payload, ack) =>
    handle(roomSchema, payload, ack, ({ code }) => {
      staff();
      sessions.endRoom(code);
      return null;
    }),
  );
  socket.on("admin:boards", (payload, ack) =>
    handleAsync(emptySchema, payload, ack, async () => {
      staff();
      return results.adminBoards();
    }),
  );
  socket.on("admin:hide", (payload, ack) =>
    handleAsync(hideSchema, payload, ack, async ({ matchId, side, hidden }) => {
      staff();
      await results.setHidden(matchId, side, hidden);
      return null;
    }),
  );
  socket.on("admin:resetBoards", (payload, ack) =>
    handleAsync(resetSchema, payload, ack, async () => {
      staff();
      await results.reset();
      return null;
    }),
  );
}
