# CLAUDE.md

Overclock: live team survival game for 1st/2nd-year CS students at a fest,
played on college lab PCs (desktop, mouse + keyboard). Solo developer, tight
timeline, continuous milestones (docs/PLAN.md). Read `docs/` before design changes.

## Commands

- `pnpm dev` — server + web in watch mode
- `pnpm test` / `pnpm typecheck` — run before calling anything done
- `pnpm db:up` — local Postgres (infra/docker-compose.yml)
- `pnpm --filter @overclock/server balance` — bot balance report (once it exists)

## Layout

- `web/` — React + Vite + TS. Routes: `/play`, `/screen` (`/admin` deferred — core team flow first).
- `server/` — Express 5 + Socket.IO + TS. `server.ts → app.ts → routes → controllers → services`, plus `sockets/`, `sim/`, `db/`, `validators/`, `middlewares/`, `utils/`, `config/`, `types/`.
- `docs/` — GAME, ARCHITECTURE, DECISIONS, PLAN, BALANCE, RUNBOOK.
- `infra/` — docker-compose, render.yaml, .env.example.

## Rules

- **`server/src/sim` is pure**: no Express/Socket.IO/DB imports, no `Date.now()`, no `Math.random()` (use the seeded RNG in state). Same scenario + action log ⇒ same result.
- **Thin controllers and socket handlers**: validate with Zod → call a service → respond/emit. Both call the same services.
- **Live match state is in memory, owned by `match.service`**; DB writes only when rounds/sessions end. Single server instance.
- **`web` imports from `server` with `import type` only.**
- **Server ESM uses `NodeNext`**: relative imports need `.js` extensions.
- **Desktop-first** (≥1366×768), keyboard shortcuts on every button, lightweight animations, visual-first alerts (no guaranteed audio).
- **Shared PCs**: clear saved team/session data when a session ends or is abandoned.
- **Never expose technical terms in player-facing UI** (no CPU %, RPS, latency, "cache", "load balancer"). Those belong in the post-round reveal or the hidden Tech View.
- One root `.gitignore` only — no per-folder ignore files.
- Keep `docs/PLAN.md` status and `docs/DECISIONS.md` up to date as work lands.
- Don't commit unless asked.
