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
| Capacity per server | 30 people/sec | |
| Server boot time | 2s | shows "starting…" |
| Servers min / max | 1 / 40 | 40 is a safety limit |
| Health target | 0 at ≤40% served, 100 at ≥95% | closes 60% of the gap per second |
| Critical / recovered | below 25 / back above 60 | alerts |
| Crash | health ≤ 1 → 8s down, reboot at 30 | |
| Lost penalty | 1 per person turned away | |

### Duel values (first pass — `server/src/sim/items.ts`, `config.ts`, `scenario.ts`)

| Knob | Value |
| --- | --- |
| Rounds | 1:30 / 2:00 / 2:00; 4 servers and 500 coins each; crowd 100/s growing 15–35% with natural rushes |
| Income | 0.12 coins per visitor served (≈ 12/s at normal traffic); +25% when trailing by > 15% |
| Database / shelf | 150 visitors/s, +120 per Backup database; a warm shelf answers 60%, warms in 8s |
| Bouncer | stops 85% of bots, wrongly turns away 3% of real people |
| Traffic splitter | without it, servers beyond 4 work at 60% |
| Setup | servers 2s, other defences 4s (instant in the buy phase) |
| Attacks | 3s warning · regroup 5s after any attack · +25% per repeat in a round |
| Sell refund | 50% |

| Item | Price | Upkeep / cooldown | Effect |
| --- | ---: | --- | --- |
| Server | 60 | 1/s | +30 visitors/s |
| Traffic splitter | 220 | 2/s | all servers at 100% |
| Bouncer | 200 | 2/s | see above |
| Fast shelf | 200 | 2/s | see above |
| Backup database (max 2) | 200 | 2/s | +120 visitors/s at the database |
| Second route | 180 | 1.5/s | a cut route lasts 1s instead of 6s |
| Emergency repair | 220 | 15s | +35 health |
| Shield | 180 | 10s | blocks the next attack within 15s |
| Overclock | 160 | 20s | servers ×1.6 for 10s |
| Instant backup | 160 | 10s | melted servers back |
| Crowd surge | 220 | 12s | their crowd ×1.7 for 10s |
| Bot army | 240 | 15s | bots = 1× their crowd for 12s |
| Cut a route | 260 | 18s | offline 6s (1s with a second route) |
| Slow their database | 220 | 15s | database ×0.5 for 12s |
| Server meltdown | 280 | 20s | 40% of their servers melt for 12s |
| Flush their shelf | 160 | 12s | shelf cold for 6s, then re-warms |

Match points: total + 0.5 × opponent total + 2,000 for a win.

## Bot results

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
| | | | |
