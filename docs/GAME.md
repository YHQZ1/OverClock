# Overclock — The Game

> **Flood their site. Keep yours alive.**
> Complexity underneath. Simplicity on top.

A live head-to-head strategy game for **SymbiTech**, played on the college lab
PCs. Two teams each run a pretend website. Visitors pour in; every visitor you
serve earns coins; you spend coins defending your own site or attacking the
other team's. Three short rounds, one winner, a live leaderboard.

Numbers marked *(tune)* are starting points — the bots and playtests decide
the final values (see BALANCE.md).

## Who it's for

Walk-in students from **any branch** — most are not into tech. Nobody needs to
know system design; the real concepts are revealed only at the end.

The pitch a player hears:

> "Everyone's cursed at a website that crashed on results day. Today you run
> one — and you can crash theirs."

Success looks like: goal understood in **under 30s**, playing within **2
minutes**, they can see what went wrong and what fixed it, and they say
**"again!"**

## Formats

| Format  | PCs | Notes                                  |
| ------- | --- | -------------------------------------- |
| **1v1** | 2   | You do everything.                     |
| **2v2** | 4   | Teammates share one wallet and full controls. |

*Later, if time:* 1v2 with a handicap for the solo player; play vs a bot when
no opponent is around; spectator view.

## Session flow

```
 HOME        [Create a room]  your name → get a 4-letter code
             [Join a room]    code + your name
   ▼
 ROOM        ┌──── Team 1 ────┐        ┌──── Team 2 ────┐
             │  [1]     [2]   │   vs   │  [3]     [4]   │
             └────────────────┘        └────────────────┘
             team names · slots · Ready toggles · Leave
   ▼  (everyone ready, valid format)
 THEME VOTE  10s · everyone votes · most votes wins
   ▼
 ┌─ for each round (1, 2, 3) ───────────────────────────────────────┐
 │ BUY PHASE     ~20s (tune): plan and build; sites are paused      │
 │ LIVE          Round 1 1:30 · Round 2 2:00 · Round 3 2:00 (tune)   │
 │ ROUND RESULT  ~10s: round winner, served / turned away, best move │
 └───────────────────────────────────────────────────────────────────┘
   ▼
 FINAL       totals · winner · match points · leaderboard (live)
             "what you actually built" · [DONE — NEXT PLAYERS]
```

### Room rules

- Anyone with the code can join until the match starts (max 4).
- **Slots first, then ready.** Slots 1–2 are Team 1 (left), 3–4 are Team 2
  (right). Changing slot **clears your ready** — press it again.
- The match starts the moment **everyone in the room is ready** and the
  sides form a valid format: **1v1** (one player per side) or **2v2** (two per
  side). With 3 players, or an uneven split, the room explains why it can't
  start.
- Each side can name its team (default: the players' names, e.g. "Priya &
  Rahul").
- Nobody is "host" — the ready checks replace a start button.

### Theme vote

- 10 seconds; every player votes for one of the 3–4 themes.
- Most votes wins. **Any tie at the top is broken at random** (1-1-1-1, 2-2,
  …). Nobody votes → random.
- Themes are cosmetic (words, icons, colours of the crowd) — the rules and
  numbers are identical, so scores stay comparable.

## The core loop: serve → earn → spend

Each team has its own site — the same pipeline the visitors travel through:

```
 People → Front door → Servers → Fast shelf → Database
          (route A/B)
```

- Both sites receive the **same background crowd** (same seed), so the
  match starts perfectly fair. Attacks are what make the sites differ.
- **Every visitor served earns coins.** Visitors turned away earn nothing.
- **One currency, coins,** for everything. Every coin is a choice.
- Each round starts with the same coins for both teams *(tune: reset each
  round vs carry over)*.
- The part of the pipeline that's over its limit is the **bottleneck** — it
  turns yellow/red on the map. That's where you look.

### Attack or defend? Your call, any time

There are **no fixed roles**. Teams find their own rhythm — attack while
you're rich, defend while you rebuild, or balance. The economy creates that
rhythm:

- **Hurting their site cuts their income** (fewer visitors served → fewer
  coins). A good attack is also an investment.
- **Neglecting your own site makes you broke**, and broke teams can't attack.
- **Defences you keep cost coins every second** (upkeep). Over-building is
  waste. If you can't pay upkeep, your newest server switches off.
- **Attacks cost about what their counter costs**, so neither pure attacking
  nor pure defending wins — timing and choosing the right attack do.

### Fairness and anti-snowball

- **Every attack is announced** to the target: *"⚠️ Bot army incoming in
  3…"* (tune).
- **Attacks have cooldowns**, so a rich team can't spam.
- **The team that's behind earns a little more** (comeback income, tune).
- **After a crash**, a rebooted site gets a few seconds of protection.

## The shop

Open during the buy phase **and** the whole live round. Buy, sell (refund
~50%, tune) and use things whenever you like. Every in-game action has a
keyboard shortcut.

### Defences — you keep them (upkeep per second)

| Player sees          | What it does                                                    | Real concept       |
| -------------------- | --------------------------------------------------------------- | ------------------ |
| **Server**           | More visitors served at once; takes a moment to start           | Horizontal scaling |
| **Traffic splitter** | Without it, extra servers help less; with it, every server pulls its weight and dead ones are skipped | Load balancer |
| **Bouncer**          | Turns bots away at the door; set it too strict and real people get turned away too | Rate limiter |
| **Fast shelf**       | Popular things served without touching the database             | Cache              |
| **Backup database**  | More database capacity                                          | Read replica       |
| **Second route**     | A cut route doesn't take you offline                            | Redundant network  |

### Utilities — one use

| Player sees         | What it does                               | Real concept            |
| ------------------- | ------------------------------------------ | ----------------------- |
| **Emergency repair**| Instantly restores some health (expensive) | Incident recovery       |
| **Shield**          | Blocks the next attack for a short time    | DDoS protection         |
| **Overclock**       | Servers run much faster for ~10s           | Vertical scaling burst  |
| **Instant backup**  | Brings melted servers straight back        | Failover                |

### Attacks — one use, cooldown, announced to the target

| You send              | They see                        | Their counter                      | Real concept       |
| --------------------- | ------------------------------- | ---------------------------------- | ------------------ |
| **Crowd surge**       | 🚨 Too many people!             | Servers, Traffic splitter, Overclock | Traffic spike    |
| **Bot army**          | 🤖 Bots are flooding in!        | Bouncer, Shield                    | DDoS               |
| **Cut a route**       | 🌐 Connection trouble!          | Second route, Shield               | Network partition  |
| **Slow their database** | 🐌 Database is slow!          | Backup database, Fast shelf        | DB degradation     |
| **Server meltdown**   | 🔥 Servers are down!            | Instant backup, more Servers       | Instance failure   |
| **Flush their shelf** | 🧊 Everything feels slow!       | Rebuild shelf, Backup database     | Cache stampede     |

Prices, durations and strengths: *(tune)*, with the rule that an attack costs
roughly what its counter costs.

## Health, crash and reboot

- **Health** heads towards the share of visitors getting in: everyone in →
  climbs to 100; most turned away → falls to 0.
- **Health 0 → 💀 SITE DOWN** for ~8s: nobody gets in, no coins, buttons
  locked. Then it reboots at 30% with a few seconds of protection. Nobody is
  eliminated; the round goes on.

## Scoring

- **Round score** = visitors served − visitors turned away *(penalty weight:
  tune)*. Your attacks lower their score; your defences protect yours.
- **Round winner:** the higher round score.
- **Match total:** the sum of the three rounds. **Match winner:** the higher
  total. Ties: fewer crashes, then less downtime.
- **Only completed matches are recorded.** A match abandoned halfway records
  nothing.

### Leaderboard

Every match is a one-off — two fresh teams, never a rematch — so ratings like
Elo don't work. Instead, each match is judged by what happened in it:

> **Match points = your total + ½ × opponent's total + win bonus** *(tune)*

The opponent's score is the evidence of how strong they were: beating a team
that also played well is worth more than crushing one that barely played. The
bots tune the weights until the board ranks teams by skill regardless of who
they faced.

- **Separate boards for 1v1 and 2v2.**
- Updates **live** on every PC and the big screen.
- **Fun awards** on the big screen (no fairness needed): biggest comeback,
  most destructive attack, longest uptime, most coins earned.

## Screens

| Screen        | Shows                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| Home          | Pitch, live map preview, Create a room / Join a room                           |
| Room          | Code, team names, 4 slots, ready toggles, how to play                          |
| Theme vote    | 3–4 theme cards, live vote counts, 10s timer                                   |
| Buy phase     | Shop, both sites (paused), round number, timer                                 |
| Live          | HUD (health, coins, score, time) · alert bar · our site map · their site · shop · incoming warnings · "who bought what" feed |
| Round result  | Round winner, served / turned away, best attack, biggest save                  |
| Final         | Totals, winner, match points, leaderboard, "what you actually built" cards     |
| Big screen `/screen` | Leaderboards (1v1 / 2v2), matches in progress, fun awards               |

### Live screen (sketch)

```
┌ ■ Overclock ───────────── Round 2 · 1:12 ───────── Team 1 vs Team 2 ┐
│ Health 82 ▇▇▇▇▇▇▇░  Coins 1,240  Score 8,750  │ Them: Health 41  Score 7,900 │
├────────────────────────────────────────────────────────────────────┤
│ ⚠ Bot army incoming in 2…   Turn up the Bouncer                      │
├───────────────────────────────────────────┬────────────────────────┤
│  OUR SITE  (Tab ⇄ THEIR SITE)              │  DEFEND · ATTACK · UTIL │
│   people → door → servers → shelf → db     │  [1] Server        120  │
│   (live map: crowd, bottleneck in red)     │  [2] Splitter      300  │
│                                            │  [Q] Crowd surge   250  │
│                                            │  [W] Bot army      300  │
│  health this round ▁▂▃▅▇▇▅▃▂▁              │  Rahul: Bot army −300   │
└───────────────────────────────────────────┴────────────────────────┘
```

### The rhythm of every problem

1. **Warning** — "⚠️ incoming in 3…" (attacks only)
2. **Alert** — what's wrong *and* what to do ("Bots are flooding in! — Turn up the Bouncer")
3. **Where** — the hurting part of the map turns red and pulses
4. **Act** — buy or use the counter; cooldown shows on the button
5. **Relief** — the part goes green, health climbs, "Recovered!"

Every alert is visual. Lab PCs may have no speakers; sound is a bonus.

## The reveal

At the end of the match: **"What you actually built"** cards — *Traffic
splitter → that's a load balancer. Bouncer → a rate limiter. Bot army → a
DDoS attack.* For CS students a cool reveal; for everyone else a fun fact.
Never required to enjoy the game. Player screens never show technical terms
before this.

## Themes

3–4 themes, voted per match. **Not decided yet.** Direction: relatable worlds
students know — real-life crash moments (results day, a ticket drop, a mega
sale) or worlds inspired by games and shows — *inspired by, never using real
names or art*. Until then, shared screens use neutral words ("people", "your
site").
