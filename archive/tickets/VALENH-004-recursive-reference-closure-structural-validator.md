# VALENH-004: Recursive reference closure structural validator

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/` (new validator), `tools/validators/src/public/registry.ts` (register validator), plus focused tests under `tools/validators/tests/`.
**Deps**: none

## Problem

At intake, `branching-story-page-cycle` Phase 9 gate 3 was still operator-verified: the operator had to recursively inspect every story-local record reachable from a new page's `state_snapshot` and ensure no nested reference leaked across sibling branches. That branch-isolation invariant is load-bearing for fork/replay correctness, but there was no structural validator that rejected a PG create whose reachable story-local graph cited records outside `this_page.branch_path`.

## Assumption Reassessment (2026-05-05)

1. `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md` landed `snapshot_replay_equality` for Phase 9 gate 4 only and explicitly out-scoped Phase 9 gate 3 as a separate structural-validator candidate.
2. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` defines gate 3 as recursive reference closure: every story-local record reachable from `this_page.state_snapshot`, at any depth, must cite only records with `created_at_page == null` or `created_at_page` inside `this_page.branch_path`.
3. The shared boundary under audit is the validators package's pre-apply materialized story-bundle read surface for Shape B `create_pg_record` plans, plus the page-cycle record fields `state_snapshot`, `branch_path`, nested story-local ID references, and each referenced record's `created_at_page`.
4. FOUNDATIONS Rule 5 and §Validation Rules At Story Scope motivate this ticket by requiring story pages to preserve consequences and action-state continuity without silently leaking sibling-branch state into the current branch.
5. HARD-GATE / Canon Safety Check semantics are affected because Phase 9 is the page-cycle Canon Safety Check phase. This ticket must strengthen gate 3 without weakening Mystery Reserve firewall behavior or canon-promotion approvals.
6. Intake grep evidence showed the branch-isolation invariant was documented in `.claude/skills/branching-story-page-cycle/SKILL.md`, `references/governance-and-foundations.md`, and `references/phase-5-state-mutation.md`, but no `recursive_reference_closure` validator was registered in `tools/validators/src/public/registry.ts`.
7. Package/proof reassessment confirmed `tools/validators/package.json` owns the live proof lane through package-local `npm run build`, direct compiled `node --test dist/tests/...`, and `npm test`; there is no root workspace command needed for this ticket.

## Architecture Check

1. A structural validator is the clean boundary because the invariant is graph-shaped, deterministic, and pre-apply checkable from materialized story records. Operator-only validation is too easy to miss, and embedding the check in patch-engine apply would couple validation with mutation.
2. No backwards-compatibility aliasing/shims introduced. Existing `validation_trace` prose remains an audit trail; the validator adds programmatic enforcement.

## Verification Layers

1. Validator registration -> codebase grep-proof and registry test.
2. Same-branch recursive references pass -> structural validator test with nested records reachable from `PG.state_snapshot`.
3. Sibling-branch nested references fail -> structural validator test with a reachable record citing an ID whose `created_at_page` is outside `this_page.branch_path`.
4. Author-pool storylets with `created_at_page: null` remain legal -> structural validator test.
5. FOUNDATIONS / HARD-GATE alignment -> manual review against `docs/FOUNDATIONS.md` and page-cycle Phase 9 gate 3 prose.

## Landed Changes

### 1. Add a recursive reference closure validator

Added `recursive_reference_closure` as a PG-create-only structural validator. It walks story-local IDs reachable from the new page's `state_snapshot`, follows nested story-local references through object values, arrays, and map keys, and classifies each referenced record by `created_at_page` / `provenance.created_at_page`.

References are accepted when the referenced record was created on the current page's `branch_path`. `created_at_page: null` is accepted only for `storylet_record` records whose `visibility.scope` is `global_author_pool`, matching the author-pool exception in Phase 9 gate 3. Missing records and sibling-branch records emit structured fail verdicts with the leaking reference path.

### 2. Register the validator

Registered the validator in `tools/validators/src/public/registry.ts` so pre-apply validation runs it automatically for Shape B `create_pg_record` plans. Non-PG plans skip it with the existing `applies_to=false` execution behavior.

### 3. Add focused tests

Added focused structural tests for clean same-branch closure, sibling-branch leakage at nested depth, author-pool `created_at_page: null` allowance, world-level artifact ID allowance, missing referenced records, and envelopes without PG creates. Updated the registry and integration tests so validator counts and pre-apply execution expectations include `recursive_reference_closure`.

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — skip and Shape B page-op execution expectations)

## Out of Scope

- Snapshot replay equality; landed in `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md`.
- State snapshot field-population integrity; tracked separately by `tickets/VALENH-005-state-snapshot-integrity-structural-validator.md`.
- Changing page-cycle skill prose unless reassessment proves a factual handoff correction is required.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/validators` succeeds.
2. `node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js` from `tools/validators` passes.
3. `npm test` from `tools/validators` passes.

### Invariants

1. Every story-local ID reachable from a new PG's `state_snapshot`, recursively, resolves to a record whose `created_at_page` is either `null` or inside the new PG's `branch_path`.
2. Any sibling-branch reachable record reference produces a fail verdict with enough location/detail information for the operator to identify the leaking reference path.
3. World-canon IDs and author-pool storylets are not rejected as branch leaks.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — positive and negative graph-closure fixtures.
2. `tools/validators/tests/structural/registry.test.ts` — assert validator registration.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — confirm non-PG plans skip the PG-only validator and Shape B page plans execute it.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js`
3. `cd tools/validators && npm test`

## Outcome

Completion date: 2026-05-05.

Implemented `recursive_reference_closure` as a structural pre-apply validator in `tools/validators`. The validator anchors on newly-created PG records, walks the story-local graph reachable from `state_snapshot`, rejects dangling references, and rejects any reachable story-local record whose creation page is outside the new page's `branch_path`.

The validator preserves the author-pool exception for global storylets with `provenance.created_at_page: null` and leaves non-story/world-canon IDs outside this story-scope branch-isolation check. It is registered with the validators package registry and covered by direct structural tests plus a `validatePatchPlan` integration test that exercises the Shape B pre-apply overlay.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js` — passed.
3. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/integration/spec04-verification.test.js` — passed.
4. `cd tools/validators && npm test` — passed, 118/118 tests.

## Deviations

- The drafted `tools/validators/tests/integration/validate-patch-plan.test.ts` edit became necessary, not optional, because the pre-apply clean-plan execution table needed to classify the new PG-only validator as skipped and the ticket needed a package-level proof that `validatePatchPlan` invokes the validator for Shape B page ops.
- `tools/validators/tests/integration/spec04-verification.test.ts` was updated for the structural-validator count increase from 7 to 8 and total mechanized-validator count increase from 16 to 17.
