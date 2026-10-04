# Overclock

**Flood their site. Keep yours alive.**

Overclock is a live, head-to-head strategy game built for **SymbiTech**, our
college's tech fest. Two teams sit at neighbouring lab PCs, each running a
pretend website. Crowds pour in, money flows from every visitor you serve, and
you decide — second by second — whether to spend it **defending** your own
site or **attacking** the other team's: send a crowd surge, unleash a bot
army, cut their connection, slow their database.

Three short rounds. One winner. A live leaderboard on the big screen.

No technical knowledge needed. Everyone has cursed at a website that crashed
on results day or during a ticket sale — here you're the one keeping it alive,
and the one knocking the other side over. The real computer-science ideas
(load balancing, rate limiting, caching, failover, DDoS…) are hidden in the
mechanics and revealed only at the end: *"you just built a load balancer."*

> Complexity underneath. Simplicity on top.

---

## Contents

- [What a match looks like](#what-a-match-looks-like)
- [How you play](#how-you-play)
- [Who it's for](#who-its-for)
- [Under the hood](#under-the-hood)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Project layout](#project-layout)
- [Status](#status)
- [Documentation](#documentation)
- [Design principles](#design-principles)

---

## What a match looks like

A match is **1v1** (two PCs) or **2v2** (four PCs) and takes about six
minutes.

```
 HOME         Create a room  ·  Join a room with its 4-letter code
   ▼
 ROOM         ┌──── Team 1 ────┐        ┌──── Team 2 ────┐
              │  [1]     [2]   │   vs   │  [3]     [4]   │
              └────────────────┘        └────────────────┘
              Pick a slot, then press Ready.
              Starts when everyone in the room is ready (1v1 or 2v2).
   ▼
 THEME VOTE   Everyone votes · 10 seconds · most votes wins (ties: random)
   ▼
 ┌─ ROUND 1, 2, 3 ─────────────────────────────────────────────────┐
 │  BUY PHASE   ~20s to plan and build — the shop never closes       │
 │  LIVE        1:30 / 2:00 / 2:00 of defending and attacking        │
 │  RESULT      who won the round, what hurt, what helped            │
 └──────────────────────────────────────────────────────────────────┘
   ▼
 FINAL        Total scores · winner · leaderboard updates live
              "What you actually built" · Done — next players
```

## How you play

**Serve → earn → spend.** Every visitor your site serves earns your team
coins. Coins are the only currency, and every coin is a choice:

| Spend on…    | Examples (what players see)                                        | Real concept (revealed at the end)         |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------ |
| **Defence**  | Servers · Traffic splitter · Bouncer · Fast shelf · Backup database · Second route | Scaling · load balancer · rate limiter · cache · read replica · redundant network |
| **Attack**   | Crowd surge · Bot army · Cut a route · Slow their database · Server meltdown · Flush their shelf | Traffic spike · DDoS · network partition · DB degradation · instance failure · cache stampede |
| **Utility**  | Emergency repair · Shield · Overclock · Instant backup              | Recovery · protection · vertical scaling burst · failover |

- **Anyone can do anything, any time.** There are no fixed attacker or
  defender roles. Teams find their own rhythm: attack while you're rich,
  defend while you rebuild.
- **Hurting their site cuts their income.** A good attack is also an
  investment; a neglected site goes broke and can't attack back.
- **Every attack is announced** to the target — *"⚠️ Bot army incoming in
  3…"* — so defending is skill, not luck. Attacks have cooldowns, so money
  alone can't spam.
- **Defences you keep cost coins every second.** Over-building is waste.
- **If your health hits zero, your site goes down** for a few seconds — no
  one gets in, you earn nothing — then reboots and you fight on.
- **The round goes to the team that served more people.** The match goes to
  the higher total over three rounds.

In **2v2**, both teammates have full controls and share one wallet. Each PC
can flip between **Our site** and **Their site** with one key, so teams
naturally split the work — and argue about who spent the coins.

Full rules: [docs/GAME.md](docs/GAME.md).

## Who it's for

Walk-in students at SymbiTech — from any branch, any year. The design target:

- understand the goal in **under 30 seconds**,
- be playing within **2 minutes** of sitting down,
- see what went wrong *and* what fixed it,
- and say **"again!"** when it ends.

It runs on the college **lab PCs** (desktop, mouse and keyboard), on the
venue network, with a big-screen leaderboard on the projector.

## Under the hood

**One Node.js process** serves the web app, a small REST API and a Socket.IO
connection for the live game. Live matches live in memory; finished matches
are saved to PostgreSQL.

```
 lab PCs + projector
        │  HTTP + Socket.IO
        ▼
 ┌─────────────────────────────── server ───────────────────────────────┐
 │  routes → controllers ─┐                                             │
 │                        ├─► services ──► sim/  (pure game engine)     │
 │  sockets/ handlers ────┘       │                                     │
 │                                └──► db/ (Drizzle) ──► PostgreSQL     │
 └──────────────────────────────────────────────────────────────────────┘
```

- **The server decides everything.** PCs send intents ("buy a server",
  "send a bot army"); the server applies them and broadcasts the result ten
  times a second. Every PC in a room always shows the same truth, and a
  refresh drops you straight back into your match.
- **The game engine is pure and deterministic** (`server/src/sim`): no
  clock, no `Math.random`, no I/O. Randomness comes from a seeded generator,
  so **the same seed plus the same button presses always produce the same
  match** — which makes replays, fair disputes and testing easy.
- **Bots keep it balanced.** Bot players (idle, all-attack, all-defence,
  balanced, human-speed…) play thousands of matches in seconds; tests enforce
  rules like *"every attack has a counter that measurably helps"* and *"a
  balanced team beats a one-trick team."*
- **No tech terms on player screens.** The map is drawn from relative values
  only (how big the crowd is, how many get in) — never "requests per second".

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech stack

| Area     | Choice                                                         |
| -------- | -------------------------------------------------------------- |
| Web      | React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Zustand |
| Server   | Node.js, Express 5, Socket.IO, Zod, TypeScript                 |
| Data     | PostgreSQL + Drizzle (Docker locally, Render in production)    |
| Tooling  | pnpm workspaces, Vitest, tsx                                   |
| Hosting  | One Render web service + Render Postgres                       |

## Getting started

Requires **Node 22+**, **pnpm** and (for the database, once results are
saved) **Docker**.

```sh
pnpm install
cp infra/.env.example server/.env
pnpm dev            # server on :3000, web on :5173 (proxied), hot reload
```

Open <http://localhost:5173/play> in two browser tabs to play against
yourself. Each tab is its own seat, so you can test a full room on one PC.

## Commands

| Command                                     | What it does                                   |
| ------------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                                  | Server and web in watch mode                   |
| `pnpm build`                                | Production build of both                       |
| `pnpm start`                                | Run the built server (it serves the web app too) |
| `pnpm test`                                 | All tests (engine, balance invariants, live socket flows) |
| `pnpm typecheck`                            | Type-check everything                          |
| `pnpm --filter @overclock/server balance`   | Bot balance report (thousands of matches, ~1s) |
| `pnpm db:up` / `pnpm db:down`               | Start / stop local Postgres                    |

## Project layout

```
web/                   player screens (/play) and the big screen (/screen)
  src/game/            live map, alerts, timeline — pictures of server state
  src/pages/play/      one screen per phase: Home, Room, Vote, Game, Results…
  src/styles/index.css Tailwind import + design tokens (the only stylesheet)
server/                the game server
  src/sim/             pure, deterministic game engine + bots
  src/services/        rooms, sessions, live matches, results
  src/sockets/         thin Socket.IO handlers (validate → service)
docs/                  game rules, architecture, decisions, plan, balance, runbook
infra/                 docker-compose (Postgres), Render blueprint, env example
```

## Status

Built so far: the deterministic engine with bots and a balance report; the
real-time server with rooms, live shared matches and refresh-safe rejoin; and
the player screens (home, lobby, live game with an animated map, results).

**The duel is playable end to end:** rooms with slots and ready, theme
voting, the shop (defences, boosts, attacks), three rounds with buy phases,
round results and the final. **Next:** saving results, the live leaderboard and
the big screen, then the real themes.

Tip: `FAST_ROUNDS=1 pnpm dev` runs 20-second rounds for quick testing.

What's built and what's next: [docs/PLAN.md](docs/PLAN.md).

## Documentation

| Doc                                    | What's in it                                             |
| -------------------------------------- | -------------------------------------------------------- |
| [GAME.md](docs/GAME.md)                | The full game: flow, economy, shop, attacks, scoring, screens |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)| Structure, rules, phases, real-time contract, data model |
| [DECISIONS.md](docs/DECISIONS.md)      | What we chose and why; what's still open                 |
| [PLAN.md](docs/PLAN.md)                | What's built and the build queue                         |
| [BALANCE.md](docs/BALANCE.md)          | Tuning values, bot results, playtest log                 |
| [RUNBOOK.md](docs/RUNBOOK.md)          | Running the game at SymbiTech, and what to do when things break |

## Design principles

- **Complexity underneath, simplicity on top.** Real systems behaviour in the
  engine; plain words and pictures on screen.
- **Every alert says what's wrong *and* what to do.**
- **Visual first.** Lab PCs may have no speakers; sound is a bonus.
- **Desktop first** (1366×768 and up), keyboard shortcuts on every in-game
  action, light animations for slow PCs.
- **Shared-PC safe.** Leaving or finishing clears the seat, so the next
  players never land in someone else's match.
- **Look:** sharp, minimal, dark — Inter, square corners, hairline dividers,
  one lavender accent. Green, yellow and red only ever mean healthy,
  struggling and broken.
