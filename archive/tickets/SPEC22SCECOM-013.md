# SPEC22SCECOM-013: branching-story-page-cycle record-schemas: PG.state_snapshot extension docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-page-cycle/references/record-schemas.md` and truth-syncs SPEC-22 deliverable prose. Documentation-only.
**Deps**: archive/tickets/SPEC22SCECOM-005.md

## Problem

SPEC-22 §Track 4 extends the PG record's `state_snapshot` block with four new fields: `applied_effect_variant` (the variant chosen at archived SPEC-20 §C Phase 4b), `narrative_point_classification` (the Phase 8 classification per the closed enum), `arc_trace_id` (ARCTRACE-NNNN | null), `arc_trace_emitted` (true | false). Without documenting these fields in `branching-story-page-cycle/references/record-schemas.md`, the page-cycle schema docs lag the live validator/runtime contract: `effect_model_replay_safety` consumes `applied_effect_variant`, `narrative_point_classification` consumes `narrative_point_classification` and `arc_trace_id`, and the page-cycle runtime references `arc_trace_emitted` for low-budget ARC_TRACE omission. That is a Rule 1 (No Floating Facts) gap at the schema-documentation layer.

## Assumption Reassessment (2026-05-09)

1. `.claude/skills/branching-story-page-cycle/references/record-schemas.md` exists. The PG record schema has a `state_snapshot` block (verified at SPEC-22 reassessment via partial Read of lines 22-52). `applied_effect_variant` is mentioned in ARC_TRACE context elsewhere; the four new fields are not yet documented in `state_snapshot`.
2. **Cross-skill boundary under audit**: page-cycle's `record-schemas.md` documents the PG record's state_snapshot field surface. Three fields are consumed by validators from 004/005 (`applied_effect_variant`, `narrative_point_classification`, `arc_trace_id`); `arc_trace_emitted` is consumed by page-cycle runtime docs as the low-budget ARC_TRACE omission flag. The boundary is the documented field set; validator/runtime docs assert on these exact field names.
3. **FOUNDATIONS Rule 1 (No Floating Facts)** restated: every documented field must declare scope / prerequisites / limits / consequences. The 4 new fields each carry their own purpose: `applied_effect_variant` records which variant was chosen at arc-close; `narrative_point_classification` records the Phase 8 classification; `arc_trace_id` + `arc_trace_emitted` link to the ARC_TRACE record (or signal the low-budget-mode skip).
4. (HARD-GATE / canon-write ordering): N/A — page-cycle reference docs are meta-tooling.
5. **Schema extension is additive** — 4 new fields in PG.state_snapshot. Existing fields (current_location, entity_status, relationships_current, etc.) preserved.
6. (Rename/removal blast radius): no existing field is renamed or removed; pure addition.
7. **Verification command correction**: the drafted `grep ... tools/validators/src/rules/` command is not executable because `grep` receives a directory. The landed proof uses `rg -n ... tools/validators/src/rules` for the recursive validator field-name cross-check.

## Architecture Check

1. Documenting these fields in page-cycle's record-schemas reference (rather than inline in SKILL.md) follows the existing per-skill reference-doc pattern.
2. No backwards-compatibility shims — page-cycle docs are meta-tooling; existing field documentation preserved.

## Verification Layers

1. `record-schemas.md` documents 4 new fields → grep `applied_effect_variant`, `narrative_point_classification`, `arc_trace_id`, `arc_trace_emitted` in page-cycle/references/.
2. Each field's purpose, type, default value, and emission discipline documented.
3. Validators/runtime references match the documented field names: grep `tools/validators/src/rules/` for `applied_effect_variant`, `narrative_point_classification`, and `arc_trace_id`; grep page-cycle runtime docs for `arc_trace_emitted`.
4. FOUNDATIONS Rule 1 alignment: every field declares scope (per-page) + prerequisites (Phase 4b/8 emit) + limits (low-budget-mode skip semantics) + consequences (validator inputs).

## Landed Changes

### 1. Extended PG state_snapshot schema docs

In `.claude/skills/branching-story-page-cycle/references/record-schemas.md`, the PG record's `state_snapshot` block now documents:

```yaml
state_snapshot:
  ...                                                # existing fields preserved
  applied_effect_variant: <variant id>               # the variant chosen at Phase 4b
  narrative_point_classification: <narrative_point enum>  # the Phase 8 classification (one of: CONTINUE_ARC, NATURAL_COMMITMENT_HINGE, INTERRUPT_HINGE, CONTINUE_ONLY_PAUSE, TERMINAL_OR_CHAPTER_CLOSE)

  # ARC_TRACE pointer (when emitted)
  arc_trace_id: ARCTRACE-NNNN | null
  arc_trace_emitted: true | false                    # false in low-budget interactive_runtime
```

Field semantics landed:

- `applied_effect_variant`: the variant id from `arc.effect_model.variants[].id` chosen at archived SPEC-20 §C Phase 4b. Null at PG-0001 (root scene-setter, no arc realized).
- `narrative_point_classification`: the Phase 8 classification recording how the page closes. Required.
- `arc_trace_id`: the `ARCTRACE-NNNN` record id of the trace emitted for this page (null when arc_trace_emitted is false).
- `arc_trace_emitted`: false in low-budget interactive_runtime when the trace was elided per archived SPEC-20 §H budget; true in standard runtime.

### 2. Truth-synced SPEC-22 deliverable prose

`specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` now records the page-cycle record-schema deliverable as completed by this ticket.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify — extend PG.state_snapshot block)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — truth Track 4 deliverable status)

## Out of Scope

- Other Track 4 skills (in 010, 011, 012)
- Migration (in 014)
- Validators (in 005)
- Runtime page-cycle Phase 4b/8 emit logic — owned by archived SPEC-20; this ticket only documents the persisted-record schema
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'applied_effect_variant|narrative_point_classification|arc_trace_id|arc_trace_emitted' .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns matches for all 4 fields in the PG record's state_snapshot block.
2. Each field has a purpose / type / default-value / emission-discipline documentation line.
3. Field names exactly match the live consumers: validator rules for `applied_effect_variant`, `narrative_point_classification`, and `arc_trace_id`; page-cycle runtime docs for `arc_trace_emitted`.

### Invariants

1. PG.state_snapshot remains additive — existing fields preserved verbatim.
2. Field names match exactly between page-cycle docs (this ticket) and their live consumers.
3. FOUNDATIONS Rule 1 alignment: every documented field has scope / prerequisites / limits / consequences.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'applied_effect_variant|narrative_point_classification|arc_trace_id|arc_trace_emitted' .claude/skills/branching-story-page-cycle/references/record-schemas.md`
2. `rg -n 'applied_effect_variant|narrative_point_classification|arc_trace_id' tools/validators/src/rules` — cross-check validator field-name consistency.
3. `rg -n 'arc_trace_emitted' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` — cross-check runtime-doc field-name consistency.

## Outcome

Completed: 2026-05-09.

Outcome amended: 2026-05-09 — post-review archival path truthing.

`branching-story-page-cycle/references/record-schemas.md` now documents all four PG `state_snapshot` scene-commitment fields in the page-record YAML block and in per-field prose. The added prose declares type, purpose, root-page/default behavior, and emission discipline for `applied_effect_variant`, `narrative_point_classification`, `arc_trace_id`, and `arc_trace_emitted`.

SPEC-22 was also truth-synced so the Track 4 deliverable table and sibling-skill status prose record this ticket as the owner of the completed page-cycle schema-documentation update.

## Verification Result

1. `grep -nE 'applied_effect_variant|narrative_point_classification|arc_trace_id|arc_trace_emitted' .claude/skills/branching-story-page-cycle/references/record-schemas.md` — passed; all four fields appear in the PG `state_snapshot` block and field-semantics prose.
2. `rg -n 'applied_effect_variant|narrative_point_classification|arc_trace_id' tools/validators/src/rules` — passed; validator consumers reference the three validator-consumed PG fields.
3. `rg -n 'arc_trace_emitted' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` — passed; runtime docs reference the low-budget ARC_TRACE omission flag.
4. Manual FOUNDATIONS Rule 1 alignment check — passed; each added field declares its per-page scope, prerequisite/emission phase, limit/default behavior, and validation/runtime consequence.
5. `git diff --check -- .claude/skills/branching-story-page-cycle/references/record-schemas.md specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md tickets/SPEC22SCECOM-013.md` — passed before archival.
6. `git diff --check -- .claude/skills/branching-story-page-cycle/references/record-schemas.md specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md archive/tickets/SPEC22SCECOM-013.md tickets/SPEC22SCECOM-015.md` — passed after post-review archival path truthing.

## Deviations

- The drafted validator proof command used `grep` on a directory and would exit with an error. The completed ticket uses recursive `rg` for the validator consumer proof.
- Reassessment corrected the consumer boundary: `arc_trace_emitted` is not consumed by `tools/validators/src/rules/`; it is a page-cycle runtime-doc field controlling low-budget ARC_TRACE omission.
