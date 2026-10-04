import type { Request, Response } from "express";
import type { Metrics } from "../services/metrics.js";

export const getMetrics = (metrics: Metrics) => (_req: Request, res: Response) => {
  res.json(metrics.snapshot());
};
