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
| **The shop never closes** — buy, sell (~50% refund), use and attack during live rounds too | Strategy is dynamic, unlike Valorant's buy phase. Partial refunds stop buy/sell money tricks. |
| **No fixed roles** — anyone attacks or defends any time | The economy creates the rhythm (attack while rich, defend while rebuilding); fixed roles felt artificial. |
| **One currency (coins), earned by serving visitors; attacks have cooldowns** | One number for non-technical players; every coin is a choice. Cooldowns stop rich teams spamming. Revisit two currencies if playtests show starving or never attacking. |
| **Hurting their site cuts their income** | Links attack and defence: a good attack is also an investment; a neglected site goes broke. |
| **Attacks cost about what their counter costs** | Neither pure attack nor pure defence wins; timing and choice do. Enforced by bot tests. |
| **Every attack is announced** ("⚠️ incoming in 3…") | Defending is skill, not luck. |
| **Anti-snowball**: comeback income for the trailing team, brief protection after a reboot | Matches stay tense to the end. |
| **Defences take ~4s to set up** (servers 2s); instant during the buy phase | With instant counters a 3s warning made every attack useless (bots: defence-only won 96%). "Build ahead, or Shield in a pinch" rewards scouting and keeps surprise attacks worth something. |
| **After any attack, attackers regroup (5s); repeating the same attack in a round costs +25% each time** | Without it, all-attack spam won 98% of bot matches. Encourages variety and timing. |
| **Every round starts fresh** (same coins and 4 servers for both teams) | Fair restarts; no snowballing between rounds. Resolves the reset-vs-carry question. |
| **Vote ends early once everyone has voted** | No waiting out the timer. |
| **Joining players are auto-seated on the emptier team** | A 1v1 lines up with zero clicks; 4 players land 2v2. Anyone can still move. |
| **Upkeep on kept defences**; can't pay → newest server switches off | Over-building is waste; no debt spiral. |
| **2v2: shared wallet, full controls on both PCs, "Our site / Their site" views, purchases attributed** | Players split work naturally without enforced roles; arguing about spending is part of the fun. |
| **Both sites get the same background crowd (same seed)** | The match starts perfectly fair; only attacks and choices make the sites differ. |
| **Round score = served − turned away; match = sum of 3 rounds** | Simple, visible, directly hurt by attacks. |
| **Leaderboard: match points = your total + ½ × opponent total + win bonus**, per format (1v1 / 2v2), tuned by bots | Every match is a one-off (no rematches, no accounts), so Elo can't work; the opponent's score in the same match is the evidence of their strength. |
| **Fun awards on the big screen** (comeback, most destructive attack, uptime) | More teams get a moment on screen; no fairness needed. |
| **Only completed matches are recorded** | Leaving halfway records nothing. |
| **Crash and reboot** at 0 health (no elimination) | Fixed match length; nobody sits idle. |
| **Player-friendly names; real concepts revealed at the end** (Traffic splitter → load balancer, Bouncer → rate limiter, Fast shelf → cache…) | Never show tech terms before the reveal. |
| **Every alert says what's wrong *and* what to do** | First-timers shouldn't have to work out the fix. |
| **The map is drawn from relative values only** (crowd vs normal, share getting in) | Shows a rush and people turned away without technical numbers. |
| **Opponent's coins are hidden; their health and defences are visible** | Scouting matters, bluffing stays possible. |
| **Played on college lab PCs**, desktop-first, mouse + keyboard shortcuts on every in-game action | That's the venue. |
| **Visual-first alerts**; sound optional | Lab PCs may have no speakers. |
| **Sound effects + light chiptune background music (Am–F–C–G; gentle in menus, drums in rounds, faster in the last 20s), synthesised in the browser** (Web Audio, no files; layered voices, reverb, compressor; one musical key); **M** mutes all, **N** toggles music, remembered per browser | Nothing to download past the firewall; tiny; every sound has a visual twin. Each attack has its own sound so you know what hit you without looking. |
| **Shared-PC safety**: seat cleared on Leave and on "Done — next players" | The next players must never land in someone else's match. |
| **Room codes: 4 letters, no I or O** | Easy to read off a screen and type. |
| **No C/J shortcuts on Home**; forms keep Enter / Esc | Home is clicked once; shortcuts matter in the game. |
| **Look: sharp, minimal, dark, full-width** — Inter only, square corners, hairline dividers, no gradients or pills; split layout | Feels deliberate rather than templated. Tried and dropped: warm paper + clay (too close to Claude), Google four-colour palette, rounded "hero + two cards". |
| **One accent: lavender `#A594F9`**; green / yellow / red only for game signals | Quiet and distinct; colour on the game screen always means something. |
| **Themes: relatable worlds** (crash moments, inspired by games/shows — never real names or art) | Recognisable without copyright trouble at a public event. |
| **Admin page deferred** | Core flow first. |

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
| **PostgreSQL + Drizzle**; Docker locally | Typed queries, simple migrations. |
| **server → app → routes → controllers → services**, plus `sockets/` and pure `sim/` | The usual layering, extended for real-time and the engine. |
| **Server decides the screen** (room phase machine) | Keeps every PC in sync; refresh/reconnect just works. |
| **Server-authoritative, deterministic sim at 10 ticks/sec** | Fairness, replays for disputes, easy testing. |
| **Services push updates through a `Broadcaster` interface** | Services never import Socket.IO, so they're unit-testable. |
| **Seat (code + token) in `sessionStorage`**, per tab | Refresh rejoins; several tabs can test a room on one PC; cleared on Leave / Done. |
| **One web service** serves API + socket + web build | One deploy, no CORS, local fallback is one command. Single instance. |
| **Dev `tsx watch`; prod `tsc` → `node dist`** | Fast reload locally, plain Node in production. |
| **`FAST_ROUNDS=1` dev switch** (5s buy, 20s rounds) | Test a full match in ~90s instead of ~7 minutes. Never set at the event. |
| **pnpm 11 with `allowBuilds: esbuild`** | pnpm blocks dependency build scripts by default; `tsx` needs esbuild's. |
| **No milestones — one build queue** (docs/PLAN.md) | Keep building, top of the queue first, verify as we go. |

## Open

| Question | Notes |
| --- | --- |
| The themes | 3–4, not decided. Direction above. |
| All numbers | Prices, upkeep, attack strength/duration/cooldowns, warning time, income, comeback bonus, round lengths, match-point weights — bots + playtests. |
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
