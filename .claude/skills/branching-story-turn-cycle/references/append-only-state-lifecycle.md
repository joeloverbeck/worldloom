# Append-Only State Lifecycle

## Overview

Story-bundle `_source/<class>/*.yaml` records are append-only at the filesystem
level. Lifecycle transitions for `CLK`, `STSEC`, and `STQ` are authored as
create-new plus `supersedes: <prior_id>`, not as edits to the prior record.
This preserves FOUNDATIONS §Story Bundles §8 and keeps `SE.state_delta`
expressed as creates / supersessions / closes.

## Active Records Consequence

Supersession is reflected in `PG.state_snapshot.active_records` per shared
contract §4.2a `replayActiveRecords` (`parent.active_records + state_delta.create
− state_delta.supersede − state_delta.close`): the new record id is ADDED to the
relevant class list AND the prior record id is DROPPED. The lineage from prior
to new lives only in the new record's `supersedes:<prior-id>` body field; the
`active_records` list itself reflects post-event state, not a transition window.
This convention applies uniformly to every class that participates in
`state_delta` (STENT / STCHAR / STSTAT / STINT / SF / BEL / OBL / CNSQ / THR /
CLK / STSEC / STQ / STPLAN / STEMO / SREL / STLOC / STOBJ / DA), not only the
CLK / STSEC / STQ classes whose lifecycle is described below.

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

## Closed Enums Quick Reference

The lifecycle-managed classes carry closed enums for `status` / `plan_status` /
`affect_kind` / `behavioral_pressure` / `intensity` / `agency_effect`.
Validators (`record_schema_compliance`, `stemo_enum_compliance`,
`state_snapshot_integrity`) reject any value outside the closed set, and the
**active set** (records lawful in `PG.state_snapshot.active_records[<class>]`)
is narrower than the full status enum. Use this table at draft time so a typo
or invented verb does not surface as a validator failure at submit.

Schema source of truth lives at `tools/validators/src/schemas/story-*.schema.json`;
this table is a copy maintained at the same revision and must stay in sync.

### STEMO

- `status`: `active` | `suppressed` | `settled` | `transformed` | `dissociated`
  - **active set**: `active`, `suppressed`, `dissociated`
- `affect_kind` (18, required unless `status: dissociated`):
  `fear` | `anxiety` | `anger` | `disgust` | `grief` | `shame` | `guilt` |
  `humiliation` | `hope` | `relief` | `joy` | `awe` | `tenderness` | `desire` |
  `envy` | `contempt` | `confusion` | `dread`. Set to `null` only when
  `status: dissociated`. `surprise` is intentionally NOT in the enum (surface
  it at the event/appraisal layer); `numbness` is `status: dissociated` plus
  `affect_kind: null`.
- `behavioral_pressure` (18, required non-empty unless `status: dissociated`):
  `approach` | `flee` | `freeze` | `attack` | `reject` | `dominate` | `submit` |
  `seek_contact` | `protect_other` | `seek_help` | `confess` | `conceal` |
  `withdraw_socially` | `plan` | `accommodate` | `self_soothe` | `ruminate` |
  `collapse`. Common author trap: there is no `communicate`, no `engage`, no
  `comfort`, no `reach_out` — `seek_contact` is the relational-engagement
  pressure; `protect_other` is the protective-action pressure.
- `intensity`: `low` | `medium` | `high` | `extreme` (required when
  `affect_kind != null`).
- `agency_effect`: `none` | `constraining`. `constraining` triggers Rule 1 /
  Rule 5 downstream-artifact coverage per phase-4-5 guidance.

### CLK

- `status`: `active` | `paused` | `resolved` | `fired` | `abandoned` |
  `superseded`
  - **active set**: `active`, `paused`, `fired`
  - Semantic guidance: use `paused` when the driving condition ended without
    a threshold firing (clock could resume if the condition returns); use
    `resolved` when the clock concluded through threshold-fire payoff or
    canonical closure; use `abandoned` when the clock is given up unresolved.

### STSEC

- `status`: `hidden` | `partially_revealed` | `revealed` | `disproven` |
  `abandoned`
  - **active set**: `hidden`, `partially_revealed`
- `clue_carriers[].status`: `available` | `discovered` | `destroyed` |
  `suppressed` | `superseded`

### STQ

- `status`: `open` | `complicated` | `answered` | `paid_off` | `abandoned` |
  `inherited` | `superseded`
  - **active set**: `open`, `complicated`
  - Partial answer + newly-introduced complexity → `complicated`, not
    `answered` (`answered` requires the question to be fully closed).

### STPLAN

- `plan_status`: `active` | `blocked` | `suspended` | `fulfilled` | `failed` |
  `abandoned` | `revised`
  - **active set**: `active`, `blocked`, `suspended`, `revised`

### Inactive-status supersession pattern

When a supersession sets the new record to an inactive-set status (e.g.,
`CLK status: resolved`, `STQ status: answered`, `STSEC status: revealed`,
`STPLAN plan_status: fulfilled`, `STEMO status: settled`), the new record is
EXCLUDED from `PG.state_snapshot.active_records[<class>]`. Both
`state_snapshot_integrity` and `snapshot_replay_equality` consult lifecycle
status when computing the expected active set, so authoring an inactive-status
successor and omitting it from `active_records[<class>]` is the canonical
pattern — no special routing or workaround is required.

## Cross-References

- `docs/FOUNDATIONS.md` §Story Bundles §8: story-bundle atomic records remain
  append-only at the filesystem level.
- `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.14 (CLK),
  §4.5.15 (STSEC), §4.5.16 (STQ), §4.5.17 (STPLAN), §4.5.18 (STEMO): canonical
  field-list and enum definitions; this reference's quick-table mirrors them.
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`:
  phase-local lifecycle and belief propagation guidance.
- `archive/tickets/SPEC44STOSTAAPP-003.md`: structural enforcement through
  `no_story_state_in_place_mutation`.
