# CIINT-001: Update stale assertions in world-index build-animalia integration test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — test-only; no skill, tool, or canon-record schema changes
**Deps**: None

## Problem

At intake, `tools/world-index/tests/integration/build-animalia.test.ts` had three test failures caused by content drift in the Animalia fixture. The assertions hardcoded counts and referenced a file that no longer exists post-SPEC-13. These failures were not source indexer bugs — the test expectations were stale.

The integration test is currently excluded from `npm test` (the package's glob is `dist/tests/*.test.js`, non-recursive), which is why the drift went unnoticed. Re-enabling it in CI is tracked separately (`CIINT-003`); fixing the stale assertions is the prerequisite.

Three failing tests in scope:

- **Test 3** (`build resolves animalia DA-0001 references through the canonical whole-file node id`, lines 403-438): asserts `derivedFromRows.length === 4`; actual is `5` (animalia gained one reference to DA-0001 since the test was written).
- **Test 9** (`build preserves recovery-parsed animalia semantic edge totals`, lines 788-809): asserts `{affected_fact: 127, derived_from: 87, modified_by: 80, required_world_update: 283}`; actual is `{149, 89, 82, 313}` (animalia grew).
- **Test 10** (`sync reparses only the touched file`, lines 811-843): writes to `worlds/animalia/ECONOMY_AND_RESOURCES.md`. Per SPEC-13, that prose file was atomized to `_source/economy-and-resources/SEC-ECR-NNN.yaml`. The legacy file no longer exists in the fixture, so `readFileSync` throws `ENOENT`.

## Assumption Reassessment (2026-04-26)

1. `tools/world-index/tests/integration/build-animalia.test.ts` existed and contained the stale literal assertions listed above before this patch (`derivedFromRows.length === 4`, the old semantic-edge totals, and `ECONOMY_AND_RESOURCES.md`).
2. The fixture at repo-root `tests/fixtures/animalia/` is the test source. The fixture's `_source/economy-and-resources/` contains `SEC-ECR-001.yaml` through `SEC-ECR-009.yaml`. There is no `ECONOMY_AND_RESOURCES.md` at the fixture root. Earlier ticket wording that implied a package-local fixture path was corrected during reassessment.
3. Test boundary: scope is the three tests' assertions only. No changes to `tools/world-index/src/`, no changes to `enumerate.ts`, no changes to `build()`. The other 3 failing tests in the same file (1, 5, 12) are reserved for `CIINT-002`.
4. Scope discipline: the new counts (`5`, `149`, `89`, `82`, `313`) reflect the fixture as committed. Future fixture refreshes via `scripts/refresh-test-fixture.sh` may drift these numbers further; that's a separate concern (whether to make the assertions count-derived rather than hardcoded is reserved for a future ticket if it becomes a maintenance pain point).
5. `sync()` compares file-version content hashes, and `contentHashForProse()` normalizes trailing whitespace. The atomic-source sync test therefore needs a semantic-neutral comment touch (`# sync touch`) rather than a whitespace-only edit to prove the changed file is reparsed.
6. `node --test dist/tests/integration/build-animalia.test.js` remains an opaque full-file wrapper while `CIINT-002` failures still exist. The truthful CIINT-001 proof is direct execution of the compiled integration file with grep over subtests 3, 9, and 10, plus the package's current top-level `npm test` lane.

## Architecture Check

1. Updating assertions to match committed fixture state is cleaner than gating the integration test on a stale snapshot. The fixture is now the test's source of truth — its counts are the authoritative expected values.
2. No backwards-compatibility aliasing/shims introduced. The legacy `ECONOMY_AND_RESOURCES.md` reference is removed outright; no fallback path is added.

## Verification Layers

1. Tests 3, 9, 10 pass against the current fixture -> codebase grep-proof of new assertion values + targeted compiled integration diagnostic.
2. No source code under `tools/world-index/src/` changes -> `git diff --stat tools/world-index/src/` returns empty after the patch.
3. Other passing tests in the same file remain green -> targeted compiled integration diagnostic surfaces the relevant subtest results.

## What to Change

### 1. Test 3: update `derivedFromRows.length` assertion

In `tools/world-index/tests/integration/build-animalia.test.ts` around line 429, change `assert.equal(derivedFromRows.length, 4);` to `assert.equal(derivedFromRows.length, 5);`. The two follow-up assertions (`every row.target_node_id === "DA-0001"`, `every row.target_unresolved_ref === null`) remain unchanged; they assert structural properties, not counts.

### 2. Test 9: update semantic edge totals

In `tools/world-index/tests/integration/build-animalia.test.ts` around line 797, change the `loadSemanticEdgeCounts(db)` expectation to:

```ts
{
  affected_fact: 149,
  derived_from: 89,
  modified_by: 82,
  required_world_update: 313
}
```

### 3. Test 10: redirect `sync` test to a file that exists in the fixture

In `tools/world-index/tests/integration/build-animalia.test.ts` around line 823, change `const relativePath = "ECONOMY_AND_RESOURCES.md";` to `_source/economy-and-resources/SEC-ECR-001.yaml`, which exists in the post-SPEC-13 fixture and preserves the original test intent (touching an economy-domain file) while staying within the new atomic-source layout. The temp-file mutation appends a YAML comment so the normalized source hash changes and `sync()` updates `file_versions` for that exact `relativePath`.

## Files to Touch

- `tools/world-index/tests/integration/build-animalia.test.ts` (modify — three localized edits)

## Out of Scope

- Test 1 (`build succeeds, writes the current schema version, and matches source-derived node counts`) — `audits/validation-grandfathering-pre-spec14.yaml` enumerator gap. Reserved for `CIINT-002`.
- Test 5 (`build promotes explicit ontology registry declarations from the copied world fixture`) — exercises a feature that may have been removed by SPEC-13. Reserved for `CIINT-002`.
- Test 12 (`all indexable files appear in file_versions`) — enumerate vs file_versions mismatch. Reserved for `CIINT-002`.
- The glob change in `tools/world-index/package.json` to make `npm test` actually run these integration tests. Reserved for `CIINT-003` (depends on this ticket and `CIINT-002`).
- Replacing hardcoded counts with dynamic counts derived from the fixture. Out of scope unless future drift makes maintenance painful.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && node dist/tests/integration/build-animalia.test.js | grep -E "^(ok|not ok) (3|9|10) "` shows all three as `ok`.
2. The other already-passing tests in the file (2, 4, 6, 7, 8, 11) remain `ok`.
3. `cd tools/world-index && npm test` continues to pass with 55/55 (no regression in the top-level suite).

### Invariants

1. `tools/world-index/src/**` is byte-identical before and after the patch (test-only change).
2. The three assertions match the fixture as committed; `loadSemanticEdgeCounts(db)` returns the expected dictionary.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/build-animalia.test.ts` — three localized assertion updates; rationale: align test expectations with current fixture state.

### Commands

1. `cd tools/world-index && npm run build && node dist/tests/integration/build-animalia.test.js | grep -E "^(ok|not ok) (3|9|10) "` — targeted: confirms tests 3, 9, 10 pass while sibling tests 1, 5, and 12 remain reserved for `CIINT-002`.
2. `cd tools/world-index && npm test` — package-level: confirms top-level suite (55/55) still passes.
3. `for pkg in world-index patch-engine validators world-mcp hooks; do (cd tools/$pkg && npm test 2>&1 | tail -5); done` — full-pipeline: confirms no cross-package regression. Narrower scope is the right boundary because this ticket only touches world-index test assertions.

## Outcome

Completed: 2026-04-26.

Completed. `tools/world-index/tests/integration/build-animalia.test.ts` now expects the current Animalia fixture counts, touches `_source/economy-and-resources/SEC-ECR-001.yaml` for the sync test, and uses a YAML comment touch so the indexed content hash changes.

No source files under `tools/world-index/src/` were modified.

## Verification Result

1. `cd tools/world-index && npm run build` — passed.
2. `cd tools/world-index && node dist/tests/integration/build-animalia.test.js | grep -E "^(ok|not ok) (3|9|10) "` — passed; tests 3, 9, and 10 were all `ok`.
3. `cd tools/world-index && node dist/tests/integration/build-animalia.test.js | grep -E "^(ok|not ok) (2|3|4|6|7|8|9|10|11) "` — passed; the already-green neighboring tests remained `ok`.
4. `cd tools/world-index && npm test` — passed; 55/55 top-level tests passed.
5. `for pkg in world-index patch-engine validators world-mcp hooks; do (cd tools/$pkg && npm test); done` — first sandboxed run passed `world-index`, `patch-engine`, and `world-mcp`, then failed in `validators` and `hooks` with subprocess `EPERM` / empty-output symptoms. Escalated reruns of `cd tools/validators && npm test` and `cd tools/hooks && npm test` both passed.

## Deviations

1. The drafted `node --test dist/tests/integration/build-animalia.test.js` proof remains opaque and exits nonzero while `CIINT-002` owns tests 1, 5, and 12. Direct compiled-file execution is the truthful subtest-level diagnostic for this ticket.
2. The drafted whitespace-only sync touch did not change the normalized source hash for an atomic YAML record. The landed test appends a YAML comment instead, preserving record semantics while changing the tracked source content.
