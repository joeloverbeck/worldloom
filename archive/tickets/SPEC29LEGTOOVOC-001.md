# SPEC29LEGTOOVOC-001: Retire 7 orphan vocabulary classes from canonical-vocabularies + downstream test residue

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/public/canonical-vocabularies` (vocabulary registry) and `tools/world-mcp/src/tools/get-canonical-vocabulary` (MCP-side exposure) lose 7 vocabulary classes; downstream test residue in `tools/world-index/tests/public-types.test.ts`, `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`, `tools/world-mcp/tests/tools/get-record-schema.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` is cleaned up.
**Deps**: None

## Problem

At intake, seven vocabulary classes (`commitment_family`, `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`) survived in the canonical-vocabularies registry and the `get_canonical_vocabulary` MCP tool despite the greenfield rebuild of the seven story-pipeline skills having retired the entire SPEC-22-era scene-commitment-arc vocabulary from the skill layer. Codebase recon (2026-05-15) confirmed zero live skill consumers — the SCAUD-003 "retain as independent storylet/arc vocabulary metadata" rationale was speculative retention against verified zero consumption.

At intake, two trailing surfaces shared the same vocabulary residue and were retired alongside the registry:
- `tools/world-mcp/tests/tools/get-record-schema.test.ts:237-243` — SCAUD-003 retired-CHC-property sentinels asserting `target_or_action_family`, `commitment_family`, `commitment_class`, `commitment_detail` are `undefined` on the CHC schema. These assert against fields the schema no longer mentions, making them tautological once the vocabulary the names point to is gone.
- `tools/validators/tests/integration/validate-patch-plan.test.ts:92, 476, 488, 510` — the `narrative_point_classification` validator-name sentinel + state-snapshot positive fixtures. The validator-name sentinel asserts a retired validator is NOT among executions; the positive fixtures populate `stateSnapshot.narrative_point_classification` with legacy narrative_point values. Both are residue from the same retired vocabulary surface.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality**: at intake, `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` contained exactly the 7 case clauses to remove while retaining 11 surviving classes (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, `cf_type`). `tools/world-index/src/public/canonical-vocabularies.ts` defined all 8 retired exports (`COMMITMENT_FAMILIES`, `COMMITMENT_CLASSES`, `COMMITMENT_CLASS_TO_FAMILY`, `ARC_ARCHETYPES`, `NARRATIVE_POINTS`, `STRONG_AXES`, `STRONG_OUTCOMES`, `STOP_PREDICATES`) + 8 derived types (`CommitmentFamily`, `CommitmentClass`, `CommitmentClassToFamily`, `ArcArchetype`, `NarrativePoint`, `StrongAxis`, `StrongOutcome`, `StopPredicate`) + 1 helper `commitmentFamilyForClass`. Spec D1's "retire 7 orphan classes" framing was scoped to the case clauses; the producer-side registry was the same retirement and landed in this ticket.
2. **Spec/docs reality**: SPEC-29 §1 names the case clauses only. Issue 1 from /spec-to-tickets Step 2 (codebase validation, 2026-05-15) surfaced the upstream constant/type/helper surface and dispositioned **expand-scope-in-place** — the spec's intent (mechanical cleanup of legacy ARC vocabulary, no behavior change to live flows) is preserved; the codebase requires the full registry seam to be touched. `docs/FOUNDATIONS.md:626` §5b "Schema-Minimalism At Story Scope" governs: every exposed vocabulary class must be load-bearing.
3. **Shared boundary under audit**: the `@worldloom/world-index/public/canonical-vocabularies` export surface — consumed by `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (producer) and the world-index `tests/public-types.test.ts` (test). Issue 3 from /spec-to-tickets Step 2 also re-attributed spec D3's `narrative_point` reference: the spec named `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` but `narrative_point` is in `tools/validators/tests/integration/validate-patch-plan.test.ts:92, 476, 488, 510` (different package, same basename). This ticket implements the corrected attribution.
4. **FOUNDATIONS principle under audit**: §Story Bundles §5b — Schema-Minimalism At Story Scope. The principle requires every exposed vocabulary class to be load-bearing. Retiring zero-consumer classes brings the registry into §5b compliance; the §4.4 / §5a prohibition text in `story-state-contract.md` is preserved (per SPEC-29 §6) because it documents what the SLT schema rejects, not what `get_canonical_vocabulary` exposes.
5. **Rename/removal blast radius (per /spec-to-tickets §New-class / new-op / new-id-class / new-field parity scan applied in reverse for removal)**: pipeline-wide grep for the 8 retired symbols + the helper yielded 6 files inside this ticket's scope (excluding `archive/`, `dist/`, `docs/triage/`, the `story-state-contract.md` §4.4 / §5a prohibition text retained per spec §6, and `tools/world-mcp/README.md` / `tools/world-index/README.md` / `docs/MACHINE-FACING-LAYER.md` routed to SPEC29LEGTOOVOC-005). Validators package (`tools/validators/src/`) imported none of these constants directly; the only validators-lane residue was the integration test's `narrative_point_classification` token. Patch-engine package (`tools/patch-engine/src/`) imported none of these constants directly.
6. **Final docs boundary**: `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-index/README.md` still advertised the retired vocabulary classes after this code ticket landed. That intentional same-family residual work was completed by `archive/tickets/SPEC29LEGTOOVOC-005.md`, whose `Deps` include this ticket.

## Architecture Check

1. **Why this is cleaner than alternatives**: removing the registry seam in one diff (case clauses + imports + constants + types + helper + tests) makes the retirement structurally complete; piecemeal retention (the rejected alternative in SPEC-29 §"Key design decisions") would re-create the SCAUD-003 ambiguity for the next reader. Removing just the case clauses while leaving the constants exported would create eight dead exports surfacing from a documented public module — strictly worse than the current state where the case clauses at least give the exports a (zero-consumer) purpose.
2. **No backwards-compatibility shims**: no aliases, no deprecated-class fallbacks, no `// @deprecated`-tagged re-exports. The `get_canonical_vocabulary` default-case error path handles unknown class names already; retired class names fall through to that path uniformly. No worldloom consumer requires a deprecation cycle (single-user pre-production, no external MCP consumers).

## Verification Layers

1. **Invariant: zero exported references to retired vocabulary constants/types/helper** → `grep -rnE "COMMITMENT_FAMILIES|COMMITMENT_CLASSES|COMMITMENT_CLASS_TO_FAMILY|ARC_ARCHETYPES|NARRATIVE_POINTS|STRONG_AXES|STRONG_OUTCOMES|STOP_PREDICATES|commitmentFamilyForClass|CommitmentFamily|CommitmentClass|ArcArchetype|NarrativePoint|StrongAxis|StrongOutcome|StopPredicate" tools/world-index/src/ tools/world-mcp/src/ tools/validators/src/ tools/patch-engine/src/` returns no hits.
2. **Invariant: zero exposure of retired classes through MCP** → `grep -nE "case \"(commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate)\"" tools/world-mcp/src/tools/get-canonical-vocabulary.ts` returns no hits; the remaining case branches cover only the 11 surviving classes.
3. **Invariant: world-index + world-mcp + validators test lanes pass with retired-class assertions removed** → `cd tools/world-index && npm run build && npm test`; `cd tools/world-mcp && npm test`; `cd tools/validators && npm test`. All three lanes pass.
4. **Invariant: §5b Schema-Minimalism preserved at the registry surface** → FOUNDATIONS §5b alignment check by inspection of remaining `get_canonical_vocabulary` cases: every remaining class must be consumed by at least one skill or tools/src file. Grep for each of the 11 surviving class names confirms live consumption.

## Landed Changes

### 1. Drop 7 case clauses + imports from `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`

Removed imports of `ARC_ARCHETYPES`, `COMMITMENT_CLASS_TO_FAMILY`, `COMMITMENT_CLASSES`, `COMMITMENT_FAMILIES`, `NARRATIVE_POINTS`, `STOP_PREDICATES`, `STRONG_AXES`, `STRONG_OUTCOMES`. Removed the 7 retired class names from `VOCABULARY_CLASSES` and removed the 7 case clauses. The existing default-case path handles retired names uniformly as unsupported classes; no special-case was introduced.

### 2. Drop 8 constants + 8 derived types + 1 helper from `tools/world-index/src/public/canonical-vocabularies.ts`

Removed `COMMITMENT_FAMILIES`, `COMMITMENT_CLASSES`, `COMMITMENT_CLASS_TO_FAMILY`, `ARC_ARCHETYPES`, `NARRATIVE_POINTS`, `STRONG_AXES`, `STRONG_OUTCOMES`, `STOP_PREDICATES`, their derived types, and `commitmentFamilyForClass`. The remaining exports (`CANONICAL_DOMAINS`, `VERDICT_ENUM`, `MYSTERY_STATUS_ENUM`, `MYSTERY_RESOLUTION_SAFETY_ENUM`, `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, `REVISION_DIFFICULTY_VALUES`, `CF_TYPE_COMMON_VALUES`, `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED`, `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED`, `CF_TYPE_VALUES`) stay.

### 3. Drop 8 imports + per-class assertion blocks from `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`

Removed the same 8 imports as Change 1. Removed the retired-class assertion block for `commitment_family`, `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, and `stop_predicate`. Removed the `commitment_class` per-value family mapping assertion and updated the unsupported-class details assertion to list only the 11 surviving classes.

### 4. Drop 8 imports + constant assertion blocks from `tools/world-index/tests/public-types.test.ts`

Removed the same 8 imports as Change 1. Removed the retired constant equality assertions, the `commitmentFamilyForClass` helper invocation, and the commitment taxonomy mapping test. The remaining file's tests of surviving constants stay.

### 5. Drop SCAUD-003 retired-CHC-property sentinel assertions from `tools/world-mcp/tests/tools/get-record-schema.test.ts`

Removed the four retired-property sentinel assertions. The positive assertions (`properties.target_or_action_families`, `properties.surface_label`, `properties.player_visible_intent`, `properties.likely_state_pressure`, `properties.associated_commitment_block`, `properties.success_policy`) stay.

### 6. Drop `narrative_point_classification` residue from `tools/validators/tests/integration/validate-patch-plan.test.ts`

Removed the validator-name sentinel and three `stateSnapshot.narrative_point_classification` fixture assignments. Surrounding state-snapshot field assignments stayed intact.

## Files to Touch

- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify)
- `tools/world-index/src/public/canonical-vocabularies.ts` (modify)
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (modify)
- `tools/world-index/tests/public-types.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- Documentation surfaces (`docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, `tools/world-index/README.md`) — routed to SPEC29LEGTOOVOC-005.
- `arc_trace_record` removal from list-records / schema / parser / indexer / migration — routed to SPEC29LEGTOOVOC-002 (world-mcp surface) and SPEC29LEGTOOVOC-004 (world-index layer).
- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` + `tools/validators/tests/fixtures/story-storylet-complete.yaml` fixture — routed to SPEC29LEGTOOVOC-003.
- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` — routed to SPEC29LEGTOOVOC-002.
- `.claude/skills/_shared-templates/story-state-contract.md` §4.4 / §5a prohibition text — retained per SPEC-29 §6; this prose documents what the SLT schema rejects (the design contract), not what `get_canonical_vocabulary` exposes.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && npm test` passes; the public-types test does not import retired constants and does not assert on retired counts/mappings.
2. `cd tools/world-mcp && npm test` passes; `get-canonical-vocabulary.test.ts` exercises only the 11 surviving classes; `get-record-schema.test.ts` no longer carries the four retired-property sentinels.
3. `cd tools/validators && npm test` passes; the integration `validate-patch-plan.test.ts` no longer carries `narrative_point_classification` residue.
4. `grep -nE "case \"(commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate)\"" tools/world-mcp/src/tools/get-canonical-vocabulary.ts` returns no hits.
5. `grep -rnE "COMMITMENT_FAMILIES|COMMITMENT_CLASSES|COMMITMENT_CLASS_TO_FAMILY|ARC_ARCHETYPES|NARRATIVE_POINTS|STRONG_AXES|STRONG_OUTCOMES|STOP_PREDICATES|commitmentFamilyForClass|CommitmentFamily|CommitmentClass|ArcArchetype|NarrativePoint|StrongAxis|StrongOutcome|StopPredicate" tools/world-index/src tools/world-mcp/src tools/validators/src tools/patch-engine/src` returns no hits.

### Invariants

1. The `@worldloom/world-index/public/canonical-vocabularies` export surface contains only load-bearing exports (consumed by at least one skill or tools/src file). FOUNDATIONS §5b Schema-Minimalism at the registry scope.
2. `get_canonical_vocabulary`'s MCP-exposed enum class list is the 11 surviving classes only; no retired class name is reachable through the default-case error path under a distinct identity (the default case treats all unknown names uniformly).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — modify per Change 3; the file's remaining tests for the 11 surviving classes assert structural consistency rather than per-retired-class coverage.
2. `tools/world-index/tests/public-types.test.ts` — modify per Change 4; the file's remaining tests cover surviving exports.
3. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — modify per Change 5; the positive properties on CHC remain asserted.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — modify per Change 6; surrounding state-snapshot integration tests stay green.

### Commands

1. `cd tools/world-index && npm run build && npm test`
2. `cd tools/world-mcp && npm test`
3. `cd tools/validators && npm test`
4. `tools/world-index` must build before its test lane because its `npm test` script consumes compiled `dist` output. `tools/world-mcp` and `tools/validators` build inside their `npm test` scripts.

## Outcome

Completed. The seven retired vocabulary classes are no longer exported by `@worldloom/world-index/public/canonical-vocabularies`, no longer listed in `VOCABULARY_CLASSES`, and no longer reachable through `getCanonicalVocabulary`. Same-seam tests were updated to cover only the surviving vocabulary surface and to remove `narrative_point_classification` / retired CHC-property residue.

## Verification Result

1. `cd tools/world-index && npm run build` — passed.
2. `cd tools/world-index && npm test` — passed, 83 tests.
3. `cd tools/world-mcp && npm test` — passed, 362 tests.
4. `cd tools/validators && npm test` — passed, 221 tests. Output included the standard temporary-git default-branch hint from a test fixture; no test failed.
5. `rg -n 'COMMITMENT_FAMILIES|COMMITMENT_CLASSES|COMMITMENT_CLASS_TO_FAMILY|ARC_ARCHETYPES|NARRATIVE_POINTS|STRONG_AXES|STRONG_OUTCOMES|STOP_PREDICATES|commitmentFamilyForClass|CommitmentFamily|CommitmentClass|ArcArchetype|NarrativePoint|StrongAxis|StrongOutcome|StopPredicate' tools/world-index/src tools/world-mcp/src tools/validators/src tools/patch-engine/src` — no hits.
6. `rg -n 'case "(commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate)"' tools/world-mcp/src/tools/get-canonical-vocabulary.ts` — no hits.
7. Same-seam docs/README inspection found retired vocabulary prose in `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-index/README.md`; those hits were explicitly owned by follow-up `archive/tickets/SPEC29LEGTOOVOC-005.md`.

## Deviations

1. The drafted world-index proof command was corrected from `cd tools/world-index && npm test` to `cd tools/world-index && npm run build && npm test`, because the package test script runs compiled `dist/tests/**/*.test.js` and does not build by itself.
2. `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-index/README.md` remained stale after this ticket by design. They were excluded from this implementation ticket and later completed by `archive/tickets/SPEC29LEGTOOVOC-005.md`.
