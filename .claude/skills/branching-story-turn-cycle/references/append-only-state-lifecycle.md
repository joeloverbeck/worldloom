# Append-Only State Lifecycle

## Overview

Story-bundle `_source/<class>/*.yaml` records are append-only at the filesystem
level. Lifecycle transitions for `CLK`, `STSEC`, and `STQ` are authored as
create-new plus `supersedes: <prior_id>`, not as edits to the prior record.
This preserves FOUNDATIONS §Story Bundles §8 and keeps `SE.state_delta`
expressed as creates / supersessions / closes.

## Op-Naming Clarification

`supersede_clk_record`, `supersede_stsec_record`, and
`supersede_stq_record` route through the same story-record create path as the
plain create operations. The operation name describes intent: the new record
supersedes a prior record. The mechanism is a fresh file such as
`CLK-<N+1>.yaml`, `STSEC-<N+1>.yaml`, or `STQ-<N+1>.yaml` whose body carries
`supersedes: <prior_id>`.

The patch-engine definitions live in
`tools/patch-engine/src/ops/create-story-record.ts` under
`STORY_RECORD_SPECS`; commit staging routes those operations to
`stageCreateStoryRecord` in `tools/patch-engine/src/commit/temp-file.ts`.
The structural backstop is `no_story_state_in_place_mutation`, landed in
`archive/tickets/SPEC44STOSTAAPP-003.md`.

## CLK Lifecycle Authoring

To tick a clock, create `CLK-<N+1>` through `supersede_clk_record` with:

- `supersedes: CLK-<N>`
- the updated `value`
- the previous `tick_history[]` plus the new tick entry with event, delta, and
  cause
- any threshold-fire effects materialized in the same `SE.state_delta`

To resolve a clock, create `CLK-<N+1>` with `supersedes: CLK-<N>`,
`status: resolved`, and `resolution_event: SE-<integer>`. Preserve the prior
clock file unchanged.

## STSEC Lifecycle Authoring

To append a clue carrier, create `STSEC-<N+1>` through
`supersede_stsec_record` with `supersedes: STSEC-<N>` and the previous
`clue_carriers[]` plus the new carrier.

To mark a carrier discovered, create `STSEC-<N+1>` with the same carrier set
but the discovered carrier updated to `status: discovered` and populated
`discovered_by[]`.

To reveal a secret, create `STSEC-<N+1>` with `status: revealed`,
`reveal_event: SE-<integer>`, and `reveal_records[]` naming the BEL / SF / DA /
STQ records that carry the revealed truth. Secret reveal still triggers Phase 4
belief and witness propagation.

## STQ Lifecycle Authoring

To answer or pay off a question, create `STQ-<N+1>` through
`supersede_stq_record` with `supersedes: STQ-<N>`, `status: answered` or
`paid_off`, `answer_event: SE-<integer>`, and `answer_records[]` naming the
records that prove the closure.

To abandon a question, create `STQ-<N+1>` with `supersedes: STQ-<N>`,
`status: abandoned`, and a non-empty `abandonment_rationale`.

## Cross-References

- `docs/FOUNDATIONS.md` §Story Bundles §8: story-bundle atomic records remain
  append-only at the filesystem level.
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`:
  phase-local lifecycle and belief propagation guidance.
- `archive/tickets/SPEC44STOSTAAPP-003.md`: structural enforcement through
  `no_story_state_in_place_mutation`.
