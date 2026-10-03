# Balance

Tuning notes, bot results and playtest findings. Real playtests win over bots.

## How we balance

Bots play thousands of matches in seconds (`pnpm --filter @overclock/server balance`):

| Bot | Plays like | Must… |
|---|---|---|
| `idle` | never presses anything | crash and score far lower |
| `spam` | presses + SERVERS constantly | lose to attentive play (wastes budget) |
| `stingy` | never adds servers, banks the budget | lose to attentive play (loses fans) |
| `sensible` | reads hidden metrics, near-ideal | never crash — the upper bound |
| `human (fast/slow)` | only uses what the UI shows, with reaction delay | not crash in Round 1 |

Invariants (enforced as tests): the "must" column above; every disaster has a
counter that measurably helps; round variants score within a few % of each other.

## Current values

Rules live in `server/src/sim/config.ts`; round content in `server/src/sim/scenario.ts`.

| Knob | Value | Notes |
|---|---|---|
| Tick rate | 10/sec | |
| Capacity per server | 30 people/sec | |
| Server cost | 6 budget/sec per running *or booting* server | A busy server earns ~5× its cost |
| Server boot time | 2s | Show "booting…" |
| + SERVERS cooldown | 1s | – SERVER has none; it cancels a booting server first |
| Servers min / max | 1 / 40 | 40 is a technical safety limit, not a gameplay cap |
| Health target | 0 at ≤40% served, 100 at ≥95% | Closes 60% of the gap per second (was 0.35 — too slow, idle never crashed) |
| Critical / recovered | below 25 / back above 60 | Alerts |
| Crash | health ≤ 1 → 8s down, reboot at 30 | While down: nobody served, buttons locked, servers still cost |
| Lost penalty | 1 point per person lost | Was 0.5 — idle scored 71% of best |
| Budget → points | 1 : 1, can be negative | + SERVERS locks at budget ≤ 0; running servers keep draining |

**Round 1** (`ROUND_1`): 120s · 4 servers · budget 6,000 (was 4,500 — even the ideal bot overspent) ·
100 people/sec rising 10% · gentle ±6% waves (20s) · ±5% noise ·
Rush Hour ×2.5 at ~25s for 15s and ×3 at ~75s for 18s (4s ramps, ±3s seeded jitter).

Prototype finding: with free servers, the spam bot beat every other bot.
A per-server running cost fixed it — the budget does the same, visibly.

## Bot results

### 2026-10-04 · Round 1 · 200 seeds per bot

| Bot | Avg score | vs best | Served | Lost | Budget left | Crashes | Peak servers |
|---|---:|---:|---:|---:|---:|---:|---:|
| idle | 10,067 | 58% | 12,119 | 5,172 | 3,120 | 1.00 | 4 |
| spam | −1,729 | −10% | 17,291 | 0 | −19,020 | 0 | 40 |
| stingy | 5,269 | 30% | 9,360 | 7,931 | 3,840 | 2.00 | 4 |
| sensible | 17,432 | 100% | 16,675 | 616 | 1,373 | 0 | 13.2 |
| humanFast (0.5s) | 16,974 | 97% | 16,431 | 860 | 1,403 | 0 | 13.4 |
| humanSlow (1.5s) | 16,001 | 92% | 15,853 | 1,438 | 1,587 | 0 | 14.4 |

All invariants hold (`server/src/sim/balance.test.ts`). Note the skill gap between
attentive play and the ideal is small in Round 1 — intended for "Learn"; later
rounds should widen it.

## Playtest log

| Date | Who | What we learned | Change made |
|---|---|---|---|
| | | | |
