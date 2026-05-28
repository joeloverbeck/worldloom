# STSELECT-005: Regression coverage for branch/scope/cooldown boundary cases in `select_storylet_candidates`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new fixture/test additions in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` and `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts`. No production-code changes.
**Deps**: None.

## Problem

At ticket intake, the `matchesScope` predicate (`tools/world-mcp/src/tools/select-storylet-candidates.ts:339-365`) and the cooldown rejection logic (`cooldownRejectionSample` at lines 553-584; `loadSelectedStoryletPagesByBranch` at lines 501-551) carried or were believed to carry five boundary cases that needed explicit regression coverage:

1. **Cooldown distance boundary at `distance === cooldown_pages`.** Line 574 reads `if (distance > cooldown) return null;` — so `distance > cooldown` passes (SLT exits cooldown), `distance <= cooldown` rejects. Before this ticket, the exact rejection boundary was missing; live reassessment found that `distance === cooldown + 1` already had focused coverage in `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts`.

2. **Cooldown on a sibling-branch selection.** When an SLT was previously selected on a page that is NOT in the current parent's `branch_path`, line 569 (`parentPage.branchPath.indexOf(lastSelectedPageId) === -1`) returns `-1` and the rejection sample is `null` (no rejection). This is the branch-local-cooldown semantic — cooldowns do not leak across siblings — and is a load-bearing fairness invariant. Live reassessment found focused sibling-branch coverage already present in `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts`.

3. **Genesis page (`branch_path: []`).** Bootstrap-time invocations operate against a genesis page snapshot before any pages have been committed. With `branch_path: []`, `parentBranchIndex = -1` in cooldown math; `branch_prefix_scoped` SLTs require `prefixPath.length > 0 && prefixPath.length <= page.branchPath.length` (line 357), so any non-empty prefix always rejects against an empty branch path. Before this ticket, no test exercised the genesis-page shape.

4. **`branch_scoped` SLT when parent page has `branch_id: null`.** Line 344 short-circuits with `page.branchId !== null && candidate.row.slt_scope_branch_id === page.branchId` — a parent with null `branch_id` always rejects every `branch_scoped` SLT regardless of the SLT's branch_id. The null parent case is a legitimate shape (some genesis pages, replay seeds). Before this ticket, no test asserted the rejection.

5. **Malformed `slt_scope_branch_path_prefix` JSON.** Lines 351-354 defensively `try { JSON.parse(...) } catch { return false; }`. The catch branch is defensive against data corruption in the projection (e.g., truncated write, encoding mishap during indexer refactor). Before this ticket, no test exercised the catch branch, so a regression that removed the try/catch and let the exception propagate would not have been caught.

These cases are individually small but collectively cover the branch-isolation discipline that Rule 4 (No Globalization by Accident) protects at the runtime-selection layer. Bundle them in one ticket because they share the test-fixture machinery (branch_path / branch_id / cooldown projection / prior SE selection).

## Assumption Reassessment (2026-05-28)

1. **Codebase reassessment**: confirmed each boundary at the line numbers cited above. The cooldown distance comparator (line 574) is the most regression-prone — a single-character change would silently break it. The `branch_prefix_scoped` JSON parse (line 351-354) is the most opaque — a contributor refactoring the projection column type might not realize the try/catch is load-bearing for resilience against partial-write corruption.
2. **Existing coverage check**: `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` covers `branch_prefix_scoped` positive (`PG-5` on `BR-1` includes `SLT-5`) and negative (`PG-4` on `BR-2` excludes `SLT-5`) paths. SPEC-84 does NOT cover the malformed-JSON case, the genesis case, or the null-branch-id case. The cooldown distance boundary is not covered in SPEC-84 (the fixture has no cooldowned SLTs).
3. **Cross-skill / cross-artifact boundary**: this ticket audits the contract between the selector's branch-scope logic and the page-state snapshots produced by `branching-story-turn-cycle` (which writes `PG.branch_id` and `PG.branch_path`) plus the projection rows produced by the indexer (which writes `slt_scope_branch_id` and `slt_scope_branch_path_prefix`). Both producer surfaces have their own tests; this ticket pins down the consumer-side branch-boundary contract.
4. **FOUNDATIONS principle restatement**: §Story Bundles Validation Rule 4 (No Globalization by Accident) is the principle engaged at the runtime-selection layer. Branch-scope discipline at retrieval time is what prevents a `branch_scoped` SLT from leaking across sibling branches; branch-local cooldown discipline is what prevents fairness contamination across replays. The current coverage proves the positive path; this ticket adds the boundary-and-defensive coverage that protects against silent regression.
5. **Existing-output schema unchanged**: this ticket adds test coverage only.
6. **Pre-edit baseline**: `cd tools/world-mcp && npm test` passed before this ticket's edits (505 passing tests after the package build).
7. **Live coverage split correction**: cooldown sibling-branch and `distance === cooldown_pages + 1` behavior already had focused coverage in `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts`; this ticket owns the missing `distance === cooldown_pages` assertion there plus the missing genesis/null-branch/malformed-prefix scope tests in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`.

## Architecture Check

1. **Cleaner than alternatives.** Option A (this ticket — bundle five boundary cases into one ticket because they share fixture machinery and one FOUNDATIONS principle) keeps the regression-test surface coherent. Option B (split into five tickets, one per boundary) inflates ticket count without analytical benefit; the user's review burden goes up while the work shape stays the same. Option C (add boundary assertions to existing tests by extending fixtures) risks confusing the existing tests' purpose (which is to demonstrate the happy path of the eight-stage filter pipeline).
2. **No backwards-compatibility aliasing/shims introduced.** Purely additive test coverage.

## Verification Layers

1. Cooldown at `distance === cooldown_pages` rejects → new regression assertion (e.g., `cooldown=2`, prior selection at index 0, parent at branch_path index 2 → distance=2; SLT rejected with sample).
2. Cooldown at `distance === cooldown_pages + 1` passes → existing regression assertion in `select-storylet-candidates-cooldown-window.test.ts` (e.g., `cooldown=2`, prior selection at index 0, parent at branch_path index 3 → distance=3; SLT survives).
3. Cooldown for an SLT previously selected on a page NOT in the parent's `branch_path` does NOT reject → existing regression assertion in `select-storylet-candidates-cooldown-window.test.ts` (sibling-branch SE record exists; current parent on different branch; cooldown sample is null).
4. Genesis page with `branch_path: []` excludes `branch_prefix_scoped` SLTs and processes `global_author_pool` SLTs normally → regression assertion.
5. Parent page with `branch_id: null` excludes all `branch_scoped` SLTs at the scope stage → regression assertion.
6. Malformed `slt_scope_branch_path_prefix` JSON (e.g., `"["incomplete-jso"`) causes the SLT to fall into the scope-rejection branch without raising → regression assertion.

## Files to Touch

- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — add focused scope-boundary tests)
- `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` (modify — add exact cooldown-boundary test)
- `archive/tickets/STSELECT-005.md` (modify — reassessment, closeout, and archival handoff)
- (No production code changes.)

## Out of Scope

- Changes to `matchesScope` or cooldown semantics.
- Coverage for the eight filter stages beyond scope/cooldown (covered by existing tests and STSELECT-006).
- Coverage for the ranking algorithm (STSELECT-004's scope).
- Coverage for the end-to-end indexer→selector pipeline (completed under `archive/tickets/STSELECT-003.md`).
- Coverage for the `include_rejection_summary` flag defect (MCPENH-075's scope).
- Adding test coverage for the SQL queries themselves (those are exercised indirectly by every test that builds a fixture).

## Acceptance Criteria

### Tests That Must Pass

1. New test asserts cooldown at `distance === cooldown_pages` rejects.
2. Existing test continues to assert cooldown at `distance === cooldown_pages + 1` passes.
3. Existing test continues to assert cooldown for sibling-branch selection does NOT reject (the sibling SE exists but its `created_at_page` is not in the parent's `branch_path`).
4. New test asserts genesis-page handling: `branch_path: []` excludes `branch_prefix_scoped` SLTs and processes `global_author_pool` SLTs normally.
5. New test asserts null parent `branch_id` rejects all `branch_scoped` SLTs at the scope stage.
6. New test asserts malformed `slt_scope_branch_path_prefix` JSON causes the SLT to fall into the scope-rejection branch (caught exception → `false`).
7. All existing tests in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` and `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` continue to pass.

### Invariants

1. Each of the six branch/scope/cooldown boundary cases is asserted by an independent test.
2. A regression that flips any single boundary (e.g., `>` to `>=` in cooldown math, removed try/catch around the prefix JSON parse) fails at least one test.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — add three focused scope-boundary tests; reuse the existing `seedWorld` / `withRepoRoot` machinery.
2. `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` — add one focused exact cooldown-boundary test; reuse the existing cooldown fixture builder.

### Commands

1. `cd tools/world-mcp && npm test` — full suite passes including the new boundary tests.
2. `cd tools/world-mcp && npm run build` followed by `node --test dist/tests/tools/select-storylet-candidates.test.js dist/tests/tools/select-storylet-candidates-cooldown-window.test.js` — focused compiled proof.

## Outcome

Completed. Added four focused regression tests without production-code changes:

1. `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` now asserts that a candidate selected at `distance === cooldown_pages` is still rejected with a cooldown sample.
2. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` now asserts that a genesis page with `branch_path: []` rejects non-empty branch-prefix SLTs while preserving global-author-pool candidates.
3. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` now asserts that a parent page with `branch_id: null` rejects `branch_scoped` candidates at the scope stage.
4. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` now asserts malformed `slt_scope_branch_path_prefix` JSON is caught and treated as a scope rejection instead of throwing.

## Verification Result

1. `cd tools/world-mcp && npm test` before edits: passed after build, 505 tests passing.
2. `cd tools/world-mcp && npm run build`: passed after test edits.
3. `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js dist/tests/tools/select-storylet-candidates-cooldown-window.test.js`: passed, 22 tests passing.
4. `cd tools/world-mcp && npm test`: passed after build, 509 tests passing.

## Deviations

1. The drafted `Files to Touch` path `tools/world-mcp/tests/tools/select-storylet-candidates.ts` was corrected to `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`.
2. The drafted plan expected six new tests in one file. Live reassessment found two acceptance cases already covered in `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts`, so this ticket added four missing tests across the two existing selector test files.
