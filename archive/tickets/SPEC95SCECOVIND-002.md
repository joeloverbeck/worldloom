# SPEC95SCECOVIND-002: Derived scene-coverage layer in world-index

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new `tools/world-index/src/index/scene-coverage.ts` module + `build`/`sync` wiring + `public/types.ts` read-surface exposure. No impact on validators, patch-engine, or the `state_hash` chain.
**Deps**: None

## Problem

The world-index already recognizes `scenes/` as `scene_record` nodes (`parse/story-directories.ts`) and emits `scene_includes_page` / `scene_previous_scene` / `scene_branch` / `scene_emitted_choice` edges (`parse/atomic.ts` `edgesForScene`). What is missing is a **derived coverage view** over those edges that the scene-first backend (SPEC-96) and MCP packet (SPEC-99) need: which SCNs are active per branch, which committed PG runs are unscened, PG→containing-SCN lookup, and per-SCN artifact availability with a presence-based publication indicator. Build that view as a read-only derived layer. (SPEC-95 §2 D2, §3.)

## Assumption Reassessment (2026-05-29)

1. `scene_record` nodes exist (`tools/world-index/src/parse/story-directories.ts:24` — `storySourceDirectorySpec("scenes", "scene_record", "id", "^SCN-[0-9]+$")`); `edgesForScene` (`tools/world-index/src/parse/atomic.ts` ~944-958) emits `scene_branch` (from `branch_id`), `scene_previous_scene` (from `previous_scene_id`), `scene_includes_page` (from `pg_ids[]`), `scene_emitted_choice` (from `emitted_choice_ids[]`). There is **no** `scene_supersedes` edge. The SCN schema (`tools/validators/src/schemas/story-scene.schema.json:25`) carries `supersedes: SCN-<n> | null` as a node field. Therefore the coverage layer reads the supersedes lineage from the `scene_record` node's `supersedes` field at build/sync time — NOT from a typed edge (SPEC-95 §2 D2 first bullet, as clarified by reassessment finding M1). The new module wires into `tools/world-index/src/commands/build.ts` and `tools/world-index/src/commands/sync.ts` (both confirmed to exist); the read surface is exposed via `tools/world-index/src/public/types.ts`.
2. SPEC-95 §2 D2 + §3 + AC#2/#3: compute per `(world_slug, story_slug, branch_id)` — active SCNs (latest in each `supersedes` lineage; superseded excluded by default but queryable), committed PG runs not covered by any active SCN (unscened runs as contiguous `[start_pg, end_pg]` spans), PG→containing-active-SCN lookup, and per-SCN artifact availability + the SPEC-94 derived publication indicator (`planned` / `prose-present` / `attached:PASS|WARN|FAIL` / `superseded`) computed from `scene-prose/` + `scene-prose-receipts/` file presence (via `file_versions`) + the receipt `verdict` — **no content hashing**. SPEC-95 §3 + §Out of Scope: must not modify `computePgStateHash` or the `state_hash` chain; `hash/content.ts` is untouched.
3. Cross-artifact boundary under audit: the world-index **public read surface** (`src/public/types.ts` re-exports + the query path the MCP server / story-explorer consume). The coverage view's types are consumed downstream by SPEC-96 (backend read model) and SPEC-99 (MCP context packet) — neither is in this batch; this ticket only PRODUCES and EXPOSES the read-only view, it does not wire any downstream consumer. The view derives over the existing `scene_*` edge vocabulary; it introduces no new node type, edge type, or op.
4. FOUNDATIONS — `SCN` is a render-membership record; publication state is derived, not stored (SPEC-92/94; `_shared-templates/story-record-schemas.md` §4.5.20). The coverage layer derives active/unscened/publication state from edges + node fields + artifact presence at the index surface and stores no new SCN field. No prose/plan byte-hash coupling on editable artifacts ([[feedback_author_rejects_hash_coupling]]; SPEC-93) — §3 presence-based-only; `hash/content.ts` untouched, `computePgStateHash` (causal-state tamper protection) unaffected. Non-canon story-bundle derived view — no Mystery Reserve / canon-write impact.
5. Reassessment while implementing exposed same-seam substrate fallout: `enumerate.ts` retained `scene-prose`, `scene-prose-plans`, and `scene-prose-receipts`, but atomic-mode `reindexAllFiles` filtered all non-`_source` `stories/` paths before this ticket. That made `file_versions` unable to support the SPEC-95 publication indicator. This ticket therefore indexes retained story-bundle artifact paths through the generic file parser before coverage refresh. `verify` was also updated to parse only `stories/*/_source/*` paths through `parseStoryBundleSourceFile`; story artifact file-version rows are verified through `parseWorldFile`.
6. Materializing the read-only coverage view requires schema ownership, so this ticket adds `scene_coverage` through migration `009_scene_coverage.sql` and bumps `CURRENT_INDEX_VERSION` to 9. The table stores derived JSON payloads only; it adds no SCN field, no edge type, and no hash/freshness fingerprint.

## Architecture Check

1. A derived read-only view computed during `build`/`sync` from already-parsed `scene_record` nodes + `scene_*` edges keeps publication state out of the append-only `SCN` record (per the SPEC-92/94 derived-not-stored contract) while giving downstream consumers a single typed query surface instead of forcing them to re-walk edges + stat artifact files themselves. Reading the supersedes lineage from the node `supersedes` field (rather than adding a `scene_supersedes` edge) avoids expanding the edge vocabulary for a relationship the node payload already serializes.
2. No backwards-compatibility shim: the view is net-new; it adds no field to `SCN`, no hashing, and no second authoritative state. Presence-based publication indicator only — no `stale_receipt` / freshness-fingerprint state (explicitly rejected by SPEC-95 §3).

## Verification Layers

1. Active-SCN / supersedes-lineage correctness → unit test over a scene fixture: a superseded SCN is excluded from the active set by default and surfaced when superseded SCNs are requested.
2. Unscened-run computation → unit test: a branch with committed PGs partially covered by active SCNs yields the correct contiguous `[start_pg, end_pg]` unscened spans (edge cases: zero-scene branch = whole chain unscened; superseded-SCN pages fall back to unscened; fork point does not leak parent coverage into child).
3. PG↔SCN lookup → unit test: PG→containing-active-SCN resolves; the inverse is available via `scene_includes_page`.
4. Publication indicator → unit test: `planned` (plan present, no prose), `prose-present` (prose, no receipt), `attached:PASS|WARN|FAIL` (receipt `verdict`), `superseded` — each derived from `file_versions` presence + receipt verdict, with no content hashing.
5. No hash coupling → codebase grep-proof: the new module does not import or call `computePgStateHash`; `grep -rn "computePgStateHash\|state_hash" tools/world-index/src/index/scene-coverage.ts` returns zero matches; `hash/content.ts` is unmodified.

## What to Change

### 1. New coverage module (`tools/world-index/src/index/scene-coverage.ts`)

Add a derived-view module that, given the indexed `scene_record` nodes + `scene_*` edges + `file_versions` for a `(world_slug, story_slug)`, computes per `branch_id`: the active-SCN set (latest in each `supersedes` lineage, walking the node `supersedes` field; superseded SCNs retained but excluded by default), the unscened committed-PG runs as contiguous `[start_pg, end_pg]` spans, the PG→containing-active-SCN map, and per-SCN artifact availability + the presence-based publication indicator (`planned` / `prose-present` / `attached:PASS|WARN|FAIL` / `superseded`) from `scene-prose-plans/`, `scene-prose/`, and `scene-prose-receipts/` `file_versions` presence + the scene-prose receipt `verdict`. No content hashing; no mutation of `SCN` or any `_source` record.

### 2. Wire into build + sync (`tools/world-index/src/commands/shared.ts`)

Populate/refresh the derived coverage view during `build` (full) and `sync` (incremental), consistent with how other derived index artifacts are populated. The view is read-only and regenerable.

### 3. Expose the read surface (`tools/world-index/src/public/types.ts` + `README.md`)

Re-export the coverage-view types (active-SCN list, unscened-run spans, PG↔SCN lookup, per-SCN publication indicator) plus the query entry point the MCP server / story-explorer will consume, as a read-only derived view. Document the view in `tools/world-index/README.md`.

### 4. Tests + fixture (`tools/world-index/tests/scene-coverage.test.ts` — new)

Add coverage tests over a scene fixture story bundle (root PG, several committed PGs, an SCN over a PG range with plan/prose/receipt, unscened trailing PGs, a sibling branch with no scene, one planned-but-unrendered scene, one attached-with-WARN receipt, no page-prose artifacts) exercising the five Verification Layers. The fixture may be built inline here (SPEC-99 builds a shared reusable fixture; this ticket does not depend on it).

## Files to Touch

- `tools/world-index/src/index/scene-coverage.ts` (new)
- `tools/world-index/tests/scene-coverage.test.ts` (new)
- `tools/world-index/src/commands/shared.ts` (modify)
- `tools/world-index/src/commands/verify.ts` (modify)
- `tools/world-index/src/public/types.ts` (modify)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/src/schema/migrations/009_scene_coverage.sql` (new)
- `tools/world-index/tests/schema.test.ts` (modify)
- `tools/world-index/tests/public-types.test.ts` (modify)
- `tools/world-index/README.md` (modify)

## Out of Scope

- Backend/frontend consumption of the coverage view — SPEC-96 / SPEC-97.
- The MCP context-packet `scene_coverage` surface — SPEC-99 (consumes this layer).
- Any change to `computePgStateHash`, the `state_hash` chain, or `hash/content.ts`.
- Hash/freshness fingerprints on scenes/plans/prose/receipts (rejected — SPEC-95 §3).
- A `scene_supersedes` edge type (the node `supersedes` field is used instead).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && npm test` passes, including the new `scene-coverage.test.ts` over the scene fixture.
2. The coverage view exposes, per branch: active SCNs / unscened PG runs / PG↔SCN lookup / per-SCN presence-based publication indicator, with superseded SCNs excluded by default and queryable on request.
3. `grep -rn "computePgStateHash\|state_hash" tools/world-index/src/index/scene-coverage.ts` → zero matches; `git diff --stat` shows `tools/world-index/src/hash/content.ts` unmodified.

### Invariants

1. The coverage view stores no new field on `SCN` and performs no content hashing; publication state is always derived at read time from artifact presence + receipt verdict.
2. The supersedes lineage is read from the `scene_record` node `supersedes` field; no `scene_supersedes` edge is introduced.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/scene-coverage.test.ts` (new) — exercises active-SCN/supersedes, unscened-run spans (incl. zero-scene, superseded-fallback, fork-no-leak edge cases), PG↔SCN lookup, and the four publication-indicator states over a scene fixture.

### Commands

1. `cd tools/world-index && npm run build && npm test`
2. `grep -rn "computePgStateHash\|state_hash" tools/world-index/src/index/scene-coverage.ts` (expect zero matches)
3. The world-index build+test boundary is correct: the coverage layer is internal to world-index and its only declared consumers (SPEC-96/99) are out of this batch, so no cross-package run is warranted here.

## Outcome

Completed: 2026-05-29

Implemented a materialized, read-only scene-coverage layer in `tools/world-index`. The new `scene_coverage` table is created by migration 009 and refreshed during the shared build/sync reindex path. `querySceneCoverage` is exported from `@worldloom/world-index/public/types` and returns branch-scoped active SCNs, superseded SCNs, unscened PG runs, PG-to-containing-SCN lookup, per-SCN artifact availability, and the presence-based publication indicator. The implementation reads supersession from each SCN node payload, membership from `scene_includes_page` edges, branch paths from PG records, and scene artifact presence/receipt verdicts from retained story artifact file-version rows. No `SCN` field, `scene_supersedes` edge, content hash, or `computePgStateHash` change was introduced.

Deviation from draft: the actual build/sync hook lives in `commands/shared.ts` rather than the thin `build.ts` / `sync.ts` wrappers. Implementation also repaired same-seam artifact indexing so retained `scene-prose*` paths populate `file_versions` in atomic mode; `verify.ts` was adjusted accordingly so story artifacts and story `_source` records use the correct parser.

Verification:

1. `cd tools/world-index && npm run build` — PASS.
2. `cd tools/world-index && node --test dist/tests/schema.test.js dist/tests/scene-coverage.test.js` — PASS (9 tests).
3. `cd tools/world-index && npm test` — PASS (130 non-CLI compiled tests; serial CLI tests: `cli-init`, `cli-smoke`, `cli-world-root` all PASS).
4. `grep -rn "computePgStateHash\|state_hash" tools/world-index/src/index/scene-coverage.ts` — PASS by expected no-match result.
