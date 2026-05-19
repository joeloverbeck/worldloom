# SPEC50STPSTECHC-009: CHC↔SLT eligibility-source grounding validator

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (new structural validator + registry).
**Deps**: None

## Problem

No source-level rule requires a storylet-derived `CHC` to cite the predicate-bearing records that made its `SLT` eligible. A storylet can become eligible because of one set of records (e.g., `STPLAN-4`, `STEMO-2`, `STSEC-3`) while the emitted choice grounds in a different or incidental set, so the causal link between eligibility and the player-facing affordance is invisible and unauditable.

## Assumption Reassessment (2026-05-19)

1. Codebase: CHC grounding is validated across `tools/validators/src/structural/recursive-reference-closure.ts` / `observer-firewall.ts` and `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts`; new structural validators register in `tools/validators/src/public/registry.ts`. `CHC.associated_commitment_block` is the link between a choice and its source storylet. Verified this session.
2. Specs/contract: SPEC-50 §D.2 — the deterministic half is `accept-with-modification` of the audit's R4; the salience half stays warning-only.
3. Cross-artifact boundary: the validator reads `CHC.associated_commitment_block`, the SLT's selecting predicates, and `CHC.grounded_in.records[]`; it must align with the CHC/SLT schemas without duplicating the existing grounding validators.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape): this validator is scoped strictly to a per-choice eligibility-source trace. It MUST NOT score choice sets against an aggregate "active-state pressure distribution" or salience target — that drifts toward the global drama-manager pattern §5c rejects. The deliverable is the per-choice trace only.
5. HARD-GATE / Canon Safety surface: a new structural validator under `tools/validators/src/structural/` that gates story-bundle record writes at pre-apply. Confirm it does not weaken the Mystery Reserve firewall (it does not touch mystery state — it checks choice→storylet→predicate-record grounding).

## Architecture Check

1. A dedicated validator for the eligibility-source trace keeps the check separable from the existing reference-resolution and observer-access validators; the FAIL/WARN split (FAIL on missing required grounding with no rationale; WARN on weak/incidental grounding) avoids forcing cosmetic grounding citations.
2. No shim — a new validator, registered alongside existing CHC validators; no modification to the grounding semantics of sibling validators.

## Verification Layers

1. Storylet-derived CHC with no eligibility-source grounding and no background rationale -> FAIL (validator dry-run).
2. Storylet-derived CHC citing the eligibility records, or carrying an explicit background-only rationale -> PASS.
3. Weak/incidental grounding -> WARN.
4. §5c boundary preserved (no pool-level distribution check) -> FOUNDATIONS alignment check on the validator's inputs (per-choice only).

## What to Change

### 1. New eligibility-source grounding validator (D.2)

When `CHC.associated_commitment_block` is non-null, require the choice to ground in at least one of the records that made that SLT eligible (the records bound by the selecting predicates) OR carry an explicit rationale flag marking those predicate records as background-only. Missing required grounding with no rationale → FAIL; weak/incidental grounding → WARN. Register in `tools/validators/src/public/registry.ts`.

## Files to Touch

- `tools/validators/src/structural/` new validator (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/` validator test (new)

## Out of Scope

- Any pool-level salience / active-state pressure-distribution audit (§5c-forbidden).
- CHC.grounded_in STSTAT schema change (archive/tickets/SPEC50STPSTECHC-002.md).
- The accept-route prose-receipt check (SPEC50STPSTECHC-010).

## Acceptance Criteria

### Tests That Must Pass

1. Storylet-derived CHC with no eligibility-source link and no rationale → FAIL.
2. Storylet-derived CHC citing an eligibility record → PASS; with background-only rationale → PASS.
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
