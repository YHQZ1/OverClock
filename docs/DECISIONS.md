# Decisions

Short record of what we chose and why.

## Product

| Decision                                                                     | Why                                                                                            |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Name: Overclock** (formerly "Scale Wars")                                  | Set by the event.                                                                              |
| **Played on college lab PCs**, desktop-first, mouse + keyboard shortcuts     | That's the venue. Bigger screens, faster input.                                                |
| **Walk-in, self-serve teams**: create → share code → join → host START       | No organizer bottleneck.                                                                       |
| **1–3 players per team**, one PC each (1 = all buttons)                      | Solo walk-ins and testing work; 2–3 is the intended experience.                                |
| **Buttons split by role** across a team's PCs                                | More interactive; teammates must talk.                                                         |
| **One leaderboard**, team size shown                                         | Simple. Revisit if solo players dominate.                                                      |
| **Only completed sessions are recorded**                                     | Leaving halfway records nothing.                                                               |
| **Budget can go negative**: + SERVERS locks at 0, running servers keep draining, negative budget subtracts from score | Overspending always hurts; no hard stop mid-round.                                              |
| **Score = fans served − fans lost + budget saved**                           | Rewards uptime _and_ not wasting resources; makes button-mashing a losing strategy.            |
| **No fixed "right" number of servers**                                       | Real world: you never know exactly how many you need. Deciding under uncertainty is the skill. |
| **Serving fans always outweighs saving budget**                              | Otherwise "never add servers, bank the budget" would win. Enforced by a stingy-bot test.       |
| **Budget resets each round**; Round 1 generous                               | Learn first, pressure later.                                                                   |
| **Crash and reboot** at 0 health (no elimination)                            | Fixed match length; nobody sits idle.                                                          |
| **Tutorial is skippable** (host chooses)                                     | Teams decide; all PCs move together.                                                           |
| **Planning break between rounds** (~30s, host can skip)                      | Time to talk strategy; shows what went wrong.                                                  |
| **Host picks theme** from three or 🎲 Random                                 | Variety; harder to spot patterns. Themes are cosmetic so scores stay comparable.               |
| **Visual-first alerts**; sound optional                                      | Lab PCs may have no speakers.                                                                  |
| **Shared-PC safety**: clear saved session on end/abandon; "Done — next team" | The next team must never land in the previous team's game.                                     |
| **Per-round variant pool** (same disasters/strength, different order/timing) | Teams watching earlier teams can't memorise; bots check variants score within a few %.         |
| **Admin page deferred**                                                      | Core team flow first.                                                                          |
| **Look: sharp, minimal, dark, full-width** — Inter only, square corners, hairline dividers, no gradients or pills; split layout (statement left, action column right) | Feels deliberate rather than templated. Tried and dropped: warm paper + clay (too close to Claude), Google four-colour palette, rounded-card "hero + two cards". |
| **One accent: lavender `#A594F9`** (primary button, active row, highlights) — one token in `web/src/styles/tokens.css` | Quiet and distinct; not blue/orange/neon. Green / yellow / red stay reserved for game signals (healthy / struggling / broken). |
| **No C/J shortcuts on Home**; forms keep Enter / Esc. Lobby and in-game buttons keep shortcuts | Home is clicked once per team; shortcuts matter where speed matters (the game).               |
| **Team codes: 4 letters, no I or O**                                         | Easy to read off a projector and type.                                                         |

## Technical

| Decision                                                                            | Why                                                                                                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Modular monolith**, not microservices                                             | Tick loop and reproducibility need the engine in-process; one dev; ~35 connections. Clean boundaries keep a later split possible. |
| **TypeScript everywhere**                                                           | One language; server types reused in the web app.                                                                                 |
| **Folders `web/`, `server/`, `docs/`, `infra/`** at the root                        | Two apps — an `apps/` level adds nothing.                                                                                         |
| **React + Vite** (not Next.js)                                                      | No SSR/SEO needs.                                                                                                                 |
| **Fonts self-hosted** (Fontsource: Inter)                                           | Lab firewall may block Google Fonts; no CDN dependency at the event.                                                              |
| **Zustand** for client state                                                        | Tiny; holds the latest server snapshot.                                                                                           |
| **Express 5** (not Fastify)                                                         | Familiar, low risk; tiny HTTP surface.                                                                                            |
| **Socket.IO** (not raw `ws`)                                                        | Auto-reconnect, rooms, and HTTP long-polling fallback if WebSockets are blocked.                                                  |
| **Zod** for all inputs                                                              | A bad message must never break a match.                                                                                           |
| **PostgreSQL + Drizzle**; Docker locally                                            | Typed queries, simple migrations.                                                                                                 |
| **server → app → routes → controllers → services**, plus `sockets/` and pure `sim/` | The usual layering, extended for real-time and the engine.                                                                        |
| **Server decides the screen** (session phase machine)                               | Keeps a team's PCs in sync; refresh/reconnect just works.                                                                         |
| **Server-authoritative, deterministic sim at 10 ticks/sec**                         | Fairness, replays for disputes, easy testing.                                                                                     |
| **One web service** serves API + socket + web build                                 | One deploy, no CORS, local fallback is one command. Single instance.                                                              |
| **Seat (code + rejoin token) in `sessionStorage`**, per tab                         | Refresh rejoins; several tabs can test a team on one PC; cleared on Leave / Done so a shared PC never reuses a seat.               |
| **Services push updates through a `Broadcaster` interface**                         | Services never import Socket.IO, so they're unit-testable; the socket layer implements it with one room per team.               |
| **Joining is lobby-only; host leaving hands host to the next player**               | No mid-round joins (roles/fairness); a lobby never gets stuck without a host.                                                     |
| **Dev `tsx watch`; prod `tsc` → `node dist`**                                       | Fast reload locally, plain Node in production.                                                                                    |
| **Continuous milestones, not day-by-day**                                           | Keep momentum; finish → verify → next.                                                                                            |

## Open

| Question             | Notes                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- |
| The three themes     | Not decided. Direction: relatable worlds from games/shows (inspired by, no names/art). Home/Lobby stay theme-neutral meanwhile. |
| Round contents       | Lengths, disasters per round, button unlock order.                                      |
| Tie-breaks           | Proposal: less downtime, then fewer crashes.                                            |
| Duplicate team names | Proposal: allow; show code suffix if two match.                                         |
| College firewall     | To be sorted with the college; code is the same either way.                             |
