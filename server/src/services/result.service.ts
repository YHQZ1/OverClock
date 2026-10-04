import type { Side } from "../sim/index.js";
import type { Leaderboards } from "../types/contracts.js";
import { logger } from "../utils/logger.js";
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

  /** Re-read the boards and push them to everyone. */
  async refresh(): Promise<Leaderboards> {
    this.cache = await this.store.boards(BOARD_SIZE);
    this.notify.leaderboard(this.cache);
    return this.cache;
  }

  async boards(): Promise<Leaderboards> {
    return this.cache ?? (this.cache = await this.store.boards(BOARD_SIZE));
  }

  close(): Promise<void> {
    return this.store.close();
  }
}
