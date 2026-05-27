# SPEC42STOSTADEB-016: Reconcile SPEC-42 capstone commitment-block coverage surface

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` contract-test surface.
**Deps**: None

## Problem

At intake, `cd tools/world-mcp && npm test` failed on the integration test `SPEC-42 capstone covers story-skill contract surfaces as executable surrogates` because the capstone expected `.claude/skills/commitment-block-authoring/SKILL.md` to contain the SPEC-42 coverage target labels:

- `clock_advancing`
- `clue_discovering`
- `setup_paying_off`

Those terms are present in `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`, where the live Phase 1 coverage target list now documents targets 12-14. They are not present in the parent `SKILL.md` surface that the capstone read at intake.

Archived ticket `archive/tickets/SPEC42STOSTADEB-011.md` said the SPEC-42 work extended the parent `commitment-block-authoring/SKILL.md` coverage list to include these three targets. The current live repo now places the detailed coverage list in the Phase 1 reference file, and the parent `SKILL.md` delegates to that reference for "17 coverage targets." The failing test is therefore a real contract drift in the capstone's assertion surface, not a missing parent-skill contract.

This was discovered during review of `archive/tickets/RTINSTR-001.md`; it is unrelated to render-time instruction wording or page-plan canonical inlining.

## Assumption Reassessment (2026-05-27)

1. The failing assertion in `tools/world-mcp/tests/integration/spec42-capstone.test.ts` read `.claude/skills/commitment-block-authoring/SKILL.md` and expected `clock_advancing`, `clue_discovering`, and `setup_paying_off` there.
2. The live detailed coverage contract in `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` names targets 12-14 as `clock_advancing`, `clue_discovering`, and `setup_paying_off`.
3. The cross-artifact boundary is the SPEC-42 capstone's executable surrogate coverage of story-skill contract surfaces. The parent `SKILL.md` remains a routing surface; the detailed Phase 1 coverage target list is delegated to the reference file.
4. `archive/tickets/SPEC42STOSTADEB-011.md` is historical evidence, not current authority. Its closeout recorded parent-skill coverage entries, but the live parent skill now points operators to the reference for the full 17-target contract.
5. Pre-edit baseline: `cd tools/world-mcp && npm test` rebuilt the package and failed only the SPEC-42 capstone subtest `SPEC-42 capstone covers story-skill contract surfaces as executable surrogates` with `expected content to include clock_advancing`; summary was 494 pass, 1 fail.
6. Correction: update the capstone to assert `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` for the three detailed Phase 1 target labels instead of duplicating those labels into `.claude/skills/commitment-block-authoring/SKILL.md`.
7. Package public-surface inspection: `tools/world-mcp/README.md` does not document this SPEC-42 test surrogate or the commitment-block coverage labels, so no package README/example update is required.

## Architecture Check

Keep the repair at the contract boundary the capstone is meant to protect. The parent skill already delegates the detailed Phase 1 coverage contract to `references/phase-1-coverage-diagnosis.md`, so the capstone should assert that authoritative reference instead of forcing duplicate target labels into the parent routing prose.

## Verification Layers

1. Capstone source reads the authoritative detailed coverage reference for the three SPEC-42 labels -> codebase grep-proof plus focused compiled capstone test.
2. Parent skill still points operators at `references/phase-1-coverage-diagnosis.md` for the 17 coverage targets -> manual review / grep-proof.
3. Package executable surrogate remains green for SPEC-42 story-skill contract surfaces -> `node --test dist/tests/integration/spec42-capstone.test.js` after rebuild.

## Files to Touch

- `tools/world-mcp/tests/integration/spec42-capstone.test.ts` (modify)
- `archive/tickets/SPEC42STOSTADEB-016.md` (mark complete with closeout evidence and archive)

## Out of Scope

- Changing SPEC-42 record schemas or predicate DSL behavior.
- Editing story-bundle world content.
- Changing RTINSTR render-time instruction wording or page-plan canonical inliner behavior.
- Broad refactors of the capstone suite beyond this failed assertion surface.

## Acceptance Criteria

1. `cd tools/world-mcp && node --test dist/tests/integration/spec42-capstone.test.js` passes after rebuild.
2. `cd tools/world-mcp && npm test` no longer fails on `SPEC-42 capstone covers story-skill contract surfaces as executable surrogates`.
3. The final owner surface is truthful: the three labels are asserted in `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`, where the live skill contract expects implementers to find Phase 1 coverage targets.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec42-capstone.test.ts` — updates the existing SPEC-42 capstone surrogate to read the authoritative Phase 1 coverage reference for detailed target labels.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/integration/spec42-capstone.test.js`
3. `cd tools/world-mcp && npm test`

## Outcome

Completed on 2026-05-27.

The SPEC-42 capstone now keeps the parent `commitment-block-authoring/SKILL.md` assertion focused on the routing contract: it must point operators to `references/phase-1-coverage-diagnosis.md` for the 17 Phase 1 coverage targets. The detailed `clock_advancing`, `clue_discovering`, and `setup_paying_off` assertions now read that reference file directly, which is the live authoritative surface for targets 12-14.

No `.claude/skills/commitment-block-authoring/SKILL.md` prose changed; the parent skill already delegates to the reference. No world content, schema, validator, patch-engine, or HARD-GATE semantics changed.

## Verification Result

- `cd tools/world-mcp && npm test` — pre-edit baseline FAIL; rebuilt the package and failed only `SPEC-42 capstone covers story-skill contract surfaces as executable surrogates` with `expected content to include clock_advancing`; summary: 494 pass, 1 fail.
- `cd tools/world-mcp && npm run build` — PASS; rebuilt compiled `dist/` output for the source test change.
- `cd tools/world-mcp && node --test dist/tests/integration/spec42-capstone.test.js` — PASS; 4 tests passed, including the story-skill contract surrogate.
- `cd tools/world-mcp && npm test` — PASS; 495 tests passed, 0 failed. The formerly failing SPEC-42 capstone subtest passed.
- Manual contract review / grep-proof — PASS; parent `SKILL.md` contains `references/phase-1-coverage-diagnosis.md` and `17 coverage targets`, while the reference contains `clock_advancing`, `clue_discovering`, and `setup_paying_off`.

## Deviations

- The ticket resolved the drafted either/or by updating the capstone test, not the parent skill. Reassessment showed the parent skill is a routing surface and the Phase 1 reference is the detailed operator contract.
- `tools/world-mcp/dist/` was refreshed by package build/test commands and remains an ignored generated artifact, not a tracked source edit.
