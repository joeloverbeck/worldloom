# VALENH-006: Recursive reference closure — page references must be branch-path-direct

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/recursive-reference-closure.ts` (modify), `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — add page-reference fixtures and legacy OBL branch-anchor fixtures).
**Deps**: `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md` (the validator this ticket patches)

## Problem

At intake, `recursive_reference_closure` (landed in VALENH-004) treated every `PG-NNNN` string reachable from a new page's `state_snapshot` as a story-local record reference and required that record's `created_at_page` field to be inside the new page's `branch_path`. PG records, however, do not carry a `created_at_page` field — page records ARE pages, not records-on-pages; their own `id` is their branch anchor by definition. The validator's `createdAtPageFor(parsedTarget)` returned `undefined`, and `isAllowedReference` rejected every PG reference as a "branch_leak", regardless of whether the referenced PG id was in `branch_path`.

The cascade is severe in practice. Story-bundle records contain raw `PG-NNNN` strings in fields the validator's `NON_EDGE_FIELDS` skip-list does NOT cover:
- `OBL.introduced_at_page` (every obligation declares the page where it was introduced)
- `SREL.last_meaningful_interaction` (relationship-state records optionally pin the last interaction page)
- `CHC.emitted_at_page` and `CHC.created_at_page` (every emitted choice declares its page; `created_at_page` is in NON_EDGE_FIELDS but `emitted_at_page` is not)
- `SE.source.parent_page_id` (story event records declare the parent page)

The validator also follows `supersedes` chains and walks into existing on-disk records' bodies (records committed before VALENH-004 landed), so on a real bundle with any supersession history, the failure cascade reaches dozens of PG references through paths like:

```
state_snapshot.relationships_current[0]    # SREL-0005 (this turn)
  .supersedes                              # SREL-0004 (prior turn)
  .supersedes                              # SREL-0003 (turn before)
  .last_meaningful_interaction             # PG-0002 (string)  → look up → no created_at_page → FAIL
```

A real reproduction case landed in this work session: page-cycle invocation `--world_slug erotica-world --story_slug red-bunny --parent_page_id PG-0003 --chosen_choice_id CHC-0015`. The new PG-0004 patch envelope (`/tmp/STORY-0001-page-cycle-PG-0004-red-bunny.json`) passed every other validator (snapshot_replay_equality, record_schema_compliance, rule1-rule12, id_allocation_race, cross_file_reference, etc.) and produced cascading branch-leak verdicts from PG-reference recursion. During implementation, the same reproduction also exposed pre-existing OBL-0001 through OBL-0008 records without `created_at_page`; those records carry `introduced_at_page: PG-0001`, which is the truthful legacy branch anchor for obligations and is now handled without mutating old story source records.

## Assumption Reassessment (2026-05-06)

1. `tools/validators/src/structural/recursive-reference-closure.ts` defines `STORY_LOCAL_ID` with `PG` included, resolves branch containment through `createdAtPageFor`, and previously rejected `createdAtPage === undefined` outright. PG records produced by the story pipeline carry `id`, `parent_page_id`, `branch_path`, etc., but not `created_at_page`.
2. `tools/validators/tests/structural/recursive-reference-closure.test.ts` previously included `created_at_page: "PG-0002"` on the PG fixture used by the closure test. Live page records do not match that fixture shape, so focused PG tests were required.
3. `worlds/erotica-world/stories/red-bunny/_source/pages/PG-0001.yaml`, `PG-0002.yaml`, `PG-0003.yaml` — all three were authored before VALENH-004 landed, and none carry `created_at_page`. Verified by `grep -E "created_at_page" worlds/erotica-world/stories/red-bunny/_source/pages/*.yaml` returning no matches on the page records themselves (the matches inside `validation_trace` notes are prose, not record fields).
4. The first post-fix reproduction run showed the PG bug was not the only live-shape mismatch in the envelope: `worlds/erotica-world/stories/red-bunny/_source/obligations/OBL-0001.yaml` through `OBL-0008.yaml` lack `created_at_page` and carry `introduced_at_page: PG-0001`. Treating `introduced_at_page` as the legacy OBL branch anchor is same-validator fallout because otherwise the accepted reproduction lane still fails without any PG leak remaining.
5. The shared boundary under audit is the validator's `isAllowedReference`, `createdAtPageFor`, and branch-anchor selection behavior plus the implicit data-shape contract for page records and legacy obligations produced by the story-pipeline skill family.
6. FOUNDATIONS §Story Bundles §5 (Validation Rules At Story Scope) names Rule 4 (No Globalization by Accident) as the principle behind story-scope branch isolation — global author-pool storylets must not reference branch-local record IDs whose branch anchor is non-null.
7. HARD-GATE / Canon Safety Check semantics: this ticket strengthens `recursive_reference_closure` correctness without weakening any firewall. The Mystery Reserve firewall is owned by `rule7_mystery_reserve_preservation` and is unaffected.
8. Intake grep evidence: `tools/validators/src/structural/recursive-reference-closure.ts` is the only file that needed functional change. The validator is registered at `tools/validators/src/public/registry.ts` and that registration is correct as-is. Existing dirty page-cycle skill prose contains adjacent story-record shape wording, but this ticket did not edit that pre-existing skill work.
9. Adjacent contradiction classification: the OBL fallback is required same-validator consequence fallout for the live reproduction. It is not a Mystery-Reserve / canon-promotion regression and does not require migration of old story source records.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** Two alternatives were considered:
   - **(B) Add `created_at_page` to PG records (skill change + data migration).** Updating `branching-story-bootstrap` and `branching-story-page-cycle` to emit `created_at_page: <self>` on every PG record they create, plus a one-time migration of existing PG records on every story bundle. Conservative — aligns with the validator's already-tested fixture shape — but requires retroactive structural-field appends on closed PG records (technically a retcon under FOUNDATIONS Rule 6's append-only contract) AND pipeline-wide skill changes. Heavier touchpoint surface, and the field is semantically redundant (a page's `created_at_page` is always its own `id`).
   - **(C) Add the leak-prone fields to `NON_EDGE_FIELDS`** (`introduced_at_page`, `last_meaningful_interaction`, `emitted_at_page`, `parent_page_id`, `supersedes`). Crude — `supersedes` legitimately needs traversal to verify the supersession chain stays in branch — and shifts the burden to a hand-maintained skip-list that future field additions must remember to update.

   The landed fix special-cases PG references inside `isAllowedReference` to check the PG `id` directly against `branchPath`: a PG reference is in-branch iff that PG id is in the new page's `branch_path`. The same implementation adds a narrow branch-anchor helper for legacy OBL records, using `introduced_at_page` only when `created_at_page` / `provenance.created_at_page` is absent. No skill changes, no data migration, no growing skip-list.

2. **No backwards-compatibility aliasing/shims introduced.** The validator's external contract (verdict shape, applies_to predicate, registry name) is unchanged. Existing tests continue to pass; new tests cover PG-reference handling and the legacy OBL `introduced_at_page` branch-anchor fallback explicitly.

## Verification Layers

1. PG references resolved against `branch_path` directly → structural validator test for PG references in same-branch positions (PG-0001 reachable from PG-0002 via `OBL.introduced_at_page` passes).
2. PG references outside `branch_path` rejected → structural validator test for sibling-branch PG references (PG-0099 reachable from PG-0002 via `OBL.introduced_at_page` fails with a `branch_leak` verdict).
3. Legacy OBL records without `created_at_page` resolve their branch anchor from `introduced_at_page` only → structural validator pass/fail tests for in-branch and sibling-page `introduced_at_page`.
4. Existing same-branch and sibling-branch tests continue to pass → re-run the existing `recursive-reference-closure.test.ts` suite with the new cases.
5. Live reproduction case clears → re-validate `/tmp/STORY-0001-page-cycle-PG-0004-red-bunny.json` (the prepared PG-0004 envelope already on disk) and confirm `recursive_reference_closure` returns `pass` with no verdicts.
6. FOUNDATIONS / HARD-GATE alignment → manual review against `docs/FOUNDATIONS.md` §Story Bundles §5 (Rule 4 No Globalization by Accident) and `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` gate 3 prose.

## Landed Changes

### 1. Patch branch-anchor selection and page-record authorization

`recursive_reference_closure` now resolves a referenced record's branch anchor through `referenceBranchPageFor`. It preserves the existing `created_at_page` / `provenance.created_at_page` behavior first, falls back to `introduced_at_page` only for legacy `obligation_record` targets, and lets `isAllowedReference` authorize `page_record` targets directly by their PG id in `branch_path`.

### 2. Update the `branchLeak` message to reflect PG semantics

When a PG reference is rejected, `branchLeak` now reports the page id as the `created_at_page` detail value for `page_record` targets and gives a page-specific suggested fix. Non-page branch leaks preserve the existing suggested fix.

### 3. Add focused tests for PG-reference handling

In `tools/validators/tests/structural/recursive-reference-closure.test.ts`, added five test cases:

- **`recursive_reference_closure passes for same-branch PG references`** — fixture where an OBL has `introduced_at_page: "PG-0001"` and PG-0001 is in `branch_path` for PG-0002; expect no verdicts. PG-0001 record may be authored either with or without `created_at_page` (cover both shapes).
- **`recursive_reference_closure fails for sibling-branch PG references`** — fixture where an OBL has `introduced_at_page: "PG-0099"` reachable from PG-0002.state_snapshot; PG-0099 is NOT in `branch_path`; expect a `branch_leak` verdict whose `detail.reference_id === "PG-0099"`.
- **`recursive_reference_closure passes for PG references with no created_at_page field`** — explicit coverage that the test fixture's currently-implicit shape (PG record without `created_at_page`) does not regress: a PG-0001 record authored without `created_at_page`, reachable from PG-0002 via `SREL.last_meaningful_interaction = "PG-0001"`, must pass when PG-0001 is in branch_path.
- **`recursive_reference_closure accepts legacy obligations with introduced_at_page`** — fixture where an OBL has no `created_at_page` but has `introduced_at_page: "PG-0001"` and remains in branch.
- **`recursive_reference_closure rejects legacy obligations introduced outside the branch`** — fixture where an OBL has no `created_at_page` and `introduced_at_page: "PG-0099"` outside branch.

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — `referenceBranchPageFor`, `isAllowedReference`, `branchLeak`)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — add 3 PG-reference test cases and 2 legacy OBL branch-anchor test cases)

## Out of Scope

- Adding `created_at_page` to PG records emitted by `branching-story-bootstrap` / `branching-story-page-cycle`. The validator fix obviates this; if a future ticket wants the field for human-readability or audit-trail clarity, it can land independently as an additive schema extension.
- Retroactive migration of existing PG records (`worlds/<slug>/stories/<slug>/_source/pages/PG-NNNN.yaml`). Same reason — the validator fix obviates the need.
- Expanding `NON_EDGE_FIELDS` to skip more fields. The PG fix is targeted; non-PG references continue to require `created_at_page` resolution as before except for legacy `obligation_record` targets that use their existing `introduced_at_page` branch anchor.
- Changing skill prose in `branching-story-page-cycle/references/phase-9-validation-gates.md`. The documented semantics already match the corrected validator behavior; no doc drift.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — succeeds.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js` — passes.
3. `cd tools/validators && npm test` — passes (130/130 tests; no regressions across the full validators package).
4. **Live reproduction case clears**: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/STORY-0001-page-cycle-PG-0004-red-bunny.json` returns `status: pass`. (The envelope is already prepared on disk and is bit-identical to what the page-cycle skill submitted at the moment this ticket was authored.)

### Invariants

1. A PG reference reachable from a new page's `state_snapshot` is allowed iff that PG id is in the new page's `branch_path`. The PG record's body shape (`created_at_page` field present or absent) is irrelevant.
2. Non-PG story-local references (SF / SE / CNSQ / THR / SREL / STINT / STLOC / STOBJ / DA / SLT / CHC / BR) continue to require `created_at_page` resolution per the existing validator contract. Legacy OBL records without `created_at_page` may use `introduced_at_page` as their branch anchor.
3. Author-pool storylets (`provenance.created_at_page: null` AND `visibility.scope: global_author_pool`) continue to pass without branch_path containment per the existing validator contract.
4. World-level artifact ids (DA-NNNN at world scope, etc.) continue to be recognized via the `worldLevelIds` map and are not treated as missing or out-of-branch.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — added five test cases per §Landed Changes item 3. Each test follows the existing fixture-builder pattern (`records()` + `storyRecord()` + `patchPlan()`) so the additions are stylistically consistent.
2. No changes to `registry.test.ts` (validator name/applies_to predicate unchanged).
3. No changes to `spec04-verification.test.ts` (registry count unchanged).
4. No changes to `validate-patch-plan.test.ts` (Shape B execution expectation unchanged).

### Commands

1. `cd tools/validators && npm run build` — producer build.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js` — targeted compiled structural/registry pass.
3. `cd tools/validators && npm test` — full validators-package pass.
4. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/STORY-0001-page-cycle-PG-0004-red-bunny.json` — end-to-end reproduction-case pass.

## Outcome

Completion date: 2026-05-06.

Implemented direct PG branch-path authorization in `recursive_reference_closure`: page targets are allowed when their PG id is in the new page's `branch_path`, independent of whether the page record carries `created_at_page`. Rejected page targets now report the PG id as the branch anchor and give a page-specific suggested fix.

During reproduction verification, the same live red-bunny envelope exposed legacy OBL records without `created_at_page`. The validator now preserves the existing `created_at_page` / `provenance.created_at_page` contract first, and only for `obligation_record` targets falls back to `introduced_at_page` when the created-at field is absent. That keeps the branch-isolation invariant intact without mutating old story source records.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js` — passed.
3. `cd tools/validators && npm test` — passed, 130/130 tests.
4. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/STORY-0001-page-cycle-PG-0004-red-bunny.json` — passed with `status: "pass"`, no verdicts, and `recursive_reference_closure` status `pass`.

## Deviations

- The active implementation added a narrow legacy OBL fallback after the first reproduction rerun showed remaining `recursive_reference_closure.branch_leak` verdicts for OBL-0001 through OBL-0008. Those records lacked `created_at_page` but carried `introduced_at_page: PG-0001`. This was same-validator fallout needed for the ticket's live reproduction acceptance and avoided retroactive story-source migration.
- Pre-existing dirty edits in `.claude/skills/branching-story-page-cycle/` were left untouched. Some same-family skill prose still discusses current story-record `created_at_page` discipline, but the active validator ticket only changed the package implementation and tests.
