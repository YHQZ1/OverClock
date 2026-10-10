# Decisions

Short record of what we chose and why. Newest thinking wins; superseded
choices are kept at the bottom so we remember why we moved on.

## Product

| Decision | Why |
| --- | --- |
| **Name: Overclock**, built for **SymbiTech** (our college tech fest) | Set by the event. |
| **Head-to-head duel, not co-op survival**: two teams, each runs a site, attacks the other's and defends its own | Rivalry pulls walk-ins in far more than "keep a site alive"; one-sentence pitch ("Flood their site. Keep yours alive."); spectators get it instantly. |
| **Audience: any student, mostly non-technical** | That's who walks up at a fest. No tech knowledge needed; concepts revealed at the end. |
| **Formats: 1v1 and 2v2** (2 or 4 PCs). 1v2 later, with a handicap | 1v2 is hard to make fair; pairs can attack and defend at once. |
| **Rooms with 4 slots** (1–2 = Team 1, 3–4 = Team 2); **slots first, then ready**; changing slot clears ready | Ready means "happy with my side". No host needed — the match starts when everyone in the room is ready and the format is valid. |
| **Theme vote: 10s, everyone votes, majority wins, any top tie random, no votes random** | Everyone gets a say; fast. Themes are cosmetic, so scores stay comparable. |
| **3 rounds** (~1:30 / 2:00 / 2:00, tune), each with a **~20s buy phase** | Planning time before the chaos. |
| **Redesign after playtest 1 (2026-10-10): make the game smaller, not just the words simpler** | Tech-club juniors took two rounds to understand it, found the screen overloaded and the themes unfamiliar, and still found it technical. The cause was quantity — 20 items, a pipeline to reason about, invisible rules (upkeep, selling, fatigue), two maps, a feed and timelines — not wording. The engine stays; what players see and choose between shrinks. |
| **The shop never closes** — buy, use and attack during live rounds too; **no selling** | Strategy is dynamic, unlike Valorant's buy phase. Selling was never used in playtest 1 and was one more rule and shortcut to learn. |
| **No fixed roles** — anyone attacks or defends any time | The economy creates the rhythm (attack while rich, defend while rebuilding); fixed roles felt artificial. |
| **One currency (coins), earned by serving visitors; attacks have cooldowns** | One number for non-technical players; every coin is a choice. Cooldowns stop rich teams spamming. Revisit two currencies if playtests show starving or never attacking. |
| **Hurting their site cuts their income** | Links attack and defence: a good attack is also an investment; a neglected site goes broke. |
| **Attacks cost about what their counter costs** | Neither pure attack nor pure defence wins; timing and choice do. Enforced by bot tests. |
| **Every attack is announced** ("⚠️ incoming in 3…") | Defending is skill, not luck. |
| **Anti-snowball**: comeback income for the trailing team, brief protection after a reboot | Matches stay tense to the end. |
| **Defences take ~4s to set up** (servers 2s); instant during the buy phase | With instant counters a 3s warning made every attack useless (bots: defence-only won 96%). "Build ahead, or Shield in a pinch" rewards scouting and keeps surprise attacks worth something. |
| **After any attack, attackers regroup (5s); repeating the same attack in a round costs +25% each time; every attack makes all attacks +8% pricier for the round** | Without these, all-attack spam won 93–98% of bot matches. Encourages variety and timing. |
| **12 cards: 5 attacks, 3 defences, 4 boosts.** Attacks: Crowd surge, Bot army, Wreck servers, Steal visitors, Freeze their controls. Defences: Server, Bouncer, Verified link. Boosts: Emergency repair, Shield, Overclock, Instant backup. Keys 1–3 · Q–R · A–G | Chosen with the user after playtest 1. Kept the attacks that are **visible and funny in an arena** (a wave of people, robots at the gate, sparks, your queue walking to their site, iced-over cards), each with one obvious counter that shares its icon on the card. Dropped the ones that needed the pipeline (slow database, slow servers, knock out splitter) or were pointless with both sites on screen (blindfold), plus their counters. |
| **Traffic splitter always on; database and fast shelf out of play — servers are the only capacity limit, and the queue is the signal** | "Bottleneck" reasoning is system-design thinking, however friendly the names. Everyone understands a queue: too long → people give up. The full pipeline still appears in the reveal. |
| **Attack tuning after the cut: Crowd surge ×1.8, Bot army 0.9, Steal visitors 50%; income 0.11 per person** | Bots, 2026-10-10 (docs/BALANCE.md): with five attacks and a counter for each, a perfect defender answered everything and the attacker never paid; ×1.1–1.15 on attack strength is the point between "balanced dominates" and "pure defence dominates". Income drops from 0.15 because nothing drains it any more. Real playtests decide. |
| **The demo is recorded from the engine, not simulated in the browser** (`pnpm --filter @overclock/server demo` → `web/src/game/demo.json`); a unit test fails if the committed file is out of date | CLAUDE.md: `web` never imports server code except types, and the sim stays on the server. A recording can't drift from the rules, plays identically on every PC, and costs the server nothing. |
| **Bots answer each announced attack once, whenever they next act** | Before, a bot had to act on exactly the 2.0s tick, so slow bots missed counters by accident and looked weaker than a slow human. |
| **Balance test "no strategy dominates" counts only opponents that defend** | The rusher never defends, so with five counterable attacks it loses to everyone; counting wins against it made every competent strategy look dominant. |
| **Every round starts fresh** (same coins and 4 servers for both teams) | Fair restarts; no snowballing between rounds. Resolves the reset-vs-carry question. |
| **Vote ends early once everyone has voted** | No waiting out the timer. |
| **Theme reveal: 3s, the winning card fills the screen ("BookMyShow it is!")** before the briefing | Playtest 1: the vote jumped straight on and nobody saw which theme won. |
| **Voting is a wall of four posters, one per app, in its own colours; the hero is the moment everyone opened the app at once as a stacked clock time** (12:00 · 00:00 · 01 DEC · 11:59), with a "people arriving" spike; votes raise the panel from the bottom, yours is stamped; the winner then takes the whole screen ("BookMyShow it is!") | The first vote cards (identical rounded boxes) looked templated and "AI-generated" to the user. A poster says why each app crashed without a paragraph, and the takeover makes the 3-second pick feel like one continuous move. Logos stay in their own colours on a paper label (transparent glyphs) or bare (opaque tiles like Spotify's). |
| **Briefing in 5 player-paced steps: How to play → Attacks → Defences → Boosts → Demo match**; Enter / Backspace; **no visible timer**; round 1 starts when every connected player is done; hidden 3-min cap + staff skip in `/admin`; not before rounds 2–3 | Suggested by the user from playtest 1: one screen was too much to take in, and the 60s countdown felt pressuring. The hidden cap and staff skip keep one absent player from freezing a room. |
| **Demo match: a scripted ~40s bot match in the real arena, with captions**, after the Boosts step and before round 1; generated from the real engine (scenario + scripted action log → recorded timeline); Enter skips | The playtesters asked for a bot match to watch. Scripted, not random, so every attack and both outcomes (blocked / landed → fixed) appear once; recorded from the engine so it can't drift from the rules and plays on each PC at its own pace. Placement after the cards chosen by the user: they know the names, then see them used. Replaces the idea of a guided round 1. |
| **Joining players are auto-seated on the emptier team** | A 1v1 lines up with zero clicks; 4 players land 2v2. Anyone can still move. |
| **No upkeep. Each extra server costs more than the last** (shown on the card), with a max per round; Bouncer and Verified link are bought once and kept for the round | Upkeep was an invisible drain — coins fell and players didn't know why, and a server switching off for non-payment felt like a bug. A rising price does the same job (over-building is waste) where you can see it. Picked by me; the user left it open. |
| **2v2: shared wallet, full controls on both PCs, "Our site / Their site" views, purchases attributed** | Players split work naturally without enforced roles; arguing about spending is part of the fun. |
| **Both sites get the same background crowd (same seed)** | The match starts perfectly fair; only attacks and choices make the sites differ. |
| **Round score = served − turned away; match = sum of 3 rounds** | Simple, visible, directly hurt by attacks. |
| **Leaderboard: match points = your total + ½ × opponent total + win bonus**, per format (1v1 / 2v2), tuned by bots | Every match is a one-off (no rematches, no accounts), so Elo can't work; the opponent's score in the same match is the evidence of their strength. |
| **Fun awards on the big screen** (comeback, most destructive attack, uptime) | More teams get a moment on screen; no fairness needed. |
| **Only completed matches are recorded** | Leaving halfway records nothing. |
| **Crash and reboot** at 0 health (no elimination) | Fixed match length; nobody sits idle. |
| **Player-friendly names; real concepts revealed at the end** (Bouncer → rate limiter, Steal visitors → DNS hijack, Instant backup → failover…) | Never show tech terms before the reveal. |
| **The reveal is its own step: final (8s, or Enter) → reveal (as long as they like) → Enter → Home**; real product names and incidents included; what the team used is highlighted | A button would get skipped; the auto-advance means everyone sees it. Real names (Redis, Cloudflare, Mirai…) make it concrete for CS students and searchable later. |
| **Every alert says what's wrong *and* which key to press** ("Scalper bots incoming! Press 2"), floats over your site, and the card to press glows | First-timers shouldn't have to work out the fix or hunt for the card. |
| **The arena is drawn from relative values only** (queue length, share getting in) | Shows a rush and people giving up without technical numbers. |
| **The live screen is two server rooms facing each other (side to side), with a hand of cost-badged cards below** — racks fill as you buy servers, a switch's port lights show load, a conduit of avatar chips is the line, a brick firewall / padlock / dome / ice show defences; each attack has its own animation (stampede, marching robots, meteor with crosshairs, tractor beam, ice shard) with a wind-up and a closing warning ring; the one alert says which key to press and that card bounces; big moments slash across the field | Chosen with the user across mocks (docs/mocks/arena.html): the first "shop with a queue" arena didn't feel like system design; attacks as sliding circles were weak. Names on cards stay friendly — the picture is the data centre the reveal then labels with real names. Side to side because lab PCs are wide screens. Cheap: SVG + CSS transforms/opacity, a capped particle pool. |
| **Each site is drawn as a place in its theme** (box office, cinema, stage, payment counters), one counter per server | People are easier to read than racks and dots; each theme feels different. Cut-list fallback: one building shape themed by colour and logo. |
| **Vote cards are app-icon tiles in each app's own colours**; a missing logo file shows the name on the tile (Netflix, Spotify and Google Pay have no logo files yet) | An app's colour is its recognisable part and costs nothing; real logo files can be dropped in later without code changes. |
| **Opponent's coins are hidden; their health and defences are visible** | Scouting matters, bluffing stays possible. |
| **Played on college lab PCs**, desktop-first, mouse + keyboard shortcuts on every in-game action | That's the venue. |
| **Visual-first alerts**; sound optional | Lab PCs may have no speakers. |
| **Sound effects + light chiptune background music (Am–F–C–G; gentle in menus, drums in rounds, faster in the last 20s), synthesised in the browser** (Web Audio, no files; layered voices, reverb, compressor; one musical key); **M** mutes all, **N** toggles music, remembered per browser | Nothing to download past the firewall; tiny; every sound has a visual twin. Each attack has its own sound so you know what hit you without looking. |
| **Shared-PC safety**: seat cleared on Leave and on "Done — next players" | The next players must never land in someone else's match. |
| **Room codes: 4 letters, no I or O** | Easy to read off a screen and type. |
| **No C/J shortcuts on Home**; forms keep Enter / Esc | Home is clicked once; shortcuts matter in the game. |
| **Responsive from phones to 2560px**, still desktop-first: below 1024px (`lg`) columns stack and pages scroll; above 1366px the root font grows (16px → ≈21px at 2560) and sizes are in `rem`, so big monitors aren't tiny. Projector pages size by screen height | Nobody should hit a broken layout on any screen; lab PCs at 1366×768 look exactly as designed. |
| **Look: flat poster colour** — near-black night, paper text, violet brand colour that gives way to the app's own colour once picked; no gradients or rounded boxes, thick black outlines and hard shadows; **Barlow Condensed** (self-hosted, uppercase, heavy) for headlines, names, numerals and card titles, **Inter** for small text; the hero of a screen is a big number or moment, with a quiet motif per app | Chosen with the user via mocks (docs/mocks/vote.html, home.html, arena.html) after playtest 1 called the UI lifeless. The vote wall of posters was the first thing they liked, so the whole app now follows it. Fonts are self-hosted (the lab firewall may block Google Fonts). |
| **One brand colour: violet `#8B6CFF`**; green / orange / red only for game signals (warning moved from yellow to orange so it can't be mistaken for Boost amber) | Violet is the only hue that none of the four apps (rose, red, green, blue) or the card kinds (blue, amber, coral) use, so it is always "Overclock". Colour on the game screen means something. |
| **Themes: four apps on your phone — BookMyShow (tickets), Netflix (watch), Spotify (listen), Google Pay (pay)** — each with the moment the whole country opened it at once (concert tickets at 12:00, a finale at midnight, Wrapped day, sale night); real names and logos (text + logo only), own accent, words and music; vote cards look like app icons | Chosen with the user after playtest 1: Nasdaq, FanCode and Miniclip weren't familiar enough. One category each so they feel like a set, not four random sites. Zomato (New Year's Eve orders) is the backup if Google Pay doesn't land in playtest 2. None are fest sponsors. |
| **Card names are themed, in everyday words, after things people have seen in that app** (Fake QR code, Password check, Scalper bots, Freeze their remote); **key, icon and position never change** | The user wanted themed names, but more relevant and less technical. Fixed icons and keys keep what's learned in one match valid in the next, and let onlookers learn by watching. Full table in GAME.md. |
| **Theme colour is decoration only** — on buildings and cards, never on health; green / yellow / red stay the health signals, always with words | Netflix and BookMyShow red sit close to "bad", Spotify green to "ok". |
| **Original music per theme**, reusing the four synthesised styles: BookMyShow → race, Netflix → trailer, Spotify → chip, Google Pay → ticker; menus keep the arcade tune | Each world feels different with no new music work; never copy a real tune. |
| **ChronoNexia (the fest theme) later, as framing**: "the timeline has split — only one survives", both teams in the same voted world | Fits the vote (one world per match); added incrementally. |
| **Three staff pages, one passcode**: `/admin` (control panel: rooms, end a room, hide / unhide teams, reset), `/live` (spectator view), `/leaderboard` (display only). Players see just their own place on the final screen | The projector is the event's moment; shared lab PCs stay on `/play`; one place to manage the board, one to show it. A shared "big screen" with layouts and a remote-control admin preview was built first and dropped as cluttered. |
| **`/live`: a sidebar of every match in progress** (incl. briefing and between rounds), the one on screen highlighted with a 10s progress bar; auto-switches every **10s** (preferring matches in play) unless **pinned** (held until that match ends); click a match to show it. Controlled at the projector itself, not remotely | One projector: whoever's at it switches between `/live` and `/leaderboard` (Alt+Tab). Simple and live; no remote-control state on the server. |
| **Awards**: comeback of the day (biggest deficit after any round, then won), most destructive (most attacks landed in a match), unbreakable (best total with no crash); hidden teams excluded | Simple, explainable, computed from saved matches. |
| **Staff sign-in: one passcode, no username** (`ADMIN_PASSCODE`; production requires 8+ characters), 5 wrong tries → 1-minute lockout, quiet "Staff" link on Home | admin/admin would be the first guess in a room of CS students. |
| **Name filter** on player and team names (English + common Hindi abuse; short words only as whole words so Kshitij, Gandhi, Chodankar, Assam pass) | Stops the obvious ones before they reach the projector; Hide handles the rest. |

## Technical

| Decision | Why |
| --- | --- |
| **Modular monolith**, not microservices | Tick loop and reproducibility need the engine in-process; one dev; a few dozen connections. |
| **TypeScript everywhere** | One language; server types reused in the web app. |
| **Folders `web/`, `server/`, `docs/`, `infra/`** at the root | Two apps — an `apps/` level adds nothing. |
| **React + Vite** (not Next.js) | No SSR/SEO needs. |
| **Tailwind v4**; design tokens in `@theme` (`web/src/styles/index.css`); shared `Button`, `Field`, `Label`, `Frame` in `web/src/components/ui.tsx` | Utilities next to markup are faster to change; tokens keep the palette consistent. |
| **Fonts self-hosted** (Fontsource: Inter) | The lab firewall may block Google Fonts. |
| **Zustand** for client state | Tiny; mirrors the latest server snapshot. |
| **Express 5** (not Fastify) | Familiar, low risk; tiny HTTP surface. |
| **Socket.IO** (not raw `ws`) | Auto-reconnect, rooms, and long-polling fallback if WebSockets are blocked. |
| **Zod** for all inputs | A bad message must never break a match. |
| **PostgreSQL + Drizzle** (postgres.js driver); Docker locally on **port 5433**, compose project `overclock` | Typed queries, simple SQL migrations applied on start. 5433 avoids a Postgres already on 5432; the project name keeps our volume separate from other projects' `infra_pgdata`. |
| **Results behind a `ResultStore`** — Postgres, or memory when `DATABASE_URL` is unset (dev/tests); production requires it | Tests and Docker-less dev still work; the event can't silently lose results. |
| **Each team's leaderboard entry is per match**; equal points share a place; replays (seed + action log per round) saved with every match | Teams are one-offs with no accounts; replays settle disputes. |
| **`hidden` flag on leaderboard rows** (set from the admin page) | Rude team names must be removable from the projector. |
| **server → app → routes → controllers → services**, plus `sockets/` and pure `sim/` | The usual layering, extended for real-time and the engine. |
| **Server decides the screen** (room phase machine) | Keeps every PC in sync; refresh/reconnect just works. |
| **Server-authoritative, deterministic sim at 10 ticks/sec** | Fairness, replays for disputes, easy testing. |
| **Services push updates through a `Broadcaster` interface** | Services never import Socket.IO, so they're unit-testable. |
| **Seat (code + token) in `sessionStorage`**, per tab | Refresh rejoins; several tabs can test a room on one PC; cleared on Leave / Done. |
| **One web service** serves API + socket + web build | One deploy, no CORS, local fallback is one command. Single instance. |
| **Dev `tsx watch`; prod `tsc` → `node dist`** | Fast reload locally, plain Node in production. |
| **Tests split by kind** — unit / integration / balance (Vitest projects), web unit, e2e (Playwright), load (bot clients + `/api/metrics`) | Each answers a different question and runs at its own speed; see docs/TESTING.md. |
| **CI: GitHub Actions** — `ci.yml` every push, `e2e.yml` on PRs/pushes to main, `load.yml` nightly + manual | Fast checks block every change; the slow, noisier suites run where they're worth the wait. |
| **Load target: 30 rooms (~75 players)** — a full lab × 1.5; tick p95 ≤ 25 ms, lag p95 ≤ 50 ms | The event must never stall; measured, not guessed. |
| **`/api/metrics`** (counts and timings only) | The load test asserts on real server numbers; also handy on event day. |
| **`FAST_ROUNDS=1` dev switch** (5s buy, 20s rounds) | Test a full match in ~90s instead of ~7 minutes. Never set at the event. |
| **`DEV_ROUNDS=1…3` dev switch** (`pnpm dev:round`) — a match of fewer rounds; refused in production | Iterating on the final, reveal and results screens shouldn't need three rounds each time. The server's round count already drives every screen, so nothing else changes. |
| **pnpm 11 with `allowBuilds: esbuild`** | pnpm blocks dependency build scripts by default; `tsx` needs esbuild's. |
| **No milestones — one build queue** (docs/PLAN.md) | Keep building, top of the queue first, verify as we go. |

## Open

| Question | Notes |
| --- | --- |
| All numbers | Prices, server price step and max, attack strength/duration/cooldowns, warning time, income (higher net now that upkeep is gone), comeback bonus, round lengths, match-point weights — bots + playtests. |
| Bouncer and Verified link bought once per round | Without upkeep they're cheap permanent counters. Fine if it makes attackers scout and switch attacks; if turtling wins, raise their price or give them a duration. Watch in the bots and playtest 2. |
| Team names | Default "Priya & Rahul"; editable in the room. Duplicates allowed. |
| Mid-match disconnects | Whole team gone > ~1 min → match ends unrecorded (proposal). |
| Play vs bot | Fallback when no opponent is around — likely, later. |
| College firewall | To be sorted with the college; the code is the same either way. |

## Superseded

| Was | Replaced by | Why |
| --- | --- | --- |
| Co-op survival: 1–3 players keep one site alive against scripted disasters | Head-to-head duel | Not exciting enough for non-technical walk-ins; rivalry is the hook. |
| Host creates a team, host presses START, host picks the theme | Rooms with slots + ready; everyone votes | No single person in charge; fairer and faster. |
| Fixed roles per PC (Network / Servers / Database) | No roles; shared controls and views | Roles felt artificial; the economy creates the rhythm. |
| Score = served − lost + budget saved; budget can go negative | Duel scoring (served − turned away) and one currency with upkeep | Leftover money as points discourages attacking. |
| Milestones 0–12 | A single build queue | Faster to keep building than to manage milestones. |
| 20 items: 9 attacks (+ Slow their database, Slow their servers, Knock out their splitter, Blindfold), 7 defences (+ Traffic splitter, Fast shelf, Backup database, Backup monitor) | 12 cards | Playtest 1: too many to learn; half needed the pipeline to make sense. |
| Pipeline (front door → servers → fast shelf → database) with a bottleneck to find | Servers only; the queue is the signal | Reading a bottleneck is system-design thinking. |
| Upkeep on kept defences; selling for 50% | Rising server price + max; no selling | Invisible drain; selling unused. |
| One-screen briefing, 60s cap, straight after the vote | Theme reveal + 5-step player-paced briefing + demo match | Too much text at once; the countdown felt pressuring; nobody saw which theme won. |
| Themes Nasdaq, FanCode, Miniclip, BookMyShow | BookMyShow, Netflix, Spotify, Google Pay | Players didn't know the first three well enough. |
| Live map: the theme's geography (world / India land dots, city arcs) feeding a data centre from above; Tab between our site and theirs; feed, timelines, mini map | The arena | Still read as a diagram you had to decode; the rival was a Tab away. (The map also chose land dots only, no borders, for sensitivity — keep that if geography ever returns.) |
| Look: sharp, minimal, square corners, hairline dividers, no gradients | A game look | Lifeless and monotonous in playtest 1. |
