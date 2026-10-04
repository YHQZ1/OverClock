import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Only completed matches are written (docs/ARCHITECTURE.md → Data).
// Change this file, then `pnpm db:generate` to add a migration.

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    format: text("format").$type<"1v1" | "2v2">().notNull(),
    theme: text("theme").notNull(),
    /** null = draw. */
    winnerSide: smallint("winner_side"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("matches_completed_at_idx").on(t.completedAt)],
);

/** One row per team per match — the leaderboard is a query over these. */
export const matchTeams = pgTable(
  "match_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    side: smallint("side").notNull(),
    format: text("format").$type<"1v1" | "2v2">().notNull(),
    name: text("name").notNull(),
    players: jsonb("players").$type<string[]>().notNull(),
    totalScore: integer("total_score").notNull(),
    matchPoints: integer("match_points").notNull(),
    /** null = draw. */
    won: boolean("won"),
    crashes: integer("crashes").notNull(),
    downtimeSec: real("downtime_sec").notNull(),
    /** Set from the admin page (e.g. a rude team name) — hidden from every board. */
    hidden: boolean("hidden").notNull().default(false),
  },
  (t) => [index("match_teams_board_idx").on(t.format, t.hidden, t.matchPoints)],
);

/** One row per round: both sides' scores, plus the seed and action log to replay it exactly. */
export const matchRounds = pgTable("match_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  roundNo: smallint("round_no").notNull(),
  seed: integer("seed").notNull(),
  winnerSide: smallint("winner_side"),
  scores: jsonb("scores").notNull(),
  actionLog: jsonb("action_log").notNull(),
});
