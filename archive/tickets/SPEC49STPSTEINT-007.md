# SPEC49STPSTEINT-007: Extend SE.state_relations[] deterministic coverage in stplan-event-plan-relation-consistency.ts to all declared relations

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` (modify), `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` (modify)
**Deps**: None

## Problem

At intake, `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` enforced only the `advances` relation in `SE.state_relations[]`; the validator's fail-message string was hardcoded to advances semantics. The other six relations declared in the SE state-relation vocabulary (`tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`) were accepted by schema but unenforced by the deterministic validator. This ticket closed that SPEC-49 §B.5 audit-identified gap by extending the validator to enforce each declared relation's deterministic delta-shape per the rubrics in the spec.

## Assumption Reassessment (2026-05-19)

1. At intake, `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` was confirmed via codebase grep to hardcode advances semantics. The other six relation values were silently uncovered. The schema-level acceptance of all seven declared relation values was confirmed during spec-to-tickets validation.
2. SPEC-49 §Approach §B.5 (added by reassessment per the reassess-spec session's M1 finding) cites the audit report's deterministic-validator strengthening list item 9: *"SE.state_relations[] consistency must cover all relation values, not just advances."* Each relation's deterministic shape is defined in SPEC-49 §B.5 prose:
   - `advances` (existing): SE creates or supersedes a current-step target or success-condition record.
   - `tests`: SE produces a state-delta touching at least one record named in `current_step.success_condition.predicates[]` record arguments.
   - `blocks`: SE produces a state-delta that creates/supersedes/closes a record named in `STPLAN.blockers[]` OR appends a new blocker via append-style operation.
   - `revises`: SE supersedes the `STPLAN` record itself OR supersedes one of its `current_step` / `fallback_steps[]` sub-records.
   - `fulfills`: SE closes the `STPLAN` (supersede with `plan_status: fulfilled`).
   - `abandons`: SE closes the `STPLAN` (supersede with `plan_status: abandoned`).
   - `ignores`: SE explicitly names the ignored `STPLAN` in `SE.state_relations[]` without producing any state-delta touching the plan's basis.
3. Cross-skill boundary under audit: `stplan-event-plan-relation-consistency` is a structural validator that now runs at engine pre-apply time when `create_se_record` is submitted. The validator gates story-bundle record writes; extending its coverage to the six formerly uncovered relations preserves the same enforcement strength as the existing `advances` check. The state-relations vocabulary is shared with `branching-story-turn-cycle` Phase 4 (SE emission), which already documents the relation contract; this ticket closes the validator side.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: a STPLAN claiming any relation against an SE without a corresponding state-delta shape is a floating fact — the claim is unmoored from the actual event behavior. Extending the validator to enforce each relation's shape closes the Rule 1 enforcement gap. SPEC-49 §FOUNDATIONS Alignment confirms this Rule 1 alignment.
5. Canon Safety surface touched: `stplan-event-plan-relation-consistency.ts` is a structural validator under `tools/validators/src/structural/`. The validator gates story-bundle record writes. Extending the deterministic coverage does not weaken the Mystery Reserve firewall — the relation checks are orthogonal to mystery resolution.
6. Live reassessment for this implementation pass found same-seam dispatch drift: `stplan-event-plan-relation-consistency.ts` currently uses `stplanValidatorApplies`, whose pre-apply predicate only checks `create_stplan_record`; this contradicts this ticket's own cross-skill boundary claim that the validator gates `create_se_record` submissions carrying `SE.state_relations[]`. The ticket therefore also owns a local apply-scope fix for this validator: full-world remains true, pre-apply runs for `create_se_record` and `create_stplan_record`, and incremental runs for touched `events/SE-*.yaml` or `plans/STPLAN-*.yaml` files.
7. Live reassessment also refuted the drafted legacy-marker WARN acceptance item: the repo does not yet have a deterministic SPEC-49 `story_system_contract_revision` marker for classifying old SE relation entries, and `.claude/skills/branching-story-health-audit/SKILL.md` already says hard current-contract detection is deferred until such a marker exists. The implementation therefore keeps this validator fail-closed and records the migration-posture difference in the spec rather than adding a heuristic WARN path.

## Architecture Check

1. Extending the existing validator with per-relation enforcement branches is the minimal-blast-radius approach. Alternative (introducing 5 separate validators, one per new relation) would multiply the registry-registration surface 5× and force per-validator dispatch overhead. The single-validator-per-target shape is the canonical pattern (parallel to how `stplan-belief-basis-grounded.ts` covers all belief-basis records in one validator).
2. No backwards-compatibility aliasing introduced. The validator remains fail-closed for legacy bundles with SE.state_relations entries that violate the new coverage; no WARN-mode alias or heuristic was added because deterministic current-contract detection is not yet available for this surface.
3. The existing `advances` enforcement at line 21 is preserved unchanged. New relation handlers extend the validator's dispatch logic without modifying the existing check.

## Verification Layers

1. Per-relation enforcement: each of the seven declared relations has deterministic coverage; the six formerly uncovered relations have relation-specific finding codes. Validator surface: unit tests with inline records for PASS + FAIL cases.
2. Validator dispatch: `stplan-event-plan-relation-consistency` runs against `create_se_record` patch-plan ops + on bundle-replay verification. Validator surface: `applies_to` unit tests plus the full package suite.
3. Fail-message constant uniqueness: each new relation's fail-message constant follows the pattern `stplan_event_plan_relation_consistency.<relation>_<shape>` (e.g., `.tests_no_predicate_touch`, `.blocks_no_obstruction_delta`, `.revises_no_supersession`, `.fulfills_status_mismatch`, `.abandons_status_mismatch`, `.ignores_unexpected_delta`). Validator surface: grep-proof of finding-code uniqueness.
4. Apply-scope correctness: the validator applies to full-world runs, `create_se_record` / `create_stplan_record` pre-apply plans, and incremental event/plan file touches. Validator surface: unit tests for `applies_to`.

## Landed Changes

### 1. Extend `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` with per-relation enforcement

The validator's main loop now dispatches on `relation.relation` value. For each `SE.state_relations[]` entry where `target_record` matches `STPLAN-<integer>`:

- `advances` (existing): preserves the current target/success-condition touch check.
- `tests`: walks the STPLAN's `current_step.success_condition.predicates[]`, extracts record IDs from predicate arguments, and checks that the SE's `state_delta` touches at least one of those records. Emits `stplan_event_plan_relation_consistency.tests_no_predicate_touch` if no touch.
- `blocks`: checks that the SE's `state_delta` creates/supersedes/closes a record in `STPLAN.blockers[]`, or supersedes the plan with a newly-created blocker. Emits `.blocks_no_obstruction_delta` if neither.
- `revises`: checks that the SE's `state_delta` supersedes the STPLAN. Emits `.revises_no_supersession` if not.
- `fulfills`: checks that the SE's `state_delta` supersedes the STPLAN with `plan_status: fulfilled`. Emits `.fulfills_status_mismatch` if not.
- `abandons`: checks that the SE's `state_delta` supersedes the STPLAN with `plan_status: abandoned`. Emits `.abandons_status_mismatch` if not.
- `ignores`: checks that the SE's `state_delta` produces no touch on the plan's basis records. Emits `.ignores_unexpected_delta` if a touch is produced.

The implementation also replaced this validator's shared `stplanValidatorApplies` predicate with a validator-local apply predicate so `create_se_record` pre-apply submissions are actually gated by the relation check. Other STPLAN validators keep their existing STPLAN-create scope.

### 2. Add per-relation fail-message constants

Each new finding code is defined as a string constant at the top of the validator file, paralleling the existing `stplan_event_plan_relation_consistency.no_matching_delta` constant for `advances`.

### 3. D-CX.1-style migration-posture handling

The drafted WARN-then-FAIL extension was not implemented. The validator remains fail-closed because the repo has no deterministic SPEC-49 revision marker for classifying old SE relation entries; the active health-audit migration surface owns compatibility triage until that marker exists.

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

1. For each of the seven declared relations, the validator has at least one PASS test case (event matches the relation's deterministic shape).
2. For each of the six formerly uncovered relations (`tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`), the validator has at least one FAIL test case with the relation-specific finding code.
3. The pre-existing `advances` enforcement test case continues to pass without modification (the existing line-21 check is unchanged).
4. Legacy-marker WARN behavior was not implemented because no deterministic SPEC-49 relation-entry marker exists in the live repo; the validator remains fail-closed and the deviation is recorded below.
5. `applies_to` returns true for `create_se_record` pre-apply plans and touched event files, not only STPLAN-create plans.

### Invariants

1. All seven SE.state_relations[] values (`advances`, `tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`) are deterministically validated. No relation accepts SE state_relations entries without a corresponding state-delta shape check.
2. The seven fail-message constants are unique within the validator's finding-code namespace.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` — modified with inline structural records for PASS + FAIL cases per new relation (`tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`), the existing `advances` PASS/FAIL cases, and `applies_to` coverage for full-world, `create_se_record`, `create_stplan_record`, non-owned `create_pg_record`, touched event files, and touched plan files.

### Commands

1. `npm test --prefix tools/validators` (full validator suite)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/structural/stplan-event-plan-relation-consistency.test.js`
3. Finding-code uniqueness grep: `grep -n "stplan_event_plan_relation_consistency\." tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` shows seven distinct fail-message constants (advances + six formerly uncovered relations).

## Outcome

Completed on 2026-05-19. `stplan_event_plan_relation_consistency` now validates every declared `SE.state_relations[]` relation for STPLAN targets:

- `advances` preserves the existing current-step target / success-condition touch check and code.
- `tests`, `blocks`, `revises`, `fulfills`, `abandons`, and `ignores` each have deterministic checks and relation-specific finding codes.
- The validator now runs for `create_se_record` pre-apply plans, `create_stplan_record` pre-apply plans, full-world runs, and incremental event/plan file touches.
- The implementation uses inline structural test records rather than separate YAML fixture files.

## Verification Result

1. `npm run build` from `tools/validators` — PASS.
2. `node --test dist/tests/structural/stplan-event-plan-relation-consistency.test.js` from `tools/validators` — PASS, 15 tests.
3. `npm test` from `tools/validators` — PASS, 655 tests.
4. Manual review of `.claude/skills/branching-story-health-audit/SKILL.md` confirmed the drafted legacy WARN acceptance item is not currently mechanized because deterministic current-contract detection is deferred until a future `story_system_contract_revision` marker.

## Deviations

- The drafted separate YAML fixture files were not created; the structural test file uses inline records, matching existing nearby tests and proving the same validator invariants with less fixture sprawl.
- The drafted legacy-marker WARN acceptance item was not implemented. No deterministic SPEC-49 marker exists for old SE relation entries, and adding a heuristic WARN path would weaken this HARD-GATE-facing validator. The validator remains fail-closed; the spec now records this implementation note.
