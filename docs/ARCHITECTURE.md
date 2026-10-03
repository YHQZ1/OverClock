# Architecture

**Modular monolith.** One Node process serves the REST API, the Socket.IO
connection and the built web app. One web service + one Postgres.

```
 lab PCs + projector
          │  HTTP + Socket.IO
          ▼
 ┌──────────────────────────── server ─────────────────────────────┐
 │ routes → controllers ─┐                                         │
 │                       ├─► services ──► sim/ (pure game engine)  │
 │ sockets/ handlers ────┘      │                                  │
 │                              └──► db/ (Drizzle) ──► PostgreSQL  │
 └─────────────────────────────────────────────────────────────────┘
```

## Repo layout

```
web/      React + Vite + TS — /play, /screen (/admin later)
server/   Node + Express 5 + Socket.IO + TS
docs/     these docs
infra/    docker-compose (Postgres), render.yaml, .env.example
```

## Rules

1. **`sim/` is pure.** No Express, Socket.IO, database, `Date.now()` or
   `Math.random()`. Randomness comes from a seeded generator stored in the
   state. Same scenario + same action log ⇒ identical result.
2. **Controllers and socket handlers are thin.** Validate with Zod, call a
   service, respond/emit. Both entry points call the *same* services.
3. **Live state lives only in memory**, owned by services. The database is
   written when a session completes. Consequence: exactly one server instance.
4. **The server is authoritative — for the game *and* for screens.** Clients
   send intents ("press + SERVERS", "host taps NEXT"); the server decides and
   broadcasts. Clients never simulate and never decide which screen to show.
5. **`web` imports from `server` with `import type` only.** The server sends
   timers (cooldowns, boot progress, break countdown) inside the state, so the
   web app needs no engine code.

## The server decides the screen

The server keeps one **session phase** per team. Every PC renders the screen
for the current phase. This keeps a team's PCs in sync and makes refresh /
reconnect trivial: ask the server where the team is, show that.

```
 LOBBY → TUTORIAL → INTRO → COUNTDOWN → PLAYING → BREAK ─┐
   │        (skippable)  ▲                               │ rounds 1–3
   │                     └───────────────────────────────┘
   │                                                 → FINAL
   └─ everyone gone > ~2 min (any phase) → ABANDONED (nothing saved)
```

## Server layout

```
server/src/
├── server.ts          # http server + Socket.IO + listen + graceful shutdown
├── app.ts             # express: json, cors, routes, static web build, error handler
├── config/            # env (Zod-validated), constants
├── routes/            # health.routes.ts, leaderboard.routes.ts
├── controllers/       # thin: validate, call service, respond
├── sockets/           # setup + player.handlers.ts, screen.handlers.ts
├── services/
│   ├── team.service.ts      # codes, players, host, roles, rejoin tokens
│   ├── session.service.ts   # phase machine, rounds, break timers
│   ├── match.service.ts     # live round: 10 Hz loop, sim.step(), broadcast
│   └── result.service.ts    # save completed sessions, leaderboard
├── sim/               # PURE engine: state, step, disasters, actions, budget, scenarios, rng, bots
├── db/                # Drizzle schema, client, migrations
├── middlewares/       # error handler, validation (admin auth later)
├── validators/        # Zod schemas for HTTP bodies and socket payloads
├── utils/             # logger, code generator, helpers
└── types/             # shared types incl. socket message contracts
```

## Web layout

```
web/src/
├── main.tsx, App.tsx       # router: /play, /screen
├── socket/                 # useGameSocket — the one Socket.IO connection
├── store/                  # Zustand: latest session + match snapshot from the server
├── themes/                 # ThemeProvider: ids → theme text/icons
├── pages/
│   ├── play/               # PlayPage renders a screen per phase:
│   │                       #   Home, Lobby, Tutorial, Intro, Countdown, Game, Break, Final
│   └── screen/             # Leaderboard, NowPlaying tiles, announcements
└── components/game/        # TopBar (Health, Timer, Score), BudgetMeter, AlertBanner,
                            # AppMap, ServerRack, ActionPanel, Toasts, CrashOverlay
```

The web app has **no game logic** — it displays what the server sends.
Desktop-first (≥1366×768), mouse + keyboard shortcuts, lightweight
animations (lab PCs can be slow), visual-first alerts (no guaranteed audio).

## Real-time contract

Typed in `server/src/types/contracts.ts`; payloads validated by Zod in
`server/src/validators/socket.schemas.ts`. Requests that need an answer use
Socket.IO acks: `{ ok: true, data } | { ok: false, error }` where `error` is a
player-friendly message.

Client → server

| Event | Payload | Who |
|---|---|---|
| `team:create` | `{ teamName, playerName }` → code + player token; sender is host | player |
| `team:join` | `{ code, playerName }` → player token | player |
| `team:rejoin` | `{ code, playerToken }` (after refresh/reconnect) | player |
| `team:leave` | `{}` | player |
| `team:setTheme` | `{ theme \| "random" }` | host |
| `session:start` | `{ tutorial: boolean }` | host |
| `session:next` | `{}` (skip tutorial / end break early) | host |
| `game:action` | `{ action }` | player (own role's buttons only) |
| `screen:watch` | `{}` | big screen |

Server → client

| Event | Payload |
|---|---|
| `session:state` | phase, round, players, host, roles, theme, timers — on every change |
| `match:state` | game snapshot, 10/sec while playing |
| `match:event` | array of engine events: rush started/ended, critical, recovered, crashed, … |
| `leaderboard:update` | top teams |
| `error` | user-facing message ("No team with that code", "Team is full") |

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/leaderboard` | Top scores |

Later (admin): list sessions, abort a session, export results.

## Data (draft)

Only **completed** sessions are written.

- `teams` — id, code, name, theme, player_count, created_at
- `sessions` — id, team_id, total_score, completed_at
- `rounds` — id, session_id, round_no, scenario_id, seed, score, fans_served,
  fans_lost, budget_saved, downtime_sec, stats (jsonb), action_log (jsonb)

## Edge cases

| Situation | Handling |
|---|---|
| Refresh / brief disconnect | Browser keeps `{code, playerToken}`; `team:rejoin` restores phase, state and role |
| PC gone > ~5s mid-round | Its buttons move to connected teammates; returned on rejoin |
| Host leaves | Next player becomes host |
| Everyone gone > ~2 min | Session abandoned, nothing saved |
| **Shared lab PCs** | Saved code/token cleared when a session ends or is abandoned; FINAL has **[DONE — NEXT TEAM]**; LOBBY has **[LEAVE TEAM]** |
| Two players press the same button | Server applies one per cooldown; others get cooldown feedback |
| 4th player joins | "Team is full" |
| Wrong code | "No team with that code" |
| Session already started | Joining is closed; rejoin with a token still works |
| Malformed / spammed messages | Zod rejects; per-socket rate limit |
