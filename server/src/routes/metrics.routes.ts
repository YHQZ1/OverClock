import { Router } from "express";
import { getMetrics } from "../controllers/metrics.controller.js";
import type { Metrics } from "../services/metrics.js";

/** Server health numbers (counts and timings only — no player data). */
export const metricsRoutes = (metrics: Metrics) => Router().get("/", getMetrics(metrics));
