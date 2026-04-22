# Mismatch Handling

If the ticket and the live repo disagree, correct the mismatch before implementation.

For each mismatch, state:

- what the ticket says
- what the repo currently has
- what correction is being applied
- why that correction is safe, or why it needs user input

## Auto-correct without stopping

Apply directly when the correction is mechanical and directionally obvious:

- exact live path for a glob or stale path
- stale skill/tool/doc symbol names
- outdated command examples
- wrong `Files to Touch` list
- wrong `Deps` path when the live active or archived target is unambiguous
- acceptance or verification wording that only needs to match the already-known truthful boundary

Record these in `Assumption Reassessment`.

## Stop and escalate with 1-3-1

Use a short 1 problem / 3 options / 1 recommendation escalation when:

- the ticket's owned boundary changed materially
- the draft wants behavior that conflicts with `docs/FOUNDATIONS.md`
- reassessment exposes a broader adjacent contradiction
- the ticket should split into follow-up work
- the authored proof surface is no longer honest and multiple replacements are plausible

Do not silently weaken or broaden the ticket.

## Narrowing rules

When reassessment shows substrate is already live:

- narrow the ticket to the remaining delta
- update `Problem`, `What to Change`, `Files to Touch`, `Acceptance Criteria`, and `Test Plan`
- close it as validation-only or doc-only if no code/tool change remains

When reassessment disproves the premise entirely:

- mark the ticket with a truthful terminal status
- record the reason
- create or name a follow-up owner only if real work remains
