# SPEC92SCERANPRO-005: world-index SCN enumeration, node-type parsing, and edges

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (enumerate the four scene directories; parse SCN as a node-type; index SCN edges).
**Deps**: archive/tickets/SPEC92SCERANPRO-002.md

## Problem

The world index must enumerate the new scene directories and parse SCN records so they are retrievable (via -004's `list_records` / `get_record`) and so scene structure is queryable. SPEC-92 acceptance #6 requires the index to enumerate `_source/scenes`, `scene-prose-plans`, `scene-prose`, `scene-prose-receipts` and to index `SCN→PG` (membership), `SCN→CHC`, `SCN→BR`, and `SCN.previous_scene_id` edges.

## Assumption Reassessment (2026-05-28)

1. `tools/world-index/src/enumerate.ts` (story-bundle directory enumeration) and `tools/world-index/src/parse/story-directories.ts` exist at HEAD (verified). Story-bundle edge parsing lives in `tools/world-index/src/parse/structured-edges.ts` (verified present). SCN node-type + edges follow the existing story-bundle pattern.
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

### 3. parse/structured-edges.ts (modify)

Emit SCN→PG (membership, one per `pg_ids` entry), SCN→CHC (`emitted_choice_ids`), SCN→BR (`branch_id`), SCN→SCN (`previous_scene_id`) edges.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/src/parse/story-directories.ts` (modify)
- `tools/world-index/src/parse/structured-edges.ts` (modify)
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify — add SCN node + edge-parity cases)

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
