# SPEC-95 — World-Index Scene-Coverage Layer + Validator/Schema Cleanup

**Status:** COMPLETED
**Date:** 2026-05-28
**Classification:** story-canon-related (changes the world-index story-bundle inventory + a derived coverage layer over `scene_record` nodes/edges, the `tools/validators` registry naming for two surviving PG causal validators, and removes the legacy page-prose receipt schema surface; touches no canon record schema and no FOUNDATIONS principle beyond reinforcing the SPEC-92 SCN-is-membership / prose-is-non-authoritative stance).
**Depends on:** archived **SPEC-94** (SCN carries no stored `status`; the coverage layer derives publication state from artifact presence + receipt `verdict`). SPEC-94 is landed; land this spec next.
**Related:** archived `SPEC-92` (scene render layer; the `scene_includes_page` / `scene_previous_scene` / `scene_branch` / `scene_emitted_choice` edges already exist), archived `SPEC-93` (page-plan retirement). This spec is phase 2–3 of the second-iteration scene-first plan; consumed by **SPEC-96** (backend read model) and **SPEC-99** (MCP packet).
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` §11/§13/§19 phases 2–3. The report's "scene coverage computation" is built here; its hash/freshness-fingerprint proposals are **rejected** (presence-based only — see §3).

**Implementation note (2026-05-29):** `archive/tickets/SPEC95SCECOVIND-004.md` completed AC#5 by adding the §4.6 deferral note to `.claude/skills/_shared-templates/story-record-schemas.md`; the legacy block remains retained while `story-fact-promotion-to-canon` is still a live consumer.

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
   - active SCNs (latest in each `supersedes` lineage; superseded SCNs excluded by default but queryable). The lineage is read from each `scene_record` node's `supersedes` field (`story-scene.schema.json` `supersedes: SCN-<n> | null`) at build/sync time — there is **no** `scene_supersedes` edge in the index (`edgesForScene` emits only `scene_branch` / `scene_previous_scene` / `scene_includes_page` / `scene_emitted_choice`), so the coverage layer walks supersession from the node payload, not from a typed edge.
   - committed PG runs on the branch path **not** covered by any active SCN (unscened runs, as contiguous `[start_pg, end_pg]` spans),
   - PG → containing active SCN lookup (and the inverse, already available via `scene_includes_page`),
   - per-SCN artifact availability + the SPEC-94 derived publication indicator (`planned` / `prose-present` / `attached:PASS|WARN|FAIL` / `superseded`) computed from `scene-prose/`, `scene-prose-receipts/` file presence (via `file_versions`) + the receipt `verdict` — **no content hashing**.
   Expose it through the existing index query surface (`src/public/types.ts` re-exports + the query path the MCP server / story-explorer consume) as a read-only derived view.
3. **Validator rename** (`tools/validators`): rename `page_plan_turn_driver_consistency` → `pg_se_turn_driver_consistency` and `page_affordance_integrity` → `pg_affordance_integrity`; update the registry (`src/public/registry.ts` imports + the registered-validators array), source filenames + symbol names (`pagePlanTurnDriverConsistency` / `pageAffordanceIntegrity` exports), colocated tests, and any `applies_to`/diagnostic-message strings. **The rename surface extends beyond `src/`** — these names are asserted by literal string in test and doc consumers that the §5 sweep (below) must cover and that would otherwise fail after rename: `tests/structural/registry.test.ts`, the integration tests `tests/integration/spec44-append-only-supersession.test.ts`, `tests/integration/spec92-scene-layer-capstone.test.ts`, `tests/integration/validate-patch-plan.test.ts`, the validator inventory in `tools/validators/README.md`, and the Hard-Gate-9 enforcing-validator row in `.claude/skills/_shared-templates/story-state-contract.md` §7. Behavior unchanged — rename only.
4. **Account for the legacy page-prose receipt schema surface** (documentation-only — most of this deliverable already landed): the schema file `tools/validators/src/schemas/prose-receipt.schema.json` **was already removed by SPEC-93** (commit `04100b18`, "SPEC93DECSTATUR-003 validator retirement"; the live receipt surface is `scene-prose-receipt.schema.json`, which is untouched). No file removal remains. The shared-schemas §4.6 legacy receipt block in `.claude/skills/_shared-templates/story-record-schemas.md` is **retained / deferred**: the §5 sweep confirms a live consumer — `story-fact-promotion-to-canon` (`SKILL.md:155/167/195`) loads `pages-prose-receipts/<page_id>.yaml` and reads its `verdict` (`PASS | WARN | FAIL`) for prose-evidence source kinds on legacy bundles, exactly the shape §4.6 documents. Per this deliverable's own live-consumer condition (and AC#5), §4.6 stays until that consumer is migrated. The scene-prose receipt schema (`scene-prose-receipt.schema.json`) is the live surface and is untouched.

### Out of scope

- The backend/frontend that consume the coverage layer → **SPEC-96 / SPEC-97**.
- The MCP context-packet `scene_coverage` surface → **SPEC-99** (it consumes this layer).
- Any change to `computePgStateHash` or the `state_hash` chain (the coverage layer is presence-based; `hash/content.ts` is untouched).
- Hash/freshness fingerprints on scenes/plans/prose/receipts — **rejected** (author rejects hash coupling on editable artifacts).
- Renaming `PG`/`page_record` node type — out (report §17 "not now").
- Removing the optional legacy PG `plan` / `plan_hash` / `prose_plan_path` fields from the live `story-page.schema.json` — **rejected/deferred** here, despite the source report (§11 final bullet, §13 Schemas) calling for it. Those fields are still present (`story-page.schema.json:125–137`) and are grandfathered for existing PG records that carry them (per SPEC-93; `_shared-templates/story-record-schemas.md:151,157`). Removing them from live schema expectations would invalidate grandfathered records. New PG-authoring flows already do not emit them, so the field-acceptance carries no live authoring cost; a removal, if ever wanted, must first migrate or re-grandfather the affected records and is out of scope for this spec.

## 3. Key decision — presence-based freshness, no hashing

The coverage layer's publication indicator and "stale" detection are **file-presence + receipt-verdict only**. The report's "stale_receipt"/freshness-fingerprint states would require hashing editable scene plans/prose and comparing — exactly the coupling the author rejected and SPEC-93 removed for PG. A hand-edited plan/prose simply reflects current presence + last receipt verdict; "stale" is not a derived state here. (`computePgStateHash` is causal-state tamper protection, not prose coupling, and is unaffected.)

## 4. Migration & grandfathering

None required for coverage (0 SCN records exist). Removing the page-prose inventory follows world-index migration discipline (README §migration): if the change reclassifies or de-indexes existing `(file_path, node_type)` rows, the migration must delete the affected `nodes`/`file_versions` rows so sync re-parses; with 0 page-prose files on disk this is a no-op in practice, but the migration step is included for correctness.

## 5. Files to touch

- `tools/world-index/src/enumerate.ts` — inventory sets + `isIndexablePath`.
- `tools/world-index/src/index/scene-coverage.ts` (new) + wiring in `src/commands/sync.ts` / `build`.
- `tools/world-index/src/public/types.ts` + README — expose/document the coverage view.
- `tools/world-index/tests/enumerate.test.ts`, `tests/helpers/atomic-fixture.ts`, + new coverage tests.
- `tools/validators/src/public/registry.ts` + `src/structural/page-plan-turn-driver-consistency.ts` + `src/structural/page-affordance-integrity.ts` (rename files + symbols).
- Rename consumers outside `src/` (literal-string assertions / inventories that fail or drift if missed): `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts`, `tools/validators/tests/structural/page-affordance-integrity.test.ts`, `tools/validators/tests/integration/spec44-append-only-supersession.test.ts`, `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, `tools/validators/README.md` (validator inventory), and `.claude/skills/_shared-templates/story-state-contract.md` §7 Hard-Gate-9 enforcing-validator row.
- `tools/validators/src/schemas/prose-receipt.schema.json` — **no action; already removed by SPEC-93** (`04100b18`). `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 — **retain/defer** (live consumer `story-fact-promotion-to-canon`; see Deliverable 4).

**Completeness sweep (run before drafting Acceptance Criteria; re-run as a gate):**
```
grep -rn "page_plan_turn_driver_consistency\|page_affordance_integrity\|prose-receipt.schema\|pages-prose-receipts\|pages-prose-plans\|pages-prose" \
  .claude/skills/ docs/ tools/world-index/src tools/world-index/tests \
  tools/validators/src tools/validators/tests tools/validators/README.md \
  tools/world-mcp/src tools/story-explorer/src | grep -v "archive/" | grep -v "/dist/"
```
The search paths deliberately include `tools/validators/tests` and `tools/validators/README.md` (and `tools/world-index/tests`): the validator names are asserted by literal string in integration/registry tests and listed in the README inventory, so a sweep scoped to `src/` only would miss them and the rename would break those tests at build time. `dist/` is excluded (build output, regenerated). Triage each hit: renamed-validator references (including test assertions, the README inventory, and the story-state-contract §7 Hard-Gate-9 row) and removed-inventory references are in scope; story-explorer's page-prose READ routes are SPEC-96's concern (note, don't edit here); the `story-fact-promotion-to-canon` `pages-prose-receipts` reads are the live legacy consumer (Deliverable 4 — leave); archive untouched.

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
4. `page_plan_turn_driver_consistency` → `pg_se_turn_driver_consistency` and `page_affordance_integrity` → `pg_affordance_integrity` are renamed across registry + filenames + symbols + colocated **and** integration/registry tests + the `tools/validators/README.md` inventory + the story-state-contract §7 Hard-Gate-9 row + diagnostic-message strings, with behavior unchanged (all validator tests pass on renamed symbols; `npm test` green).
5. The legacy `prose-receipt.schema.json` is confirmed already removed (SPEC-93); the shared-schema §4.6 block is retained with a note documenting `story-fact-promotion-to-canon` as the live consumer of legacy `pages-prose-receipts` (removal deferred until that consumer is migrated).
6. §5 completeness sweep returns zero unexpected live references.

## 9. Risks & open questions

- **Rename test blast radius (resolved by §5).** The two validator names are asserted by literal string in integration tests (`spec44-append-only-supersession`, `spec92-scene-layer-capstone`, `validate-patch-plan`), the registry test, and the README inventory; a rename that misses any of them breaks `npm test`. Mitigation: the §5 sweep now searches `tools/validators/tests` and `tools/validators/README.md`, and Deliverable 3 enumerates the consumers explicitly.
- **§4.6 deferral leaves a legacy surface in the contract.** Retaining the legacy prose-receipt block is correct while `story-fact-promotion-to-canon` still reads `pages-prose-receipts`, but it perpetuates a page-prose-era shape in the shared template. Open question: schedule the §4.6 removal behind a future migration of `story-fact-promotion-to-canon` off legacy receipts (likely alongside the explorer scene-first cutover, SPEC-96/97), then re-run the §5 sweep to confirm zero live consumers before deleting.
- **Unscened-run computation correctness.** The coverage layer segments a branch's committed PG chain into contiguous unscened spans by walking `branch_path` and subtracting active-SCN `scene_includes_page` membership. Edge cases to cover in tests: a branch with zero scenes (entire chain unscened), a superseded SCN whose pages must fall back to unscened, a fork point where the parent branch's coverage must not leak into the child, and an SCN spanning a non-contiguous PG set (should already be rejected upstream by `scene_range_integrity`).
- **Validator final names.** Settled as `pg_se_turn_driver_consistency` (names the PG↔SE linkage it checks) and `pg_affordance_integrity` (parallels the `pg_` prefix); the report's `turn_driver_state_consistency` alternative was not chosen.

## Outcome

Completed on 2026-05-29.

What changed:

- Removed legacy page-prose inventory from `tools/world-index` and retained scene-prose artifact inventory.
- Added the derived `scene_coverage` world-index layer, including active scenes, superseded scenes, unscened PG runs, PG-to-scene lookup, artifact availability, and presence-based publication indicators.
- Renamed the two PG-causal validators to `pg_se_turn_driver_consistency` and `pg_affordance_integrity` across source, registry, tests, docs, and the story-state contract.
- Documented the legacy §4.6 page-prose receipt deferral in `.claude/skills/_shared-templates/story-record-schemas.md`; the block is retained while `story-fact-promotion-to-canon` remains a live legacy consumer, and `prose-receipt.schema.json` remains removed.

Deviations from the original plan:

- The legacy `prose-receipt.schema.json` file removal was already landed by SPEC-93, so SPEC-95 closed that deliverable as documentation/truthing rather than a file deletion.
- The §4.6 shared-template block was retained rather than removed because a live legacy consumer still reads `pages-prose-receipts/<page_id>.yaml`.
- The final §5 sweep still reports intentional legacy compatibility, fixture, migration, historical triage, and SPEC-96-owned story-explorer page-prose hits. Those are not unexpected SPEC-95 leftovers.

Verification results:

- `tools/world-index`: `npm run build` PASS; `npm test` PASS with 139 tests passing across the compiled and serial CLI lanes.
- `tools/validators`: `npm run build` PASS; `npm test` PASS with 1058 tests passing.
- §5 sweep classified remaining `pages-prose*` / legacy receipt / old validator-name hits as intentional compatibility, historical docs/triage, SPEC-96-owned story-explorer work, or current scene-receipt surfaces; no unexpected SPEC-95 live-removal hit remains.
- `rg -n "computePgStateHash|state_hash" tools/world-index/src/index/scene-coverage.ts tools/world-index/src/hash/content.ts` found no hash references in `scene-coverage.ts`; the only hits are the existing `hash/content.ts` PG state-hash implementation.
