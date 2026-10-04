# Event Runbook — SymbiTech

What to do on event day. Fill in the blanks during the rehearsal.

## The day before

- [ ] Render web service on a **paid** plan (free instances sleep and can restart)
- [ ] Exactly **one** instance; auto-deploy **off**
- [ ] Database reachable; results export tested
- [ ] Laptop fallback tested from a lab PC (see below)
- [ ] Projector browser tested full screen on `/screen`
- [ ] Lab PCs: browser opens `/play`; fullscreen works; keyboard shortcuts work

## Setup at the venue

1. Open `/screen` on the projector machine, full screen.
2. On every lab PC: open `/play`, full screen, so players can just sit down.
3. Seat PCs in **pairs** (1v1) and **blocks of four** (2v2) — teams should
   be next to each other, opponents within shouting distance.
4. Check one PC can create a room and another can join it (firewall check).

## Running a match

Players run it themselves:

1. One player clicks **Create a room** → gets a 4-letter code.
2. Everyone else clicks **Join a room** → types the code.
3. Each player picks a **slot** (1–2 = Team 1, 3–4 = Team 2) and presses
   **Ready**. The match starts when everyone is ready (2 players = 1v1,
   4 players = 2v2).
4. Everyone **votes for a theme** (10 seconds).
5. Three rounds: short buy phase, then live. Shop is open the whole time.
6. Final screen: winner and scores; the leaderboard updates on its own.
7. Players click **Done — next players**; the PC is ready for the next group.

Organizer's job: point groups to free PCs, explain the one-line pitch
("Flood their site. Keep yours alive."), and help anyone stuck.

**Three people show up?** Two play a 1v1, the winner faces the third. (Or two
of them wait for a fourth to make a 2v2.)

## Rules during the event

- **Never redeploy while anyone is playing** — a restart ends every live match.
- A refreshed or dropped PC rejoins its match automatically (same browser tab).

## If something breaks

| Problem | Do this |
| --- | --- |
| A player can't connect | Refresh; re-enter the code. Check the college firewall. |
| A room won't start | Check everyone pressed Ready and the sides are 1v1 or 2v2. |
| One match misbehaves | Have them make a new room and start again (until `/admin` exists). |
| Server down / everything frozen | Check the Render dashboard and logs. Live matches are lost; saved results are safe. |
| Internet down | Switch to the laptop fallback. |
| Leaderboard looks wrong | Export results from the database; fix after the event. |

## Laptop fallback

_To be written before the rehearsal:_ start Postgres + server via Docker on a
laptop the lab PCs can reach, then open `http://<laptop-ip>:3000/play` on each PC.

## After the event

- [ ] Export all results (JSON/CSV) — from the database until `/admin` exists
- [ ] Downgrade the Render plan
