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
web/      React + Vite + TS + Tailwind v4 — /play; staff: /admin, /live, /leaderboard
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
   capacities) never leave the server. The arena is drawn from relative values;
   a team sees the opponent's site health and defences but **not their coins**.

## The server decides the screen

Each **room** has one phase. Every PC in the room renders the screen for that
phase, so all PCs stay in sync and refresh/reconnect is trivial.

```
 ROOM ──(everyone ready, 1v1 or 2v2)──► THEME_VOTE (10s) ──► THEME_PICK (3s) ──► BRIEFING
                                                       (5 steps, each at their own pace;
                                                        everyone done → go; hidden 3-min cap)
                                                                  │
            ┌─────────────────────────────────────────────────────┘
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
│   ├── session.service.ts   # phase machine: vote, theme pick, briefing, buy, live, results, abandon
│   ├── demo.ts              # the briefing's scripted demo match, recorded from the engine
│   ├── match.service.ts     # live duel: 10 Hz loop, sim.step(), player-safe views
│   └── result.service.ts    # save completed matches, match points, leaderboards
├── sim/               # PURE engine: two sites, crowd, servers + gate, 12 cards, scoring, rng, bots
├── db/                # Drizzle schema, client, migrations
├── middlewares/       # error handler
├── validators/        # Zod schemas for HTTP bodies and socket payloads
├── utils/             # logger, codes, errors
└── types/             # socket message contracts (imported by web as types)
```

### The engine (`sim/`)

- **Match state** holds two **sites** (one per team), the shared background
  crowd, the round clock and the seeded RNG.
- **Site:** a gate (with an optional Bouncer) and servers — the only capacity
  limit, so whoever can't be served gives up; health; coins; owned defences;
  active effects (attacks landed, shield, overclock); cooldowns.
- **`step(state, actions)`** advances one tick (1/10 s) for both sites:
  apply actions (buy, sell, use, attack) → timers and effects → crowd arrives →
  gate (Bouncer turns bots away) → servers; what they can't take gives up →
  health, coins (income only: no upkeep; selling refunds half), crash/reboot → events.
- **Actions carry the side** that issued them; attacks resolve against the
  other side after their warning delay.
- **Bots** are `Policy` functions `(state, side) → actions`; the balance
  script and tests pit them against each other.
- A match is reproducible from `{ scenario, seed, action log }`.

## Web layout

```
web/src/
├── main.tsx, App.tsx       # router: /play, /admin, /live, /leaderboard
├── socket/                 # the one Socket.IO connection, api (acks), seat storage, useGameSocket
├── store/                  # Zustand: room, match snapshot, feed, banner, usage — mirrors the server
├── styles/index.css        # Tailwind v4 import + @theme design tokens (the only CSS file)
├── components/             # TopBar, AppMap, ui.tsx (Button, Field, Label, Frame)
├── game/                   # items (keys, hints), icons, alert + feed text, reveal content, demo.json
│   └── arena/              # Arena (both sites, SVG), Hand (the cards), ScoreBar, kinds
├── themes/                 # theme id → words, card names, accent, how the site is drawn
└── pages/
    ├── play/               # PlayPage renders one screen per phase:
    │                       #   Home, Room, Vote, ThemePick, Briefing (5 steps + DemoPlayer),
    │                       #   Game (the arena: buy + live), RoundResult, Final, Reveal
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
| `game:sell`     | `{ item }`                                | Defences: 50% back; never the last server |
| `game:use`      | `{ item }`                                | Utilities                              |
| `game:attack`   | `{ attack }`                              | Cooldown + warning                     |
| `briefing:continue` | `{}`                                 | Finished the briefing steps; round 1 starts when all connected players have (or at the hidden cap) |
| `screen:watch`  | `{ token }`                               | Staff (big screen / admin): signs the connection in, joins the `screen` channel; ack = boards + awards + matches + control |
| `admin:rooms` · `admin:boards` · `admin:endRoom` · `admin:skipBriefing` · `admin:hide` · `admin:resetBoards` | see `contracts.ts` | Staff only (signed-in connection): list rooms, list every saved entry (hidden ones too), end a room, move a stuck briefing on, hide / unhide a team (`hidden: bool`), wipe results (`confirm: "RESET"`) |

Server → client

| Event                | Payload                                                         |
| -------------------- | --------------------------------------------------------------- |
| `room:state`         | phase, code, slots, players, ready flags, team names, votes, timers, round results — on every change |
| `match:state`        | player-safe duel snapshot for this player's side, 10/sec in BUY/LIVE |
| `match:event`        | engine events: purchases (with who), attacks incoming/landed, crashes, recoveries… |
| `leaderboard:update` | staff only: top 10 per format (1v1 / 2v2), after each saved match |
| `screen:matches`     | staff only, 4×/sec: every match in progress (`ScreenMatch`: both sites, no coins) |
| `screen:awards`      | big screens: comeback / most destructive / unbreakable, after each saved match |

## HTTP API

| Method | Path               | Purpose                         |
| ------ | ------------------ | ------------------------------- |
| GET    | `/api/health`      | Health check                    |
| POST   | `/api/admin/login` | `{ passcode }` → `{ token }` (staff; 5 wrong tries → 1 min lockout per address) |

## Data

Only **completed** matches are written, in one transaction, right after the
final (`session.service` → `result.service` → `ResultStore`). Schema:
`server/src/db/schema.ts`; migrations in `server/drizzle` (applied by the
server on start; `db:generate` makes new ones).

- `matches` — id (uuid, also `RoomView.final.matchId`), code, format (`1v1`/`2v2`), theme, winner_side (null = draw), completed_at
- `match_teams` — one row per team: match_id, side, format, name, players (jsonb), total_score, match_points, won (null = draw), crashes, downtime_sec, **hidden** (admin)
- `match_rounds` — one row per round: match_id, round_no, seed, winner_side, scores (jsonb, both sides), action_log (jsonb) — seed + log replay the round exactly

Leaderboards are queries over `match_teams` per format, hidden rows left out,
best match points first (equal points share a place; the earlier match lists
first). After each save the top 10 per format are pushed to staff screens
(`leaderboard:update`) and each team's place goes into `final.ranks` — players
only ever see their own place.

**Staff.** One passcode (`ADMIN_PASSCODE`; "admin" in dev, required in
production) gives a token kept in that browser's localStorage; `/admin`,
`/live` and `/leaderboard` all need it. `ScreenService` pushes every match in
progress to signed-in staff pages; `/live` decides locally which one to show
(10s rotation preferring matches in play, click to show, pin until it ends —
`web/src/staff/rotation.ts`).

- **`ResultStore`**: `PgResultStore` (Drizzle + postgres.js) in dev/production;
  `MemoryResultStore` in tests and when `DATABASE_URL` is unset (dev only —
  production refuses to start without it). A failed save is logged and never
  breaks the match.
- Local Postgres: `pnpm db:up` (Docker, host port **5433**, compose project
  `overclock`); test runs (`NODE_ENV=test`) ignore `server/.env`, so e2e and
  load tests never touch the dev leaderboard.

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
