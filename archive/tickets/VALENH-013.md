# VALENH-013: storylet_predicate_dsl_parsability sees in-plan CNSQ/SREL creates during pre-apply

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`; paired rule and pre-apply integration tests under `tools/validators/tests/`.
**Deps**:

## Problem

At intake, the `storylet_predicate_dsl_parsability` validator failed to resolve a same-envelope CNSQ reference from a storylet precondition. Reassessment found the pre-apply read surface already overlays patch-plan creates (`buildPreApplyReadSurface`), so most in-plan story records are visible through `ctx.index.query(record_type)`. The active defect is narrower: the predicate validator queries two stale node-type names, `story_consequence_record` and `story_relationship_record`, while the live index/pre-apply overlay emits `consequence_record` and `relationship_record_story`. That makes same-plan CNSQ/SREL records invisible to the validator's `activeRecordIds` set and causes false `predicate.unresolved_reference` failures.

The branching-story-bootstrap session of 2026-05-13 hit this directly: `SLT-0004` (the "name the bruise on her arm aloud" storylet in the red-bunny bundle) included `{pred: "record_active", record: "CNSQ-0001"}` as a hard precondition — the CNSQ-0001 bruise consequence record was being created in the same patch envelope alongside the SLT. The validator rejected with `"SLT-0004: preconditions.hard[2].record references missing CNSQ-0001"`. The operator removed the precondition to ship the bundle; the disclosure-storylet now lacks the structural CNSQ-active guard that would block selection of the bruise-naming move when the bruise has already healed or been closed in a future page state.

The general pre-apply overlay already covers SLT/STINT/SF/BEL/STLOC/STOBJ/THR/OBL/story-local DA references when the validator asks for the live node type. This ticket fixes the stale CNSQ/SREL query buckets and keeps the wider audit of other validators' in-plan visibility out of scope.

## Assumption Reassessment (2026-05-13)

1. Current validator state (HEAD): `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts:91-130` defines `loadReferenceSets(ctx)` which queries `ctx.index.query({ world_slug, record_type, story_slug? })` for each story-bundle record type. The consequence and relationship buckets use stale node-type names (`story_consequence_record`, `story_relationship_record`) that do not match the live world-index node types.
2. Current pre-apply infrastructure (HEAD): `Context` carries `ctx.patch_plan?.patches[]` for `applies_to`, but `tools/validators/src/public/index.ts` already passes `buildPreApplyReadSurface(db, envelope)` as `ctx.index`. That read surface materializes in-plan creates before `ctx.index.query(...)`, so the validator should rely on the index abstraction and ask it for the live node type names.
3. Shared boundary under audit: the predicate-validator's contract for the closed DSL (`fact_true`, `belief`, `record_active`, etc., per `.claude/skills/_shared-templates/story-state-contract.md` §5) — the contract is that predicate references must resolve to active story-bundle records in the page's state_snapshot. In pre-apply mode, the page's state_snapshot is represented by the pre-apply index overlay; stale query keys lose that in-plan visibility for CNSQ/SREL.
4. FOUNDATIONS principle restated: §Story Bundles §4 (the eight shared hard gates) — gate 5 ("append-only delta") and gate 7 ("plan grounding") both depend on the predicate validator correctly identifying which records are active at the new page. When the validator can't see in-plan records, gate 7's grounding check is silently weakened (any precondition referencing a same-plan create fails, forcing operators to drop the precondition or hard-code its absence).
5. Adjacent contradiction surfaced during reassessment: other validators may still have stale node-type names or pre-apply overlay blind spots. Classification: future cleanup — name as a separate `VALENH-NNN` ticket after this one lands, scoped to the wider in-plan-visibility audit; do NOT bundle into this ticket since the predicate validator's CNSQ/SREL reference sets are the most specific surface.
6. Reassessment correction: the drafted ticket used stale story-bundle node-type names for two buckets. The live world-index, structural validator, MCP retrieval, and patch-engine surfaces use `consequence_record` and `relationship_record_story`, not `story_consequence_record` / `story_relationship_record` (`tools/world-index/src/parse/atomic.ts`, `tools/validators/src/structural/utils.ts`, `tools/world-mcp/src/tools/_shared.ts`, `tools/patch-engine/src/ops/create-story-record.ts`). This ticket owns correcting the predicate validator and its test fixtures to the live names because the CNSQ/SREL reference sets are part of the same validator contract.
7. Reassessment correction: `tools/validators/package.json` is npm/package-local, with `npm run build` and `npm test`; no repo-root pnpm workspace manifest controls this package. The proof surface is corrected from the drafted `pnpm test -- predicate_dsl` to package-local build plus the compiled rule test and package test.

## Architecture Check

1. The proposed change corrects `loadReferenceSets` to query the live CNSQ/SREL node types (`consequence_record`, `relationship_record_story`) through the existing index abstraction. This is cleaner than duplicating pre-apply patch-plan merge logic inside the rule validator, because the package already centralizes overlay materialization in `buildPreApplyReadSurface`.
2. No backwards-compatibility shim: no aliases are added for stale node-type names. Tests move to the live node types, and full-world/incremental/pre-apply modes all use the same corrected query keys.

## Verification Layers

1. Pre-apply validator with a patch plan that creates SLT + CNSQ in the same envelope: the SLT's `record_active(CNSQ-NNNN)` precondition resolves cleanly through the pre-apply overlay and live `consequence_record` query key → package integration test.
2. Pre-apply validator with a patch plan whose SLT references a NON-existent CNSQ (neither on-disk nor in-plan): still fails with `predicate.unresolved_reference` → package integration test.
3. Full-world and incremental rule-level behavior continues to pass with live CNSQ/SREL node-type fixtures → compiled rule test.
4. Full-package validator suite continues to pass → `npm test`.

## Landed Changes

### 1. Reference-set builder: use live CNSQ/SREL node types

In `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, `loadReferenceSets(ctx)` now:

- Uses `consequence_record` for the consequences bucket.
- Uses `relationship_record_story` for the relationships bucket.
- Preserves the existing index abstraction; pre-apply in-plan visibility remains centralized in `buildPreApplyReadSurface`.

### 2. Tests for in-plan visibility

The test surface now:

- Builds a package integration pre-apply plan containing `create_cnsq_record` (CNSQ-0001) + `create_slt_record` (SLT-0001 with `{pred: 'record_active', record: 'CNSQ-0001'}` precondition), and asserts no CNSQ unresolved-reference verdict.
- Builds a package integration pre-apply plan containing only `create_slt_record` referencing CNSQ-0099 (not in-plan, not on-disk), and asserts a `predicate.unresolved_reference` verdict.
- Uses live `consequence_record` / `relationship_record_story` fixtures in the rule-level full-world coverage.

### 3. Update validator docstring / code comment

An inline comment near `loadReferenceSets` explains that pre-apply in-plan visibility is supplied by the context's index read surface; this validator must query live node-type names so the overlay and on-disk index agree.

## Files to Touch

- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — live CNSQ/SREL node-type fixtures)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — same-envelope CNSQ and missing-CNSQ pre-apply tests)

## Out of Scope

- Re-emitting the already-committed `red-bunny` bundle's SLT-0004 to restore the `record_active(CNSQ-0001)` precondition (the bundle remains as-shipped; future bundles can use the precondition once the validator sees in-plan records).
- In-plan-visibility fixes for OTHER pre-apply validators (`cross_file_reference`, `state_snapshot_integrity`, etc.); those route to a separate follow-up ticket scoped to the wider in-plan-visibility audit.
- Two-phase patch-engine commit (orthogonal architectural change; would be a much larger ticket).
- Skill-prose updates encouraging operators to use `record_active` predicates against in-plan creates (route via `/skill-audit` after this lands).

## Acceptance Criteria

### Tests That Must Pass

1. New package integration test: pre-apply validator with a `create_cnsq_record` + `create_slt_record` patch plan where the SLT references the CNSQ produces zero `predicate.unresolved_reference` verdicts.
2. New package integration test: pre-apply validator with a `create_slt_record` patch plan where the SLT references a CNSQ that is neither in-plan nor on-disk still produces one `predicate.unresolved_reference` verdict.
3. Existing tests under `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` continue to pass without modification (no regression on full-world or incremental modes).

### Invariants

1. The pre-apply overlay remains additive only — it does NOT replace the index-derived set; on-disk records remain visible.
2. No validator-local patch-plan merge is introduced; `full-world`, `incremental`, and `pre-apply` all read through `ctx.index`.
3. Each reference-set bucket uses the live node type for that record class (CNSQ → `consequence_record`, SREL → `relationship_record_story`, SF → `story_fact_record`, BEL → `belief_record`, etc.); no bucket-mixing.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — truth the CNSQ/SREL fixtures to the live `consequence_record` / `relationship_record_story` node types and preserve full-world/incremental rule coverage.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — add pre-apply patch-plan coverage for same-envelope CNSQ visibility and missing-CNSQ rejection.

### Commands

1. Build: `cd tools/validators && npm run build`
2. Targeted: `cd tools/validators && node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js`
3. Targeted integration: `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js`
4. Full-package: `cd tools/validators && npm test`
5. End-to-end: optional/manual if a current red-bunny bootstrap envelope is available; otherwise the synthetic pre-apply patch-plan integration tests are the portable acceptance surface.

## Outcome

Completed. The predicate validator now queries `consequence_record` and `relationship_record_story`, matching the live world-index, pre-apply overlay, structural validator, and MCP retrieval node-type vocabulary. The rule fixture was truthed to those live node types, and `validatePatchPlan` now has regression coverage for both same-envelope CNSQ visibility and missing-CNSQ rejection.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` — passed, 5/5 tests.
3. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js` — passed, 15/15 tests.
4. `cd tools/validators && npm test` — passed, 182/182 tests. The run emitted the existing Git default-branch hint from a temp repo test; no validator test failed.

## Deviations

- Reassessment narrowed the implementation from a validator-local patch-plan merge to live node-type correction. The package already centralizes pre-apply overlay materialization in `buildPreApplyReadSurface`, so duplicating patch-plan merge logic inside this rule would create a second transport path for the same records.
- The drafted red-bunny envelope smoke was not run because no current envelope path was part of the live repo. The portable acceptance proof is the synthetic `validatePatchPlan` integration coverage for the same `create_cnsq_record` + `create_slt_record` failure mode.
