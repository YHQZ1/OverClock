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

## Current values (single site — carried over from the co-op engine)

| Knob | Value | Notes |
| --- | --- | --- |
| Tick rate | 10/sec | |
| Capacity per server | 30 people/sec | |
| Server running cost | 6/sec per running *or starting* server | becomes coin upkeep in the duel |
| Server boot time | 2s | shows "starting…" |
| + Server cooldown | 1s | |
| Servers min / max | 1 / 40 | 40 is a safety limit |
| Health target | 0 at ≤40% served, 100 at ≥95% | closes 60% of the gap per second |
| Critical / recovered | below 25 / back above 60 | alerts |
| Crash | health ≤ 1 → 8s down, reboot at 30 | |
| Lost penalty | 1 per person turned away | |

**Duel values — to be set:** starting coins, income per visitor, prices and
upkeep of every defence, attack strength / duration / cooldown / warning,
utility effects, comeback bonus, sell refund, round lengths, match-point
weights.

## Bot results

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
