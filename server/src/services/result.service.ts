import type { Side } from "../sim/index.js";
import type { AdminBoards, Awards, Leaderboards } from "../types/contracts.js";
import { logger } from "../utils/logger.js";
import { computeAwards } from "./awards.js";
import type { Broadcaster } from "./broadcaster.js";
import type { MatchRecord, ResultStore } from "./result.store.js";

/** How many entries each board shows. */
export const BOARD_SIZE = 10;
/** The admin list goes deeper, so a hidden or low entry can still be found. */
const ADMIN_LIMIT = 200;

/**
 * Saves completed matches and keeps the leaderboards fresh: after every save
 * the boards are re-read once and pushed to every connected PC.
 */
export class ResultService {
  private cache: Leaderboards | null = null;
  private awardsCache: Awards | null = null;

  constructor(
    private readonly store: ResultStore,
    private readonly notify: Broadcaster,
  ) {}

  /** Save a match; resolves to each team's place on its board. */
  async record(record: MatchRecord): Promise<Record<Side, number> | null> {
    await this.store.save(record);
    logger.info("match saved", { id: record.id, format: record.format });
    const ranks = await this.store.ranks(record.id);
    await this.refresh();
    return ranks;
  }

  /** Re-read the boards and awards and push them out (boards to everyone, awards to big screens). */
  async refresh(): Promise<Leaderboards> {
    const [boards, awards] = await Promise.all([this.store.boards(BOARD_SIZE), this.loadAwards()]);
    this.cache = boards;
    this.awardsCache = awards;
    this.notify.leaderboard(boards);
    this.notify.awards(awards);
    return boards;
  }

  async boards(): Promise<Leaderboards> {
    return this.cache ?? (this.cache = await this.store.boards(BOARD_SIZE));
  }

  async awards(): Promise<Awards> {
    return this.awardsCache ?? (this.awardsCache = await this.loadAwards());
  }

  /** Take a team off the boards or put it back (admin), then push the corrected boards. */
  async setHidden(matchId: string, side: Side, hidden: boolean): Promise<void> {
    await this.store.setHidden(matchId, side, hidden);
    await this.refresh();
  }

  /** Everything saved, hidden entries included — the admin page's list. */
  adminBoards(): Promise<AdminBoards> {
    return this.store.adminBoards(ADMIN_LIMIT);
  }

  /** Wipe every saved result and push the empty boards. */
  async reset(): Promise<void> {
    await this.store.reset();
    logger.warn("leaderboard reset by admin");
    await this.refresh();
  }

  private async loadAwards(): Promise<Awards> {
    return computeAwards(await this.store.awardMatches());
  }

  close(): Promise<void> {
    return this.store.close();
  }
}
