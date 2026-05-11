# BSPAGE-002: Add `plan_completeness_check` field to `record-schemas.md` PG `validation_trace` block

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — documentation fix inside `.claude/skills/branching-story-page-cycle/references/`.
**Deps**: None.

## Problem

`references/record-schemas.md:75` declares the PG `validation_trace` block as `# Phase 9 gates 1-17 with one-line PASS rationales`, and lines 76-92 enumerate exactly 17 trace fields. But `SKILL.md` (lines 48, 184, 311) and `references/phase-9-validation-gates.md` (lines 1, 26) both declare 18 gates, with gate 18 = `plan_completeness_check`. The schema reference is missing the 18th field.

A maintainer authoring a PG record from `record-schemas.md` as the schema authority would silently omit `plan_completeness_check` from `validation_trace`. The `record_schema_compliance` validator at submit time and the Phase 9 gate-18 contract both require the field. The audit fix is a one-file edit synchronizing the schema reference with the rest of the skill's current contract.

This finding parallels the bootstrap bug fixed by **BSBOOT-025** (archived) — same pattern, different file.

## Assumption Reassessment (2026-05-11)

1. `references/record-schemas.md:75` reads `validation_trace:                                    # Phase 9 gates 1-17 with one-line PASS rationales`. Confirmed by direct read.
2. `references/record-schemas.md:76-92` enumerate 17 trace fields: `mystery_firewall`, `invariant_compatibility`, `recursive_reference_closure`, `snapshot_replay_equality`, `id_uniqueness`, `content_policy_presence`, `prose_ledger_consistency`, `choice_contract_integrity`, `choice_consequence_capacity`, `state_snapshot_integrity`, `epistemic_class_declared`, `consequence_persistence`, `arc_envelope_conformance`, `effect_model_replay_safety`, `arc_trace_evidence_alignment`, `narrative_point_classification`, `choice_worthiness_completeness`. Missing: `plan_completeness_check`. Confirmed by direct read.
3. `SKILL.md:48` lists 18 gates including `plan_completeness_check` as the final gate. `SKILL.md:184` reads `"18 gates (see HARD-GATE)"`. `SKILL.md:311` reads `"all 18 gates ... plan_completeness_check"`. Confirmed by direct read.
4. `references/phase-9-validation-gates.md:1` reads `"Phase 9 has 18 gates"`. Line 26 documents gate 18 as `plan_completeness_check`. Confirmed by direct read.
5. Shared boundary: `record-schemas.md` is the schema authority for the PG record per its cross-skill citation by `branching-story-bootstrap/SKILL.md:229` (STINT id discipline) and `branching-story-bootstrap/templates/story-records.yaml:404` (SPEC-19 CHC schema runtime authority). The PG schema's `validation_trace` field set being a strict mirror of the current Phase 9 gate count is load-bearing for downstream readers.
6. Mismatch + correction: The PG record's `validation_trace` field set is 18 keys (one per Phase 9 gate), not 17. Update the header comment AND add the missing 18th field to the example.

## Architecture Check

1. The fix is an additive sync — adding the missing 18th `validation_trace` field to match the existing 18-gate contract already documented in `SKILL.md` and `references/phase-9-validation-gates.md`. No contract change.
2. No backwards-compatibility aliasing introduced; the schema reference simply catches up to the current contract.

## Verification Layers

1. `record-schemas.md` post-edit contains a `plan_completeness_check:` line inside the `validation_trace:` block → `grep -c "^\s*plan_completeness_check:" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns ≥1 (codebase grep-proof).
2. `record-schemas.md` post-edit header comment reads `# Phase 9 gates 1-18` → `grep -c "Phase 9 gates 1-18" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns ≥1.
3. The 18-gate count matches `references/phase-9-validation-gates.md:1` (`"Phase 9 has 18 gates"`) and `SKILL.md` HARD-GATE block → manual diff.

## What to Change

### 1. `.claude/skills/branching-story-page-cycle/references/record-schemas.md`

Update line 75 from:

```
validation_trace:                                    # Phase 9 gates 1-17 with one-line PASS rationales
```

to:

```
validation_trace:                                    # Phase 9 gates 1-18 with one-line PASS rationales
```

After line 92 (`choice_worthiness_completeness: PASS — <rationale>`), insert a new line:

```
  plan_completeness_check: PASS — <rationale>
```

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (one line edit + one line insert).

## Acceptance Criteria

- `grep -c "^\s*plan_completeness_check:" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns ≥1.
- `grep -c "Phase 9 gates 1-18" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns ≥1.
- `grep -c "Phase 9 gates 1-17" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns `0`.
- The 18 fields in the `validation_trace:` block of the PG example match the 18 gates listed in `references/phase-9-validation-gates.md` lines 7-26 (manual cross-check).

## Test Plan

- Manual diff comparison: line up the 18 `validation_trace` field names in `record-schemas.md` with the 18 gates in `phase-9-validation-gates.md`'s table; confirm 1:1 correspondence.
- Verify a future skill-audit drift scan re-running the same Phase 3 numeric-drift pattern on this file no longer reports a finding.
