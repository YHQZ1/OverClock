# Plan

No milestones. One build queue: take the top item, build it, verify it
(tests + a real run in the browser), tick it off, move on. Keep building until
we run out of time; the cut list says what goes first if we must.

## Built

Foundation from the first (co-op) version — kept and reused by the duel:

- [x] Monorepo: pnpm workspaces, TypeScript, Vitest, docs, infra
- [x] **Pure deterministic engine** (`server/src/sim`): seeded RNG, traffic
      (base + waves + rushes + noise), servers with boot/cooldown, health,
      crash/reboot, scoring, run/replay from an action log
- [x] **Bots + balance report** (`pnpm --filter @overclock/server balance`) and
      balance invariants as tests
- [x] **Real-time server**: Express 5 + Socket.IO, Zod-validated thin
      handlers, services behind a `Broadcaster`, 10 Hz match loop, player-safe
      views, abandon sweep
- [x] **Join flow**: 4-letter codes, rejoin tokens, refresh drops you back in,
      shared-PC seat clearing
- [x] **Web**: Home (statement, animated map, create/join tiles), lobby,
      countdown, live game screen (HUD, alert + hint, live map with real
      servers and turned-away visitors, health timeline, feed), results
- [x] Tailwind v4 styling with design tokens
- [x] Tests: engine rules, determinism, balance invariants, end-to-end socket flows (37 for the duel)

- [x] **Testing**: unit / integration / balance / web / e2e / load, organised
      by kind; GitHub Actions for CI, E2E and nightly load (docs/TESTING.md)

## Build queue (duel)

In order. Each item ends playable and tested.

1. [x] **Rooms**: 4 slots (auto-balanced on join), slot picking, ready
       toggles (slot change clears ready), auto-start when all ready and
       1v1/2v2 is valid, team names, room screen
2. [x] **Theme vote**: 10s, live counts, majority / random tie-break, ends
       early once everyone has voted (placeholder themes)
3. [x] **Duel engine**: two sites sharing one seeded background crowd;
       per-side actions; both sites step together; exact replays
4. [x] **Economy**: coins from visitors served, upkeep, buy/sell (50%
       refund), can't-pay → newest server switches off, comeback income
5. [x] **Pipeline**: front door → servers → fast shelf → database;
       bottleneck detection and highlight on the map
6. [x] **Defences**: server, traffic splitter, bouncer, fast shelf, backup
       database, second route (4s setup, instant in the buy phase)
7. [x] **Attacks** (9): crowd surge, bot army, slow their database, destroy
       servers, slow their servers, knock out their splitter, blindfold, Wrong
       Turn, jam their controls — warnings, cooldowns, regroup, repeat price,
       attack fatigue; map effects + a sound each
8. [x] **Utilities**: emergency repair, shield, overclock, instant backup
9. [x] **Rounds**: buy phase → live → round result × 3, totals, final,
       forfeit when a team leaves
10. [~] **Duel bots + balance**: idle, turtle, rusher, balanced, human
        fast/slow with buy-phase plans; invariants as tests (idle loses,
        mirror = draw, no strategy > 90%, every attack has a counter that
        measurably helps). Keep tuning with real playtests.
11. [x] **Game screen for the duel**: HUD (us vs them), alert with counter
        hints, live map per site (Tab), mini map, both health timelines,
        shop (Defend / Attack / Boost, shortcuts, Shift+N sells), feed
12. [x] **Results + leaderboard**: Postgres via Drizzle (Docker, port 5433),
        completed matches saved with replays, match points, 1v1 / 2v2 boards
        pushed live, place shown on the final screen; memory fallback without a DB
13. [x] **Projector pages** (staff): `/live` — sidebar of every match, the
        featured one big in its theme, 10s rotation, click to show, pin;
        `/leaderboard` — 1v1 / 2v2 top 10 (new entries flash) and awards
13a. [x] **Briefing** before round 1: every item in the theme's words with
        counters; starts when all press Continue, 60s cap
13b. [x] **Control panel** `/admin` (passcode, rate-limited; "Staff" link on
        Home): rooms (end), leaderboard (hide / unhide, reset), links to /live
        and /leaderboard; players see only their own place; name filter (incl.
        common Hindi abuse) on player and team names
14. [x] **Themes**: Nasdaq, FanCode, Miniclip, BookMyShow — vote cards with
        logos, accent colour, words (visitors, alerts, round lines), a music
        style each. Later: ChronoNexia "split timeline" framing
15. [ ] **The reveal**: "what you actually built" cards
16. [ ] **Deploy** to Render; test from a lab PC (firewall)
17. [~] **Juice**: sound done — effects for every action and event, a
        signature sound per attack, attack-ready ping, heartbeat when
        critical, last-10s clock, live-round music bed that speeds up at the
        end (M mutes, N music). Attack and crash animations still to do
18. [ ] **Playtest with non-technical students**; tune; fix
19. [ ] **Rehearsal + freeze**: full mock event, laptop fallback, bug fixes only

Later, if time: play vs bot · 1v2 with a handicap · spectator view · `/admin`.

## Cut order if behind

1. Sound
2. Slow their servers or Knock out their splitter (keep seven attacks)
3. Fourth theme
4. Fun awards
5. Detailed reveal cards → one static card

**Never cut:** rooms + ready, at least four attacks with counters, the shop
during live rounds, 3 rounds, saving results, the leaderboard, the big screen,
crash/reboot.
