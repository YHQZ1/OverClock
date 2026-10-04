# CLAUDE.md

Overclock: live head-to-head strategy game (1v1 / 2v2 — "flood their site, keep
yours alive") for SymbiTech, our college tech fest. Walk-in players are mostly
non-technical; played on college lab PCs (desktop, mouse + keyboard). Solo
developer, tight timeline. No milestones — build from the queue in
docs/PLAN.md, top first. Read `docs/` before design changes.

## Commands

- `pnpm dev` — server + web in watch mode
- `pnpm test` (unit + integration) / `pnpm typecheck` — run before calling anything done
- `pnpm test:balance`, `pnpm test:e2e`, `pnpm test:load` — slower suites (docs/TESTING.md)
- `pnpm db:up` — local Postgres (infra/docker-compose.yml)
- `pnpm --filter @overclock/server balance` — bot balance report

## Layout

- `web/` — React + Vite + TS + Tailwind v4. Routes: `/play`, `/screen` (`/admin` deferred).
- `server/` — Express 5 + Socket.IO + TS. `server.ts → app.ts → routes → controllers → services`, plus `sockets/`, `sim/`, `db/`, `validators/`, `middlewares/`, `utils/`, `config/`, `types/`.
- `docs/` — GAME, ARCHITECTURE, DECISIONS, PLAN, BALANCE, TESTING, RUNBOOK.
- `e2e/` — Playwright tests. Server tests in `server/tests/{unit,integration,balance,load}`, web in `web/tests/unit`.
- `infra/` — docker-compose, render.yaml, .env.example.

## Rules

- **`server/src/sim` is pure**: no Express/Socket.IO/DB imports, no `Date.now()`, no `Math.random()` (use the seeded RNG in state). Same scenario + action log ⇒ same result.
- **Thin controllers and socket handlers**: validate with Zod → call a service → respond/emit. Both call the same services.
- **Live match state is in memory, owned by `match.service`**; DB writes only when rounds/sessions end. Single server instance.
- **`web` imports from `server` with `import type` only.**
- **Server ESM uses `NodeNext`**: relative imports need `.js` extensions.
- **Desktop-first** (≥1366×768), keyboard shortcuts on every button, lightweight animations, visual-first alerts (no guaranteed audio).
- **Shared PCs**: clear saved team/session data when a session ends or is abandoned.
- **Never expose technical terms in player-facing UI** (no CPU %, RPS, latency, "cache", "load balancer"). Use the player names from docs/GAME.md (Traffic splitter, Bouncer, Fast shelf…); real names only in the end-of-match reveal.
- One root `.gitignore` only — no per-folder ignore files.
- Keep `docs/PLAN.md` status and `docs/DECISIONS.md` up to date as work lands.
- Don't commit unless asked.
