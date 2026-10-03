# Overclock — The Game

> **Complexity underneath. Simplicity on top.**

A live team survival game for 1st/2nd-year CS students at a college fest,
played on the **college lab PCs**. A team keeps a pretend app alive while
disasters hit it. No system-design knowledge needed — the real concepts are
revealed *after* playing.

## The pitch (what a player hears)

"Thousands of fans are trying to buy concert tickets. Keep the site alive,
keep them happy — and don't waste money doing it."

## Session flow (walk-in, self-serve)

Teams of 2–3 players, one lab PC each (1 is allowed). No organizer needed.

```
 HOME   [CREATE TEAM] team name + your name → get a code, become host
        [JOIN TEAM]   code + your name
   ▼
 LOBBY  big team code · players (👑 host) · theme picker + 🎲 Random (host)
        [GO FULLSCREEN] · [LEAVE TEAM] · [START] (host)
   ▼
 TUTORIAL  host chooses [▶ Play tutorial] or [⏭ Skip to Round 1]
   ▼
 ┌─ for each round (1, 2, 3) ──────────────────────────────┐
 │ INTRO      "ROUND 2: SURVIVE — problems can overlap"     │
 │ COUNTDOWN  3 · 2 · 1                                     │
 │ PLAYING    a few minutes                                 │
 │ BREAK      planning break (~30s, tunable): score         │
 │            breakdown, health timeline, hint for next     │
 │            round · host taps [NEXT] or it auto-continues │
 └──────────────────────────────────────────────────────────┘
   ▼
 FINAL  total score · leaderboard rank · "what you actually did" cards
        [DONE — NEXT TEAM] resets this PC to HOME
```

- All of a team's PCs always show the same screen (the server decides; see
  ARCHITECTURE.md).
- The tutorial is not scored. Session score = Round 1 + Round 2 + Round 3.
- **Only completed sessions count.** A team that leaves halfway gets nothing
  recorded.
- **One leaderboard** for everyone, showing team size.

## Scoring: serve fans, don't waste money

Each round starts with a fixed **💰 Budget**. Running servers drain it every
second; other buttons cost budget too. Whatever is left at the end becomes
bonus points.

```
👥 FANS SERVED        8,420
💔 FANS LOST           −310
💰 BUDGET SAVED        +640
──────────────────────────
⭐ ROUND SCORE         8,750      ⏱️ downtime: 6s
```

- There is **no "correct" number of servers** — just like the real world.
  Deciding without knowing is the skill.
- **Serving fans is always worth more than saving money.** A busy server
  easily pays for itself; an idle one is pure waste. (Bots check that a
  "stingy" team that never adds servers loses.)
- Budget resets every round. Round 1 is generous; rounds 2–3 are tight.

## What players see (game screen)

```
┌─────────────────────────────────────────────────────┐
│ ❤️ Health ███████░░        ⏱️ 01:43        ⭐ 8,750   │
│ 💰 Budget ██████░░░░  −12/s                          │
│ 🚨 TOO MANY FANS!                                    │
│   🚪 Fans → 🌐 Internet → 🖥️ Servers → 🗄️ Database     │  ← app map: green/yellow/red
│   🖥️ 🖥️ 🖥️ 😴 ⏳                                       │  ← busy / idle / booting
│   [1] – SERVER   [2] + SERVERS   [3] USE BACKUP      │  ← only this player's buttons
└─────────────────────────────────────────────────────┘
```

- Every button has a **keyboard shortcut**, shown on the button.
- **Every alert works visually.** Lab PCs may have no speakers; sound is extra.
- Never shown: CPU %, requests/sec, latency, cache hit ratio. Those exist
  only in a hidden Tech View.

### The rhythm of every problem

```
1. ALERT     🚨 banner (+ sound if available)
2. WHERE     the hurting icon turns red and pulses; health starts dropping
3. ACT       player presses the button → cooldown ring
4. RESPONSE  visible effect (e.g. server "booting…" → online)
5. RELIEF    icon goes green, health climbs, "🔥 RECOVERED! +840 fans saved"
```

Harder rounds overlap these rhythms; the team must decide what's worst.

## Roles (buttons split between PCs)

Everyone sees the full map, health, budget and score. Only buttons differ.

| 3 players | 2 players | 1 player |
|---|---|---|
| 🌐 **Network**: Switch Route, Block Extra Users | 🌐🖥️ **Front**: + Servers, – Server, Switch Route, Block Extra Users | Everything |
| 🖥️ **Servers**: + Servers, – Server, Use Backup | 🗄️ **Back**: Boost Database, Make Popular Things Faster, Use Backup | |
| 🗄️ **Database**: Boost Database, Make Popular Things Faster | | |

If a PC disconnects for more than ~5s, its buttons move to teammates.

## Buttons

| Button (player sees) | Effect | Cost | Real concept (revealed after) |
|---|---|---|---|
| + SERVERS | More capacity after a short boot | Budget per second while running | Horizontal scaling |
| – SERVER | Removes a server, stops its cost | — | Scaling down |
| BOOST DATABASE | Database faster for a while | Budget | Vertical scaling / read replicas |
| MAKE POPULAR THINGS FASTER | Less database load for a while; spike when it wears off | Budget | Caching (and cold caches) |
| USE BACKUP | Restores a dead component | Very limited uses | Failover |
| SWITCH ROUTE | Gets around a broken network path | Cooldown | Traffic routing |
| BLOCK EXTRA USERS | Turns some fans away; free when bots are the problem | Lost fans | Load shedding / rate limiting |

## Disasters

| Disaster | Player sees | Counter |
|---|---|---|
| Rush Hour | 🚨 TOO MANY FANS! | + Servers, Block Extra Users |
| Server Meltdown | 🔥 SERVERS ARE DOWN! | Use Backup, + Servers |
| Snail Database | 🐌 DATABASE IS SLOW! | Boost Database, Make Popular Things Faster |
| Internet Problem | 🌐 CONNECTION TROUBLE! | Switch Route, Block Extra Users |
| Bot Army | 🤖 BOTS ARE FLOODING IN! | Block Extra Users |
| Black Friday | 📈 TRAFFIC KEEPS CLIMBING! | Keep adjusting capacity |
| Everything Is On Fire | Several at once (final round) | Prioritise |

## Rounds

1. **Learn** — few buttons, one problem at a time, generous budget, no cascades.
2. **Survive** — more buttons, cooldowns, tighter budget, overlapping problems.
3. **Chaos** — cascades on (failures → retries → more load), stacked
   disasters, final surge. A boss fight.

Exact lengths, disasters per round and unlock order: decided while building.

## Crash and reboot

Health hits 0 → **💀 SYSTEM DOWN** for ~8s: no points, buttons disabled. Then
reboot at 30% health and play on. Nobody is eliminated.

## Themes

Same simulation, different words and icons — harder to spot patterns, and
scores stay comparable. Host picks one of three or 🎲 Random. **The three
themes are not decided yet** (candidates: ticket booking, food delivery,
flash sale).

## Screens

- **Player** (`/play`) — one per lab PC
- **Big screen** (`/screen`) — leaderboard, now-playing tiles, big alerts
- **Organizer** (`/admin`) — *later*

## Success criteria

A first-year student can walk up, understand the goal in under 30s, start
playing in 2–3 minutes, see what went wrong and that their action fixed it,
and say **"that was actually fun."**
