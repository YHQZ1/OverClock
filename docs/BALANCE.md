# Balance

Tuning notes, bot results and playtest findings. **Real playtests win over
bots.** Rules live in `server/src/sim/config.ts`; round content in
`server/src/sim/scenario.ts`.

## How we balance

Bots play thousands of matches in seconds
(`pnpm --filter @overclock/server balance`). For the duel, bots play **against
each other** in every pairing.

| Bot | Plays like | Must… |
| --- | --- | --- |
| `idle` | never presses anything | lose to everyone, crash |
| `turtle` | only defends, never attacks | lose to balanced play |
| `rusher` | spends everything on attacks | lose to balanced play (goes broke) |
| `balanced` | defends to stay healthy, attacks with the surplus | win most pairings — the upper bound |
| `human (fast/slow)` | only uses what the screen shows, with reaction delay | not crash in round 1 against `idle` |

### Invariants (enforced as tests)

- The "must" column above.
- **Every attack has a counter that measurably helps** (same match with and
  without the counter).
- **An attack costs about what its counter costs** (within a band).
- **Comeback works:** the trailing team's win rate isn't near zero after a
  bad first round.
- **Symmetry:** mirror matches (same bot both sides) end within a few % — no
  side advantage.
- **Leaderboard fairness:** match points rank bots by skill regardless of
  which bot they faced.
- **Themes and round variants** score within a few % of each other.

## Current values

### Site rules (`server/src/sim/config.ts`)

| Knob | Value | Notes |
| --- | --- | --- |
| Tick rate | 10/sec | |
| Capacity per server | 30 people/sec | the only capacity limit — what the servers can't take gives up |
| Server boot time | 2s | shows "starting…" |
| Servers | 4 at the start, max 12 | each extra costs 20 more than the last |
| Health target | 0 at ≤40% served, 100 at ≥95% | closes 60% of the gap per second |
| Critical / recovered | below 25 / back above 60 | alerts |
| Crash | health ≤ 1 → 8s down, reboot at 30 | |
| Lost penalty | 1 per person turned away | |

### Duel values (redesign, 2026-10-10 — `server/src/sim/items.ts`, `config.ts`, `scenario.ts`)

| Knob | Value |
| --- | --- |
| Rounds | 1:30 / 2:00 / 2:00; 4 servers and 500 coins each; crowd 100/s growing 15–35% with natural rushes |
| Income | 0.11 coins per visitor served (≈ 11/s at normal traffic, no upkeep to subtract); +25% when trailing by > 15% |
| Bouncer | stops 85% of bots, wrongly turns away 3% of real people |
| Setup | servers 2s, other defences 4s (instant in the buy phase) |
| Attacks | 3s warning · regroup 5s after any attack · +25% per repeat of the same attack · +8% to all attacks per attack sent (each round) |
| Upkeep, selling | none — each extra server costs more (60, 80, 100…), max 12 |

| Card | Price | Cooldown | Effect |
| --- | ---: | --- | --- |
| Server | 60 + 20 per extra | — | +30 visitors/s |
| Bouncer | 200 | — | see above |
| Verified link | 160 | — | Steal visitors lasts 1s |
| Emergency repair | 220 | 15s | +35 health |
| Shield | 180 | 10s | blocks the next attack within 15s |
| Overclock | 160 | 20s | servers ×1.6 for 10s |
| Instant backup | 160 | 10s | wrecked servers back |
| Crowd surge | 220 | 12s | their crowd ×1.8 for 10s |
| Bot army | 240 | 15s | bots = 0.9× their crowd for 12s |
| Wreck servers | 280 | 18s | 2 servers wrecked for 10s |
| Steal visitors | 240 | 18s | 50% of their visitors go to you for 10s (1s if their link is verified) |
| Freeze their controls | 240 | 20s | their cards frozen for 5s |

Match points: total + 0.5 × opponent total + 2,000 for a win.

## Bot results

### 2026-10-10 · The redesign (12 cards, no upkeep / selling, servers-only) · 40 seeds per pairing

Win rate of row vs column (a mirror match is an exact draw, so it shows 0%).

| | idle | turtle | rusher | balanced | humanFast | humanSlow |
|---|---:|---:|---:|---:|---:|---:|
| **idle** | 0% | 0% | 0% | 0% | 0% | 0% |
| **turtle** | 100% | 0% | 100% | 28% | 68% | 98% |
| **rusher** | 100% | 0% | 0% | 0% | 0% | 0% |
| **balanced** | 100% | 73% | 100% | 0% | 83% | 98% |
| **humanFast** | 100% | 33% | 100% | 18% | 0% | 98% |
| **humanSlow** | 100% | 3% | 100% | 3% | 3% | 0% |

Overall win rate vs others: idle 0% · turtle 79% · rusher 20% · balanced 91% ·
humanFast 70% · humanSlow 42%. Idle crashes 0.14× a match and scores ~72% of
the best — doing nothing still loses to everyone, but the gap is thin.

What the bots told us, and what we did:

- **First pass (old numbers, new rules):** balanced won 93% and the rusher fell
  to 20% (a defender can now answer all five attacks). Pure defence beat anyone
  who attacked less than perfectly.
- **Sweep of one "attack power" dial** (strengths ×1.0 → 1.2, prices ×0.85 → 1):
  results are cliff-like because bots are deterministic — pairings flip 0% ↔
  100%. Too weak → balanced dominates; too strong or cheap → the turtle beats
  everyone. Chose the middle: **Crowd surge ×1.7 → 1.8, Bot army 0.8 → 0.9,
  Steal visitors 0.45 → 0.5**, income 0.15 → 0.11 (nothing drains it now).
- **Bots:** each now answers an announced attack once, whenever it next acts
  (before it had to act on exactly the 2.0s tick, so slow bots missed
  counters by accident).
- **Test change:** "no strategy dominates" is now measured against opponents
  that defend. The rusher never defends, so it loses to everyone and wins
  against none — counting it made any competent strategy look dominant.
- **To watch in playtest 2:** the balanced bot (perfect reactions) at ~91% is the
  upper bound, but turtle ≥ humanFast means a prepared defender beats a
  human-speed attacker 2 times in 3. If real players find attacks don't pay,
  lower attack prices (~10%) first; if one defender sits back and wins,
  raise Bouncer / Verified link or give them a duration.

### 2026-10-05 · Income 0.12 → 0.15 per visitor · 40 seeds per pairing

Playtest feedback: coins came too late — after the buy phase the next attack
took 30–40s of saving, so most of a round was waiting. Compared:

| Income | Kept / sec after upkeep | Rusher (spam) | Balanced | Turtle |
| --- | --- | ---: | ---: | ---: |
| 0.12 (old) | ~6–8 | 68% | 74% | 24% |
| **0.15 (chosen)** | ~9–11 | 69% | 82% | 40% |
| 0.18 | ~11–14 | 33% | 90% | 40% |

Chose 0.15 with the user: a moderate step (an attack every ~25s), keeping
money a real constraint. 0.18 punished spam harder — the next lever if
playtests show spam winning. Starting coins (500 → 600) held back until a
playtest says it's needed. The HUD shows a "+N" pop beside the coins every
second, so income is felt.

### 2026-10-04 · New attack roster (9 attacks) · 40 seeds per pairing

Overall win rate vs others: idle 0% · turtle 24% · rusher 68% · balanced 74% ·
humanFast 54% · humanSlow 82%. Before the fix the rusher won 93% (9 attacks meant
one was always off cooldown and uncountered) — added the +8% attack fatigue and
toned down Destroy servers, Bot army and Slow their servers.

### 2026-10-04 · Duel, 3 rounds · 40 seeds per pairing

Win rate of row vs column (a mirror match is an exact draw, so it shows 0%).

| | idle | turtle | rusher | balanced | humanFast | humanSlow |
|---|---:|---:|---:|---:|---:|---:|
| **idle** | 0% | 0% | 0% | 0% | 0% | 0% |
| **turtle** | 100% | 0% | 10% | 68% | 13% | 10% |
| **rusher** | 100% | 90% | 0% | 80% | 83% | 0% |
| **balanced** | 100% | 33% | 20% | 0% | 88% | 63% |
| **humanFast** | 100% | 88% | 18% | 13% | 0% | 73% |
| **humanSlow** | 100% | 90% | 100% | 38% | 28% | 0% |

Overall win rate vs others: idle 0% · turtle 40% · rusher 71% · balanced 61% ·
humanFast 58% · humanSlow 71%. No strategy dominates; pure defence is weakest.

How we got here (each step from the bots): instant counters → defence-only won
96% (added setup time + buy phase); no anti-spam → all-attack won 98% (added
regroup + repeat price); counters that only half-worked → attack won (tuned
strengths so each counter mostly cancels its attack). Rusher at 71% is the
thing to watch in playtests.

### 2026-10-04 · Co-op Round 1 (superseded engine) · 200 seeds per bot

Kept for reference — how the single-site loop behaved before the duel.

| Bot | Avg score | vs best | Crashes | Peak servers |
| --- | ---: | ---: | ---: | ---: |
| idle | 10,067 | 58% | 1.00 | 4 |
| spam | −1,729 | −10% | 0 | 40 |
| stingy | 5,269 | 30% | 2.00 | 4 |
| sensible | 17,432 | 100% | 0 | 13.2 |
| humanFast (0.5s) | 16,974 | 97% | 0 | 13.4 |
| humanSlow (1.5s) | 16,001 | 92% | 0 | 14.4 |

Tuning that came out of it: health response 0.35 → 0.6/s (idle never
crashed), round budget 4,500 → 6,000 (even the ideal bot overspent), lost
penalty 0.5 → 1 (idle scored 71% of best).

## Playtest log

| Date | Who | What we learned | Change made |
| --- | --- | --- | --- |
| 2026-10-10 | Tech-club juniors, at college (observed) | Took ~2 rounds to understand how it works; too much on screen with too little time to decide; the one-screen briefing was too much text and its 60s timer felt pressuring; nobody saw which theme won the vote; Nasdaq / FanCode / Miniclip unfamiliar; still felt technical; UI lifeless and samey. Asked for a bot match to watch first | The redesign (docs/PLAN.md → Redesign queue): 12 cards, no upkeep / selling, servers-only capacity, new themes, theme reveal, 5-step briefing + demo match, the arena. The values above predate it and change with redesign item 1 |
