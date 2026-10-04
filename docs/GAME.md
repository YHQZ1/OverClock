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
 BRIEFING    how to play, in the theme's words · up to 60s · starts when all press Continue
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

- 10 seconds (ends early once everyone has voted); every player votes for
  one of the 4 themes (Nasdaq, FanCode, Miniclip, BookMyShow).
- Most votes wins. **Any tie at the top is broken at random** (1-1-1-1, 2-2,
  …). Nobody votes → random.
- Themes are cosmetic (words, logo, accent colour, music) — the rules and
  numbers are identical, so scores stay comparable.

### Briefing (before round 1 only)

- One screen, in the chosen theme's words and colour: the goal in one line,
  then **Defend (1–7) · Attack (A–L) · Boost (Q–R)** — every item with its key,
  name and one-line description; each attack also says what beats it
  ("Scalper bots — beaten by Robot check or Security").
- Round 1's buy phase starts when **everyone presses Continue** (Enter) — or
  after **60s**, so one slow or absent player can't hold the room. Disconnected
  players don't count. Each player's tick shows who's still reading.
- Rounds 2 and 3 go straight to their buy phase; the shop keeps every item's
  one-line hint.

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
- **Every round starts fresh**: the same coins and starting servers for
  both teams.
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
- **Attacks have cooldowns**; after any attack your attackers **regroup** for
  a few seconds, and **repeating the same attack** in a round costs more each
  time — so a rich team can't spam one trick.
- **Defences take a few seconds to set up** (instant in the buy phase):
  build ahead, or use a Shield in a pinch.
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
| **Lock your address** | Nobody can send your visitors elsewhere (Wrong Turn becomes a blip) | DNSSEC / domain lock |
| **Backup monitor**   | You can't be blindfolded (it becomes a blip)                    | Redundant monitoring |

### Utilities — one use

| Player sees         | What it does                               | Real concept            |
| ------------------- | ------------------------------------------ | ----------------------- |
| **Emergency repair**| Instantly restores some health (expensive) | Incident recovery       |
| **Shield**          | Blocks the next attack for a short time    | DDoS protection         |
| **Overclock**       | Servers run much faster for ~10s           | Vertical scaling burst  |
| **Instant backup**  | Brings wrecked servers straight back       | Failover                |

### Attacks — one use, cooldown, announced to the target

| You send                     | What it does to them                              | Their counter                     | Real concept          |
| ---------------------------- | ------------------------------------------------- | --------------------------------- | --------------------- |
| **Crowd surge**              | Floods them with extra **real** visitors          | Servers, Overclock                | Traffic spike         |
| **Bot army**                 | Floods them with **fake** visitors (bots)         | Bouncer, Shield                   | DDoS                  |
| **Slow their database**      | Their database crawls                             | Backup database, Fast shelf       | DB degradation        |
| **Destroy servers**          | Wrecks two of their servers for a while           | Instant backup, Shield            | Instance failure      |
| **Slow their servers**       | Every server runs slower                          | Overclock, Shield                 | CPU throttling        |
| **Knock out their splitter** | Traffic piles onto two servers; the rest barely help | Owning a Traffic splitter, Shield | Load balancer failure |
| **Blindfold**                | Their map **and alerts** go dark                  | Backup monitor, Shield            | Monitoring outage     |
| **Wrong Turn**               | A share of their visitors goes **to your site**   | Lock your address, Shield         | DNS hijacking         |
| **Jam their controls**       | Their shop freezes — they can't press anything    | Shield (raised before it lands)   | Control-plane lockout |

Every attack has its own sound, so you know what hit you without looking.

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
- **Fun awards** on the big screen (no fairness needed): **Comeback of the
  day** (won from furthest behind after any round), **Most destructive** (most
  attacks landed in one match), **Unbreakable** (best total without going down).

## Screens

| Screen        | Shows                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| Home          | Pitch, live map preview, Create a room / Join a room                           |
| Room          | Code, team names, 4 slots, ready toggles, how to play                          |
| Theme vote    | 4 theme cards (logo, what the site is, the rush moment), live vote counts, 10s |
| Briefing      | Goal, then every Defend / Attack / Boost item with key, hint and counter; who's ready; 60s cap |
| Buy phase     | Shop, both sites (paused), round number, timer                                 |
| Live          | HUD (health, coins, score, time) · alert bar · our site map · their site · shop · incoming warnings · "who bought what" feed |
| Round result  | Round winner, served / turned away, best attack, biggest save                  |
| Final         | Totals, winner, match points, leaderboard, "what you actually built" cards     |
| Big screen `/screen` | A featured live match (both sites, its theme, rotating), other matches, 1v1 / 2v2 top 10, fun awards |

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
│                                            │  [A] Crowd surge   220  │
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

Four real websites students know, each famous for a crowd rush. Voted per
match. Both teams run the same site; only the look and words change.

| Theme | The moment | Visitors | Accent | Round lines | Music |
| --- | --- | --- | --- | --- | --- |
| **Nasdaq** | Market open — every second is money | traders | Nasdaq blue | Opening bell · Midday rally · Closing hour | *ticker*: cool D minor, ticking clock, price-blip melody |
| **FanCode** | Race day, final lap | fans | FanCode orange | Lights out · Safety car in · Final laps | *race*: fast E minor, engine-like running bass, four-on-the-floor |
| **Miniclip** | A new game just dropped | players | Miniclip orange | Level 1 · Level 2 · Boss level | *chip*: bright, bouncy C-major chiptune |
| **BookMyShow** | Concert tickets go live at 12:00 | fans | BookMyShow red | Presale · General sale · Last tickets | *trailer*: slow C minor, held strings, booming drums |

- **Vote card:** logo, name, one line on what the site is (not everyone
  knows them all), and the rush moment.
- **What changes:** the logo and name in the top bar, the accent colour
  (buttons, highlights, coins, crowd), what visitors are called, **every map
  label and shop item name** (and so the hints, counters, alerts, feed and
  effect labels), the "site is down" line, the rush line in the feed, the
  buy-phase line per round, and the music style. Full name table:
  `web/src/themes/themes.ts`; e.g. Bot army = Bot traders / Bot fans / Bot
  swarm / Scalper bots, Shield = Circuit breaker / Safety car / Bubble shield /
  Security.
- **What doesn't:** the dark background, the rules and numbers, the layout
  and keyboard shortcuts (the same key always does the same thing). Green / yellow / red stay the health signals and
  always come with words. BookMyShow's crowd is drawn in white so it can't be
  mistaken for red "turned away" dots.
- Home and the room use the lavender accent and menu music; the theme takes
  over once the vote picks it.
- Logos live in `web/public/themes/<id>.png` (transparent, light version). A
  missing logo just shows the name.
- Original music only — each style borrows a genre's feel, never a real tune.
- Real names and logos, text and logo only, no claim of partnership (agreed
  with the user; none are fest sponsors).
