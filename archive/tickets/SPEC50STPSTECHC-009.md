# SPEC50STPSTECHC-009: CHC↔SLT eligibility-source grounding validator

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (new structural validator + registry).
**Deps**: None

## Problem

No source-level rule requires a storylet-derived `CHC` to cite the predicate-bearing records that made its `SLT` eligible. A storylet can become eligible because of one set of records (e.g., `STPLAN-4`, `STEMO-2`, `STSEC-3`) while the emitted choice grounds in a different or incidental set, so the causal link between eligibility and the player-facing affordance is invisible and unauditable.

## Assumption Reassessment (2026-05-19)

1. Codebase: CHC grounding is validated across `tools/validators/src/structural/recursive-reference-closure.ts` / `observer-firewall.ts` and `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts`; new structural validators register in `tools/validators/src/public/registry.ts`. `CHC.associated_commitment_block` is the link between a choice and its source storylet. Rechecked on 2026-05-20.
2. Specs/contract: SPEC-50 §D.2 — the deterministic half is `accept-with-modification` of the audit's R4; the salience half stays warning-only.
3. Cross-artifact boundary: the validator reads `CHC.associated_commitment_block`, the SLT's selecting predicates, and `CHC.grounded_in.records[]`; it must align with the CHC/SLT schemas without duplicating the existing grounding validators.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape): this validator is scoped strictly to a per-choice eligibility-source trace. It MUST NOT score choice sets against an aggregate "active-state pressure distribution" or salience target — that drifts toward the global drama-manager pattern §5c rejects. The deliverable is the per-choice trace only.
5. HARD-GATE / Canon Safety surface: a new structural validator under `tools/validators/src/structural/` that gates story-bundle record writes at pre-apply. `docs/HARD-GATE-DISCIPLINE.md` was read on 2026-05-20; the validator does not weaken the Mystery Reserve firewall because it does not touch mystery state or approval semantics — it checks choice→storylet→predicate-record grounding.
6. Live mismatch corrected before implementation: the spec/ticket draft said CHC could carry an explicit background-only rationale flag, but `tools/validators/src/schemas/story-choice.schema.json` has `additionalProperties: false` and no such field, while SPEC-50 rejects new schema fields. The no-new-field implementation therefore treats `likely_state_pressure` text containing `eligibility_background_only:` followed by `all` or exact predicate-record ids as the explicit rationale mini-format. This is a transitional prose-backed validator convention, not a new CHC schema field.

## Architecture Check

1. A dedicated validator for the eligibility-source trace keeps the check separable from the existing reference-resolution and observer-access validators; the FAIL/WARN split (FAIL on missing required grounding with no rationale; WARN on weak/incidental grounding) avoids forcing cosmetic grounding citations.
2. No shim — a new validator, registered alongside existing CHC validators; no modification to the grounding semantics of sibling validators.

## Verification Layers

1. Storylet-derived CHC with no eligibility-source grounding and no `eligibility_background_only:` rationale in `likely_state_pressure` -> FAIL (validator dry-run).
2. Storylet-derived CHC citing at least one exact eligibility record, or carrying `eligibility_background_only: all` / exact predicate-record ids in `likely_state_pressure` -> PASS.
3. Weak/incidental same-class grounding -> WARN.
4. §5c boundary preserved (no pool-level distribution check) -> FOUNDATIONS alignment check on the validator's inputs (per-choice only).

## What to Change

### 1. New eligibility-source grounding validator (D.2)

When `CHC.associated_commitment_block` is non-null, require the choice to ground in at least one exact record id found in that SLT's selecting predicates OR carry a `likely_state_pressure` rationale marker (`eligibility_background_only: all` or `eligibility_background_only: <record ids>`) marking those predicate records as background-only. Missing required grounding with no rationale → FAIL; weak/incidental same-class grounding → WARN. Register in `tools/validators/src/public/registry.ts`.

## Files to Touch

- `tools/validators/src/structural/` new validator (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/` validator test (new)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify; stale SPEC-50 legacy SLT fixture truthing discovered during downstream proof)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify; stale SPEC-50 legacy SLT projection truthing discovered during downstream proof)

## Out of Scope

- Any pool-level salience / active-state pressure-distribution audit (§5c-forbidden).
- CHC.grounded_in STSTAT schema change (archive/tickets/SPEC50STPSTECHC-002.md).
- The accept-route prose-receipt check (SPEC50STPSTECHC-010).

## Acceptance Criteria

### Tests That Must Pass

1. Storylet-derived CHC with no eligibility-source link and no `eligibility_background_only:` rationale → FAIL.
2. Storylet-derived CHC citing an eligibility record → PASS; with `eligibility_background_only:` rationale → PASS.
3. Weak/incidental grounding → WARN.
4. `npm test --prefix tools/validators` green.

### Invariants

1. The validator's inputs are scoped to a single CHC and its associated SLT — never the choice-set distribution.
2. Non-storylet-derived CHC (null `associated_commitment_block`) is unaffected.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/` — eligibility-source grounding validator (FAIL / PASS / WARN cases).

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`

## Outcome

Implemented `chc_slt_eligibility_source_grounding` as a fail-mode structural validator. For each storylet-derived `CHC`, it finds the same-story associated `SLT`, extracts exact record ids from `preconditions.hard[]` and `preconditions.soft[]`, and requires either exact overlap with `CHC.grounded_in.records[]` or an explicit `likely_state_pressure` mini-format rationale (`eligibility_background_only: all` or exact predicate ids). Weak same-prefix/class grounding emits a warning; non-storylet-derived choices remain unaffected.

The validator is registered in the public validator registry, covered by focused PASS/FAIL/WARN tests, counted in the validators integration surfaces, and exposed through `world-mcp` capability parity. Downstream proof exposed stale world-mcp story-bundle fixtures that still used retired SPEC-50 `opens_obligations` / `opens_obligation`; those fixtures were truthed to current `SLT.effects` / `storylet_effect_ref` behavior so the capability parity check proves the live contract.

## Verification Result

- PASS: `npm test` in `tools/validators` before edits (672 tests) established the starting package baseline.
- PASS after one type-fix iteration: `npm run build` in `tools/validators`.
- PASS: `node --test dist/tests/structural/chc-slt-eligibility-source-grounding.test.js` in `tools/validators` (6 tests).
- PASS after one skipped-execution expectation fix: `npm test` in `tools/validators` (678 tests).
- PASS after stale fixture truthing: `npm run build` in `tools/world-mcp`.
- PASS: `node --test dist/tests/server/capability-parity.test.js` in `tools/world-mcp` (5 tests).
- PASS after projection-key order correction: `node --test dist/tests/tools/list-records.story-bundle.test.js` in `tools/world-mcp` (9 tests).

## Deviations

- The draft's "explicit background-only rationale flag" was not implemented as a new CHC field because the live CHC schema forbids additional properties and SPEC-50 rejects new schema fields. The implementation uses a transitional prose-backed marker in `likely_state_pressure` instead.
- The validator intentionally does not infer existential alias bindings or score pool-level pressure/salience distribution; it enforces only the per-choice CHC->SLT->predicate-record trace.
- World-mcp fixture/projection updates were added to the ticket scope because the required downstream parity proof failed on stale same-SPEC-50 legacy SLT obligation edges, not on unrelated runtime behavior.
