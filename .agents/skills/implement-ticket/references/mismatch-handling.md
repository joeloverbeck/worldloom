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
- internally contradictory acceptance or invariant wording when the truthful correction is narrower and already dictated by another accepted ticket boundary, such as preserving top-level `additionalProperties: true` while removing a field from `required[]` / `properties`

Record these in `Assumption Reassessment`.

## Stop and escalate with 1-3-1

Use a short 1 problem / 3 options / 1 recommendation escalation when:

- the ticket's owned boundary changed materially
- the draft wants behavior that conflicts with `docs/FOUNDATIONS.md`
- reassessment exposes a broader adjacent contradiction
- the ticket should split into follow-up work
- the authored proof surface is no longer honest and multiple replacements are plausible

Do not silently weaken or broaden the ticket.

## Same-seam widening examples

Use these examples to keep top-level routing compact while still making escalation boundaries concrete:

- same-seam / no escalation: a CLI ticket also needs the missing parser/helper module that the CLI path cannot function without.
- boundary growth / escalate: a CLI ticket appears to require MCP wiring, hook orchestration, or a sibling validator/spec family that the active ticket did not already own.

## Narrowing rules

When reassessment shows substrate is already live:

- narrow the ticket to the remaining delta
- update `Problem`, `What to Change`, `Files to Touch`, `Acceptance Criteria`, and `Test Plan`
- close it as validation-only or doc-only if no code/tool change remains

When reassessment disproves the premise entirely:

- mark the ticket with a truthful terminal status
- record the reason
- create or name a follow-up owner only if real work remains
