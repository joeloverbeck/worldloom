# SPEC47STPSTE-006: Add 8 STEMO deterministic validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 8 new STEMO structural validators under `tools/validators/src/structural/`; extends `tools/validators/src/public/registry.ts` with 8 new registrations
**Deps**: 003

## Problem

SPEC-47's STEMO record class needs deterministic validators to enforce its schema/lifecycle/access/grounding discipline at the validator-framework pre-apply gate. The 8 validators are non-optional per SPEC-47 §Key Design Decisions item 5 (schema-integrity / lifecycle / access). Without these validators, malformed or semantically-inconsistent STEMO records can land via the patch engine, breaking the Observer Firewall (§6b) at the appraisal_basis access-route check and the Schema-Minimalism (§5b) at the closed-enum compliance check.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/validators/src/structural/` is the established home for structural validators (parallel to ticket 005's STPLAN validators). The per-class validator file convention is `<class>-<check>.ts`. Verified `tools/validators/src/public/registry.ts` is the central registry; new validators register there alongside STPLAN registrations from ticket 005 (parallel-add pattern; mechanical merge expected per §Step 6.5 shared-file overlaps).
2. Verified SPEC-47 §Approach §B specifies 8 STEMO validators by name (stemo_schema_compliance, stemo_holder_exists_and_active, stemo_trigger_event_on_branch_path, stemo_appraisal_basis_accessible_to_holder, stemo_orientation_records_exist, stemo_enum_compliance, stemo_no_future_page_ids, stemo_supersession_lifecycle_valid, stemo_agency_effect_compatibility — note: SPEC-47 lists 9 validators numbered 13-21 in §Approach §B; the 9th `stemo_agency_effect_compatibility` is included here for 8 total or 9 total depending on count; per SPEC-47 §Key Design Decisions item 5 "all deterministic validators land in v1", count all 9). Each is a deterministic structural validator (judgment-based STEMO audits deferred per §Out of Scope item 3).
3. Cross-skill boundary under audit: the validator registry is consumed by the patch engine's pre-apply gate, `world-validate` CLI, and `branching-story-health-audit`. Adding 8-9 STEMO validators extends the surface those consumers iterate over.
4. FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall) — STEMO.appraisal_basis must be accessible to holder (validator `stemo_appraisal_basis_accessible_to_holder`); STEMO.trigger_event must be on the branch path or same-event-created (validator `stemo_trigger_event_on_branch_path`). These access-route checks protect the firewall at the STEMO-emission boundary.
5. STEMO validators land in `tools/validators/src/structural/` — per the §Step 6.2(c) per-ticket-type granularity rule for item 5: structural validators are a Canon Safety surface (engine pre-apply gate). HARD-GATE discipline preserved.

## Architecture Check

1. Per-class validator bundles — STEMO's 8-9 validators land as one reviewable diff for the same reasons as ticket 005's STPLAN bundle: contract integrity, reviewer mental model, parallel registration pattern.
2. No backwards-compatibility aliasing/shims introduced — all validators are net-new.

## Verification Layers

1. 8 (or 9, per SPEC-47 numbering) new validator files exist under `tools/validators/src/structural/stemo-*.ts` → codebase grep-proof
2. registry.ts contains 8-9 new STEMO validator registrations → codebase grep-proof `grep -c "stemo_" tools/validators/src/public/registry.ts`
3. Each validator's check semantically matches its named rule per SPEC-47 §Approach §B → manual review per validator
4. Validator framework's pre-apply gate exercises all STEMO validators against representative fixtures including the `status: dissociated` + `affect_kind: null` edge case → schema validation + per-validator test

## What to Change

### 1. Author 8-9 STEMO validators under `tools/validators/src/structural/`

Each file exports a validator object (parallel to ticket 005's pattern). The validators per SPEC-47 §Approach §B:

1. `stemo-schema-compliance.ts` — JSON schema validation against `story-emotion.schema.json` (from ticket 003); enforces field types, required fields, closed enums, conditional null-allowed for `affect_kind` when `status: dissociated`, `additionalProperties: false`.
2. `stemo-holder-exists-and-active.ts` — `holder` resolves to an STENT that is active in `PG.state_snapshot.active_records`.
3. `stemo-trigger-event-on-branch-path.ts` — `trigger_event` resolves to an SE that exists on the branch path leading to `created_at_page` OR is the same SE as `created_by_event`.
4. `stemo-appraisal-basis-accessible-to-holder.ts` — every `appraisal_basis[]` BEL is accessible to `holder` per the observer-firewall access-route check, UNLESS `status: dissociated` (which carves out the appraisal-basis access requirement).
5. `stemo-orientation-records-exist.ts` — every `orientation.toward_records[]` entry resolves to a known record.
6. `stemo-enum-compliance.ts` — closed-enum validation for `affect_kind`, `intensity`, `status`, `behavioral_pressure[]`, `agency_effect`; conditional null-allowed for `affect_kind` iff `status: dissociated`.
7. `stemo-no-future-page-ids.ts` — same discipline as STPLAN's equivalent validator.
8. `stemo-supersession-lifecycle-valid.ts` — supersession chain valid (no cycles, prior record active when superseded); when `status ∈ {settled, transformed, dissociated}`, a closure/transition SE event must exist.
9. `stemo-agency-effect-compatibility.ts` — when `agency_effect: constraining`, holder's active `STSTAT.agency` must be compatible (e.g., `constrained` / `coerced`) OR the same-event SE's `world_logic_rationale` must include a plan-relation or non-propagation rationale explaining why action still occurs.

### 2. Register all STEMO validators in `tools/validators/src/public/registry.ts`

Add 8-9 import statements and 8-9 registry entries. Coordinate slot ordering with ticket 005's STPLAN registrations (parallel-add to the same file; mechanical merge expected).

## Files to Touch

- `tools/validators/src/structural/stemo-schema-compliance.ts` (new)
- `tools/validators/src/structural/stemo-holder-exists-and-active.ts` (new)
- `tools/validators/src/structural/stemo-trigger-event-on-branch-path.ts` (new)
- `tools/validators/src/structural/stemo-appraisal-basis-accessible-to-holder.ts` (new)
- `tools/validators/src/structural/stemo-orientation-records-exist.ts` (new)
- `tools/validators/src/structural/stemo-enum-compliance.ts` (new)
- `tools/validators/src/structural/stemo-no-future-page-ids.ts` (new)
- `tools/validators/src/structural/stemo-supersession-lifecycle-valid.ts` (new)
- `tools/validators/src/structural/stemo-agency-effect-compatibility.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — 8-9 new registrations; coordinate with ticket 005

## Out of Scope

- STPLAN validators — covered by ticket 005.
- Shared validator extensions (ACTIVE_RECORDS_CLASSES recognizing STEMO as a valid class) — covered by ticket 007.
- Judgment-based STEMO audits (psychological-truth, intensity-appropriateness, prose-specificity, repetition/melodrama per SPEC-47 §Out of Scope item 3) — deferred to follow-up SAU iterations.

## Acceptance Criteria

### Tests That Must Pass

1. `ls tools/validators/src/structural/stemo-*.ts | wc -l` returns 9 (or 8 if `stemo_agency_effect_compatibility` is folded into another validator per implementation discretion; the SPEC-47 §Approach §B numbering implies 9 distinct validators 13-21, but the spec headline says "8" — both are acceptable).
2. `grep -c "stemo_" tools/validators/src/public/registry.ts` returns ≥8.
3. Each validator's positive-case fixture passes; each negative-case fixture fails with the named-rule failure.
4. The `status: dissociated` + `affect_kind: null` edge case passes `stemo_schema_compliance` and `stemo_appraisal_basis_accessible_to_holder` (the dissociated-status carve-out fires); the same record with `status: active` + `affect_kind: null` fails `stemo_schema_compliance`.

### Invariants

1. Existing structural validators are unmodified by this ticket (ticket 007 handles those).
2. The validator registry is monotonically extended; no existing registrations removed or reordered.
3. Each validator's name uses the `stemo_<check_name>` snake_case convention.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stemo-schema-compliance.test.ts` through `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` (8-9 new test files) — one per validator with positive + negative case fixtures.
2. `tools/validators/tests/integration/stemo-full-validation.test.ts` (new) — exercises all STEMO validators against a representative STEMO fixture set spanning all 5 `status` enum values, all 18 `affect_kind` values (sample), and edge cases (dissociated + null affect_kind; active + constraining agency_effect).

### Commands

1. `npm --prefix tools/validators run build && npm --prefix tools/validators test` (full validator package tests pass)
2. `npm --prefix tools/validators test -- --test-name-pattern "stemo_"` (only STEMO validator tests run)
