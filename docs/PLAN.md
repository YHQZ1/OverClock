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

## Redesign queue (after playtest 1, 2026-10-10) — do these first

Playtest 1 with tech-club juniors: too slow to learn (two rounds gone before
it clicked), too much on screen, themes unfamiliar, still too technical, and
the UI felt lifeless. Design in docs/GAME.md; reasons in DECISIONS.md. Event
is **Fri 16 Oct**. In order; each ends playable and tested (update
ARCHITECTURE.md as code lands).

1. [x] **12 cards, simpler economy** (Sat 10–Sun 11): drop the 8 cut items
       (engine, validators, shop, bots); traffic splitter always on;
       database / fast shelf out of play — servers are the only capacity
       limit; no upkeep, no selling; each extra server costs more, with a
       max; Destroy servers → Wreck servers, Wrong Turn → Steal visitors,
       Jam → Freeze their controls; new keys (1–3, Q–R, A–G); retune with the
       bots and update the balance tests and BALANCE.md
2. [x] **New themes** (Sun 11): BookMyShow, Netflix, Spotify, Google Pay —
       words, card names, round lines, accents, music styles, logos; vote
       cards as app icons
3. [x] **Theme reveal** (3s) + **briefing in 5 steps** (How to play →
       Attacks → Defences → Boosts → Demo), player-paced, no visible timer,
       hidden 3-min cap, "Waiting for…", staff skip in `/admin` (Sun 11)
4. [x] **The arena** (Mon 12): both sites side by side, queues, buildings per
       theme, defences shown on the building, attacks flying across, shield /
       overclock / wreck / steal / freeze / crash animations, top bar with
       tug-of-war, card hand, floating alerts with the key to press,
       full-width banners; flat poster look (Barlow Condensed, no cards).
       Replaces the live map, Tab switching, feed, timelines and mini map
5. [x] **Demo match** (Tue 13 morning): scripted action log through the real
       engine → recorded timeline → played in the arena with captions;
       Enter skips
6. [x] **Reveal + staff pages** (Tue 13 morning): reveal decodes the 12 cards
       and the new themes; `/live` shows the arena
7. [ ] **Playtest 2 with the juniors** (Tue 13 evening) → log in BALANCE.md
8. [ ] **Fixes from playtest 2** (Wed 14)
9. [ ] **Lab setup + rehearsal + freeze** (Thu 15) — see items 16 and 19

Done in one go on Sat 10 — queue items 1–6 above. Notes for playtest 2:
Netflix, Spotify and Google Pay have no logo files yet (the vote cards show the
name on the app-icon tile; drop transparent PNGs in `web/public/themes/` to
replace it). The demo is recorded from the engine — re-record it with
`pnpm --filter @overclock/server demo` after any rule change (a test fails if
it drifts).

**Visual redesign (Sat 10 Oct, after mocks approved in `docs/mocks/`):** new
look ported to React — tokens + Barlow Condensed (self-hosted), vote poster
wall + theme takeover, landing, the server-room arena with five attack
animations, card hand, scoreboard, restyled room / round result / final /
reveal / staff pages (sign-in, `/admin`, `/live`, `/leaderboard`) — every
screen is now in the poster language; typecheck, unit, integration and all 9
e2e green. To test next: a full match on lab-size screens, the demo step,
`/live` on the projector.

**Club look (Sat 10 Oct):** every outer page — landing, room, `/live`,
`/leaderboard`, `/admin`, sign-in — is soft black with GDSC's four colours as
small accents, the club logo top-left (and as the tab icon) and the club
footer. The default accent is now paper, so nothing falls back to violet;
in-match screens still take the app's colour.

If time: the demo looping on Home and `/live` between matches.

## Build queue (duel)

In order. Each item ends playable and tested. Items touched by the redesign
are noted; the redesign queue above wins where they differ.

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
        counters; starts when all press Continue, 60s cap *(being replaced by
        the 5-step briefing — redesign 3)*
13b. [x] **Control panel** `/admin` (passcode, rate-limited; "Staff" link on
        Home): rooms (end), leaderboard (hide / unhide, reset), links to /live
        and /leaderboard; players see only their own place; name filter (incl.
        common Hindi abuse) on player and team names
14. [x] **Themes**: Nasdaq, FanCode, Miniclip, BookMyShow — vote cards with
        logos, accent colour, words (visitors, alerts, round lines), a music
        style each. Later: ChronoNexia "split timeline" framing
15. [x] **The reveal**: "What you actually built" after the final (8s or
        Enter) — story, the site with real names, all 20 items decoded with
        real products / incidents (what the team used highlighted), apps to
        build next; Enter → Home
16. [ ] **Deploy** to Render; test from a lab PC (firewall)
17. [~] **Juice**: sound done — effects for every action and event, a
        signature sound per attack, attack-ready ping, heartbeat when
        critical, last-10s clock, live-round music bed that speeds up at the
        end (M mutes, N music). Map rebuilt as a real map: the theme's
        geography (world / India land dots, real cities, traffic arcs) feeding
        a data centre seen from above; animations for incoming attacks, hits,
        wrecked racks, botnets, Wrong Turn, shield, slowed racks, crashes
        *(the map is being replaced by the arena — redesign 4)*
18. [~] **Playtest with non-technical students**; tune; fix — playtest 1
        done 2026-10-10 (led to the redesign); playtest 2 is redesign 7
19. [ ] **Rehearsal + freeze**: full mock event, laptop fallback, bug fixes only

Later, if time: play vs bot · 1v2 with a handicap · spectator view · `/admin`.

## Cut order if behind

1. Demo looping on Home / `/live`
2. Per-theme buildings → one building shape, themed by colour and logo
3. Fourth theme
4. Fun awards
5. Detailed reveal cards → one static card
6. Arena animations beyond warning → hit → relief (keep those)

**Never cut:** rooms + ready, the 5 attacks with counters, the card hand
during live rounds, both sites on one screen, the briefing steps and the demo,
3 rounds, saving results, the leaderboard, the big screen, crash/reboot.
