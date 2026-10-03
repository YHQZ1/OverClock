# Overclock

**Keep the app alive. Keep the fans happy.**

A live team survival game for a college tech fest, played on the lab PCs.
Teams of 2–3 players, one PC each, keep a pretend app alive while disasters
hit it — rush hours, server meltdowns, slow databases, bot armies — without
wasting their budget. No system-design knowledge needed; the real concepts
are revealed after each round.

> Complexity underneath. Simplicity on top.

## Stack

- **web** — React, Vite, TypeScript, Tailwind CSS, Motion, React Router, Zustand
- **server** — Node.js, Express 5, Socket.IO, Zod, TypeScript
- **data** — PostgreSQL + Drizzle (Docker locally, Render in production)
- **tooling** — pnpm workspaces, Vitest, tsx
- **hosting** — one Render web service + Render Postgres

## Quick start

Requires Node 22+, pnpm, and Docker.

```sh
pnpm install
cp infra/.env.example server/.env
pnpm db:up          # start local Postgres
pnpm dev            # server + web with hot reload
```

## Commands

| Command                       | What it does                                  |
| ----------------------------- | --------------------------------------------- |
| `pnpm dev`                    | Run server and web in watch mode              |
| `pnpm build`                  | Build both for production                     |
| `pnpm start`                  | Run the built server (serves the web app too) |
| `pnpm test`                   | Run all tests                                 |
| `pnpm typecheck`              | Type-check everything                         |
| `pnpm db:up` / `pnpm db:down` | Start / stop local Postgres                   |

## Layout

```
web/      player (/play) and big screen (/screen) pages; organizer (/admin) later
server/   game server: REST API, Socket.IO, pure game engine (src/sim)
docs/     game design, architecture, decisions, plan, balance, event runbook
infra/    docker-compose, Render blueprint, env example
```

## Docs

- [The game](docs/GAME.md) — rules, buttons, disasters, rounds, themes
- [Architecture](docs/ARCHITECTURE.md) — structure, rules, socket events, data
- [Decisions](docs/DECISIONS.md) — what we chose and why; open questions
- [Plan](docs/PLAN.md) — milestones and progress
- [Balance](docs/BALANCE.md) — tuning values, bot results, playtest log
- [Runbook](docs/RUNBOOK.md) — running the event, and what to do when things break
