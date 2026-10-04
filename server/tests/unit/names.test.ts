import { describe, expect, it } from "vitest";
import { isCleanName } from "../../src/utils/names.js";
import { teamNameSchema } from "../../src/validators/socket.schemas.js";

describe("name filter", () => {
  it("lets real names through — including ones with rude words hidden inside", () => {
    for (const n of ["Priya", "Rahul & Aisha", "Kshitij", "Gandhi", "Gandharv", "Chodankar", "Randive", "Kuttikrishnan", "Peacock", "Dickens", "Lundgren", "Assam Tigers", "Class Act", "Kamini", "Mcdonalds", "Rapid Fire", "Team 404"]) {
      expect(isCleanName(n), n).toBe(true);
    }
  });

  it("stops the obvious ones, spaced out or disguised (not every spelling — the admin can hide what slips through)", () => {
    for (const n of ["fuck", "F u c k", "fuuuck", "B1tch", "sh!t", "MC Stan", "team bc", "chutiya", "Ch00tiya", "bhosdike", "lund", "Randi", "Hitler"]) {
      expect(isCleanName(n), n).toBe(false);
    }
  });

  it("is enforced on team names", () => {
    expect(teamNameSchema.safeParse({ name: "chutiya gang" })).toMatchObject({ success: false });
    expect(teamNameSchema.safeParse({ name: "Byte Me" })).toMatchObject({ success: true });
  });
});
