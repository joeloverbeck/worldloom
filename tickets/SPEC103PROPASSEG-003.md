# SPEC103PROPASSEG-003: Segment ID allocator (per-manual-story append-only)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/write/segment-id-allocator.ts` + paired test under `tools/manual-story-studio/test/write/segment-id-allocator.test.ts`.
**Deps**: None

## Problem

SPEC-103 §2 item 2 requires allocating the next `SEG-<n>` ID for a saved segment (per-manual-story append-only). The allocator scans `<manualStoryRoot>/segments/SEG-<integer>.{md,yaml}` files, computes `max(existing_numeric_suffix) + 1`, and returns the new ID string. Gaps from hard-delete are preserved per the SPEC-101 ID-allocation convention (the allocator never reuses deleted IDs). Without this allocator, ticket 004's save flow has no way to deterministically assign segment IDs.

## Assumption Reassessment (2026-05-31)

1. Existing record allocator at `tools/manual-story-studio/src/write/id-allocator.ts:1-20` already supports custom scan directories via the `scanDirOverride` option and custom extensions via the `extension` option. The `PROMPT-<n>` allocator (in `tools/manual-story-studio/src/write/prompts.ts`, landed by SPEC-102) is implemented by calling the existing allocator with `scanDirOverride: ""` and `extension: "md"`. The segment allocator can follow the same wrapper pattern with `scanDirOverride: "segments"` and `extension: "yaml"` (or `"md"`; both files share the same numeric suffix, so scanning either gives the same `max + 1` answer).
2. SPEC-103 §4 Create enumerates `tools/manual-story-studio/src/write/segment-id-allocator.ts` as a separate file. SPEC-103 §2 item 2 specifies the allocator's interface intent (`"Allocate next segment ID SEG-<n>, per-manual-story append-only"`). SPEC-103 §3 Key decisions item 3 (existing-scaffolding acknowledgment, added during reassessment) notes the parallel to existing infrastructure.
3. Cross-skill boundary: parallel to `tools/manual-story-studio/src/write/id-allocator.ts` (the existing record allocator) and `tools/manual-story-studio/src/write/prompts.ts` (the existing PROMPT-N allocator wrapper). Reusing the table-driven mechanism rather than duplicating scan logic preserves the gap-preservation behavior and unifies allocator semantics across all per-manual-story classes.

## Architecture Check

1. Implementing `segment-id-allocator.ts` as a thin wrapper around the existing `id-allocator.ts`'s `allocateNextId` reuses gap-preservation and scan logic, parallel to the PROMPT-N wrapper precedent in SPEC-102. Avoids code duplication and inherits any future scan-behavior improvements (e.g., performance tuning) made to the base allocator.
2. No backwards-compatibility aliasing — net-new file; no prior segment allocator existed.

## Verification Layers

1. `segment-id-allocator.ts` exports a function that returns the next `SEG-<n>` ID for a given manual-story root → codebase grep-proof
2. Allocator's gap-preservation behavior (fixture with `SEG-1.yaml` + `SEG-3.yaml` present; allocator returns `SEG-4`, NOT `SEG-2`) → unit test
3. Allocator returns `SEG-1` on empty `segments/` directory → unit test

## What to Change

### 1. Create src/write/segment-id-allocator.ts

In `tools/manual-story-studio/src/write/segment-id-allocator.ts`, implement a thin wrapper over the existing `allocateNextId` (or whatever the existing allocator's exported function is named — verify against the current `id-allocator.ts` surface at implementation time, since the spec says "create segment-id-allocator.ts" but does not specify the wrapper's exact internal call shape):

```typescript
import { allocateNextId } from "./id-allocator.js";

export interface AllocateNextSegmentIdOptions {
  manualStoryRoot: string;
}

export function allocateNextSegmentId(
  options: AllocateNextSegmentIdOptions,
): string {
  // Reuses the table-driven allocator with segments/ scan dir + .yaml extension.
  // SEG-N is per-manual-story append-only; gaps from hard-delete are preserved
  // (allocator returns max(existing_numeric_suffix) + 1, never reuses gaps).
  return allocateNextId({
    manualStoryRoot: options.manualStoryRoot,
    prefix: "SEG",
    scanDirOverride: "segments",
    extension: "yaml",
  });
}
```

If `id-allocator.ts`'s `allocateNextId` signature differs from the assumed shape above (parameter names, options object structure), adapt the wrapper accordingly — the contract this ticket owns is the `SEG-N` allocation behavior (gap preservation, `max + 1`, per-manual-story scope), not a specific internal call signature. Verify the existing allocator's exact export shape at implementation time.

### 2. Create paired test

In `tools/manual-story-studio/test/write/segment-id-allocator.test.ts`, mirror the test shape of `tools/manual-story-studio/test/write/id-allocator.test.ts` (the existing record-allocator test). Cover:

- Empty `segments/` directory → returns `SEG-1`
- `segments/` contains `SEG-1.md` + `SEG-1.yaml` → returns `SEG-2`
- Gap preservation: `segments/` contains `SEG-1.{md,yaml}` + `SEG-3.{md,yaml}` (no SEG-2) → returns `SEG-4`, NOT `SEG-2`
- Numerically large IDs sort correctly: `SEG-9.{md,yaml}` + `SEG-10.{md,yaml}` → returns `SEG-11` (lexicographic-vs-numeric guard)

Use the existing test harness convention (Node's `node:test` runner with `tools/manual-story-studio/test/fixtures/` style temp manual-story roots set up via `fs.cpSync` to a temp directory; never write to the real `worlds/`).

## Files to Touch

- `tools/manual-story-studio/src/write/segment-id-allocator.ts` (new)
- `tools/manual-story-studio/test/write/segment-id-allocator.test.ts` (new)

## Out of Scope

- The save segment write flow itself (covered by ticket 004 — consumes this allocator)
- Any direct refactoring of `id-allocator.ts` (stays as-is; this ticket reuses)
- Any allocator for other classes — only `SEG-<integer>`

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/segment-id-allocator.test.js"` — new allocator unit tests pass
2. `cd tools/manual-story-studio && npm test` — full suite still green (no regression in existing record allocator or PROMPT allocator)

### Invariants

1. `allocateNextSegmentId` is deterministic: same fixture state of `segments/` → same returned ID across runs (no randomness, no wall-clock time).
2. Gap preservation: deleted segments (gaps in the `SEG-N` sequence) are never reused by the allocator, regardless of how many gaps exist.
3. Per-manual-story scope: allocator's scan is bounded by the supplied `manualStoryRoot` and does not bleed across manual stories within the same world.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/segment-id-allocator.test.ts` (new) — covers empty / non-empty / gap-preservation / numeric-sort cases per the existing `test/write/id-allocator.test.ts` shape.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/segment-id-allocator.test.js"` — targeted allocator test run
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes the new test under the chained `node --test "dist/test/**/*.test.js"` invocation)
