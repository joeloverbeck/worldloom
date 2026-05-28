# SPEC92SCERANPRO-005: world-index SCN enumeration, node-type parsing, and edges

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (enumerate the four scene directories; parse SCN as a node-type; index SCN edges).
**Deps**: archive/tickets/SPEC92SCERANPRO-002.md

## Problem

The world index must enumerate the new scene directories and parse SCN records so they are retrievable (via -004's `list_records` / `get_record`) and so scene structure is queryable. SPEC-92 acceptance #6 requires the index to enumerate `_source/scenes`, `scene-prose-plans`, `scene-prose`, `scene-prose-receipts` and to index `SCN→PG` (membership), `SCN→CHC`, `SCN→BR`, and `SCN.previous_scene_id` edges.

## Assumption Reassessment (2026-05-28)

1. `tools/world-index/src/enumerate.ts` (story-bundle directory enumeration) and `tools/world-index/src/parse/story-directories.ts` exist at HEAD (verified). Story-bundle source-record edge parsing lives in `tools/world-index/src/parse/atomic.ts` (`edgesForStoryRecord` and record-specific helpers), while `tools/world-index/src/parse/structured-edges.ts` is only for prose/frontmatter structured-reference extraction. SCN node-type + edges follow the existing story-bundle source-record pattern in `atomic.ts`.
2. SPEC-92 §Scope (world-index) + §Acceptance #6 define the four directories + four edge types. The SCN record shape comes from -002 (the Dep).
3. Cross-artifact boundary under audit: the world-index node-type registration is what makes -004's `list_records` / `get_record` resolve SCN; the SCN→PG/CHC/BR/previous_scene edges are consumed by general query primitives (`get_neighbors`, context-packet edge projection) — graph-edge deliverables with a structural-consumer model (no per-edge name-greppable consumer required).
4. FOUNDATIONS §Story Bundles §3 (Read Discipline) + the edge-vocabulary contract: SCN edges fit the existing edge vocabulary (one entry per resolved record reference; no novel semantics). The retrieval surface projects the new edges automatically.

## Architecture Check

1. Adding scene directories to the existing enumerator + SCN to the existing node-type parser keeps SCN a first-class indexed record uniformly with PG / SLT; no scene-specific index path.
2. No shims: SCN node-type + edges are new entries in existing enumerations, not special cases.

## Verification Layers

1. The four scene directories enumerate -> world-index enumeration test.
2. SCN records parse to nodes; SCN→PG/CHC/BR/previous_scene edges index with parity to disk -> world-index edge-parity test.
3. SCN nodes retrievable via the query surface (paired with -004) -> integration check.

## What to Change

### 1. enumerate.ts (modify)

Add `_source/scenes` (YAML) + `scene-prose-plans`, `scene-prose` (markdown) + `scene-prose-receipts` (YAML) to the story-bundle directory enumeration.

### 2. parse/story-directories.ts (modify)

Add `scenes` to the story-scoped record-type set so SCN records parse to nodes.

### 3. parse/atomic.ts (modify)

Emit SCN→PG (membership, one per `pg_ids` entry), SCN→CHC (`emitted_choice_ids`), SCN→BR (`branch_id`), SCN→SCN (`previous_scene_id`) edges.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/src/parse/story-directories.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify — add SCN node + edge-parity cases)
- `tools/world-index/tests/types.test.ts` (modify — assert SCN edge registration/counts)

## Out of Scope

- world-mcp retrieval registration (-004) — this ticket makes SCN indexable; -004 exposes it via `list_records` / `get_record`.
- The skills that read the index (-008 / -009).

## Acceptance Criteria

### Tests That Must Pass

1. The four scene directories enumerate; SCN records parse to nodes.
2. SCN→PG/CHC/BR/previous_scene edges index with parity to disk.
3. `cd tools/world-index && npm run build && npm test` green.

### Invariants

1. SCN edges fit the existing edge vocabulary (one entry per resolved reference; no novel semantics).
2. Enumeration is additive — page directories remain enumerated (coexistence).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` — extend; SCN node + edge parity.
2. `tools/world-index/tests/enumerate.test.ts` — extend; scene directories enumerate.

### Commands

1. `cd tools/world-index && npm run build && npm test`

## Outcome

Completed: 2026-05-28

`tools/world-index` now indexes SPEC-92 scene render-layer artifacts. Story-bundle enumeration accepts `_source/scenes`, `scene-prose-plans`, `scene-prose`, and `scene-prose-receipts`. The story-source directory registry parses `_source/scenes/SCN-*.yaml` as `scene_record` nodes. The story edge registry and parser emit SCN membership/status edges for `branch_id`, `pg_ids`, `emitted_choice_ids`, and `previous_scene_id` using registered edge types `scene_branch`, `scene_includes_page`, `scene_emitted_choice`, and `scene_previous_scene`.

## Verification Result

1. `cd tools/world-index && npm run build` passed.
2. `cd tools/world-index && node --test dist/tests/enumerate.test.js dist/tests/parse/atomic-story-edge-parity.test.js dist/tests/types.test.js dist/tests/integration/spec46-story-bundle-edges-integration.test.js dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js` passed 8 focused tests.
3. `cd tools/world-index && npm test` passed: 135 tests, 135 pass, 0 fail.

## Deviations

The drafted ticket named `tools/world-index/src/parse/structured-edges.ts` as the edge parser. Live reassessment found that source-record story-bundle edges are emitted from `tools/world-index/src/parse/atomic.ts`; `structured-edges.ts` is only for prose/frontmatter structured-reference extraction. The implementation and tests therefore updated `atomic.ts` and `tools/world-index/src/schema/types.ts` instead.
