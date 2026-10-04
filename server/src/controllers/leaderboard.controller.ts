import type { NextFunction, Request, Response } from "express";
import type { Leaderboards } from "../types/contracts.js";

export type BoardSource = () => Promise<Leaderboards>;

export const getLeaderboard = (boards: BoardSource) => async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await boards());
  } catch (err) {
    next(err);
  }
};
