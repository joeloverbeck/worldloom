# RRCDIAG-001: `recursive_reference_closure` reports a missing `created_at_page` field as a misleading `branch_leak`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/recursive-reference-closure.ts` plus tests
**Deps**: None

## Problem

When a freshly-created story-bundle record (e.g. `THR`, `STEMO`) in a turn-cycle patch is missing its required `created_at_page` field entirely, `recursive_reference_closure` treats the field's `undefined` value as "outside this page's branch_path" and emits one `recursive_reference_closure.branch_leak` verdict per reference path that reaches the record — with the message "…whose created_at_page <missing> is outside this page's branch_path" and the `suggested_fix` "Replace … with a record created on this branch, remove the sibling-branch dependency, or scope the storylet as a valid global author-pool record."

This is actively misleading. During the PG-6 turn-cycle on `red-bunny`, omitting `created_at_page` on a brand-new `THR-4` (a same-branch supersession of `THR-1`) produced **five** `branch_leak` verdicts pointing at a non-existent "sibling-branch dependency", on top of the one correct `record_schema_compliance.required` verdict that named the actual cause. An author trusting the branch_leak fix text would investigate branch isolation — entirely the wrong direction. The real fix was a one-line addition of `created_at_page: PG-6`.

The root cause is the missing-vs-null distinction in `isAllowedReference`: explicit `created_at_page: null` is special-cased (STCHAR and global/branch-prefix storylets), but an entirely-absent field falls through to the generic branch-membership check and reads as a leak.

## Assumption Reassessment (2026-05-30)

1. `tools/validators/src/structural/recursive-reference-closure.ts` `isAllowedReference` (lines 274-304): line 285 handles `createdAtPage === null`; line 303 (`return createdAtPage !== undefined && branchPathSet.has(createdAtPage)`) returns `false` when `createdAtPage` is `undefined`, which routes to `branchLeak` (lines 328-356). Confirmed by reading the source and by the live PG-6 dry-run output.
2. `record_schema_compliance` already independently and correctly reports the missing required field (`red-bunny:THR-4 schema violation at /: must have required property 'created_at_page'`). Confirmed from the same dry-run. So the branch_leak verdicts are pure redundant noise derived from a schema-incomplete record, not an independent finding.
3. Shared boundary under audit: the diagnostic contract of `recursive_reference_closure` (its verdict codes and `suggested_fix` text) consumed by turn-cycle/bootstrap authors and by `branching-story-health-audit`. This ticket changes only how a `undefined`-`created_at_page` reference is classified/reported; it does not relax true branch-isolation enforcement (a record present on a sibling branch with a real `created_at_page` outside `branch_path` must still fail).
4. FOUNDATIONS principle: branch isolation (FOUNDATIONS §Story Bundles; shared contract §7 gate 4) must remain fully enforced. The change must NOT suppress a genuine sibling-branch leak; it must only stop misclassifying a schema-incomplete (field-absent) record as one. The fix is diagnostic-routing only.
5. Adjacent contradiction classification: the redundant emission is a required consequence to fix here (it is the same defect surface). No separate bug is introduced.

## Architecture Check

1. Distinguishing "field absent" (a schema defect, owned by `record_schema_compliance`) from "field present but off-branch" (a real branch leak) is cleaner than the current conflation: each verdict then has exactly one accurate owner and one accurate fix. Preferred approach: when `created_at_page` is `undefined` for a non-page, non-STCHAR, non-storylet target, either (a) skip the `branch_leak` verdict entirely and let `record_schema_compliance` own it, or (b) emit a distinct code `recursive_reference_closure.reference_missing_created_at_page` whose `suggested_fix` points at the schema requirement. Option (a) is the minimal, lowest-duplication choice and is recommended.
2. No backwards-compatibility aliasing/shims; the behavior for genuine off-branch references (real `created_at_page` value not in `branch_path`) is unchanged.

## Verification Layers

1. Invariant: a same-branch record missing `created_at_page` yields no `branch_leak` verdict (only `record_schema_compliance.required`) -> validator unit test with a fixture record lacking `created_at_page`.
2. Invariant: a record whose `created_at_page` names a page genuinely outside `branch_path` still yields `branch_leak` -> existing regression test must continue to pass (codebase grep-proof that the off-branch test exists + green run).
3. Invariant: explicit `created_at_page: null` STCHAR/global-storylet allowances are unchanged -> existing tests for the null path remain green.

## What to Change

### 1. `recursive-reference-closure.ts` `isAllowedReference` / verdict routing

For a non-page, non-STCHAR, non-storylet target whose `created_at_page` is `undefined` (absent), do not emit `branch_leak`. Either return a sentinel that suppresses the branch_leak verdict (deferring to `record_schema_compliance`), or emit a new dedicated verdict `recursive_reference_closure.reference_missing_created_at_page` with `suggested_fix` "Add the required `created_at_page` to <id> (a missing field, not a branch-isolation problem)." Keep `createdAtPage === null` and the genuine off-branch (`createdAtPage` present, not in `branch_path`) paths exactly as they are.

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/test/structural/recursive-reference-closure.test.ts` (modify/add — confirm exact path during implementation)

## Out of Scope

- Any change to `record_schema_compliance` (it already reports the missing field correctly).
- Relaxing genuine branch-isolation enforcement for records that carry a real off-branch `created_at_page`.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: a story-bundle record referenced by the page but missing `created_at_page` produces zero `recursive_reference_closure.branch_leak` verdicts.
2. Regression: a record with `created_at_page` set to a page not in the page's `branch_path` still produces `recursive_reference_closure.branch_leak`.
3. Full validator suite: `npm --prefix tools/validators test` is green.

### Invariants

1. `branch_leak` is emitted only for references whose target carries a concrete `created_at_page` (or page id) that is genuinely outside `branch_path`.
2. A schema-incomplete (field-absent) record is owned by `record_schema_compliance`, not double-reported as a branch leak.

## Test Plan

### New/Modified Tests

1. `tools/validators/test/structural/recursive-reference-closure.test.ts` — add a "missing created_at_page does not branch_leak" case and confirm the existing off-branch case still fails. (Verify exact test path at implementation time.)

### Commands

1. `npm --prefix tools/validators test -- recursive-reference-closure`
2. `npm --prefix tools/validators test` (full suite)
3. The validators package test boundary is correct because the change is contained to one structural validator and its fixtures; story-bundle replay paths are unaffected.
