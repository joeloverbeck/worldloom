# SPEC49STPSTEINT-007: Extend SE.state_relations[] deterministic coverage in stplan-event-plan-relation-consistency.ts to all 6 relations

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` (modify), `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` (modify)
**Deps**: None

## Problem

`tools/validators/src/structural/stplan-event-plan-relation-consistency.ts:21` enforces only the `advances` relation in `SE.state_relations[]` — the validator's fail-message string is hardcoded to *"SE ${event.node_id} advances ${plan.id} but does not create or supersede a current-step target or success-condition record"*. The remaining 5 relations declared in the SE state-relation vocabulary (`tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`) are accepted by schema but unenforced by the deterministic validator — a STPLAN can claim any of these relations against any SE without the relation's deterministic shape being checked. SPEC-49 §B.5 (audit-identified surgical-hole gap) closes this by extending the validator to enforce each relation's deterministic delta-shape per the rubrics in the spec.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts:21` confirmed via codebase grep during reassess-spec session — the fail-message string is hardcoded to "advances" semantics. The 5 other relation values are silently uncovered. The schema-level acceptance of all 6 relations was confirmed during spec-to-tickets validation.
2. SPEC-49 §Approach §B.5 (added by reassessment per the reassess-spec session's M1 finding) cites the audit report's deterministic-validator strengthening list item 9: *"SE.state_relations[] consistency must cover all relation values, not just advances."* Each relation's deterministic shape is defined in SPEC-49 §B.5 prose:
   - `advances` (existing): SE creates or supersedes a current-step target or success-condition record.
   - `tests`: SE produces a state-delta touching at least one record named in `current_step.success_condition.predicates[]` record arguments.
   - `blocks`: SE produces a state-delta that creates/supersedes/closes a record named in `STPLAN.blockers[]` OR appends a new blocker via append-style operation.
   - `revises`: SE supersedes the `STPLAN` record itself OR supersedes one of its `current_step` / `fallback_steps[]` sub-records.
   - `fulfills`: SE closes the `STPLAN` (supersede with `plan_status: fulfilled`).
   - `abandons`: SE closes the `STPLAN` (supersede with `plan_status: abandoned`).
   - `ignores`: SE explicitly names the ignored `STPLAN` in `SE.state_relations[]` without producing any state-delta touching the plan's basis.
3. Cross-skill boundary under audit: `stplan-event-plan-relation-consistency` is a structural validator that runs at engine pre-apply time when `create_se_record` is submitted. The validator gates story-bundle record writes; extending its coverage to the 5 new relations preserves the same enforcement strength as the existing `advances` check. The state-relations vocabulary is shared with `branching-story-turn-cycle` Phase 4 (SE emission), which already documents the 6-relation contract; this ticket closes the validator side.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: a STPLAN claiming any relation against an SE without a corresponding state-delta shape is a floating fact — the claim is unmoored from the actual event behavior. Extending the validator to enforce each relation's shape closes the Rule 1 enforcement gap. SPEC-49 §FOUNDATIONS Alignment confirms this Rule 1 alignment.
5. Canon Safety surface touched: `stplan-event-plan-relation-consistency.ts` is a structural validator under `tools/validators/src/structural/`. The validator gates story-bundle record writes. Extending the deterministic coverage does not weaken the Mystery Reserve firewall — the relation checks are orthogonal to mystery resolution.

## Architecture Check

1. Extending the existing validator with per-relation enforcement branches is the minimal-blast-radius approach. Alternative (introducing 5 separate validators, one per new relation) would multiply the registry-registration surface 5× and force per-validator dispatch overhead. The single-validator-per-target shape is the canonical pattern (parallel to how `stplan-belief-basis-grounded.ts` covers all belief-basis records in one validator).
2. No backwards-compatibility aliasing introduced. Migration posture for legacy bundles with SE.state_relations entries that may now FAIL under the new coverage (per SPEC-49 D-CX.1 distributed contract — though D-CX.1 names A.1/A.3/B.3/B.4 specifically, the B.5 extension's migration posture follows the same WARN-then-FAIL pattern by mechanism continuity): WARN-mode rollout for one revision cycle, then FAIL.
3. The existing `advances` enforcement at line 21 is preserved unchanged. New relation handlers extend the validator's dispatch logic without modifying the existing check.

## Verification Layers

1. Per-relation enforcement: each of the 6 relations (advances + 5 new) has its own deterministic check producing a relation-specific fail-message constant. Validator surface: unit tests against fixtures for each relation with PASS + FAIL cases.
2. Validator dispatch: `stplan-event-plan-relation-consistency` runs against `create_se_record` patch-plan ops + on bundle-replay verification. Validator surface: engine pre-apply gate, exercised via integration test fixture.
3. Fail-message constant uniqueness: each new relation's fail-message constant follows the pattern `stplan_event_plan_relation_consistency.<relation>_<shape>` (e.g., `.tests_no_predicate_touch`, `.blocks_no_obstruction_delta`, `.revises_no_supersession`, `.fulfills_status_mismatch`, `.abandons_status_mismatch`, `.ignores_unexpected_delta`). Validator surface: grep-proof of finding-code uniqueness.

## What to Change

### 1. Extend `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` with per-relation enforcement

Restructure the validator's main loop to dispatch on `relation.relation` value. For each `SE.state_relations[]` entry where `target_record` matches `STPLAN-<integer>`:

- `advances` (existing): preserve the current line-21 check unchanged.
- `tests`: walk the STPLAN's `current_step.success_condition.predicates[]`, extract record IDs from predicate arguments, and check that the SE's `state_delta` touches at least one of those records. Emit `stplan_event_plan_relation_consistency.tests_no_predicate_touch` if no touch.
- `blocks`: check that the SE's `state_delta` (a) creates/supersedes/closes a record in `STPLAN.blockers[]`, OR (b) appends a new blocker to STPLAN's blockers via an append-style op. Emit `.blocks_no_obstruction_delta` if neither.
- `revises`: check that the SE's `state_delta` supersedes the STPLAN itself OR supersedes one of its `current_step` / `fallback_steps[]` sub-records. Emit `.revises_no_supersession` if neither.
- `fulfills`: check that the SE's `state_delta` supersedes the STPLAN with `plan_status: fulfilled`. Emit `.fulfills_status_mismatch` if not.
- `abandons`: check that the SE's `state_delta` supersedes the STPLAN with `plan_status: abandoned`. Emit `.abandons_status_mismatch` if not.
- `ignores`: check that the SE's `state_delta` produces no touch on the plan's basis records (the relation signals lawful non-engagement). Emit `.ignores_unexpected_delta` if a touch is produced.

### 2. Add per-relation fail-message constants

Define each new finding code as a string constant at the top of the validator file, paralleling the existing `stplan_event_plan_relation_consistency.no_matching_delta` constant for `advances`.

### 3. D-CX.1-style migration-posture handling

Although SPEC-49 D-CX.1 names only A.1/A.3/B.3/B.4 as the distributed contract's surfaces, the WARN-then-FAIL pattern extends to B.5 by mechanism continuity (audit-identified gaps share the migration discipline). Legacy bundles' SE.state_relations entries that fail the new per-relation checks emit WARN at the validator-error-reporting layer; current-contract pages FAIL.

## Files to Touch

- `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` (modify)
- `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` (modify)

## Out of Scope

- Modifying the existing `advances` enforcement at line 21 — preserved unchanged.
- Adding relation-consistency validation for STEMO records (STEMO has no `SE.state_relations[]` target shape).
- Modifying the schema to constrain `relation` enum values — the schema already accepts the 6-relation vocabulary.
- Adding choice-grounding checks that consume the new fail-message constants — choice grounding is ticket 002's scope.

## Acceptance Criteria

### Tests That Must Pass

1. For each of the 6 relations, the validator has at least one PASS test case (event matches the relation's deterministic shape).
2. For each of the 5 new relations (`tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`), the validator has at least one FAIL test case with the relation-specific finding code.
3. The pre-existing `advances` enforcement test case continues to pass without modification (the existing line-21 check is unchanged).
4. A legacy-marker bundle (pre-SPEC-49 revision_marker) containing a SE with a violating new-relation state_relations entry emits WARN (not FAIL) at the validator-error-reporting layer.

### Invariants

1. All 6 SE.state_relations[] values (`advances`, `tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`) are deterministically validated. No relation accepts SE state_relations entries without a corresponding state-delta shape check.
2. The 6 fail-message constants are unique within the validator's finding-code namespace.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/se-state-relations-tests-pass.yaml` — PASS fixture for `tests` relation.
2. `tools/validators/tests/fixtures/se-state-relations-tests-fail.yaml` — FAIL for `tests` (no predicate touch).
3. `tools/validators/tests/fixtures/se-state-relations-blocks-pass.yaml` — PASS for `blocks`.
4. `tools/validators/tests/fixtures/se-state-relations-blocks-fail.yaml` — FAIL for `blocks`.
5. `tools/validators/tests/fixtures/se-state-relations-revises-pass.yaml` — PASS for `revises`.
6. `tools/validators/tests/fixtures/se-state-relations-revises-fail.yaml` — FAIL for `revises`.
7. `tools/validators/tests/fixtures/se-state-relations-fulfills-pass.yaml` — PASS for `fulfills`.
8. `tools/validators/tests/fixtures/se-state-relations-fulfills-fail.yaml` — FAIL for `fulfills`.
9. `tools/validators/tests/fixtures/se-state-relations-abandons-pass.yaml` — PASS for `abandons`.
10. `tools/validators/tests/fixtures/se-state-relations-abandons-fail.yaml` — FAIL for `abandons`.
11. `tools/validators/tests/fixtures/se-state-relations-ignores-pass.yaml` — PASS for `ignores`.
12. `tools/validators/tests/fixtures/se-state-relations-ignores-fail.yaml` — FAIL for `ignores`.
13. `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` — modify to add 12 new test cases (PASS + FAIL per new relation) consuming the fixtures above. Preserve the existing `advances` test cases unchanged.

### Commands

1. `npm test --prefix tools/validators` (full validator suite)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/structural/stplan-event-plan-relation-consistency.test.js`
3. Finding-code uniqueness grep: `grep -n "stplan_event_plan_relation_consistency\." tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` should show 6 distinct fail-message constants (advances + 5 new).
