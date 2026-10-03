// TEMPORARY: stands in for the server until Milestone 2 wires up Socket.IO.
// Nothing here is persisted, so a shared lab PC never keeps a stale team.

export type MockPlayer = { name: string; isHost: boolean; isYou: boolean };

export type MockSession = {
  code: string;
  teamName: string;
  players: MockPlayer[];
};

// No I/O — they read like 1/0 on a projector.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;
export const MAX_PLAYERS = 3;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function mockCreate(teamName: string, playerName: string): MockSession {
  return {
    code: randomCode(),
    teamName,
    players: [{ name: playerName, isHost: true, isYou: true }],
  };
}

export function mockJoin(code: string, playerName: string): MockSession {
  return {
    code,
    teamName: "Your team",
    players: [
      { name: "Team host", isHost: true, isYou: false },
      { name: playerName, isHost: false, isYou: true },
    ],
  };
}
