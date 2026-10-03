# Plan

Solo build, continuous: finish a milestone → verify → next. No day labels.
Deploy early, playtest early, freeze features before the event.

| # | Milestone | Done when | Status |
|---|---|---|---|
| 0 | **Skeleton + design**: folders, configs, docs | Design agreed and written down | ✅ |
| 1 | **Game engine core** (`server/src/sim`): servers, Rush Hour, ± servers, budget, health, score, timer, crash/reboot, seeded RNG; tests, bots, balance script | Tests pass; idle bot crashes; spam and stingy bots lose to sensible play; same seed + actions ⇒ same result | ✅ Rush Hour + servers only; other disasters in M5 |
| 2 | **Server + team flow**: Express, Socket.IO, create/join/rejoin/leave, lobby, host START, session phases, 10 Hz match loop | Several browser tabs form a team and play the same match; refresh rejoins | ✅ Phases so far: lobby → countdown → playing → final (one round) |
| 3 | **Player UI (basic)**: Home, Lobby, Game screen (health, budget, alert, app map, server rack, buttons + shortcuts), Final | A real person plays a full round on a PC without explanation | 🟨 Home, Lobby, Final done; basic game screen works — needs the real map + alert rhythm |
| 4 | **First deploy** to a hosted URL; try from a lab PC | Reachable and playable outside localhost | ⬜ |
| 5 | **Full app**: database + network stages, all disasters, all buttons, bottleneck highlight | Every disaster has a button that measurably fixes it | ⬜ |
| 6 | **Roles + reconnect polish**: role split, buttons move on disconnect, host handover, shared-PC reset | Pull a PC's network mid-round — the team keeps playing | ⬜ |
| 7 | **Rounds + scenarios**: tutorial (skippable), 3 rounds, breaks, cascades, variant pool, themes | One full session plays end to end in every theme | ⬜ |
| 8 | **Results + leaderboard**: Postgres via Drizzle, save completed sessions, leaderboard API | Completed sessions appear on the leaderboard; abandoned ones don't | ⬜ |
| 9 | **Big screen** `/screen`: leaderboard, now-playing tiles, announcements | Readable from the back of a lab | ⬜ |
| 10 | **Juice**: animations, sound, "what you actually did" cards | Feels like a game, not a dashboard | ⬜ |
| 11 | **Balance + real playtest** with first-years | Success criteria in GAME.md hold | ⬜ |
| 12 | **Rehearsal + freeze**: full mock event, fallback check, bug fixes only | Runs start to finish without dev intervention | ⬜ |

## Later (if time)

- `/admin`: live sessions, abort a broken one, export results

## Cut order if behind

1. Sound
2. Animated fan dots (keep coloured icons)
3. Third theme
4. Interactive tutorial → short scripted demo
5. Detailed reveal cards → one static card

**Never cut:** role split, leaderboard, saving results, big screen, crash/reboot.
