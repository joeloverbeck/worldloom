# SPEC42STOSTADEB-016: Reconcile SPEC-42 capstone commitment-block coverage surface

**Status**: TODO
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` contract-test surface or `.claude/skills/commitment-block-authoring` authoring-contract surface.
**Deps**: None

## Problem

`cd tools/world-mcp && npm test` currently fails on the integration test `SPEC-42 capstone covers story-skill contract surfaces as executable surrogates` because the capstone expects `.claude/skills/commitment-block-authoring/SKILL.md` to contain the SPEC-42 coverage target labels:

- `clock_advancing`
- `clue_discovering`
- `setup_paying_off`

Those terms are present in `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`, where the live Phase 1 coverage target list now documents targets 12-14. They are not present in the parent `SKILL.md` surface that the capstone currently reads.

Archived ticket `archive/tickets/SPEC42STOSTADEB-011.md` says the SPEC-42 work extended the parent `commitment-block-authoring/SKILL.md` coverage list to include these three targets, while the current live repo has the detailed coverage list in the Phase 1 reference file. The failing test is therefore a real contract drift, but the owner surface needs reassessment before editing: either the parent skill must again expose the three target labels as a stable operator-facing summary, or the capstone must be updated to assert the reference file if that file is now the authoritative detailed surface.

This was discovered during review of `archive/tickets/RTINSTR-001.md`; it is unrelated to render-time instruction wording or page-plan canonical inlining.

## Assumption Reassessment

Before implementation, verify:

1. The current failing assertion in `tools/world-mcp/tests/integration/spec42-capstone.test.ts` reads `.claude/skills/commitment-block-authoring/SKILL.md` and expects the three SPEC-42 labels.
2. The live detailed coverage contract in `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` still names targets 12-14 as `clock_advancing`, `clue_discovering`, and `setup_paying_off`.
3. `archive/tickets/SPEC42STOSTADEB-011.md` is historical evidence, not current authority. Use it only to understand the original intent; resolve the current owner from live skill structure and current test purpose.
4. If the parent `SKILL.md` is meant to expose all load-bearing coverage target labels to operators, restore a concise parent-surface mention of the three labels and leave the capstone target unchanged.
5. If the Phase 1 reference is the authoritative detailed contract and the parent `SKILL.md` intentionally delegates to it, update the capstone to assert the reference file for these labels rather than duplicating them into the parent skill.

## Architecture Check

Keep the repair at the contract boundary the capstone is meant to protect. Do not add duplicate long-form coverage lists unless the parent skill already uses summary text as the stable executable surface. Prefer one source of detailed truth, with tests pointed at that source or a compact parent pointer that names the three load-bearing labels.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify if the parent skill must expose the three SPEC-42 target labels)
- `tools/world-mcp/tests/integration/spec42-capstone.test.ts` (modify if the capstone should assert the Phase 1 reference file instead of the parent skill)
- `tickets/SPEC42STOSTADEB-016.md` (mark complete with closeout evidence)

## Out of Scope

- Changing SPEC-42 record schemas or predicate DSL behavior.
- Editing story-bundle world content.
- Changing RTINSTR render-time instruction wording or page-plan canonical inliner behavior.
- Broad refactors of the capstone suite beyond this failed assertion surface.

## Acceptance Criteria

1. `cd tools/world-mcp && node --test dist/tests/integration/spec42-capstone.test.js` passes after rebuild.
2. `cd tools/world-mcp && npm test` no longer fails on `SPEC-42 capstone covers story-skill contract surfaces as executable surrogates`.
3. The final owner surface is truthful: the three labels are asserted where the live skill contract actually expects implementers to find Phase 1 coverage targets.

## Test Plan

1. Rebuild `tools/world-mcp` if needed so `dist/tests/integration/spec42-capstone.test.js` reflects source changes.
2. Run `cd tools/world-mcp && node --test dist/tests/integration/spec42-capstone.test.js`.
3. Run `cd tools/world-mcp && npm test`.
