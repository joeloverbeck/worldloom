# SPEC103PROPASSEG-003: Segment ID allocator (per-manual-story append-only)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/write/segment-id-allocator.ts` + paired test under `tools/manual-story-studio/test/write/segment-id-allocator.test.ts`.
**Deps**: None

## Problem

At intake, SPEC-103 §2 item 2 required allocating the next `SEG-<n>` ID for a saved segment (per-manual-story append-only), and no segment-specific allocator existed. This ticket adds that allocator so ticket 004's save flow can deterministically assign segment IDs. The allocator scans `<manualStoryRoot>/segments/SEG-<integer>.yaml`, computes `max(existing_numeric_suffix) + 1`, and preserves gaps from hard-delete by never reusing deleted IDs.

## Assumption Reassessment (2026-05-31)

1. Existing record allocator at `tools/manual-story-studio/src/write/id-allocator.ts` already supports custom scan directories via the `scanDirOverride` option and custom extensions via the `extension` option. The `PROMPT-<n>` allocator (in `tools/manual-story-studio/src/write/id-allocator.ts`, consumed by `tools/manual-story-studio/src/write/prompts.ts`) is implemented by calling the existing allocator with `scanDirOverride: ""` and `extension: "md"`. The segment allocator follows the same wrapper pattern with `scanDirOverride: ""`, `classDir: "segments"`, and `extension: "yaml"` so it scans `<manualStoryRoot>/segments/SEG-<n>.yaml`.
2. SPEC-103 §4 Create enumerates `tools/manual-story-studio/src/write/segment-id-allocator.ts` as a separate file. SPEC-103 §2 item 2 specifies the allocator's interface intent (`"Allocate next segment ID SEG-<n>, per-manual-story append-only"`). SPEC-103 §3 Key decisions item 3 (existing-scaffolding acknowledgment, added during reassessment) notes the parallel to existing infrastructure.
3. Cross-skill boundary: parallel to `tools/manual-story-studio/src/write/id-allocator.ts` (the existing record allocator) and `tools/manual-story-studio/src/write/prompts.ts` (the existing PROMPT-N allocator wrapper). Reusing the table-driven mechanism rather than duplicating scan logic preserves the gap-preservation behavior and unifies allocator semantics across all per-manual-story classes.

## Architecture Check

1. Implementing `segment-id-allocator.ts` as a thin wrapper around the existing `id-allocator.ts`'s `allocateNextId` reuses gap-preservation and scan logic, parallel to the PROMPT-N wrapper precedent in SPEC-102. Avoids code duplication and inherits any future scan-behavior improvements (e.g., performance tuning) made to the base allocator.
2. No backwards-compatibility aliasing — net-new file; no prior segment allocator existed.

## Verification Layers

1. `segment-id-allocator.ts` exports a function that returns the next `SEG-<n>` ID for a given manual-story root → codebase grep-proof
2. Allocator's gap-preservation behavior (fixture with `SEG-1.yaml` + `SEG-3.yaml` present; allocator returns `SEG-4`, NOT `SEG-2`) → unit test
3. Allocator returns `SEG-1` on empty `segments/` directory → unit test

## Landed Changes

### 1. Created src/write/segment-id-allocator.ts

Created `tools/manual-story-studio/src/write/segment-id-allocator.ts` as a thin wrapper over the existing `allocateNextId`:

```typescript
import { allocateNextId } from "./id-allocator.js";

export function allocateNextSegmentId(manualStoryRoot: string): string {
  return allocateNextId(manualStoryRoot, "segments", "SEG", {
    extension: "yaml",
    scanDirOverride: "",
  });
}
```

The live `allocateNextId` signature is positional (`manualStoryRoot`, `classDir`, `prefix`, `options`), so the wrapper uses the actual package API rather than the draft options-object sketch.

### 2. Created paired test

Created `tools/manual-story-studio/test/write/segment-id-allocator.test.ts` using the existing `node:test` + temp-root convention. The test covers empty and missing `segments/`, paired `SEG-1` files advancing to `SEG-2`, gap preservation (`SEG-1` + `SEG-3` -> `SEG-4`), numeric ordering (`SEG-9` + `SEG-10` -> `SEG-11`), and ignoring stray / wrong-extension files.

## Files to Touch

- `tools/manual-story-studio/src/write/segment-id-allocator.ts` (new)
- `tools/manual-story-studio/test/write/segment-id-allocator.test.ts` (new)

## Out of Scope

- The save segment write flow itself (covered by ticket 004 — consumes this allocator)
- Any direct refactoring of `id-allocator.ts` (stays as-is; this ticket reuses)
- Any allocator for other classes — only `SEG-<integer>`

## Acceptance Criteria

### Tests That Passed

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/segment-id-allocator.test.js"` — new allocator unit tests pass
2. `cd tools/manual-story-studio && npm test` — full suite still green (no regression in existing record allocator or PROMPT allocator)

### Invariants

1. `allocateNextSegmentId` is deterministic: same fixture state of `segments/` → same returned ID across runs (no randomness, no wall-clock time).
2. Gap preservation: deleted segments (gaps in the `SEG-N` sequence) are never reused by the allocator, regardless of how many gaps exist.
3. Per-manual-story scope: allocator's scan is bounded by the supplied `manualStoryRoot` and does not bleed across manual stories within the same world.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/segment-id-allocator.test.ts` (new) — covers empty / non-empty / gap-preservation / numeric-sort cases per the existing `test/write/id-allocator.test.ts` shape.

### Commands Run

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/segment-id-allocator.test.js"` — targeted allocator test run
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes the new test under the chained `node --test "dist/test/**/*.test.js"` invocation)

## Outcome

Completed: 2026-05-31

Added `allocateNextSegmentId(manualStoryRoot)` as the SPEC-103 `SEG-<integer>` allocator. It delegates to the existing table-driven allocator with `classDir: "segments"`, `prefix: "SEG"`, `extension: "yaml"`, and `scanDirOverride: ""`, preserving the existing `max + 1` / no-gap-reuse semantics in a per-manual-story scope.

Added a focused unit test file covering empty/missing segment directories, paired segment files, gap preservation, numeric ordering, and ignored stray files. No save-flow, manuscript, route, frontend, or record-state behavior changed.

## Verification Result

1. Pre-edit baseline `npm test` from `tools/manual-story-studio` — PASS; 236 backend tests passed and the web TypeScript test completed with exit 0.
2. `npm run build:backend` from `tools/manual-story-studio` — PASS; TypeScript compilation emitted fresh `dist/` output.
3. `node --test dist/test/write/segment-id-allocator.test.js` from `tools/manual-story-studio` — PASS; 6 segment allocator tests passed.
4. Final `npm test` from `tools/manual-story-studio` — PASS; 242 backend tests passed, including the 6 new segment allocator tests, and the web TypeScript test completed with exit 0.

## Deviations

- The drafted wrapper sketch used an options-object `allocateNextId` call shape; live `allocateNextId` uses positional arguments. The landed wrapper uses the live positional signature while preserving the intended behavior.
