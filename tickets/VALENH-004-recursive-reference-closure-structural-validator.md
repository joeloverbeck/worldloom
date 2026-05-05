# VALENH-004: Recursive reference closure structural validator

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/` (new validator), `tools/validators/src/public/registry.ts` (register validator), plus focused tests under `tools/validators/tests/`.
**Deps**: none

## Problem

`branching-story-page-cycle` Phase 9 gate 3 is still operator-verified: the operator must recursively inspect every story-local record reachable from a new page's `state_snapshot` and ensure no nested reference leaks across sibling branches. That branch-isolation invariant is load-bearing for fork/replay correctness, but there is no structural validator that rejects a PG create whose reachable story-local graph cites records outside `this_page.branch_path`.

## Assumption Reassessment (2026-05-05)

1. `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md` landed `snapshot_replay_equality` for Phase 9 gate 4 only and explicitly out-scoped Phase 9 gate 3 as a separate structural-validator candidate.
2. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` defines gate 3 as recursive reference closure: every story-local record reachable from `this_page.state_snapshot`, at any depth, must cite only records with `created_at_page == null` or `created_at_page` inside `this_page.branch_path`.
3. The shared boundary under audit is the validators package's pre-apply materialized story-bundle read surface for Shape B `create_pg_record` plans, plus the page-cycle record fields `state_snapshot`, `branch_path`, nested story-local ID references, and each referenced record's `created_at_page`.
4. FOUNDATIONS Rule 5 and §Validation Rules At Story Scope motivate this ticket by requiring story pages to preserve consequences and action-state continuity without silently leaking sibling-branch state into the current branch.
5. HARD-GATE / Canon Safety Check semantics are affected because Phase 9 is the page-cycle Canon Safety Check phase. This ticket must strengthen gate 3 without weakening Mystery Reserve firewall behavior or canon-promotion approvals.
6. Current grep evidence shows the branch-isolation invariant is documented in `.claude/skills/branching-story-page-cycle/SKILL.md`, `references/governance-and-foundations.md`, and `references/phase-5-state-mutation.md`, but no `recursive_reference_closure` validator is registered in `tools/validators/src/public/registry.ts`.

## Architecture Check

1. A structural validator is the clean boundary because the invariant is graph-shaped, deterministic, and pre-apply checkable from materialized story records. Operator-only validation is too easy to miss, and embedding the check in patch-engine apply would couple validation with mutation.
2. No backwards-compatibility aliasing/shims introduced. Existing `validation_trace` prose remains an audit trail; the validator adds programmatic enforcement.

## Verification Layers

1. Validator registration -> codebase grep-proof and registry test.
2. Same-branch recursive references pass -> structural validator test with nested records reachable from `PG.state_snapshot`.
3. Sibling-branch nested references fail -> structural validator test with a reachable record citing an ID whose `created_at_page` is outside `this_page.branch_path`.
4. Author-pool storylets with `created_at_page: null` remain legal -> structural validator test.
5. FOUNDATIONS / HARD-GATE alignment -> manual review against `docs/FOUNDATIONS.md` and page-cycle Phase 9 gate 3 prose.

## What to Change

### 1. Add a recursive reference closure validator

Create a PG-create-only structural validator, likely named `recursive_reference_closure`, that walks story-local IDs reachable from the new page's `state_snapshot`. It must recursively inspect nested object/list fields in referenced story records and classify story-local ID references by the referenced record's `created_at_page`.

### 2. Register the validator

Add the validator to `tools/validators/src/public/registry.ts` so pre-apply validation runs it automatically for Shape B `create_pg_record` plans.

### 3. Add focused tests

Add tests for clean same-branch closure, sibling-branch leakage at a nested depth, author-pool `created_at_page: null` allowance, missing referenced records, and envelopes without PG creates.

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count if applicable)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — skip expectation if applicable)

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
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — confirm non-PG plans skip the PG-only validator if needed.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js`
3. `cd tools/validators && npm test`
