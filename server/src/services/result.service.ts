import type { Side } from "../sim/index.js";
import type { Awards, Leaderboards } from "../types/contracts.js";
import { logger } from "../utils/logger.js";
import { computeAwards } from "./awards.js";
import type { Broadcaster } from "./broadcaster.js";
import type { MatchRecord, ResultStore } from "./result.store.js";

/** How many entries each board shows. */
export const BOARD_SIZE = 10;

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

  /** Take a team off the boards (admin), then push the corrected boards. */
  async hide(matchId: string, side: Side): Promise<void> {
    await this.store.hide(matchId, side);
    await this.refresh();
  }

  private async loadAwards(): Promise<Awards> {
    return computeAwards(await this.store.awardMatches());
  }

  close(): Promise<void> {
    return this.store.close();
  }
}
