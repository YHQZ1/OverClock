import { existsSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import type { Env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { healthRoutes } from "./routes/health.routes.js";
import { metricsRoutes } from "./routes/metrics.routes.js";
import type { Metrics } from "./services/metrics.js";

export function createApp(env: Env, metrics?: Metrics) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.use("/api/health", healthRoutes);
  if (metrics) app.use("/api/metrics", metricsRoutes(metrics));

  // Production: serve the built web app; any non-API page falls back to index.html.
  if (existsSync(join(env.WEB_DIST, "index.html"))) {
    app.use(express.static(env.WEB_DIST));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
      res.sendFile(join(env.WEB_DIST, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
