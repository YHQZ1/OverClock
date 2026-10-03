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

## Starting values (from an earlier prototype — to be re-tuned with the budget)

| Knob | Value | Notes |
|---|---|---|
| Tick rate | 10/sec | |
| Capacity per server | 30 fans/sec | |
| Start servers | 4 | No small fixed cap; high technical safety limit only |
| Server boot time | 2s | Show "booting…" |
| + SERVERS cooldown | 1s | |
| Rush Hour | ×2.5 traffic, ramps in over 4s | Ramp lets players see it building |
| Health target | 0 at ≤40% served, 100 at ≥95% | Eases at 0.35/sec |
| Fans lost penalty | 0.5 per lost fan | |
| Crash | 8s down, reboot at 30% health | |
| Budget, server cost, button prices | TBD | Rule: a busy server must easily pay for itself |

Prototype finding: with free servers, the spam bot beat every other bot.
A per-server running cost fixed it — the budget does the same, visibly.

## Playtest log

| Date | Who | What we learned | Change made |
|---|---|---|---|
| | | | |
