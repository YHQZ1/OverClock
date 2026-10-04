import { Router } from "express";
import { getLeaderboard, type BoardSource } from "../controllers/leaderboard.controller.js";

/** Top teams per format (1v1 / 2v2). */
export const leaderboardRoutes = (boards: BoardSource) => Router().get("/", getLeaderboard(boards));
