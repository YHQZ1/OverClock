import { z } from "zod";

// Every socket payload is validated here — a bad message must never break a match.

const name = (max: number) => z.string().trim().min(1).max(max);
export const teamCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}$/, "The team code has 4 letters.");

export const createTeamSchema = z.object({
  teamName: name(20).min(2, "Give your team a name (at least 2 letters)."),
  playerName: name(16),
});

export const joinTeamSchema = z.object({
  code: teamCode,
  playerName: name(16),
});

export const rejoinSchema = z.object({
  code: teamCode,
  token: z.string().min(16).max(64),
});

/** For events that carry no data. */
export const emptySchema = z.object({});

export const startSessionSchema = z.object({
  tutorial: z.boolean().optional(),
});

export const gameActionSchema = z.object({
  action: z.enum(["addServer", "removeServer"]),
});

export type CreateTeamPayload = z.infer<typeof createTeamSchema>;
export type JoinTeamPayload = z.infer<typeof joinTeamSchema>;
export type RejoinPayload = z.infer<typeof rejoinSchema>;
export type StartSessionPayload = z.infer<typeof startSessionSchema>;
export type GameActionPayload = z.infer<typeof gameActionSchema>;
