# Event Runbook

What to do on event day. Fill in the blanks during the rehearsal.

## The day before

- [ ] Render web service on a **paid** plan (free sleeps and can restart)
- [ ] Exactly **one** instance; auto-deploy **off**
- [ ] Database reachable; results export tested
- [ ] Local fallback tested from a lab PC (see below)
- [ ] Projector browser tested at full screen on `/screen`

## Setup at the venue

1. Open `/screen` on the projector machine, full screen.
2. On every lab PC: open `/play` in the browser (fullscreen) so teams just sit down.
3. Confirm one lab PC can create a team and reach the lobby (firewall check).

## Running a team

Teams run themselves:

1. One player clicks **Create team** → gets a **team code**.
2. Teammates (neighbouring PCs) click **Join** → enter the code.
3. Host clicks **START** when everyone is in.
4. Session ends → score lands on the leaderboard automatically.
5. Players click **Done — next team**; the PC is ready for the next team.

Organizer's job: seat teams at neighbouring PCs and help anyone stuck.

## Rules during the event

- **Never redeploy while any team is playing** — a restart ends every live match.
- If a player's PC drops, their buttons move to teammates automatically;
  refreshing the page rejoins the team.

## If something breaks

| Problem | Do this |
|---|---|
| A player can't connect | Refresh; re-enter the code. Check the college firewall. |
| One team's match misbehaves | Have them create a new team and start again (until `/admin` exists). |
| Server down / all matches frozen | Check Render dashboard/logs. Matches in progress are lost; scores already saved are safe. |
| Internet down | Switch to the local fallback. |
| Leaderboard wrong | Export results from the database; fix after the event. |

## Laptop fallback

_To be written before the rehearsal:_ start Postgres + server via Docker on a
machine the lab PCs can reach, then open `http://<machine-ip>:3000/play` on each PC.

## After the event

- [ ] Export all results (JSON/CSV) — from the database until `/admin` exists
- [ ] Downgrade the Render plan
