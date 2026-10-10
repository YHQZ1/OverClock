# Overclock — The Game

> **Flood their site. Keep yours alive.**
> Complexity underneath. Simplicity on top.

A live head-to-head strategy game for **SymbiTech**, played on the college lab
PCs. Two teams each run a pretend app. People pour in; every person you serve
earns coins; you spend coins defending your own site or attacking the other
team's. Three short rounds, one winner, a live leaderboard.

Numbers marked *(tune)* are starting points — the bots and playtests decide
the final values (see BALANCE.md).

> **Redesign after the first playtest (2026-10-10).** Tech-club juniors took
> two rounds to understand the game, found the screen overloaded, didn't know
> the themes well, and called the look lifeless. So: 12 items instead of 20,
> no upkeep, four apps everyone has on their phone, a briefing in
> small steps plus a demo match, and a Clash Royale-style arena instead of
> maps and panels. This document describes the redesigned game; DECISIONS.md
> keeps what it replaced.

## Who it's for

Walk-in students from **any branch** — most are not into tech. Even our
tech-club playtesters found the first version too technical, so the rule is:
**if a first-timer can't understand it from the picture and one line, it
doesn't belong in the game.** The real concepts are revealed only at the end.

The pitch a player hears:

> "Everyone's cursed at an app that crashed when they needed it. Today you run
> one — and you can crash theirs."

Success looks like: goal understood in **under 30s**, playing within **2
minutes**, knowing what every card does **by the end of round 1**, they can
see what went wrong and what fixed it, and they say **"again!"**

## Formats

| Format  | PCs | Notes                                  |
| ------- | --- | -------------------------------------- |
| **1v1** | 2   | You do everything.                     |
| **2v2** | 4   | Teammates share one wallet and full controls. |

*Later, if time:* 1v2 with a handicap for the solo player; play vs a bot when
no opponent is around.

## Session flow

```
 HOME          [Create a room]  your name → get a 4-letter code
               [Join a room]    code + your name
   ▼
 ROOM          ┌──── Team 1 ────┐        ┌──── Team 2 ────┐
               │  [1]     [2]   │   vs   │  [3]     [4]   │
               └────────────────┘        └────────────────┘
               team names · slots · Ready toggles · Leave
   ▼  (everyone ready, valid format)
 THEME VOTE    10s · everyone votes · most votes wins
   ▼
 THEME REVEAL  3s · "BookMyShow it is!" — the winning card fills the screen
   ▼
 BRIEFING      at each player's own pace, no visible timer
               1 How to play → 2 Attacks → 3 Defences → 4 Boosts → 5 Demo match
   ▼
 ┌─ for each round (1, 2, 3) ───────────────────────────────────────┐
 │ BUY PHASE     ~20s (tune): plan and build; sites are paused      │
 │ LIVE          Round 1 1:30 · Round 2 2:00 · Round 3 2:00 (tune)   │
 │ ROUND RESULT  ~10s: round winner, served / turned away, best move │
 └───────────────────────────────────────────────────────────────────┘
   ▼
 FINAL         totals · winner · match points · your place
   ▼
 THE REVEAL    "what you actually built" · [DONE — NEXT PLAYERS]
```

### Room rules

- Anyone with the code can join until the match starts (max 4).
- **Slots first, then ready.** Slots 1–2 are Team 1 (left), 3–4 are Team 2
  (right). Changing slot **clears your ready** — press it again.
- The match starts the moment **everyone in the room is ready** and the
  sides form a valid format: **1v1** (one player per side) or **2v2** (two per
  side). With 3 players, or an uneven split, the room explains why it can't
  start.
- Each side can name its team (default: the players' names, e.g. "Alpha &
  Bravo").
- Nobody is "host" — the ready checks replace a start button.

### Theme vote and reveal

- 10 seconds (ends early once everyone has voted); every player votes for
  one of the 4 apps. The cards look like **app icons on a phone home screen**.
- Most votes wins. **Any tie at the top is broken at random.** Nobody votes →
  random.
- **Reveal (3s):** the winning card grows to fill the screen in its colour,
  with its logo and "**BookMyShow it is!**"; the others fade out. Doubles as a
  "get ready" beat. Then the briefing.
- Themes are cosmetic — the rules and numbers are identical, so scores stay
  comparable.

### Briefing (before round 1 only)

Five short steps instead of one wall of text. **Each player goes at their own
pace**; **Enter** = next, **Backspace** = back; a row of progress bars shows
where you are. It stays in the chosen app's colour from the "it is!" moment on:
night header and footer, the app's colour (or the cards' colours) filling the
middle.

1. **How to play** — three huge numbered statements on the app's poster
   colour, key words in its accent: *{Fans} come to your {App} site · Spend
   coins to protect yours — or flood theirs · Serve the most people over three
   rounds*, each with one line beneath.
2. **Attacks** — a wall of five full-height panels in the **same colour as the
   real cards in the hand** (coral): key, big icon, name, one line, and
   **"Beaten by"** with the counters' icons and names.
3. **Defences** — three panels (blue), with **"Helps against"**.
4. **Boosts** — four panels (amber).
5. **Demo match** — see below; the side a caption isn't about is dimmed.
6. After finishing: **"You're ready"** in the app's colour, with who's still
   reading.

- **No visible timer** — reading shouldn't feel like a race.
- When you've finished: "**Waiting for Bravo…**" with a tick per player.
- Round 1 starts when every connected player has finished. Safety nets so one
  absent player can't freeze the room: a **hidden 3-minute cap** *(tune)*, and
  a **Skip briefing** button for staff in `/admin`.
- Rounds 2 and 3 go straight to their buy phase.

### The demo match

A **scripted ~40s match between two bot teams**, played in the real arena with
captions, so round 1 already looks familiar.

- **Scripted, not random:** every attack happens once, and the demo shows
  both outcomes — some blocked by their counter, some landing on a site
  without one, followed by the fix.
  - e.g. "🔴 sends **Scalper bots** → 🔵's **Robot check** stops them!" ·
    "🔵 sends a **Fake ticket site** → 🔴's fans walk over to 🔵! 🔴 buys
    **Verified link**." · ends with "**Your turn!**"
- An arrow or highlight points at what each caption describes.
- **Generated from the real engine** (a fixed scenario + scripted action log),
  stored as a recorded timeline, so the demo is always true to the rules and
  needs no server work to play.
- **Enter skips** it (for players on their second match).
- *If time:* the same demo loops on Home and on the projector between
  matches, so people in the queue learn before they sit down.

## The core loop: serve → earn → spend

Each team runs one site, drawn as a **place** in the theme (a box office, a
cinema, a stage, a payment counter):

```
 People → Gate (Bouncer, Verified link) → Counters (one per server) → served
             └─ when the counters can't keep up, the queue grows and people give up
```

- Both sites receive the **same background crowd** (same seed), so the
  match starts perfectly fair. Attacks are what make the sites differ.
- **Every person served earns coins.** People who give up earn nothing.
- **One currency, coins,** for everything.
- **Every round starts fresh**: the same coins and starting servers for
  both teams.
- **The queue is the signal.** Short queue = fine. Long queue, people walking
  away = you need more counters (or something's attacking you). No pipeline,
  no bottleneck to work out — the old splitter, fast shelf and database are
  gone from play and only appear in the reveal.

### Attack or defend? Your call, any time

There are **no fixed roles**:

- **Hurting their site cuts their income** (fewer people served → fewer
  coins). A good attack is also an investment.
- **Neglecting your own site makes you broke**, and broke teams can't attack.
- **Each extra server costs more than the last** (shown on the card, e.g.
  60 → 80 → 100…), up to a **max** *(tune)*. Over-building is waste you can
  see, without a hidden drain. *(Replaces upkeep.)*
- **Attacks cost about what their counter costs**, so neither pure attacking
  nor pure defending wins — timing and choosing the right attack do.

### Fairness and anti-snowball

- **Every attack is announced** — you see it flying towards your site during
  a 3s warning (tune).
- **Attacks have cooldowns**; after any attack your attackers **regroup** for
  a few seconds, and **repeating the same attack** in a round costs more each
  time — so a rich team can't spam one trick.
- **Defences take a few seconds to set up** (instant in the buy phase):
  build ahead, or use a Shield in a pinch.
- **The team that's behind earns a little more** (comeback income, tune).
- **After a crash**, a rebooted site gets a few seconds of protection.

## The cards (12)

Open during the buy phase **and** the whole live round. Defences can be sold
back for **half** of what they cost (Shift + the card's key, or the small
"Sell +N" tab on the card); you always keep at least one server, and the
newest server's price steps back down when you sell it. Every card
has a keyboard key, an icon and a position that **never change between
themes** — only the name does (see Themes). Icons are drawn (SVG), not emoji,
so they look the same on the lab PCs; emoji below are placeholders.

### Defences — you keep them for the round (keys 1–3)

| Key | Icon | Card | What it does | Real concept |
| --- | --- | --- | --- | --- |
| 1 | ➕ | **Server** | One more counter — more people served at once. Each one costs more than the last; max *(tune)* | Horizontal scaling |
| 2 | 🚪 | **Bouncer** | Turns bots away at the gate (a few real people too) | Rate limiting / bot protection |
| 3 | 🔒 | **Verified link** | Nobody can steal your visitors with a fake link | Domain lock / DNSSEC |

### Boosts — one use (keys Q–R)

| Key | Icon | Card | What it does | Real concept |
| --- | --- | --- | --- | --- |
| Q | ❤️ | **Emergency repair** | Instantly restores some health | Incident recovery |
| W | 🛡️ | **Shield** | Blocks the next attack for a short time | DDoS protection |
| E | ⚡ | **Overclock** | Counters work much faster for ~10s | Vertical scaling burst |
| R | 🔧 | **Instant backup** | Brings wrecked counters straight back | Failover |

### Attacks — one use, cooldown, announced (keys A–G)

| Key | Icon | Card | What it does to them | What you see | Beaten by | Real concept |
| --- | --- | --- | --- | --- | --- | --- |
| A | 👥 | **Crowd surge** | Floods them with extra **real** people | a wave of people runs across | ➕ Server, ⚡ Overclock | Traffic spike |
| S | 🤖 | **Bot army** | Floods them with **fake** visitors | robots storm their gate | 🚪 Bouncer, 🛡️ Shield | DDoS |
| D | 💥 | **Wreck servers** | Wrecks two of their counters for a while | their counters spark and go dark | 🔧 Instant backup, 🛡️ Shield | Instance failure |
| F | 🔀 | **Steal visitors** | A share of their queue walks to **your** site | their queue literally walks over | 🔒 Verified link, 🛡️ Shield | DNS hijack / phishing |
| G | 🧊 | **Freeze their controls** | Their cards freeze — they can't press anything | their cards ice over | 🛡️ Shield, raised before it lands | Control-plane lockout |

Dropped from the first version: Traffic splitter (now always on), Fast shelf,
Backup database, Backup monitor, Slow their database, Slow their servers,
Knock out their splitter, Blindfold. Each needed the pipeline to make sense, or
was invisible in an arena where both sites are on screen.

Prices, durations and strengths: *(tune)*, with the rule that an attack costs
roughly what its counter costs.

## Health, crash and reboot

- **Health** heads towards the share of people getting in: everyone in →
  climbs to 100; most giving up → falls to 0. On the arena the building shows
  it: lights on, smoke when it's critical.
- **Health 0 → 💀 SITE DOWN** for ~8s: the building goes dark, nobody gets in,
  no coins, cards locked. Then it reboots at 30% with a few seconds of
  protection, its counters lighting back up one by one. Nobody is eliminated;
  the round goes on.

## Scoring

- **Round score** = people served − people who gave up *(penalty weight:
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

- **Separate boards for 1v1 and 2v2.**
- Updates **live** on every PC and the big screen.
- **Fun awards** on the big screen: **Comeback of the day**, **Most
  destructive**, **Unbreakable** (best total without going down).

## The live screen: a data centre, not a dashboard

Two server rooms facing each other across an aisle, a hand of cost-badged cards
at the bottom, attacks you watch cross the aisle. Laid out side to side for the
lab's wide screens. **Both sites are always on screen**; there's no switching
views. Mocks: `docs/mocks/arena.html` (playable), built in
`web/src/game/arena/`.

- **Scoreboard (top):** both team names with big health numbers and bars, the
  round clock stacked in the middle, and a **tug-of-war bar** (who's winning
  right now) underneath.
- **The room (yours on the left, theirs on the right)**, in the app's colour:
  - **Racks of servers:** three racks × four units. You start with four lit;
    each server you buy fills the next bay (a dashed "+" shows which). LEDs
    blink and activity bars move when working, run amber when overclocked, and
    go red with cracks and smoke when wrecked.
  - **A switch under the racks** with a row of port lights: green → amber →
    red as the line grows. Overload is readable before health drops.
  - **A gateway** where requests come in, and **a conduit of avatar chips**
    (the line). Chips that can't get in pop out red and fade. Each one served
    sends a pulse from the gateway up to a working server.
  - **Defences are visible on the room:** a brick **firewall** across the
    conduit (Bouncer), a padlock on the gateway (Verified link), a violet
    **dome** (Shield), **ice** over the racks (frozen). Scouting the rival is
    just looking.
  - **Cables** trail across the floor from each gateway; the floor is raised
    tiles. The app's logo hangs on the sign above the racks.
- **Attacks** each have their own shape — a wind-up at the attacker's gateway,
  a **red ring that closes in** on the target (the warning), then:
  - **Crowd surge** — a stampede wedge of chips with speed lines;
  - **Bot army** — a marching V of robots with a red glow; slams into the
    firewall in a burst of bricks if there is one, else swarms into the line;
  - **Wreck servers** — a meteor falling from the sky, with crosshairs on the
    exact two servers it will wreck, then flash, shockwave, debris and a heavy
    shake;
  - **Steal visitors** — a pink tractor beam with a magnet head; chips arc
    out of the victim's line across the aisle;
  - **Freeze** — a spinning ice shard; frost spreads over the racks and
    shatters when it thaws.
  A shield turns any of them into a violet shockwave and "BLOCKED".
- **The one alert that matters** floats at the top of the field, always says
  what to press ("**Scalper bots in 3s — press 2**"), and the card to press
  bounces in the hand.
- **The hand:** every card is a chunky tile — coin cost top-left, key
  top-right, icon, name on a black strip — in three groups (Defend blue ·
  Boost amber · Attack coral). Cards you can't afford grey out, cooldowns drain
  from the top, owned defences read "READY", a frozen hand is covered in ice.
  Coins and income per second sit at the left.
- **Big moments are a slash across the field:** "BLOCKED!", "DIRECT HIT!",
  "FROZEN!", "YOUR SITE IS DOWN".
- **Names stay friendly** ("Ticket counter", "Robot check"); the data-centre
  picture is exactly what the end-of-match reveal labels with real names.
- Opponent's coins stay hidden. In 2v2, small toasts say who bought what.

### Look

**Flat poster colour, not a dashboard.** One near-black "night", paper-white
text, paper as the neutral accent, GDSC's four colours as small accents on the
club's pages — replaced by the app's own colour the moment a
theme is picked. No gradients, no rounded boxes, square edges, thick black
outlines, hard offset shadows. **Barlow Condensed** (self-hosted, uppercase,
heavy) for headlines, names, numerals and card titles; **Inter** for small
text. Big numbers and moments are the picture (the vote posters' stacked
clock times, the "FLOOD THEIRS" headline); quiet motifs (ticket perforation,
curtain stripes, sound rings, receipt dots) instead of illustration.
The same language runs through every screen: room (team 1 the app colour,
team 2 a quiet dark panel, neutral seat chips, a VS badge between the teams, a huge room code in GDSC's four colours), round result and final (headline
and numbers on the app's poster, the loser dimmed, nobody on a draw), reveal,
and the staff pages (soft black with paper for the selected / leading row,
display type sized in `vh` for the projector).
Cheap to render: SVG + CSS transforms/opacity, a capped particle pool,
smooth at 1366×768.

### The rhythm of every problem

1. **Warning** — the attack flies towards you; "Scalper bots incoming! Press 2"
2. **Where** — the part it hits (gate, counters, queue, your cards) reacts
3. **Act** — press the glowing card; its cooldown shows on it
4. **Relief** — "**BLOCKED!**" or the queue shrinks, health climbs,
   "Recovered!"

Every alert is visual. Lab PCs may have no speakers; sound is a bonus.

## Screens

| Screen        | Shows                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| Home          | Pitch, Create a room / Join a room (*if time:* the demo looping)               |
| Room          | Code, team names, 4 slots, ready toggles                                       |
| Theme vote    | 4 app-icon cards (logo, what the app is, the rush moment), live vote counts, 10s |
| Theme reveal  | The winning app, full screen, 3s                                               |
| Briefing      | How to play · Attacks · Defences · Boosts · Demo match; who's still reading     |
| Buy phase     | The arena (paused), the hand, round number, timer                              |
| Live          | The arena (see above)                                                          |
| Round result  | Round winner as the headline; per team: served, turned away, attacks sent / blocked, times down |
| Final         | Totals, winner, match points, **your place** on the leaderboard                |
| The reveal    | "What you actually built" (below)                                              |
| Live `/live` (staff, projector) | Sidebar of every match in progress; the one on screen big, as the arena; switching every 10s unless pinned |
| Leaderboard `/leaderboard` (staff, projector) | 1v1 / 2v2 top 10 (new entries flash) and the fun awards — display only |
| Control panel `/admin` (staff) | Rooms (end a stuck one, skip a briefing), leaderboard management (hide / unhide, reset), links to the two projector pages |

## The reveal

After the final screen (8 seconds, or Enter), every player gets **"What you
actually built"** — one scrolling page in the app they played, and the only
place real technical names and products appear. Same visual language as the
rest: the app's colour, huge condensed type, the cards' own colours.

1. **The headline**, on the app's poster colour: "You just kept a payments app
   working through a midnight sale", and what they were really running.
2. **Your site, with its real names** — **the same server room they just
   played**, with numbered pins on each part: **1** requests (the line of
   chips), **2** gateway + firewall, **3** load balancer (the switch) and
   application servers (the racks); and dashed ghost pins **4 cache** and **5
   database**, "not in your game — real sites have these too". Under it, a
   column per pin: what *they* called it, its real name, what it really is.
3. **Decoded** — all 12 cards as tiles **in the card's own colour** (defend
   blue, boost amber, attack coral): game name → real concept, what it really
   is, and real products (Cloudflare, AWS Auto Scaling…) or, for attacks, a real
   incident (Mirai botnet 2016, MyEtherWallet DNS hijack 2018, Facebook 2021
   lockout). **What their team used, sent, or got hit by is full colour with a
   stamp ("You used this", "It hit you") and listed first**; the rest are
   dimmed.
4. **You could build these too** — three real apps per theme as big numbered
   statements.

They read for as long as they like; **Enter** ("Done — next players") clears
the seat and returns the PC to Home. Content lives in `web/src/game/reveal.ts`;
the screen is `web/src/pages/play/RevealScreen.tsx`. Never required to enjoy the
game — and player screens never show technical terms before this.

## Themes: four apps on your phone

> **Four apps everyone has, four moments the whole country opened them at
> once.** Tickets · Watch · Listen · Pay.

Voted per match. Both teams run the same app; only the look and words change.

| Theme | Category | The moment | People | Site drawn as | Round lines | Music |
| --- | --- | --- | --- | --- | --- | --- |
| 🎟️ **BookMyShow** | Tickets | Concert tickets go live at 12:00 (it really crashed for Coldplay) | fans | a box office | Presale · General sale · Last tickets | *race*: fast, four-on-the-floor — concert energy |
| 🎬 **Netflix** | Watch | The season finale drops at midnight | viewers | a cinema | Episode 1 · Episode 2 · The finale | *trailer*: held strings, booming drums |
| 🎧 **Spotify** | Listen | Wrapped day — everyone opens it at once | listeners | a stage with DJ booths | Intro · Chorus · The drop | *chip*: bright and bouncy |
| 💸 **Google Pay** | Pay | Sale night — midnight deals, everyone paying at once | customers | a row of payment counters | Sale opens · Lightning deals · Last minute | *ticker*: ticking clock, price blips |

Backup for Google Pay if it doesn't land in the next playtest: **Zomato**, New
Year's Eve orders.

### Card names per theme

Named after things people have **seen happen in that app**, in everyday
words. Key, icon and position stay the same everywhere.

| Card | Default | 🎟️ BookMyShow | 🎬 Netflix | 🎧 Spotify | 💸 Google Pay |
| --- | --- | --- | --- | --- | --- |
| ➕ Server | Server | Ticket counter | Extra screen | DJ booth | Payment lane |
| 🚪 Bouncer | Bouncer | Robot check | Password check | Stream check | Fraud check |
| 🔒 Verified link | Verified link | Verified link | Verified link | Verified link | Verified QR |
| ❤️ Emergency repair | Emergency repair | Quick fix | Rewind | Tune-up | Quick fix |
| 🛡️ Shield | Shield | Security | Skip intro | Noise cancelling | Safety shield |
| ⚡ Overclock | Overclock | Express lane | 1.5× speed | Bass boost | Turbo pay |
| 🔧 Instant backup | Instant backup | Spare counters | Backup screens | Backup booths | Backup lanes |
| 👥 Crowd surge | Crowd surge | Fan frenzy | Binge wave | Viral hit | Sale rush |
| 🤖 Bot army | Bot army | Scalper bots | Fake accounts | Fake streams | Scam bots |
| 💥 Wreck servers | Wreck servers | Shut their counters | Smash their screens | Wreck their booths | Crash their lanes |
| 🔀 Steal visitors | Steal visitors | Fake ticket site | Fake Netflix link | Fake Spotify link | Fake QR code |
| 🧊 Freeze controls | Freeze their controls | Freeze their screens | Freeze their remote | Freeze their player | Freeze their phone |

### Other theme words

| | 🎟️ BookMyShow | 🎬 Netflix | 🎧 Spotify | 💸 Google Pay |
| --- | --- | --- | --- | --- |
| Gate / counters | Entry gate / Ticket counters | Entrance / Screens | Entry / DJ booths | Entry / Payment lanes |
| Too crowded | Fans are stuck in the queue! | Viewers are stuck buffering! | Listeners are stuck loading! | Payments stuck on "processing"! |
| Site down | no one's getting tickets | everyone's staring at a spinning wheel | the music's stopped | every payment is failing |
| Rush | Tickets are live — fans rushing in! | The finale just dropped — everyone's pressing play! | Wrapped is live — everyone's opening it! | Midnight deals — everyone's paying at once! |

- **Vote card:** logo, name, one line on what the app is, and the rush moment.
- **What changes per theme:** logo and name in the top bar, accent colour,
  how the site is drawn, what people are called, every card name (and so the
  hints, alerts and captions), the "site is down" line, the rush line, the
  round lines, the music.
- **What doesn't:** the rules and numbers, card keys, icons and positions, the
  layout. Green / yellow / red stay the health signals and always come with
  words. Where a theme's colour is close to a signal colour (Netflix and
  BookMyShow red, Spotify green), the theme colour stays on the buildings and
  cards, never on health.
- Logos live in `web/public/themes/<id>.png` (transparent, light version). A
  missing logo just shows the name.
- Original music only — each style borrows a genre's feel, never a real tune.
- Real names and logos, text and logo only, no claim of partnership; none are
  fest sponsors.
