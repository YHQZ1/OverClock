import { randomBytes, randomInt, randomUUID } from "node:crypto";

// No I/O — they read like 1/0 on a projector.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;

export function teamCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export const playerId = (): string => randomUUID();
export const rejoinToken = (): string => randomBytes(16).toString("hex");
export const matchSeed = (): number => randomInt(1, 2 ** 31 - 1);
