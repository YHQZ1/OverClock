# Testing

Five kinds of tests, each answering a different question. Run them from the
repo root.

| Kind | Command | Answers | Time | Runs in CI |
| --- | --- | --- | --- | --- |
| **Unit** | `pnpm test:unit` | Do the rules and the display logic work? | seconds | every push |
| **Integration** | `pnpm test:integration` | Does the real server work with real socket clients — and save results to Postgres? | seconds | every push |
| **Balance** | `pnpm test:balance` | Is the game fair — no unbeatable strategy, every attack counterable? | ~10s | every push |
| **End-to-end** | `pnpm test:e2e` | Can two people actually play a match in a real browser? | ~3 min | PRs to `main`, pushes to `main` |
| **Load** | `pnpm test:load` | Does the server stay fast with a full lab playing at once? | ~1.5 min | nightly + on demand |

`pnpm test` runs unit + integration (the quick ones). `pnpm typecheck` covers
the app code *and* the tests.

## Where things live

```
server/tests/
  unit/          engine rules (engine.test.ts), rooms, phase machine (session),
                 views (hidden coins), scoring, validators, the demo match
                 (every attack shown; committed demo.json matches the engine)
  integration/   a real server on a random port + Socket.IO clients:
                 rooms, ready, vote, a full duel, attacks, forfeit, rejoin,
                 leaderboard pushed after a saved match; results.db.test.ts —
                 the Postgres result store against a real database
  balance/       bots play each other across seeds: idle loses, mirror matches
                 draw, no strategy wins > 90% against opponents that defend,
                 every attack has a counter that cuts its damage at least in half
  load/load.ts   standalone script (not Vitest) — see below
web/tests/unit/  alert text (names the key to press), feed text (never technical
                 terms), store (banners), card keys and names per theme, reveal
e2e/tests/       Playwright: home, form errors, a whole 1v1 match through the
                 5-step briefing, freeze + bots landing on the other screen,
                 refresh mid-round, Done clears the PC
```

Server tests are split into Vitest **projects** (`server/vitest.config.ts`), so
each kind runs on its own: `pnpm --filter @overclock/server test:unit`, etc.
Coverage: `pnpm test:coverage` (HTML report in `server/coverage/`).

## Database tests

`tests/integration/results.db.test.ts` runs the Postgres result store against
a real database. It needs `TEST_DATABASE_URL` — in `server/.env` locally
(`pnpm db:up` creates `overclock_test` on port 5433) and set in CI, which runs a
Postgres service. Without it those tests are skipped. The test database is
wiped before each test; your dev database (`overclock`) is never touched.

E2E and load runs start the server with `NODE_ENV=test`, which ignores
`server/.env` — results stay in memory, so test matches never reach the dev
leaderboard.

## End-to-end (Playwright)

- First time on a machine: `pnpm --filter @overclock/e2e install-browsers`.
- It starts **its own** server (port 3300, 25-second rounds) and web app (port
  5300), so it never touches a dev server you have running on 3000/5173.
- Every test fails on any browser console error.
- Debug visually: `pnpm --filter @overclock/e2e test:ui`. On CI failures, the
  HTML report and traces are uploaded as an artifact.

## Load

`pnpm test:load` starts a real server in its own process, then runs **30 rooms**
of bot players (every 4th room is 2v2 — about 75 players) through full matches,
polling `GET /api/metrics`. It fails if:

- any match doesn't reach a recorded final, or any player hits an error;
- a game-loop tick (all live matches) takes **> 25 ms at p95** or **> 100 ms ever**
  (the tick budget is 100 ms);
- the event loop runs **> 50 ms late at p95**.

Target: a full lab (~40 PCs ≈ 20 matches) × 1.5. Options: `LOAD_ROOMS=50`,
`LOAD_ROUND_SEC=20`, or `LOAD_URL=https://…` to load an already-running server.

Latest local run (30 rooms, 76 players, 805 actions): tick p95 7.5 ms (max 21 ms),
event-loop lag p95 2.9 ms, 0 errors.

## Tools for humans

- `FAST_ROUNDS=1 pnpm dev` — 20-second rounds (`FAST_ROUND_SEC` to change).
- `pnpm dev:round` — a match is **one round** (`DEV_ROUNDS=1`; any of 1–3), then
  straight to the final and the reveal. Combine with `FAST_ROUNDS=1` for a
  20-second match: `FAST_ROUNDS=1 pnpm dev:round`. Refused when
  `NODE_ENV=production`.
- `localhost:5173/dev/reveal?theme=gpay` (dev only) — "What you actually built"
  with a made-up match (a few cards used, a few that hit you).
- `localhost:5173/dev/briefing?theme=netflix` (dev only; themes
  `bookmyshow` · `netflix` · `spotify` · `gpay`, add `&done=1` for the waiting
  screen) — the whole briefing without playing a match.
- `pnpm --filter @overclock/server demo` — re-record the briefing's demo match
  from the engine into `web/src/game/demo.json`. Do it after any rule or
  price change; a unit test fails while the committed file is out of date.
- `pnpm --filter @overclock/server exec tsx src/scripts/play.ts <CODE>` — a bot
  joins your room and plays you.
- `pnpm --filter @overclock/server balance` — the full bot balance table.
- `src/scripts/attackvalue.ts`, `src/scripts/diag.ts` — attack damage per coin;
  one bot match round by round.
- `GET /api/metrics` — rooms, players, live matches, tick time, event-loop lag.
