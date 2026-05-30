# SPEC99CONPACSCE-001: scene_coverage packet layer + tests + contract doc

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` context-packet assembly (`story-bundle-context.ts` layer + `shared.ts` interface + `assemble.ts` wiring) and `docs/CONTEXT-PACKET-CONTRACT.md` §6. No impact on the patch engine, validators, or any canon-write path (read-only projection).
**Deps**: None

## Problem

The story context packet (`buildStoryBundleContext`, surfaced per `CONTEXT-PACKET-CONTRACT.md` §6) exposes ~two dozen live-state layers but **no scene surface** — no scene coverage, no unscened-run signal, no PG→SCN binding. Authoring skills that need scene structure (notably `branching-story-health-audit`) must discover SCN ids out-of-band and `get_record` them. SPEC-95 already built the derived `scene_coverage` world-index view; this ticket surfaces a bounded projection of it in the packet so the consuming skill (SPEC99CONPACSCE-003) can read scene/unscened binding directly.

## Assumption Reassessment (2026-05-30)

1. `buildStoryBundleContext` exists at `tools/world-mcp/src/context-packet/story-bundle-context.ts:831`; the packet already computes `longest_active_branch_path` (`story-bundle-context.ts:670-700`) and `recent_pages_along_longest_active_branch`. The `ContextPacketStoryBundleContext` interface is at `tools/world-mcp/src/context-packet/shared.ts:110-371` (~two dozen top-level fields; `scene_coverage` is a new additive field). The SPEC-95 `scene_coverage` view is at `tools/world-index/src/index/scene-coverage.ts` with per-branch columns `active_scene_ids_json`, `superseded_scene_ids_json`, `unscened_ranges_json`, `pg_scene_lookup_json`, `scenes_json` (each scene carrying the SPEC-94 presence-based `publication_indicator`). The layer READS that view; it does not recompute coverage.
2. Per SPEC-99 §2 item 1: the layer is a bounded projection scoped to `longest_active_branch_path` — per relevant PG `{ page_id, scene_ids, unscened }` plus a compact active-SCN list per branch with the SPEC-94 publication indicator; trim-first under budget, never carrying prose bodies. `CONTEXT-PACKET-CONTRACT.md` §6 ("Story bundle context", line 125) is where the new layer is documented.
3. Cross-artifact boundary under audit: the context-packet contract — the `ContextPacketStoryBundleContext` interface (`shared.ts`) plus its `CONTEXT-PACKET-CONTRACT.md` §6 documentation — consumed downstream by `branching-story-health-audit` (SPEC99CONPACSCE-003) and (advisory-only) `branching-story-turn-cycle`. The field name, shape, and trim priority must match what 003 reads at `story_bundle_context.scene_coverage`.
4. FOUNDATIONS (SPEC-99 §5): aligns with the context-packet contract (bounded, retrieval-first, token-disciplined) and Rule 7 (Preserve Mystery) — scene coverage is membership/coverage metadata only; it carries no prose body and resolves no Mystery Reserve entry. The reassessment classified this as the extending-an-already-fenced-read-only-mediator case: the packet reads only SPEC-95's derived view and introduces no write path, so the Canon-Pipeline Impact Rule reduces to the honesty/mystery angle (no fabricated coverage under a stale index, no forbidden-status `M` surfaced as resolved).

## Architecture Check

1. Projects an existing derived view rather than recomputing coverage — single source of truth (SPEC-95's `scene_coverage` table); the packet layer is a read-and-shape pass scoped to the branch path the packet already computes.
2. No backwards-compatibility shim: `scene_coverage` is a new additive interface field; existing packet consumers are unaffected (additive-only).

## Verification Layers

1. Layer projects the SPEC-95 view scoped to the active branch path -> world-mcp packet test (seed `scene_coverage` rows, assert projection) + codebase grep for the new field.
2. Trim-first discipline under budget -> packet budget test (`story-bundle-budget.test.ts`) asserts `scene_coverage` trims before the higher-priority existing layers and never carries prose.
3. No prose body / no MR resolution (Rule 7) -> grep-proof the layer carries only ids/booleans/indicators; FOUNDATIONS alignment check.

## What to Change

### 1. Interface (`shared.ts`)

Add a `scene_coverage` field to `ContextPacketStoryBundleContext` — per-branch active/superseded SCN ids, per-PG `{ page_id, scene_ids, unscened }` over the active branch path, and a compact active-SCN list with the presence-based publication indicator. Prose-free.

### 2. Layer computation (`story-bundle-context.ts`)

Read the `scene_coverage` view rows for the bundle, project onto `longest_active_branch_path`, and emit the bounded shape. Trim-first under budget pressure (after the higher-priority existing layers).

### 3. Wiring (`assemble.ts`)

Wire the new layer into `buildStoryBundleContext` assembly and the truncation summary.

### 4. Tests (`tests/context-packet/`)

Extend `story-bundle-context.test.ts` (seed `scene_coverage` index rows, assert the projection + branch-path scoping) and `story-bundle-budget.test.ts` (trim-order + no-prose). Seed the index in the existing test style — no shared cross-tool fixture (per SPEC-99 §2 item 3; the per-tool scene fixtures already landed with SPEC-95/96/97/98).

### 5. Contract doc (`CONTEXT-PACKET-CONTRACT.md` §6)

Document the new `scene_coverage` layer under §6 Story bundle context: shape, branch-path scoping, trim priority, and the prose-free guarantee.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)

## Out of Scope

- Prose snapshots / PG-x-ray payloads in the packet (no authoring-skill consumer; story-explorer uses SPEC-96's API).
- The coverage computation itself (SPEC-95, already landed).
- New MCP retrieval primitives (SCN retrieval already works via `get_record`/`list_records`).
- The health-audit consumer wiring (SPEC99CONPACSCE-003) and the docs closeout sweep (SPEC99CONPACSCE-002).

## Acceptance Criteria

### Tests That Must Pass

1. The world-mcp packet test seeds `scene_coverage` rows and asserts the projected layer (scene_ids/unscened per active-branch PG + active-SCN list with publication indicator).
2. The budget test asserts `scene_coverage` trims before the higher-priority existing layers and never carries a prose body.
3. `cd tools/world-mcp && npm test` passes.

### Invariants

1. The layer projects SPEC-95's `scene_coverage` view; it never recomputes coverage or reads scene prose.
2. `scene_coverage` is additive-only on `ContextPacketStoryBundleContext`; no existing field changes shape.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — seed `scene_coverage` index rows; assert projection shape + branch-path scoping.
2. `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` — assert trim-first ordering + prose-free guarantee.

### Commands

1. `cd tools/world-mcp && npm test`
2. `grep -n "scene_coverage" tools/world-mcp/src/context-packet/shared.ts` — confirm the additive field landed.
