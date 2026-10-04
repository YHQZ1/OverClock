import { z } from "zod";
import { THEMES } from "../config/game.js";
import { ATTACKS, DEFENCES, UTILITIES } from "../sim/index.js";

// Every socket payload is validated here — a bad message must never break a match.

const name = (max: number) => z.string().trim().min(1, "Tell us your name.").max(max);
export const roomCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}$/, "The room code has 4 letters.");

export const createRoomSchema = z.object({ playerName: name(16) });
export const joinRoomSchema = z.object({ code: roomCode, playerName: name(16) });
export const rejoinSchema = z.object({ code: roomCode, token: z.string().min(16).max(64) });

/** For events that carry no data. */
export const emptySchema = z.object({});

export const slotSchema = z.object({ slot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) });
export const readySchema = z.object({ ready: z.boolean() });
export const teamNameSchema = z.object({ name: z.string().trim().min(1).max(20) });
export const voteSchema = z.object({ theme: z.enum(THEMES) });

export const gameActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("buy"), item: z.enum(DEFENCES) }),
  z.object({ kind: z.literal("sell"), item: z.enum(DEFENCES) }),
  z.object({ kind: z.literal("use"), item: z.enum(UTILITIES) }),
  z.object({ kind: z.literal("attack"), item: z.enum(ATTACKS) }),
]);

export type CreateRoomPayload = z.infer<typeof createRoomSchema>;
export type JoinRoomPayload = z.infer<typeof joinRoomSchema>;
export type RejoinPayload = z.infer<typeof rejoinSchema>;
export type SlotPayload = z.infer<typeof slotSchema>;
export type ReadyPayload = z.infer<typeof readySchema>;
export type TeamNamePayload = z.infer<typeof teamNameSchema>;
export type VotePayload = z.infer<typeof voteSchema>;
export type GameActionPayload = z.infer<typeof gameActionSchema>;
