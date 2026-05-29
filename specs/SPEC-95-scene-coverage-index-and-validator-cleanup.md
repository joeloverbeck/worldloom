# SPEC-95 — World-Index Scene-Coverage Layer + Validator/Schema Cleanup

**Status:** draft
**Date:** 2026-05-28
**Classification:** story-canon-related (changes the world-index story-bundle inventory + a derived coverage layer over `scene_record` nodes/edges, the `tools/validators` registry naming for two surviving PG causal validators, and removes the legacy page-prose receipt schema surface; touches no canon record schema and no FOUNDATIONS principle beyond reinforcing the SPEC-92 SCN-is-membership / prose-is-non-authoritative stance).
**Depends on:** archived **SPEC-94** (SCN carries no stored `status`; the coverage layer derives publication state from artifact presence + receipt `verdict`). SPEC-94 is landed; land this spec next.
**Related:** archived `SPEC-92` (scene render layer; the `scene_includes_page` / `scene_previous_scene` / `scene_branch` / `scene_emitted_choice` edges already exist), archived `SPEC-93` (page-plan retirement). This spec is phase 2–3 of the second-iteration scene-first plan; consumed by **SPEC-96** (backend read model) and **SPEC-99** (MCP packet).
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` §11/§13/§19 phases 2–3. The report's "scene coverage computation" is built here; its hash/freshness-fingerprint proposals are **rejected** (presence-based only — see §3).

---

## 1. Context & Motivation

The world-index already recognizes `scenes/` as `scene_record` nodes (`parse/story-directories.ts`) and already emits SCN→PG / previous-scene / branch / emitted-choice edges (`parse/atomic.ts` `edgesForStoryScene`, edge types `scene_includes_page`, `scene_previous_scene`, `scene_branch`, `scene_emitted_choice`). What is missing is a **derived coverage view** over those edges that the scene-first backend (SPEC-96) and MCP packet (SPEC-99) need: which SCNs are active per branch, which committed PG runs are *unscened*, PG→containing-SCN lookup, and per-scene artifact availability.

Two cleanups ride with it:

- **Legacy page-prose inventory.** `enumerate.ts` still treats `pages-prose`, `pages-prose-plans` (markdown) and `pages-prose-receipts` (yaml) as indexable story-bundle directories. With page-plan authoring retired (SPEC-93) and no live bundle producing them, and with the scene-first explorer (SPEC-96/97) replacing the page-prose read routes that justified keeping them, these become dead inventory that perpetuates the page-as-prose model. Remove them from the indexable sets.
- **Validator vocabulary.** Two registered validators carry `page-plan`/`page` names but validate **PG/SE causal state**, not page-plan markdown (which is gone): `page_plan_turn_driver_consistency` (validates `PG.input.resolved_event_id` ↔ `SE.created_at_page`/`turn_driver`) and `page_affordance_integrity` (validates `PG.state_snapshot.visible_affordances` against active records). Rename them to causal-state vocabulary so the surviving validator set no longer implies a page-plan architecture. (`page-plan-active-pressure.ts` is a NOT-registered helper module, not a validator — left as-is; no rename.)

## 2. Scope

### In scope

1. **World-index inventory removal** (`tools/world-index/src/enumerate.ts`): remove `pages-prose`, `pages-prose-plans` from `STORY_BUNDLE_MARKDOWN_DIRECTORIES` and `pages-prose-receipts` from `STORY_BUNDLE_YAML_DIRECTORIES`. Retain `scene-prose`, `scene-prose-plans` (markdown) and `scene-prose-receipts` (yaml). Update the `isIndexablePath` branches and the colocated enumerate tests/fixtures (`tests/enumerate.test.ts`, `tests/helpers/atomic-fixture.ts`).
2. **Derived scene-coverage layer** (new `tools/world-index/src/index/scene-coverage.ts` or equivalent, populated during `build`/`sync`): from the existing `scene_record` nodes + `scene_includes_page` / `scene_branch` / `scene_previous_scene` edges, compute per `(world_slug, story_slug, branch_id)`:
   - active SCNs (latest in each `supersedes` lineage; superseded SCNs excluded by default but queryable),
   - committed PG runs on the branch path **not** covered by any active SCN (unscened runs, as contiguous `[start_pg, end_pg]` spans),
   - PG → containing active SCN lookup (and the inverse, already available via `scene_includes_page`),
   - per-SCN artifact availability + the SPEC-94 derived publication indicator (`planned` / `prose-present` / `attached:PASS|WARN|FAIL` / `superseded`) computed from `scene-prose/`, `scene-prose-receipts/` file presence (via `file_versions`) + the receipt `verdict` — **no content hashing**.
   Expose it through the existing index query surface (`src/public/types.ts` re-exports + the query path the MCP server / story-explorer consume) as a read-only derived view.
3. **Validator rename** (`tools/validators`): rename `page_plan_turn_driver_consistency` → `turn_driver_state_consistency` (or `pg_se_turn_driver_consistency`) and `page_affordance_integrity` → `pg_affordance_integrity`; update the registry (`src/public/registry.ts`), source filenames, colocated tests, and any `applies_to`/diagnostic-message strings. Behavior unchanged — rename only.
4. **Retire the legacy page-prose receipt schema surface**: remove `prose-receipt.schema.json` (the page-prose receipt validator was already retired by SPEC-93) and the shared-schemas §4.6 legacy receipt block, IF no live consumer remains (verify via the §5 sweep). The scene-prose receipt schema (`scene-prose-receipt.schema.json`) is the live surface and is untouched.

### Out of scope

- The backend/frontend that consume the coverage layer → **SPEC-96 / SPEC-97**.
- The MCP context-packet `scene_coverage` surface → **SPEC-99** (it consumes this layer).
- Any change to `computePgStateHash` or the `state_hash` chain (the coverage layer is presence-based; `hash/content.ts` is untouched).
- Hash/freshness fingerprints on scenes/plans/prose/receipts — **rejected** (author rejects hash coupling on editable artifacts).
- Renaming `PG`/`page_record` node type — out (report §17 "not now").

## 3. Key decision — presence-based freshness, no hashing

The coverage layer's publication indicator and "stale" detection are **file-presence + receipt-verdict only**. The report's "stale_receipt"/freshness-fingerprint states would require hashing editable scene plans/prose and comparing — exactly the coupling the author rejected and SPEC-93 removed for PG. A hand-edited plan/prose simply reflects current presence + last receipt verdict; "stale" is not a derived state here. (`computePgStateHash` is causal-state tamper protection, not prose coupling, and is unaffected.)

## 4. Migration & grandfathering

None required for coverage (0 SCN records exist). Removing the page-prose inventory follows world-index migration discipline (README §migration): if the change reclassifies or de-indexes existing `(file_path, node_type)` rows, the migration must delete the affected `nodes`/`file_versions` rows so sync re-parses; with 0 page-prose files on disk this is a no-op in practice, but the migration step is included for correctness.

## 5. Files to touch

- `tools/world-index/src/enumerate.ts` — inventory sets + `isIndexablePath`.
- `tools/world-index/src/index/scene-coverage.ts` (new) + wiring in `src/commands/sync.ts` / `build`.
- `tools/world-index/src/public/types.ts` + README — expose/document the coverage view.
- `tools/world-index/tests/enumerate.test.ts`, `tests/helpers/atomic-fixture.ts`, + new coverage tests.
- `tools/validators/src/public/registry.ts` + `src/structural/page-plan-turn-driver-consistency.ts` + `src/structural/page-affordance-integrity.ts` (rename files + symbols) + colocated tests.
- `tools/validators/src/schemas/prose-receipt.schema.json` (remove) + `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 (remove, if §5 sweep confirms no live consumer).

**Completeness sweep (run before drafting Acceptance Criteria; re-run as a gate):**
```
grep -rn "page_plan_turn_driver_consistency\|page_affordance_integrity\|prose-receipt.schema\|pages-prose-receipts\|pages-prose-plans\|pages-prose" \
  .claude/skills/ docs/ tools/world-index/src tools/validators/src tools/world-mcp/src tools/story-explorer/src | grep -v "archive/"
```
Triage each hit: renamed-validator references and removed-inventory references are in scope; story-explorer's page-prose READ routes are SPEC-96's concern (note, don't edit here); archive untouched.

## 6. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| `SCN` is a render-membership record; publication state is derived, not stored (SPEC-92/94; story-record-schemas §4.5.20) | aligns | Coverage layer derives active/unscened/publication state from edges + artifact presence at the index surface; stores no new SCN field. |
| No prose/plan byte-hash coupling on editable artifacts ([[feedback_author_rejects_hash_coupling]]; SPEC-93) | aligns | §3 presence-based-only; `hash/content.ts` untouched. |
| Rendered prose is non-authoritative, not a state engine (story-state-contract §1) | aligns | De-indexing `pages-prose*` removes dead publication-artifact inventory; coverage reads scene artifacts as publication surfaces only, never as state. |
| Validators gate canonical/story state, named by what they validate | aligns | Renaming PG-causal validators to causal-state vocabulary (validator-gate surface) keeps the surviving set free of the retired page-plan architecture's naming. |

## 7. Build & test

- `tools/world-index`: `npm run build && npm test` (inventory change + coverage layer + updated fixtures).
- `tools/validators`: `npm run build && npm test` (rename + schema removal; behavior-preserving rename verified by the renamed tests passing unchanged assertions).
- §5 sweep returns only intentional in-scope hits.

## 8. Acceptance criteria

1. `enumerate.ts` no longer lists `pages-prose`, `pages-prose-plans`, `pages-prose-receipts`; `scene-prose*` retained; world-index build+tests pass; a test asserts `pages-prose*` paths are not indexed.
2. A derived scene-coverage view exists, computed from existing `scene_*` edges + artifact presence, exposing active SCNs / unscened PG runs / PG↔SCN lookup / per-SCN publication indicator per branch; covered by tests over a scene fixture (built in SPEC-99 or inline here).
3. The coverage layer adds no content hashing and does not modify `computePgStateHash` or the `state_hash` chain.
4. `page_plan_turn_driver_consistency` and `page_affordance_integrity` are renamed to causal-state vocabulary across registry + filenames + tests + messages, with behavior unchanged (tests pass on renamed symbols).
5. The legacy `prose-receipt.schema.json` + shared-schema §4.6 are removed (or, if the §5 sweep finds a live consumer, that consumer is documented and the removal deferred with a note).
6. §5 completeness sweep returns zero unexpected live references.
