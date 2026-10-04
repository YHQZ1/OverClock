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
web/      React + Vite + TS + Tailwind v4 — /play, /screen
server/   Node + Express 5 + Socket.IO + Zod + TS
docs/     these docs
infra/    docker-compose (Postgres), render.yaml, .env.example
```

## Rules

1. **`sim/` is pure.** No Express, Socket.IO, database, `Date.now()` or
   `Math.random()`. Randomness comes from a seeded generator stored in the
   state. Same scenario + same seed + same action log ⇒ identical match.
2. **Controllers and socket handlers are thin.** Validate with Zod, call a
   service, respond/emit. Both entry points call the *same* services.
3. **Live state lives only in memory**, owned by services. The database is
   written when a match completes. Consequence: exactly one server instance.
4. **The server is authoritative — for the game *and* for screens.** Clients
   send intents ("buy a server", "send a bot army", "I'm ready"); the server
   decides and broadcasts. Clients never simulate and never decide which
   screen to show.
5. **`web` imports from `server` with `import type` only** (alias
   `@server/*`). The server sends timers (cooldowns, boot progress, vote and
   buy-phase countdowns) inside the state, so the web app needs no engine code.
6. **Player-safe views.** Hidden engine numbers (traffic per second, internal
   capacities) never leave the server. The map is drawn from relative values;
   a team sees the opponent's site health and defences but **not their coins**.

## The server decides the screen

Each **room** has one phase. Every PC in the room renders the screen for that
phase, so all PCs stay in sync and refresh/reconnect is trivial.

```
 ROOM ──(everyone ready, 1v1 or 2v2)──► THEME_VOTE (10s)
                                            │
            ┌───────────────────────────────┘
            ▼
          BUY ──► LIVE ──► ROUND_RESULT ──┐   × 3 rounds
            ▲                              │
            └──────────────────────────────┘
                                            └──► FINAL ──► (Done → seat cleared)

 any phase: whole room gone > ~2 min → ABANDONED (nothing saved)
```

## Server layout

```
server/src/
├── server.ts          # http server + Socket.IO + listen + graceful shutdown
├── app.ts             # express: json, routes, static web build, error handler
├── realtime.ts        # Socket.IO + services wired together
├── config/            # env (Zod-validated), timing, limits
├── routes/            # health.routes.ts, leaderboard.routes.ts
├── controllers/       # thin: validate, call service, respond
├── sockets/           # setup + player.handlers.ts, screen.handlers.ts
├── services/
│   ├── broadcaster.ts       # interface services use to push updates
│   ├── room.service.ts      # codes, slots, ready, team names, rejoin tokens
│   ├── session.service.ts   # phase machine: vote, buy, live, results, abandon
│   ├── match.service.ts     # live duel: 10 Hz loop, sim.step(), player-safe views
│   └── result.service.ts    # save completed matches, match points, leaderboards
├── sim/               # PURE engine: two sites, crowd, pipeline, shop, attacks, scoring, rng, bots
├── db/                # Drizzle schema, client, migrations
├── middlewares/       # error handler
├── validators/        # Zod schemas for HTTP bodies and socket payloads
├── utils/             # logger, codes, errors
└── types/             # socket message contracts (imported by web as types)
```

### The engine (`sim/`)

- **Match state** holds two **sites** (one per team), the shared background
  crowd, the round clock and the seeded RNG.
- **Site:** pipeline stages (front door with routes, servers, fast shelf,
  database), each with a limit; health; coins; owned defences; active
  effects (attacks in flight, shields, overclock); cooldowns.
- **`step(state, actions)`** advances one tick (1/10 s) for both sites:
  apply actions (buy, sell, use, attack) → timers and effects → crowd
  arrives → flows through the pipeline, the first stage over its limit is the
  bottleneck → health, coins (income − upkeep), crash/reboot → events.
- **Actions carry the side** that issued them; attacks resolve against the
  other side after their warning delay.
- **Bots** are `Policy` functions `(state, side) → actions`; the balance
  script and tests pit them against each other.
- A match is reproducible from `{ scenario, seed, action log }`.

## Web layout

```
web/src/
├── main.tsx, App.tsx       # router: /play, /screen
├── socket/                 # the one Socket.IO connection, api (acks), seat storage, useGameSocket
├── store/                  # Zustand: room, match snapshot, feed, history — mirrors the server
├── styles/index.css        # Tailwind v4 import + @theme design tokens (the only CSS file)
├── components/             # TopBar, AppMap, ui.tsx (Button, Field, Label, Frame)
├── game/                   # LiveMap, HealthTimeline, alert + feed text — pictures of server state
├── themes/                 # theme id → words, icons, crowd colours
└── pages/
    ├── play/               # PlayPage renders one screen per phase:
    │                       #   Home, Room, ThemeVote, Game (buy + live), RoundResult, Final
    └── screen/             # big screen: leaderboards, live matches, awards
```

The web app has **no game logic** — it displays what the server sends.
Desktop-first (≥1366×768), mouse + keyboard shortcuts on every in-game action,
light animations (lab PCs can be slow), visual-first alerts.

## Real-time contract

Typed in `server/src/types/contracts.ts`; payloads validated by Zod in
`server/src/validators/socket.schemas.ts`. Requests that need an answer use
Socket.IO acks: `{ ok: true, data } | { ok: false, error }`, where `error` is a
player-friendly message.

Client → server

| Event           | Payload                                   | Notes                                  |
| --------------- | ----------------------------------------- | -------------------------------------- |
| `room:create`   | `{ playerName }` → code + seat token      |                                        |
| `room:join`     | `{ code, playerName }` → seat token       | Until the match starts; max 4          |
| `room:rejoin`   | `{ code, token }`                         | After refresh / reconnect              |
| `room:leave`    | `{}`                                      |                                        |
| `room:slot`     | `{ slot: 1 \| 2 \| 3 \| 4 }`              | Clears the player's ready              |
| `room:ready`    | `{ ready: boolean }`                      | Match starts when all ready + valid    |
| `room:teamName` | `{ side: 1 \| 2, name }`                  | Players on that side only              |
| `vote:theme`    | `{ theme }`                               | During THEME_VOTE; can change vote     |
| `game:buy`      | `{ item }`                                | Defences; shop open in BUY and LIVE    |
| `game:sell`     | `{ item }`                                | Partial refund                         |
| `game:use`      | `{ item }`                                | Utilities                              |
| `game:attack`   | `{ attack }`                              | Cooldown + warning                     |
| `screen:watch`  | `{}`                                      | Big screen                             |

Server → client

| Event                | Payload                                                         |
| -------------------- | --------------------------------------------------------------- |
| `room:state`         | phase, code, slots, players, ready flags, team names, votes, timers, round results — on every change |
| `match:state`        | player-safe duel snapshot for this player's side, 10/sec in BUY/LIVE |
| `match:event`        | engine events: purchases (with who), attacks incoming/landed, crashes, recoveries… |
| `leaderboard:update` | top entries per format (1v1 / 2v2)                             |

## HTTP API

| Method | Path               | Purpose                         |
| ------ | ------------------ | ------------------------------- |
| GET    | `/api/health`      | Health check                    |
| GET    | `/api/leaderboard` | Top match points, per format    |

## Data

Only **completed** matches are written.

- `matches` — id, code, format (`1v1`/`2v2`), theme, seed, winner_side, completed_at, action_log (jsonb)
- `match_teams` — id, match_id, side, name, players (jsonb), total_score, match_points, crashes, downtime_sec
- `match_rounds` — id, match_id, round_no, side, score, served, turned_away, coins_earned, stats (jsonb)

Leaderboards are queries over `match_teams`, per format.

## Edge cases

| Situation                          | Handling                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Refresh / brief disconnect         | Tab keeps `{code, token}` in `sessionStorage`; `room:rejoin` restores phase and side |
| Player changes slot                | Their ready is cleared                                                   |
| 3 players / uneven sides           | Can't start; the room says why                                           |
| 5th player joins                   | "That room is full"                                                      |
| Join after the match started       | Refused; rejoin with a token still works                                 |
| One team fully gone > ~1 min mid-match | Match ends, nothing recorded *(tune)*                                |
| Whole room gone > ~2 min           | Abandoned, nothing saved                                                 |
| **Shared lab PCs**                 | Seat cleared on Leave and on **DONE — NEXT PLAYERS**                     |
| Two teammates buy at once          | Both apply if affordable; feed shows who bought what                     |
| Malformed / spammed messages       | Zod rejects; per-tick action cap                                         |
| Server restart                     | Live matches are lost (memory only) — never redeploy during the event   |
