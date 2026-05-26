# SPEC87STOEXPBAC-003: IndexStatus view-model + repo-root resolution

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/read/index-status.ts` + `src/config/repo-root.ts` + supporting types.
**Deps**: SPEC87STOEXPBAC-001

## Problem

SPEC-87 §4 specifies the `IndexStatus` tagged-union view-model that the frontend (SPEC-88) consumes to surface index freshness state (`fresh` / `missing` / `version_mismatch` / `empty` / `stale` / `open_failed`). Per the SPEC-87 reassessment correction, the upstream `openExistingIndex` helper at `tools/world-index/src/index/open.ts:163` throws on missing index rather than returning a unified shape, and `SchemaVersionMismatchError` is caught at the command layer. The Story Explorer's read primitives need a single normalized view-model — this ticket implements the wrapper that catches the upstream throws and classifies them into the unified `IndexStatus`. The companion `repo-root.ts` resolves worktree-root-anchored paths so every read primitive constructs filesystem paths consistently from the worktree-root base (per CLAUDE.md §Worktree discipline).

## Assumption Reassessment (2026-05-25)

1. `openExistingIndex()` at `tools/world-index/src/index/open.ts:163` (brainstorm-verified, reassess-verified) throws on missing index with a clear error message; `SchemaVersionMismatchError` is exported from the same module and thrown when the schema version mismatches the expected version. The wrapper catches both throw sites and the `EMPTY` / `STALE` derivable states (via `file_versions` table comparison) and classifies into the SPEC-87 §4 `IndexStatus` tagged union. The wrapper does NOT modify or re-throw — every caller receives a `IndexStatus` value with a `kind` discriminator.
2. SPEC-87 §4 defines the `IndexStatus` tagged union explicitly (`fresh` / `missing` / `version_mismatch` / `empty` / `stale` / `open_failed`) with per-variant remedy strings the frontend surfaces. Each variant carries the data the SPEC-88 banner needs (drifted file list for `stale`, expected/found versions for `version_mismatch`).
3. Cross-skill boundary: `@worldloom/world-index`'s public API contract. This ticket consumes `openExistingIndex` from `@worldloom/world-index/index/open` and `SchemaVersionMismatchError` from the same module — both are public exports per `tools/world-index/package.json`'s `exports` map. The boundary is unidirectional: this ticket reads world-index's API; it does NOT extend or modify world-index's surface.

## Architecture Check

1. The wrapper centralizes index-status classification in one module so every read primitive (world-list, story-list, page-detail) reads a unified view-model rather than re-implementing the throw-catch-classify pattern per call site. The `repo-root.ts` module centralizes worktree-root path resolution so per-read-primitive code doesn't duplicate the worktree-detection logic CLAUDE.md §Worktree discipline requires.
2. No backwards-compatibility shims. The wrapper is fresh; it never falls back to a hypothetical earlier API shape.

## Verification Layers

1. IndexStatus tagged union shape correct → vitest test (`test/index-status.test.ts` asserts each `kind` variant produces the expected fields per SPEC-87 §4)
2. `openExistingIndex` throw paths classified correctly → vitest test (mock the throw + catch, assert classification produces `missing` / `version_mismatch` / `open_failed` variants)
3. `EMPTY` and `STALE` derivable states classified correctly → vitest test (mock a fresh DB with zero records → `empty`; mock a DB with `file_versions` drift → `stale`)
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

- `tools/story-explorer/src/read/index-status.ts` — exports `resolveIndexStatus(worldSlug: string): IndexStatus`. Calls `openExistingIndex(worldDbPath(worldSlug))`; catches the missing-index throw (returns `{ kind: 'missing', remedy: "Run \`world-index build <world-slug>\` to enable indexed reads." }`); catches `SchemaVersionMismatchError` (returns `{ kind: 'version_mismatch', expected, found, remedy: "Run \`world-index build <world-slug>\` to rebuild." }`); catches any other throw (returns `{ kind: 'open_failed', error: e.message }`). On successful open, queries `nodes` row count for `empty` classification and `file_versions` for `stale` classification per `tools/world-index/src/index/open.ts` semantics. Returns `{ kind: 'fresh', version }` when all checks pass.

### 3. Implement `repo-root.ts`

- `tools/story-explorer/src/config/repo-root.ts` — exports `resolveRepoRoot(): string`. Detects whether the current working directory is inside a git worktree (`.git/worktrees/` membership check or `git rev-parse --show-toplevel` shell-out — implementer choice between in-process `find-up` style detection or subprocess; given Layer 4 fence forbids subprocess calls into the worldloom repo for index refresh, prefer the in-process detection). Returns the worktree root when active, otherwise the main repo root. Also exports `worldDbPath(worldSlug: string): string` returning the absolute path to `<repo-root>/worlds/<worldSlug>/_index/world.db`.

### 4. Tests

- `tools/story-explorer/test/index-status.test.ts` — one describe block per `IndexStatus` variant; uses a temp fixture directory to simulate each state (missing dir → `missing`; fresh DB with zero rows → `empty`; DB with version mismatch → `version_mismatch`; DB with `file_versions` drift → `stale`; healthy DB → `fresh`; corrupted file → `open_failed`).

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

1. `cd tools/story-explorer && npm test -- index-status` — all 6 IndexStatus variants classified correctly.
2. `resolveRepoRoot()` returns the worktree root when invoked from inside `.claude/worktrees/<name>/`; returns main repo root otherwise.
3. `worldDbPath('erotica-world')` returns an absolute path ending in `worlds/erotica-world/_index/world.db`.

### Invariants

1. The `IndexStatus` tagged union shape matches SPEC-87 §4 exactly; no variants added or removed without a SPEC-87 amendment.
2. The wrapper NEVER throws; every error-path classifies into an `IndexStatus` variant for the frontend to surface.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/index-status.test.ts` — one describe per variant + one describe for `repo-root.ts` worktree detection.

### Commands

1. `cd tools/story-explorer && npm test -- index-status` (targeted: only IndexStatus + repo-root tests)
2. `cd tools/story-explorer && npm test` (full-pipeline)
