# SPEC87STOEXPBAC-004: World + Story enumeration view models

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/src/view-models/world-summary.ts` + `story-summary.ts` + `src/read/world-list.ts` + `src/read/story-list.ts`.
**Deps**: SPEC87STOEXPBAC-001, SPEC87STOEXPBAC-003

## Problem

SPEC-87 §4 specifies the `WorldSummary` and `StorySummary` view models the SPEC-88 frontend consumes for the World Picker and Story Picker. World enumeration must work even when no index has been built (filesystem-only fallback for the World Picker); Story enumeration uses the index when available and falls back to direct filesystem reads otherwise, deriving counts (PG count, leaf count, rendered-prose count) the picker displays per card. The Story Picker also needs the `terminalReason` discriminator added per the SPEC-87 reassessment M3 — the discriminator the frontend's `<TerminalCard>` body sub-line consumes for context-appropriate copy.

## Assumption Reassessment (2026-05-25)

1. `tools/world-index/src/parse/story-directories.ts` (brainstorm-verified) maps the 22 indexed story record classes; brainstorm-time + reassess-time agent verification confirmed `worlds/<slug>/stories/<story-slug>/_source/<class>/` is the per-bundle path convention and `worlds/<slug>/_index/world.db` is the per-world index path. This ticket's enumeration code reads `worlds/<slug>/` via `repo-root.ts` from ticket 003 + filesystem `readdir`, then optionally consults the index via ticket 003's `resolveIndexStatus`. The terminalReason derivation logic reads the parent PG's `state_snapshot` to infer whether a leaf page is terminal-by-no-children, paused-per-metadata, or terminal-per-metadata.
2. SPEC-87 §4 specifies `WorldSummary` and `StorySummary` field sets; the SPEC-87 reassessment M3 added `terminalReason: 'no_children' | 'paused' | 'terminal' | null` to `PageSummary`. The PageSummary type itself is defined here (it's a sub-shape returned by `StorySummary.leafPageIds` resolution); the full PageSummary read implementation lives in ticket 005's page-detail.ts.
3. Cross-skill boundary: the story-bundle artifact-path contract is the shared boundary under audit. SPEC-87 §3 layout names `STORY_KERNEL.md`, `_source/<class>/<ID>.yaml`, `pages-prose/PG-<n>.md`, `pages-prose-plans/PG-<n>.md`, `pages-prose-receipts/PG-<n>.yaml`, `story-characters/STCHAR-<n>.md`, `INDEX.md`. This ticket's enumeration reads `STORY_KERNEL.md` (for title), counts `_source/pages/PG-*.yaml` files (for PG count), counts `pages-prose/PG-*.md` files (for rendered-prose count). The contract is the path convention; deviation in this ticket would break SPEC-88's display.

## Architecture Check

1. World enumeration MUST work without a built index (the World Picker is the first surface a user hits — requiring `world-index build` before any world is visible would be hostile UX). Filesystem-only enumeration handles the missing-index case; the `IndexStatus` view-model surfaces the freshness state so the picker badge can guide the user toward `world-index build`. Story enumeration prefers indexed PG-count queries when the index is fresh; falls back to filesystem `pages/PG-*.yaml` count when stale or missing.
2. No backwards-compatibility shims; SPEC-87 is the first specification of this surface.

## Verification Layers

1. World enumeration without index → vitest test (creates a temp `worlds/` tree with no `_index/` subdirectory; asserts `enumerateWorlds()` returns the worlds with `indexStatus.kind: 'missing'`)
2. Story enumeration with index → vitest test (uses the `worlds/erotica-world/stories/red-bunny/` fixture; asserts PG count, leaf count, rendered-prose count match the filesystem)
3. terminalReason discrimination → vitest test (asserts a leaf-by-no-children page receives `terminalReason: 'no_children'`; mocks paused / terminal metadata for the other variants)
4. Cross-skill story-bundle path contract → codebase grep-proof (story-list.ts reads `pages-prose/PG-*.md`, `_source/pages/PG-*.yaml`, `STORY_KERNEL.md` — matches the SPEC-87 §3 path convention exactly)

## What to Change

### 1. Implement `WorldSummary` view-model

- `tools/story-explorer/src/view-models/world-summary.ts` — exports the type per SPEC-87 §4: `worldSlug`, `displayName`, `path` (absolute, worktree-root-anchored via `repo-root.ts`), `indexStatus`, `storyCount`, `hasWorldDb`, `indexVersion: number | null`, `driftedFiles: string[]`, `errors: string[]`.

### 2. Implement `StorySummary` view-model

- `tools/story-explorer/src/view-models/story-summary.ts` — exports the type per SPEC-87 §4: `worldSlug`, `storySlug`, `storyId`, `title: string | null`, `kernelPath`, `pageCount`, `choiceCount`, `branchCount`, `renderedProseCount`, `leafPageIds: string[]`, `rootPageId: string | null`, `latestPageId: string | null`, `indexStatus`.

### 3. Implement `PageSummary` view-model

- `tools/story-explorer/src/view-models/page-summary.ts` — exports the type per SPEC-87 §4 + the reassessment M3 addition: `pageId`, `branchId`, `parentPageId`, `turnIndex`, `choiceId`, `resolvedEventId`, `hasRenderedProse`, `hasPlan`, `hasReceipt`, `activeRecordCounts: Record<string, number>`, `childCount`, `isLeaf`, `isTerminalOrPaused`, `terminalReason: 'no_children' | 'paused' | 'terminal' | null`.

### 4. Implement enumeration read primitives

- `tools/story-explorer/src/read/world-list.ts` — exports `enumerateWorlds(): Promise<WorldSummary[]>`. Reads `worlds/*/` via `readdir`. For each world directory, constructs `WorldSummary` with `path` from `repo-root.ts`, `indexStatus` from ticket 003's `resolveIndexStatus`, `storyCount` from `worlds/<slug>/stories/*/` readdir, and `hasWorldDb` from `_index/world.db` existence check. Filesystem-only when no index; index-augmented when present.
- `tools/story-explorer/src/read/story-list.ts` — exports `enumerateStories(worldSlug: string): Promise<StorySummary[]>` and `getPageSummaries(worldSlug: string, storySlug: string): Promise<PageSummary[]>`. Story enumeration reads `worlds/<slug>/stories/*/` and per-story reads `STORY_KERNEL.md` frontmatter (for title), counts via indexed query when fresh else filesystem fallback. PageSummary derivation reads the indexed PG nodes (or filesystem `_source/pages/PG-*.yaml` fallback), derives `childCount` from `parent_page_id` index, computes `terminalReason` from the combination of `isLeaf` (no child PGs) + the PG record's metadata fields (paused/terminal state if present per the PG schema).

### 5. Tests

- `tools/story-explorer/test/enumeration.test.ts`:
  - World enumeration with no `_index/` subdirectory → all worlds return `indexStatus.kind: 'missing'`.
  - World enumeration with fresh index → `indexStatus.kind: 'fresh'`, `storyCount` matches filesystem.
  - Story enumeration on red-bunny fixture → PG count = 1, leaf count = 1, rendered-prose count = 1, root = `PG-1`.
  - terminalReason discrimination on a leaf page with no children → `terminalReason: 'no_children'`.

## Files to Touch

- `tools/story-explorer/src/view-models/world-summary.ts` (new)
- `tools/story-explorer/src/view-models/story-summary.ts` (new)
- `tools/story-explorer/src/view-models/page-summary.ts` (new)
- `tools/story-explorer/src/read/world-list.ts` (new)
- `tools/story-explorer/src/read/story-list.ts` (new)
- `tools/story-explorer/test/enumeration.test.ts` (new)

## Out of Scope

- PageDetail assembly (ticket 005)
- Record card view models (ticket 006)
- HTTP routes consuming these view models (tickets 007-008)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test -- enumeration` — World + Story enumeration paths covered for both indexed and missing-index cases.
2. `enumerateWorlds()` on the live `worlds/` tree returns ≥1 world (the test asserts existence + shape, not specific slugs).
3. `terminalReason` discrimination produces the correct discriminator for each variant per the SPEC-87 §4 enum.

### Invariants

1. World enumeration MUST work without a built index — the World Picker UI must never be blocked by missing infrastructure.
2. View-model field sets MUST match SPEC-87 §4 exactly; no fields added or removed without a SPEC-87 amendment (the M3 `terminalReason` addition was applied at reassessment time).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/enumeration.test.ts` — describe blocks per enumeration primitive + per terminalReason variant.

### Commands

1. `cd tools/story-explorer && npm test -- enumeration` (targeted)
2. `cd tools/story-explorer && npm test` (full-pipeline)
