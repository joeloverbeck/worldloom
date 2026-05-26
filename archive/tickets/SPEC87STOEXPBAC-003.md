# SPEC87STOEXPBAC-003: IndexStatus view-model + repo-root resolution

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/read/index-status.ts` + `src/config/repo-root.ts` + supporting types.
**Deps**: archive/tickets/SPEC87STOEXPBAC-001.md

## Problem

SPEC-87 §4 specifies the `IndexStatus` tagged-union view-model that the frontend (SPEC-88) consumes to surface index freshness state (`fresh` / `missing` / `version_mismatch` / `empty` / `stale` / `open_failed`). Per the SPEC-87 reassessment correction, the upstream `openExistingIndex` helper at `tools/world-index/src/index/open.ts:163` throws on missing index rather than returning a unified shape, and `SchemaVersionMismatchError` is caught at the command layer. The Story Explorer's read primitives need a single normalized view-model — this ticket implements the wrapper that catches the upstream throws and classifies them into the unified `IndexStatus`. The companion `repo-root.ts` resolves worktree-root-anchored paths so every read primitive constructs filesystem paths consistently from the worktree-root base (per CLAUDE.md §Worktree discipline).

## Assumption Reassessment (2026-05-25)

1. `openExistingIndex()` at `tools/world-index/src/index/open.ts` (brainstorm-verified, reassess-verified) throws on missing index with a clear error message and takes `(worldRoot, worldSlug)`, not a prebuilt `world.db` path. `SchemaVersionMismatchError` is exported from the same module and carries `expectedVersion` / `actualVersion`; the current expected schema version observed through the helper is `7`. The wrapper catches both throw sites and the `EMPTY` / `STALE` derivable states and classifies into the SPEC-87 §4 `IndexStatus` tagged union. The wrapper does NOT modify or re-throw — every caller receives an `IndexStatus` value with a `kind` discriminator.
2. SPEC-87 §4 defines the `IndexStatus` tagged union explicitly (`fresh` / `missing` / `version_mismatch` / `empty` / `stale` / `open_failed`) with per-variant remedy strings the frontend surfaces. Each variant carries the data the SPEC-88 banner needs (drifted file list for `stale`, expected/found versions for `version_mismatch`).
3. Cross-skill boundary: `@worldloom/world-index`'s public API contract. This ticket consumes `openExistingIndex` from `@worldloom/world-index/index/open`, `SchemaVersionMismatchError` from the same module, and `sha256Hex` from `@worldloom/world-index/hash/content` — all are public exports per `tools/world-index/package.json`'s `exports` map. The boundary is unidirectional: this ticket reads world-index's API; it does NOT extend or modify world-index's surface.
4. Package command reassessment: `tools/story-explorer/package.json` uses TypeScript plus Node's built-in test runner, not vitest. The historical drafted `npm test -- index-status` command currently runs the compiled package test glob plus an extra positional argument rather than filtering to the new test. The truthful targeted lane is `npm run build` followed by `node --test dist/test/index-status.test.js`; `npm test` remains the full package suite.
5. Stale detection reassessment: `file_versions.content_hash` is parser-produced. For raw markdown/prose files the explorer can safely compare `sha256Hex(rawFileBody)` to the stored file hash; for YAML files the indexer may store canonical parser-level hashes, so raw hashing YAML would create false stale positives. This ticket classifies missing indexed files as stale for every row, compares raw hashes for non-YAML rows, and intentionally leaves YAML parser-equivalent drift to a future parser-backed freshness lane.

## Architecture Check

1. The wrapper centralizes index-status classification in one module so every read primitive (world-list, story-list, page-detail) reads a unified view-model rather than re-implementing the throw-catch-classify pattern per call site. The `repo-root.ts` module centralizes worktree-root path resolution so per-read-primitive code doesn't duplicate the worktree-detection logic CLAUDE.md §Worktree discipline requires.
2. No backwards-compatibility shims. The wrapper is fresh; it never falls back to a hypothetical earlier API shape.

## Verification Layers

1. IndexStatus tagged union shape correct → Node test (`test/index-status.test.ts` asserts each `kind` variant appears in the emitted declaration surface and produces the expected fields per SPEC-87 §4)
2. `openExistingIndex` throw paths classified correctly → Node test (temp repo fixtures assert classification produces `missing` / `version_mismatch` / `open_failed` variants)
3. `EMPTY` and `STALE` derivable states classified correctly → Node test (real `openIndex()` fixture with zero records → `empty`; non-YAML `file_versions` drift → `stale`)
4. Single-layer cross-skill boundary: this ticket consumes `@worldloom/world-index`'s public API and produces an internal view-model; no shared boundary with other story-explorer tickets beyond the `IndexStatus` type that 004+005+007 will import.

## What to Change

### 1. Implement `IndexStatus` view-model

- `tools/story-explorer/src/view-models/index-status.ts` — exports the `IndexStatus` tagged union type exactly as SPEC-87 §4 specifies:
  ```ts
  export type IndexStatus =
    | { kind: 'fresh'; version: number }
    | { kind: 'missing'; remedy: string }
    | { kind: 'version_mismatch'; expected: number; found: number; remedy: string }
    | { kind: 'empty'; remedy: string }
    | { kind: 'stale'; driftedFiles: string[]; remedy: string }
    | { kind: 'open_failed'; error: string };
  ```

### 2. Implement the wrapper

- `tools/story-explorer/src/read/index-status.ts` — exports `resolveIndexStatus(worldSlug: string, repoRoot = resolveRepoRoot()): IndexStatus`. Calls `openExistingIndex(repoRoot, worldSlug)`; catches the missing-index throw (returns `{ kind: 'missing', remedy: "Run \`world-index build <world-slug>\` to enable indexed reads." }`); catches `SchemaVersionMismatchError` (returns `{ kind: 'version_mismatch', expected, found, remedy: "Run \`world-index build <world-slug>\` to rebuild the index." }`); catches any other throw (returns `{ kind: 'open_failed', error: e.message }`). On successful open, queries `nodes` row count for `empty` classification and `file_versions` for missing-file / non-YAML raw-hash stale classification. Returns `{ kind: 'fresh', version }` when all checks pass.

### 3. Implement `repo-root.ts`

- `tools/story-explorer/src/config/repo-root.ts` — exports `resolveRepoRoot(startDir = process.cwd()): string`. Detects the nearest repository/worktree root by walking upward to a `.git` marker without subprocess execution. Also exports `worldDbPath(worldSlug: string, repoRoot = resolveRepoRoot())` returning the absolute path to `<repo-root>/worlds/<worldSlug>/_index/world.db`.

### 4. Tests

- `tools/story-explorer/test/index-status.test.ts` — Node test coverage for each `IndexStatus` variant; uses a temp repo tree and the real `openIndex()` migration helper for valid DB fixtures (missing index → `missing`; fresh DB with zero rows → `empty`; DB with version mismatch → `version_mismatch`; non-YAML `file_versions` drift → `stale`; healthy DB → `fresh`; corrupted file → `open_failed`).

## Files to Touch

- `tools/story-explorer/src/view-models/index-status.ts` (new)
- `tools/story-explorer/src/read/index-status.ts` (new)
- `tools/story-explorer/src/config/repo-root.ts` (new)
- `tools/story-explorer/test/index-status.test.ts` (new)

## Out of Scope

- World / Story / Page enumeration view-models (tickets 004-005)
- HTTP envelope wiring (ticket 007)
- The `world-index sync` invocation surface (per Layer 4 fence; SPEC-87 Named Assumption A — index refresh stays manual in v1)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run build && node --test dist/test/index-status.test.js` — all 6 IndexStatus variants classified correctly.
2. `resolveRepoRoot()` returns the worktree root when invoked from inside `.claude/worktrees/<name>/`; returns main repo root otherwise.
3. `worldDbPath('erotica-world')` returns an absolute path ending in `worlds/erotica-world/_index/world.db`.

### Invariants

1. The `IndexStatus` tagged union shape matches SPEC-87 §4 exactly; no variants added or removed without a SPEC-87 amendment.
2. The wrapper NEVER throws; every error-path classifies into an `IndexStatus` variant for the frontend to surface.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/index-status.test.ts` — one test per variant + repo-root/worktree path detection.

### Commands

1. `cd tools/story-explorer && npm run build && node --test dist/test/index-status.test.js` (targeted: only IndexStatus + repo-root tests)
2. `cd tools/story-explorer && npm test` (full-pipeline)

## Outcome

Completed 2026-05-26. Added the `IndexStatus` tagged-union type, the `resolveIndexStatus()` wrapper, and the repo-root/world-db path helpers under `tools/story-explorer/src/`. The wrapper normalizes missing index, schema-version mismatch, empty index, stale non-YAML file drift, fresh index, and open-failure states without exposing throws to callers.

## Verification Result

1. `cd tools/story-explorer && npm run build` — passed.
2. `cd tools/story-explorer && node --test dist/test/index-status.test.js` — passed: 9 tests, 9 pass.
3. `cd tools/story-explorer && npm test` — passed: 14 tests, 14 pass.

## Deviations

1. Drafted vitest wording was corrected to the live Node test runner.
2. Drafted `openExistingIndex(worldDbPath(worldSlug))` wording was corrected to the live public API, `openExistingIndex(repoRoot, worldSlug)`.
3. YAML hash drift is intentionally not raw-hash compared in this ticket because `world-index` may store parser-level canonical YAML hashes; missing YAML files are still classified stale.
