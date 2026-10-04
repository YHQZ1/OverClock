import { describe, expect, it } from "vitest";
import {
  createRoomSchema,
  gameActionSchema,
  joinRoomSchema,
  slotSchema,
  voteSchema,
} from "../../src/validators/socket.schemas.js";

describe("socket payload validation", () => {
  it("normalises room codes and rejects bad ones", () => {
    expect(joinRoomSchema.parse({ code: " abcd ", playerName: "P" }).code).toBe("ABCD");
    expect(joinRoomSchema.safeParse({ code: "AB1D", playerName: "P" }).success).toBe(false);
    expect(joinRoomSchema.safeParse({ code: "ABCDE", playerName: "P" }).success).toBe(false);
  });

  it("requires a short, non-empty name", () => {
    expect(createRoomSchema.safeParse({ playerName: "   " }).success).toBe(false);
    expect(createRoomSchema.safeParse({ playerName: "x".repeat(17) }).success).toBe(false);
    expect(createRoomSchema.parse({ playerName: "  Priya " }).playerName).toBe("Priya");
  });

  it("only accepts real slots and themes", () => {
    expect(slotSchema.safeParse({ slot: 5 }).success).toBe(false);
    expect(slotSchema.safeParse({ slot: 2 }).success).toBe(true);
    expect(voteSchema.safeParse({ theme: "space" }).success).toBe(false);
  });

  it("pairs each action kind with items of the right kind", () => {
    expect(gameActionSchema.safeParse({ kind: "buy", item: "server" }).success).toBe(true);
    expect(gameActionSchema.safeParse({ kind: "attack", item: "jam" }).success).toBe(true);
    expect(gameActionSchema.safeParse({ kind: "buy", item: "jam" }).success).toBe(false);
    expect(gameActionSchema.safeParse({ kind: "attack", item: "server" }).success).toBe(false);
    expect(gameActionSchema.safeParse({ kind: "nuke", item: "server" }).success).toBe(false);
  });
});
