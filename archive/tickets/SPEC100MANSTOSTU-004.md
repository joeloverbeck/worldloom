# SPEC100MANSTOSTU-004: `enumerate.ts` `manual-stories` exclusion + fixture test

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/world-index/src/enumerate.ts` to exclude `manual-stories/` subtree from world enumeration. No impact on existing world-index consumers (the subtree contains no indexable files today).
**Deps**: None (independent of the Manual Studio package skeleton; runs against `tools/world-index/`)

## Problem

SPEC-100 §2 in-scope item 4 + §1 Context establish this as the **load-bearing integration fix**: without the `enumerate.ts` exclusion, every Manual Studio file under `worlds/<slug>/manual-stories/**` would produce a warn-severity `unexpected_path` validation_result row at `tools/world-index/src/commands/shared.ts:561-562` on every `world-index build/sync` (the walker at `enumerate.ts:77-110` recursively classifies any non-recognized file as `unexpected`, and shared.ts:551-571 emits a warn row per file). Noisy but not blocking; cleanly fixed by adding `manual-stories` to `enumerate.ts`'s `isExcludedPath()`. The exclusion is structurally correct because Manual Studio's content is intentionally not part of the world-index inventory — it lives under the world for provenance, not for indexing.

## Assumption Reassessment (2026-05-30)

1. `tools/world-index/src/enumerate.ts:112-134` confirmed at HEAD: `isExcludedPath(relativePath)` currently excludes paths whose first segment is `_index`, whose any segment starts with `.`, whose basename is `INDEX.md`, or whose path is a 2-segment audit-sidecar YAML. Adding a single `if (segments[0] === "manual-stories") return true;` condition is the prescribed one-line fix (SPEC-100 §2 item 4 + §4 Files to touch line 82 prescribe placement "after the `_index` exclusion at line 116-118 for visual proximity"). The function's signature, the `segments` variable, and the surrounding control flow all exist at HEAD as the spec describes — no refactoring needed.
2. `tools/world-index/tests/enumerate.test.ts` exists at HEAD (note: directory is `tests/` plural, not `test/` singular as the spec line 84 suggests — the spec's "or equivalent" explicitly authorizes the path adjustment; this is a mechanical-drift correction to propagate per `spec-to-tickets/SKILL.md` §Step 2 mechanical-drift carve-out). The existing tests use a fixture-world pattern via `tools/world-index/tests/fixtures/`; the new test follows the same shape: construct a fixture directory tree containing a `manual-stories/<slug>/manual-story.yaml` entry, call `enumerate(worldRoot)`, and assert (a) no entries in the `unexpected` array, (b) no entries in the `indexable` array from the `manual-stories/` subtree.
3. **Cross-skill / cross-artifact boundary**: this ticket modifies a world-index function used by every `world-index build/sync` invocation. The shared boundary is the `enumerate` function's output contract — `{ indexable: string[], unexpected: string[] }`. The exclusion narrows the input set the walker traverses; the output contract is unchanged. Downstream consumers (`tools/world-index/src/commands/shared.ts:551-571` enumeration warn-row writer; build pipeline indexer) continue to operate on the same shape, just with fewer `unexpected` paths to warn about. Verified no other consumer reads `isExcludedPath` directly — it's a private helper.
4. **FOUNDATIONS principle restated** — Rule 6 No Silent Retcons: this ticket modifies landed behavior of `enumerate.ts` (adding an exclusion that changes the warn-row volume on existing worlds). Per the reassessed SPEC-100's §FOUNDATIONS Alignment table, Rule 6 is N/A for canon-pipeline purposes because (a) no canon mutation occurs — the world-index DB is derived, gitignored, regenerable; (b) the modification is reversible by removing the one added condition; (c) the second-order effect (one fewer warn-row per Manual Studio file per `build/sync`) is explicitly acknowledged in SPEC-100 §3 Key decisions as a desirable noise reduction (the alternative — leaving the warn rows in place — was rejected because it would erode signal in real validation warnings). The retcon attribution is therefore documented in this ticket's Assumption Reassessment + Architecture Check rather than in a Change Log Entry; Rule 6's spec-level attribution requirement is satisfied by the spec authoring the change explicitly.

## Architecture Check

1. **Canonical fix, not a per-tool ignore-list**: SPEC-100 §3 Key decisions evaluated the alternative — leave the warn rows and add a per-tool filter at the consumer side — and rejected it. The single-line change at the enumeration source is structurally correct (the directory is not part of the world-index inventory), reaches every consumer uniformly, and avoids accumulating dozens-to-hundreds of warn rows per `build/sync`.
2. **Placement after the `_index` exclusion at line 116-118 for visual proximity**: both exclusions are first-segment-based directory exclusions; grouping them in the same control-flow position keeps the function readable. No alternative placement (between `.`-prefixed segment check and `INDEX.md` check; at end of function) gives clearer ordering.
3. No backwards-compatibility aliasing/shims introduced — the modification is a pure exclusion addition; existing exclusions are unchanged.

## Verification Layers

1. `enumerate.ts:isExcludedPath()` returns `true` when `segments[0] === "manual-stories"` → codebase grep-proof: `grep -A 2 "segments\[0\] === \"manual-stories\"" tools/world-index/src/enumerate.ts` shows the new condition.
2. A fixture world containing `manual-stories/<slug>/manual-story.yaml` enumerates to zero `unexpected` entries from the `manual-stories/` subtree → schema validation: new test in `tests/enumerate.test.ts` asserts `enumeration.unexpected.filter(p => p.startsWith("manual-stories/")).length === 0`.
3. The exclusion does NOT add anything to `indexable` (Manual Studio files are not index-targets) → schema validation: same test asserts `enumeration.indexable.filter(p => p.startsWith("manual-stories/")).length === 0`.
4. No regression in existing enumeration tests → codebase grep-proof + test run: `cd tools/world-index && npm test` passes (existing `enumerate.test.ts` cases continue to assert the previous exclusion + indexable behaviors).

## What to Change

### 1. Modify `tools/world-index/src/enumerate.ts:112-134` `isExcludedPath()`

Add one condition after the `_index` exclusion at line 116-118:

```typescript
function isExcludedPath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const basename = segments[segments.length - 1] ?? "";

  if (segments[0] === "_index") {
    return true;
  }

  if (segments[0] === "manual-stories") {
    // Manual Story Studio surface; intentionally outside the world-index inventory.
    return true;
  }

  if (segments.some((segment) => segment.startsWith("."))) {
    return true;
  }

  // ... rest unchanged ...
}
```

The comment on the new condition documents the SPEC-100 rationale for a future reader who greps for `manual-stories` and finds it here.

### 2. Modify `tools/world-index/tests/enumerate.test.ts`

Add a new test case to the existing suite. Pattern:

```typescript
test("excludes manual-stories/ subtree from enumeration (SPEC-100)", () => {
  // Construct a fixture world directory with a manual-stories/<slug>/manual-story.yaml entry.
  // Use the existing fixture-world helper if one exists in tools/world-index/tests/fixtures/
  // or tools/world-index/tests/helpers/; otherwise build the temp tree inline with fs.mkdtempSync.
  const worldRoot = makeFixtureWorldWithManualStory();

  const result = enumerate(worldRoot);

  // Assert no entries from the manual-stories/ subtree leaked into either array.
  assert.strictEqual(result.unexpected.filter(p => p.startsWith("manual-stories/")).length, 0);
  assert.strictEqual(result.indexable.filter(p => p.startsWith("manual-stories/")).length, 0);

  // Assert the rest of the world enumerated normally (sanity check that the exclusion didn't break the walker).
  assert.ok(result.indexable.some(p => p === "WORLD_KERNEL.md"));
});
```

Inspect the test file's existing structure first to match its conventions (fixture-helper imports, `describe`/`test` style, assertion library).

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify) — one added condition after line 118
- `tools/world-index/tests/enumerate.test.ts` (modify) — one new test case

## Out of Scope

- Any change to the `enumerate.ts` walker structure beyond the single condition — no refactor.
- Modification to `tools/world-index/src/commands/shared.ts` warn-row writer — that code path remains correct; the exclusion at the enumeration source removes the warn-row trigger upstream of the writer.
- Per-tool consumer filtering as an alternative to source-level exclusion — explicitly rejected by SPEC-100 §3.
- Index-level treatment of Manual Studio content (rebuildable indexes per Manual Studio's `indexes/records.json` are an M6 deferral per SPEC-100 §8 + IMPLEMENTATION-ORDER M6 line).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` — full world-index test suite passes, including the new `manual-stories/` exclusion case.
2. `grep -E "segments\[0\] === \"manual-stories\"" tools/world-index/src/enumerate.ts` — the new condition is present.
3. Manual integration smoke (deferred to ticket 009 capstone): create `worlds/erotica-world/manual-stories/<slug>/manual-story.yaml` and run `node tools/world-index/dist/src/cli.js build erotica-world`; assert zero `unexpected_path` warn rows are emitted for any `manual-stories/` path.

### Invariants

1. `enumerate(worldRoot)` returns `{ indexable, unexpected }` with no entry beginning with `manual-stories/` in either array. (Data-contract invariant — Manual Studio's content surface is intentionally invisible to the world-index inventory.)
2. The exclusion is implemented at the walker's `isExcludedPath` gate (descent stops before entering the `manual-stories/` subtree), not as a post-filter on the result arrays. (Architectural invariant — the walker should not waste cycles enumerating files it will then discard.)

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/enumerate.test.ts` (modify) — new test case verifying `manual-stories/` exclusion via fixture world. Use the existing fixture-helper conventions in `tools/world-index/tests/` (inspect at implementation time).

### Commands

1. `cd tools/world-index && npm test -- --grep "manual-stories"` — targeted test (if the test runner supports `--grep`; otherwise run the full `enumerate.test.ts`).
2. `cd tools/world-index && npm test` — full suite, confirms no regression.
