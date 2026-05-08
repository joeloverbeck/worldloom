# SPEC22SCECOM-013: branching-story-page-cycle record-schemas: PG.state_snapshot extension docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-page-cycle/references/record-schemas.md`. Documentation-only.
**Deps**: archive/tickets/SPEC22SCECOM-005.md

## Problem

SPEC-22 §Track 4 extends the PG record's `state_snapshot` block with four new fields: `applied_effect_variant` (the variant chosen at archived SPEC-20 §C Phase 4b), `narrative_point_classification` (the Phase 8 classification per the closed enum), `arc_trace_id` (ARCTRACE-NNNN | null), `arc_trace_emitted` (true | false). Without documenting these fields in `branching-story-page-cycle/references/record-schemas.md`, the validators in 005 (`effect_model_replay_safety`, `narrative_point_classification`, `arc_trace_evidence_alignment`) consume undocumented fields — a Rule 1 (No Floating Facts) gap at the schema-documentation layer.

## Assumption Reassessment (2026-05-08)

1. `.claude/skills/branching-story-page-cycle/references/record-schemas.md` exists. The PG record schema has a `state_snapshot` block (verified at SPEC-22 reassessment via partial Read of lines 22-52). `applied_effect_variant` is mentioned in ARC_TRACE context elsewhere; the four new fields are not yet documented in `state_snapshot`.
2. **Cross-skill boundary under audit**: page-cycle's `record-schemas.md` documents the PG record's state_snapshot field surface that validators (005) consume programmatically. The boundary is the documented field set; validators' tests will assert on these field names.
3. **FOUNDATIONS Rule 1 (No Floating Facts)** restated: every documented field must declare scope / prerequisites / limits / consequences. The 4 new fields each carry their own purpose: `applied_effect_variant` records which variant was chosen at arc-close; `narrative_point_classification` records the Phase 8 classification; `arc_trace_id` + `arc_trace_emitted` link to the ARC_TRACE record (or signal the low-budget-mode skip).
4. (HARD-GATE / canon-write ordering): N/A — page-cycle reference docs are meta-tooling.
5. **Schema extension is additive** — 4 new fields in PG.state_snapshot. Existing fields (current_location, entity_status, relationships_current, etc.) preserved.
6. (Rename/removal blast radius): no existing field is renamed or removed; pure addition.

## Architecture Check

1. Documenting these fields in page-cycle's record-schemas reference (rather than inline in SKILL.md) follows the existing per-skill reference-doc pattern.
2. No backwards-compatibility shims — page-cycle docs are meta-tooling; existing field documentation preserved.

## Verification Layers

1. `record-schemas.md` documents 4 new fields → grep `applied_effect_variant`, `narrative_point_classification`, `arc_trace_id`, `arc_trace_emitted` in page-cycle/references/.
2. Each field's purpose, type, default value, and emission discipline documented.
3. Validators (005) reference these field names against the page-cycle docs (cross-check by grep'ing 005's validators for these field names — they should match).
4. FOUNDATIONS Rule 1 alignment: every field declares scope (per-page) + prerequisites (Phase 4b/8 emit) + limits (low-budget-mode skip semantics) + consequences (validator inputs).

## What to Change

### 1. Extend PG state_snapshot schema docs

In `.claude/skills/branching-story-page-cycle/references/record-schemas.md`, in the PG record's `state_snapshot` block:

```yaml
state_snapshot:
  ...                                                # existing fields preserved verbatim
  applied_effect_variant: <variant id>               # the variant chosen at Phase 4b
  narrative_point_classification: <narrative_point enum>  # the Phase 8 classification (one of: CONTINUE_ARC, NATURAL_COMMITMENT_HINGE, INTERRUPT_HINGE, CONTINUE_ONLY_PAUSE, TERMINAL_OR_CHAPTER_CLOSE)

  # ARC_TRACE pointer (when emitted)
  arc_trace_id: ARCTRACE-NNNN | null
  arc_trace_emitted: true | false                    # false in low-budget interactive_runtime
```

Field semantics documented:

- `applied_effect_variant`: the variant id from `arc.effect_model.variants[].id` chosen at archived SPEC-20 §C Phase 4b. Null at PG-0001 (root scene-setter, no arc realized).
- `narrative_point_classification`: the Phase 8 classification recording how the page closes. Required.
- `arc_trace_id`: the `ARCTRACE-NNNN` record id of the trace emitted for this page (null when arc_trace_emitted is false).
- `arc_trace_emitted`: false in low-budget interactive_runtime when the trace was elided per archived SPEC-20 §H budget; true in standard runtime.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify — extend PG.state_snapshot block)

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
3. Field names exactly match the names consumed by 005's validators (cross-check via `grep` in `tools/validators/src/rules/`).

### Invariants

1. PG.state_snapshot remains additive — existing fields preserved verbatim.
2. Field names match exactly between page-cycle docs (this ticket) and validators (005).
3. FOUNDATIONS Rule 1 alignment: every documented field has scope / prerequisites / limits / consequences.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'applied_effect_variant|narrative_point_classification|arc_trace_id|arc_trace_emitted' .claude/skills/branching-story-page-cycle/references/record-schemas.md`
2. `grep -nE 'applied_effect_variant|narrative_point_classification|arc_trace_id|arc_trace_emitted' tools/validators/src/rules/` — cross-check field-name consistency.
