import type { NextFunction, Request, Response } from "express";
import { UserError, userMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (!(err instanceof UserError)) logger.error("request failed", { err: String(err) });
  res.status(err instanceof UserError ? 400 : 500).json({ error: userMessage(err) });
}
