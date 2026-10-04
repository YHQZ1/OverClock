import { and, asc, count, desc, eq, gt, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ThemeId } from "../config/game.js";
import type { Db } from "../db/client.js";
import { matchRounds, matches, matchTeams } from "../db/schema.js";
import type { ActionLog, RoundResult, Side } from "../sim/index.js";
import type { Format, LeaderboardEntry, Leaderboards } from "../types/contracts.js";

/** A completed match, ready to save. */
export type MatchRecord = {
  id: string;
  code: string;
  format: Format;
  theme: ThemeId;
  winner: Side | null;
  completedAt: Date;
  teams: {
    side: Side;
    name: string;
    players: string[];
    total: number;
    points: number;
    won: boolean | null;
    crashes: number;
    downtimeSec: number;
  }[];
  rounds: { round: number; seed: number; winner: Side | null; scores: RoundResult["scores"]; log: ActionLog }[];
};

/** Where finished matches go. Postgres in production; memory for tests and DB-less dev. */
export interface ResultStore {
  save(record: MatchRecord): Promise<void>;
  /** Top `limit` per format, best first; hidden entries left out. */
  boards(limit: number): Promise<Leaderboards>;
  /** Each team's place on its board (ties share a place). */
  ranks(matchId: string): Promise<Record<Side, number> | null>;
  /** Take one team's entry off every board (admin: e.g. a rude team name). */
  hide(matchId: string, side: Side): Promise<void>;
  close(): Promise<void>;
}

const FORMATS: readonly Format[] = ["1v1", "2v2"];

type Row = Omit<LeaderboardEntry, "rank">;

/** Competition ranking: equal points share a place (1, 2, 2, 4). */
function ranked(rows: Row[]): LeaderboardEntry[] {
  let rank = 0;
  return rows.map((row, i) => {
    if (i === 0 || row.points !== rows[i - 1]!.points) rank = i + 1;
    return { ...row, rank };
  });
}

// ---------- memory ----------

export class MemoryResultStore implements ResultStore {
  private readonly records: MatchRecord[] = [];
  private readonly hidden = new Set<string>(); // `${matchId}:${side}`

  async save(record: MatchRecord): Promise<void> {
    this.records.push(structuredClone(record));
  }

  private rows(format: Format): Row[] {
    const rows: (Row & { completedAt: number })[] = [];
    for (const r of this.records) {
      if (r.format !== format) continue;
      for (const t of r.teams) {
        if (this.hidden.has(`${r.id}:${t.side}`)) continue;
        const opp = r.teams.find((o) => o.side !== t.side)!;
        rows.push({
          matchId: r.id,
          side: t.side,
          team: t.name,
          players: t.players,
          points: t.points,
          total: t.total,
          won: t.won,
          opponent: opp.name,
          theme: r.theme,
          at: r.completedAt.toISOString(),
          completedAt: r.completedAt.getTime(),
        });
      }
    }
    rows.sort((a, b) => b.points - a.points || a.completedAt - b.completedAt);
    return rows.map(({ completedAt: _, ...row }) => row);
  }

  async boards(limit: number): Promise<Leaderboards> {
    return { "1v1": ranked(this.rows("1v1")).slice(0, limit), "2v2": ranked(this.rows("2v2")).slice(0, limit) };
  }

  async ranks(matchId: string): Promise<Record<Side, number> | null> {
    const record = this.records.find((r) => r.id === matchId);
    if (!record) return null;
    const all = this.rows(record.format);
    const place = (side: Side) => {
      const points = record.teams.find((t) => t.side === side)!.points;
      return all.filter((r) => r.points > points).length + 1;
    };
    return { 1: place(1), 2: place(2) };
  }

  async hide(matchId: string, side: Side): Promise<void> {
    this.hidden.add(`${matchId}:${side}`);
  }

  async close(): Promise<void> {}
}

// ---------- Postgres ----------

export class PgResultStore implements ResultStore {
  constructor(
    private readonly db: Db,
    private readonly onClose: () => Promise<void> = async () => {},
  ) {}

  async save(r: MatchRecord): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(matches).values({ id: r.id, code: r.code, format: r.format, theme: r.theme, winnerSide: r.winner, completedAt: r.completedAt });
      await tx.insert(matchTeams).values(
        r.teams.map((t) => ({
          matchId: r.id,
          side: t.side,
          format: r.format,
          name: t.name,
          players: t.players,
          totalScore: Math.round(t.total),
          matchPoints: Math.round(t.points),
          won: t.won,
          crashes: t.crashes,
          downtimeSec: t.downtimeSec,
        })),
      );
      await tx.insert(matchRounds).values(
        r.rounds.map((round) => ({
          matchId: r.id,
          roundNo: round.round,
          seed: round.seed,
          winnerSide: round.winner,
          scores: round.scores,
          actionLog: round.log,
        })),
      );
    });
  }

  async boards(limit: number): Promise<Leaderboards> {
    const opp = alias(matchTeams, "opp");
    const board = async (format: Format) => {
      const rows = await this.db
        .select({
          matchId: matchTeams.matchId,
          side: matchTeams.side,
          team: matchTeams.name,
          players: matchTeams.players,
          points: matchTeams.matchPoints,
          total: matchTeams.totalScore,
          won: matchTeams.won,
          opponent: opp.name,
          theme: matches.theme,
          at: matches.completedAt,
        })
        .from(matchTeams)
        .innerJoin(matches, eq(matches.id, matchTeams.matchId))
        .innerJoin(opp, and(eq(opp.matchId, matchTeams.matchId), ne(opp.side, matchTeams.side)))
        .where(and(eq(matchTeams.format, format), eq(matchTeams.hidden, false)))
        .orderBy(desc(matchTeams.matchPoints), asc(matches.completedAt))
        .limit(limit);
      return ranked(rows.map((row) => ({ ...row, side: row.side as Side, theme: row.theme as ThemeId, at: row.at.toISOString() })));
    };
    const [one, two] = await Promise.all(FORMATS.map(board));
    return { "1v1": one!, "2v2": two! };
  }

  async ranks(matchId: string): Promise<Record<Side, number> | null> {
    const teams = await this.db
      .select({ side: matchTeams.side, format: matchTeams.format, points: matchTeams.matchPoints })
      .from(matchTeams)
      .where(eq(matchTeams.matchId, matchId));
    if (teams.length !== 2) return null;
    const place = async (t: (typeof teams)[number]) => {
      const [row] = await this.db
        .select({ ahead: count() })
        .from(matchTeams)
        .where(and(eq(matchTeams.format, t.format), eq(matchTeams.hidden, false), gt(matchTeams.matchPoints, t.points)));
      return (row?.ahead ?? 0) + 1;
    };
    const bySide = Object.fromEntries(await Promise.all(teams.map(async (t) => [t.side, await place(t)]))) as Record<Side, number>;
    return bySide;
  }

  async hide(matchId: string, side: Side): Promise<void> {
    await this.db
      .update(matchTeams)
      .set({ hidden: true })
      .where(and(eq(matchTeams.matchId, matchId), eq(matchTeams.side, side)));
  }

  async close(): Promise<void> {
    await this.onClose();
  }
}
