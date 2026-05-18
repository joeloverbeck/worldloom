# SPEC47STPSTE-005: Add 12 STPLAN deterministic validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds 12 new STPLAN structural validators under `tools/validators/src/structural/`; extends `tools/validators/src/public/registry.ts` with 12 new registrations
**Deps**: 003

## Problem

SPEC-47's STPLAN record class needs deterministic validators to enforce its schema/lifecycle/access/grounding discipline at the validator-framework pre-apply gate. The 12 validators are non-optional per SPEC-47 §Key Design Decisions item 5 ("schema-integrity / lifecycle / access" — naturally bundles as one ticket per class). Without these validators, malformed or semantically-inconsistent STPLAN records can land via the patch engine, breaking the Observer Firewall (§6b) and the Schema-Minimalism (§5b) discipline at the story-pipeline boundary.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/validators/src/structural/` is the established home for structural validators (active-records-full-shape.ts, state-delta-class-integrity.ts, snapshot-replay-equality.ts, midstory-record-introduction-grounding.ts, observer-firewall.ts, state-snapshot-integrity.ts, compatibility-drift.ts already present); the per-class validator file convention is `<class>-<check>.ts` (e.g., the existing `stseq-...` / `clk-...` validators added by SPEC-42). Verified `tools/validators/src/public/registry.ts` is the central validator registry; each new validator file exports a validator that registers in registry.ts.
2. Verified SPEC-47 §Approach §B specifies 12 STPLAN validators by name (stplan_schema_compliance, stplan_id_uniqueness_and_append_only, stplan_holder_exists_and_active, stplan_root_intention_grounded, stplan_belief_basis_grounded, stplan_resource_basis_grounded, stplan_blockers_grounded, stplan_current_step_targets_grounded, stplan_no_future_page_ids, stplan_supersession_chain_valid, stplan_closure_status_requires_closure_event, stplan_event_plan_relation_consistency). Each is a deterministic structural validator (not judgment-based; judgment-based audits deferred to follow-up SAU iterations per SPEC-47 §Key Design Decisions item 7).
3. Cross-skill boundary under audit: the validator registry is consumed by (a) the patch engine's pre-apply gate (validators run against incoming patch plans before commit); (b) `world-validate` CLI for batch validation; (c) the `branching-story-health-audit` skill's structural audit mode. Adding 12 STPLAN validators extends the surface those consumers iterate over; existing validators are unchanged.
4. FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall) — STPLAN.belief_basis must be accessible to holder; STPLAN.resource_basis must be accessible to holder OR explicitly marked as blocker. The `stplan_belief_basis_grounded` and `stplan_resource_basis_grounded` validators enforce these access-route checks at the validator gate, protecting the firewall from STPLAN records that would let an actor act on inaccessible information.
5. STPLAN validators land in `tools/validators/src/structural/` — per the §Step 6.2(c) per-ticket-type granularity rule for item 5: structural validators are a Canon Safety surface (the engine pre-apply gate consumes them to reject story-bundle record writes that violate §6b firewall or §5b schema-minimalism). HARD-GATE discipline preserved: the new validators only add rejection paths; no canon-safety bypass introduced.

## Architecture Check

1. Per-class validator bundles (one ticket adds all validators for one class) preserves the mental model of "STPLAN's full validation contract lives here"; alternative shapes (splitting validators across multiple tickets by check-category) would fragment the contract and force reviewers to reconstruct it from multiple diffs. The 12 validators each follow the same registration pattern; reviewers verify per-validator that the check matches the §4.5.17 definition.
2. No backwards-compatibility aliasing/shims introduced — all 12 validators are net-new. Existing validators are unchanged.

## Verification Layers

1. 12 new validator files exist under `tools/validators/src/structural/stplan-*.ts` → codebase grep-proof `ls tools/validators/src/structural/stplan-*.ts | wc -l` returns 12
2. registry.ts contains 12 new STPLAN validator registrations → codebase grep-proof `grep -c "stplan_" tools/validators/src/public/registry.ts` returns ≥12
3. Each validator's check semantically matches its named rule per SPEC-47 §Approach §B → manual review per validator
4. Validator framework's pre-apply gate exercises all 12 validators against representative STPLAN fixtures (well-formed passes; malformed rejected with named-rule failure) → schema validation + per-validator test

## What to Change

### 1. Author 12 STPLAN validators under `tools/validators/src/structural/`

Each file exports a validator object (matching the existing validator file convention). The 12 validators:

1. `stplan-schema-compliance.ts` — JSON schema validation against `story-plan.schema.json` (from ticket 003); enforces field types, required fields, closed enums, `additionalProperties: false`.
2. `stplan-id-uniqueness-and-append-only.ts` — ID uniqueness across all STPLAN records in the bundle; append-only file-level lifecycle (no in-place mutation of prior records).
3. `stplan-holder-exists-and-active.ts` — `holder` resolves to an STENT that is active in the current `PG.state_snapshot.active_records`.
4. `stplan-root-intention-grounded.ts` — `root_intention` resolves to an STINT that is active, belongs to the same `holder`, and exists at or before `created_at_page`.
5. `stplan-belief-basis-grounded.ts` — every `belief_basis[]` entry resolves to an active BEL record AND the BEL is accessible to `holder` (per observer-firewall access-route check using BEL.basis.access_records or holder identity).
6. `stplan-resource-basis-grounded.ts` — every entry in `resource_basis.facts[]`, `resource_basis.objects[]`, etc. resolves to an active record AND is accessible to `holder` OR appears in `blockers[]` (resource is desired-but-unavailable).
7. `stplan-blockers-grounded.ts` — every `blockers[]` entry resolves to an active record (any class).
8. `stplan-current-step-targets-grounded.ts` — every `current_step.target_records[]` entry resolves to an active record.
9. `stplan-no-future-page-ids.ts` — no field anywhere in the record references a PG id later than `created_at_page` on the branch path.
10. `stplan-supersession-chain-valid.ts` — `supersedes` chain has no cycles; the prior record was active when superseded.
11. `stplan-closure-status-requires-closure-event.ts` — when `plan_status ∈ {fulfilled, failed, abandoned}`, an SE event must exist with `plan_relation:<fulfills|abandons|blocks>(plan=STPLAN-X)` tag in `world_logic_rationale`.
12. `stplan-event-plan-relation-consistency.ts` — when an SE event's `world_logic_rationale` carries `plan_relation:advances(plan=STPLAN-X)`, the SE must create/supersede at least one record cited by plan X's `current_step.target_records[]` or `success_condition.predicates[]`.

### 2. Register all 12 validators in `tools/validators/src/public/registry.ts`

Add 12 import statements and 12 registry entries following the existing per-validator registration pattern. Coordinate slot ordering with ticket 006 (STEMO validators added in parallel; mechanical merge expected per §Step 6.5 shared-file overlaps).

## Files to Touch

- `tools/validators/src/structural/stplan-schema-compliance.ts` (new)
- `tools/validators/src/structural/stplan-id-uniqueness-and-append-only.ts` (new)
- `tools/validators/src/structural/stplan-holder-exists-and-active.ts` (new)
- `tools/validators/src/structural/stplan-root-intention-grounded.ts` (new)
- `tools/validators/src/structural/stplan-belief-basis-grounded.ts` (new)
- `tools/validators/src/structural/stplan-resource-basis-grounded.ts` (new)
- `tools/validators/src/structural/stplan-blockers-grounded.ts` (new)
- `tools/validators/src/structural/stplan-current-step-targets-grounded.ts` (new)
- `tools/validators/src/structural/stplan-no-future-page-ids.ts` (new)
- `tools/validators/src/structural/stplan-supersession-chain-valid.ts` (new)
- `tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts` (new)
- `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — 12 new registrations; coordinate with ticket 006

## Out of Scope

- STEMO validators — covered by ticket 006.
- Shared validator extensions (ACTIVE_RECORDS_CLASSES, active_records_full_shape, etc. recognizing STPLAN as a valid class) — covered by ticket 007.
- Judgment-based STPLAN audits (plausibility, cleverness, fallback character-specificity, plan-produces-choice-pressure per SPEC-47 §Out of Scope item 3) — deferred to follow-up SAU iterations.

## Acceptance Criteria

### Tests That Must Pass

1. `ls tools/validators/src/structural/stplan-*.ts | wc -l` returns 12.
2. `grep -c "stplan_" tools/validators/src/public/registry.ts` returns ≥12.
3. Each validator's positive-case fixture (well-formed STPLAN record satisfying the validator's rule) passes; each negative-case fixture (malformed) fails with the named-rule failure.
4. Cross-validator: a full STPLAN fixture exercising all 12 validators simultaneously passes; representative fixtures violating each rule individually fail their corresponding validator only.

### Invariants

1. Existing structural validators (active-records-full-shape, state-delta-class-integrity, snapshot-replay-equality, midstory-record-introduction-grounding, observer-firewall, etc.) are unmodified by this ticket (ticket 007 handles those).
2. The validator registry is monotonically extended; no existing registrations are removed or reordered (only appended).
3. Each validator's name uses the `stplan_<check_name>` snake_case convention parallel to existing per-class validators.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stplan-schema-compliance.test.ts` through `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` (12 new test files) — one per validator with positive + negative case fixtures.
2. `tools/validators/tests/integration/stplan-full-validation.test.ts` (new) — exercises all 12 validators against a representative STPLAN fixture set spanning all 7 `plan_status` enum values.

### Commands

1. `npm --prefix tools/validators run build && npm --prefix tools/validators test` (full validator package tests pass)
2. `npm --prefix tools/validators test -- --test-name-pattern "stplan_"` (only STPLAN validator tests run)
