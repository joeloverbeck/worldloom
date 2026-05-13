# VALENH-010: Validator framework's queryRows must translate `record_type='arc_trace_record'` to indexer node_type `'arc_trace_node'`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/_helpers/index-access.ts`, `tools/validators/src/cli/_helpers.ts`, and validators package tests; `tools/validators/dist/` rebuilt by `npm run build` as ignored generated output.
**Deps**: `archive/tickets/VALENH-009-validators-recognize-plan-finalize-stamped-fields.md` (its pending-prose skip covers the complementary case where ARC_TRACE has not yet been emitted; this ticket covers the rendered-prose case where ARC_TRACE exists but is unfindable due to record_type-vs-node_type vocabulary mismatch)

## Problem

At intake, the validator framework's `queryRows` helper at `tools/validators/src/_helpers/index-access.ts` built a SQL query against the world index's `nodes` table using the caller's `record_type` parameter as the literal value of `WHERE node_type = ?`. The world index stores arc-trace rows under `node_type='arc_trace_node'` (per `tools/world-index/src/parse/atomic.ts` and migration `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`). However, every validator that queries for arc traces passes `record_type='arc_trace_record'` — the canonical name used in the JSON schema at `tools/validators/src/schemas/story-arc-trace.schema.json`, the `STRUCTURAL_NODE_TYPES` enum at `tools/validators/src/structural/utils.ts`, and the MCP-facing `list_records` enum at `tools/world-mcp/src/tools/list-records.ts`.

Before this ticket, validators querying for `record_type='arc_trace_record'` silently got zero rows even when ARC_TRACE rows existed on disk and in the index. The MCP-side `list_records` already had the translation it needs (`arc_trace_record: "arc_trace_node"`); the validator framework's parallel SQL builds did not.

The failure was reproduced in this session by `validate-patch-plan` on a `branching-story-page-cycle` PG-3 envelope whose parent PG-2 is `prose_status: rendered` with `state_snapshot.arc_trace_id: 'ARCTRACE-0001'`. `narrative_point_classification` fired `missing_arc_trace` on PG-2 even though ARCTRACE-0001 exists at `worlds/erotica-world/stories/red-bunny/_source/arc-traces/ARCTRACE-0001.yaml` and indexes correctly (confirmed via direct `SELECT * FROM arc_trace_node` returning the row, and via `mcp__worldloom__list_records(record_type='arc_trace_record', story_slug='red-bunny')` returning ARCTRACE-0001 inline). The validator's `queryRows` lookup for `node_type='arc_trace_record'` returned zero rows, so the cross-check failed and the entire envelope failed validation.

Three validator sites call `ctx.index.query({record_type: 'arc_trace_record', ...})` and are now covered by the translated read surfaces:
- `tools/validators/src/rules/narrative_point_classification.ts:41`
- `tools/validators/src/rules/arc_trace_evidence_alignment.ts:25`
- `tools/validators/src/rules/arc_envelope_conformance.ts:20`

All three were blocked on rendered-prose pages with ARC_TRACE references at intake. The same `queryRows` helper is reused for the pre-apply read surface (`buildPreApplyReadSurface`) and a parallel inline build is reused for the full-world read surface (`buildReadSurface`), so this was a single architectural seam needing the translation applied symmetrically at both sites.

VALENH-009 addressed the complementary failure mode: `prose_status='pending'` where ARC_TRACE has not yet been emitted by finalize, so the lookup is correctly skipped. This ticket completed the rendered-prose case where ARC_TRACE exists and must be findable.

## Assumption Reassessment (2026-05-12)

1. **Codebase reassessment** — `tools/validators/src/_helpers/index-access.ts` initially had a pre-existing same-seam partial patch in `queryRows`; this run kept that boundary translation, made the comment ASCII/landed-ready, and added the missing parallel translation in `tools/validators/src/cli/_helpers.ts`'s `buildReadSurface`. The world index's storage vocabulary remains `arc_trace_node` (`tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`), while validators/MCP/schema callers use `arc_trace_record`.
2. **Doc reassessment** — `docs/FOUNDATIONS.md` §Tooling Recommendation and §Story Bundles "Pipeline shape: plan + finalize" require validators to find indexed ARC_TRACE records after finalize. The fix preserves that enforcement surface rather than renaming storage or operator vocabulary.
3. **Cross-artifact boundary** — the shared boundary is the `record_type` vocabulary across MCP, validator-framework, and world-index. MCP already translates `arc_trace_record` to `arc_trace_node`; validators now do the same at both SQL read boundaries.
4. **FOUNDATIONS / HARD-GATE surface** — because this changes pre-apply validator lookup behavior, `docs/HARD-GATE-DISCIPLINE.md` was read before closeout. The change makes the gate less noisy by removing a false `missing_arc_trace` verdict; it does not weaken rendered-page ARC_TRACE enforcement.
5. **Same-seam fixture fallout** — the broad package test initially failed in `tools/validators/tests/cli/world-validate.story-bundle.test.ts` because that fixture seeded an indexed ARC_TRACE row with `node_type='arc_trace_record'`. The fixture was corrected to seed `arc_trace_node`, matching the world-index storage contract the new translation now expects.
6. **Out-of-scope drift** — `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` remain silent on the storage-vs-operator-facing vocabulary split. This ticket leaves that docs-drift surface out of scope.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** The translation-at-validator-query-boundary mirrors the MCP-side translation in `tools/world-mcp/src/tools/list-records.ts`. Alternative (a) — renaming the indexer's `node_type` from `arc_trace_node` to `arc_trace_record` — would touch the `nodes` table contents (requiring a one-off UPDATE migration), the `arc_trace_node` SQL table name (migration 005 plus every reference), the `render.ts` filter, and the MCP-side mapping (which would invert direction from `record_type → node_type` to `node_type → record_type`). Surface count: 6+ files plus a forward-compatible migration. Alternative (b) — renaming the validator/MCP/schema vocabulary from `arc_trace_record` to `arc_trace_node` — would touch every JSON schema, every validator rule, every `STRUCTURAL_NODE_TYPES` reference, every test, and every reference in operator-facing docs (`docs/MACHINE-FACING-LAYER.md`, per-skill `references/record-schemas.md`, etc.). Surface count: 30+ files. Alternative (c) — having each validator rule manually translate before passing `record_type` — would duplicate the translation across three call sites with no enforcement that future validator additions remember to translate, producing a future hazard exactly parallel to the current bug at a new code site. The single-point translation at the `queryRows` and `buildReadSurface` SQL boundaries is the minimal-change, lowest-risk, easiest-to-audit fix.

2. **No backwards-compatibility aliasing/shims introduced.** The change adds a one-line conditional translation at the SQL boundary, not a runtime alias or deprecated path. The validator's external API (the `record_type` parameter on `ctx.index.query`) is unchanged; only the internal SQL parameter binding is adjusted. No two-name path is visible to any validator rule after the fix. The translation is one-way (canonical-record_type → storage-node_type) at a single boundary in two parallel surfaces (`queryRows` + `buildReadSurface`).

## Verification Layers

1. **A pre-apply patch plan targeting a story bundle whose parent PG is `prose_status: rendered` with a populated `state_snapshot.arc_trace_id` does NOT fail `narrative_point_classification.missing_arc_trace` when the referenced ARCTRACE record exists** → package-local pre-apply integration test in `tools/validators/tests/integration/validate-patch-plan.test.ts` adding a temp-seeded scenario with one rendered parent PG + one referenced ARCTRACE, asserting `narrative_point_classification` returns no `missing_arc_trace` verdicts. Pairs with VALENH-009's pending-skip test from the same file so the two halves of the rendered-vs-pending matrix are both covered.
2. **`queryRows` returns the indexed ARC_TRACE row when called with `record_type: 'arc_trace_record'`** → unit test against `buildPreApplyReadSurface` and `buildReadSurface` in `tools/validators/tests/_helpers/index-access.test.ts`, verifying the translation is applied at the SQL boundary in both surfaces.
3. **The `arc_trace_record → arc_trace_node` translation does NOT bleed into other record_types** → grep-proof that the conditional in `queryRows` and `buildReadSurface` is `recordType === "arc_trace_record" ? "arc_trace_node" : recordType` (exact-equality, not prefix-match or fuzzy-match); a unit test calling `queryRows` with `record_type: 'page_record'` returns no rows whose `node_type` is `'arc_trace_node'`. Same negative-control assertion for `buildReadSurface`.
4. **FOUNDATIONS alignment check** → cross-check against `docs/FOUNDATIONS.md` §Tooling Recommendation by fresh read; confirm the validator framework's record-finding guarantee is consistent with the "non-negotiable" retrieval surface.

## Landed Changes

### 1. Added the record_type to node_type translation in `queryRows`

`tools/validators/src/_helpers/index-access.ts` now translates `recordType === "arc_trace_record"` to SQL `node_type = "arc_trace_node"` before querying the `nodes` table. This keeps validators' canonical record type aligned with the world-index storage vocabulary.

### 2. Applied the parallel translation in `buildReadSurface`

`tools/validators/src/cli/_helpers.ts` now applies the same translation for full-world CLI reads, so `world-validate` and pre-apply validation use the same storage-facing lookup behavior.

### 3. Rebuilt `tools/validators/dist/` from source

`cd tools/validators && npm run build` regenerated the ignored `dist/` output from source. No generated JS was hand-edited.

### 4. Added package-local test coverage

`tools/validators/tests/_helpers/index-access.test.ts` covers both read surfaces and verifies `page_record` remains unaffected. `tools/validators/tests/integration/validate-patch-plan.test.ts` now temp-seeds a rendered parent PG plus indexed `arc_trace_node` row and verifies `narrative_point_classification` does not emit `missing_arc_trace`. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` was corrected to seed full-world ARC_TRACE fixtures under the real storage node type.

## Files to Touch

- `tools/validators/src/_helpers/index-access.ts` (modify)
- `tools/validators/src/cli/_helpers.ts` (modify)
- `tools/validators/tests/_helpers/index-access.test.ts` (new)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify)
- `tickets/VALENH-010-validator-framework-arc-trace-record-to-arc-trace-node-translation.md` (modify)
- `tools/validators/dist/` (ignored generated output refreshed by `npm run build`)

## Out of Scope

- Renaming the indexer's `node_type` value from `arc_trace_node` to `arc_trace_record`. The indexer's vocabulary is legacy at this point; the validator-framework / MCP / schema vocabulary is the canonical operator-facing convention. The chosen approach normalizes at the storage-vs-operator-facing boundary rather than renaming the storage layer.
- Renaming the validator/MCP/schema vocabulary from `arc_trace_record` to `arc_trace_node`. The canonical convention is established and used across 30+ files.
- Consolidating `buildPreApplyReadSurface`'s `queryRows` and `buildReadSurface`'s inline SQL build into one shared helper. Mirroring the translation at both sites was sufficient for this ticket.
- Documenting the storage-vs-operator-facing vocabulary split in `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md`. That docs-drift surface is a separate ticket if the operator surfaces it later.
- Changes to `branching-story-page-cycle/SKILL.md` or its references. The skill operates correctly under the canonical `arc_trace_record` vocabulary; it does not need to know about the storage-side `arc_trace_node` legacy name.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — package-local source build regenerates ignored `dist/`.
2. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/_helpers/index-access.test.js dist/tests/integration/validate-patch-plan.test.js` — focused helper, pre-apply, and full-world CLI fixture coverage.
3. `cd tools/validators && npm test` — package-local build + full test suite.

### Invariants

1. `queryRows` and `buildReadSurface`'s parallel SQL builder both translate `recordType === 'arc_trace_record'` to `'arc_trace_node'` before SQL parameter binding. Future record_type vocabulary divergence (if added) is captured by extending this single translation point, not by adding new validator-side workarounds.
2. The translation is one-way at the query boundary: callers pass `arc_trace_record` (the canonical operator-facing record_type); the SQL `WHERE node_type = ?` clause binds `arc_trace_node` (the indexer's storage-facing node_type). No alias path, no two-name surface visible to validator rules.
3. Validators that pass any other `record_type` value (e.g., `page_record`, `storylet_record`, `obligation_record`) are unaffected by this change. Grep-verified: only `arc_trace_record` participates in the translation.
4. The translation is symmetric across both `buildPreApplyReadSurface` (used by pre-apply / `validate-patch-plan` / engine submit) and `buildReadSurface` (used by `world-validate` full-world mode). A future code path that adds a third read-surface helper must include the same translation.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/_helpers/index-access.test.ts` — new helper coverage for `buildPreApplyReadSurface` and `buildReadSurface`, including the `page_record` negative control.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — added the `validatePatchPlan finds indexed ARC_TRACE rows for rendered parent pages` scenario with temp-seeded `page_record` + storage-side `arc_trace_node`.
3. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` — corrected the full-world story-bundle fixture to seed ARC_TRACE rows as `arc_trace_node`, matching the live indexer vocabulary.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/_helpers/index-access.test.js dist/tests/integration/validate-patch-plan.test.js`
3. `cd tools/validators && npm test`

## Outcome

Completed. The validators package now translates canonical `record_type='arc_trace_record'` to storage `node_type='arc_trace_node'` in both pre-apply and full-world read surfaces. The rendered-parent ARC_TRACE false-negative is covered by a temp-seeded pre-apply integration test, and the full-world CLI fixture now reflects the real indexer storage vocabulary.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/_helpers/index-access.test.js dist/tests/integration/validate-patch-plan.test.js` — passed, 18/18 tests.
3. `cd tools/validators && npm test` — initially failed in `world-validate.story-bundle.test.ts` because the existing full-world fixture seeded ARC_TRACE as `arc_trace_record`; this was same-seam fixture drift under the new storage translation.
4. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/_helpers/index-access.test.js dist/tests/integration/validate-patch-plan.test.js` — passed, 20/20 tests after the fixture correction.
5. `cd tools/validators && npm test` — passed, 209/209 tests. Non-fatal output included the standard Git default-branch hint from CLI tests.

## Deviations

- The drafted live story-bundle CLI smoke against `worlds/erotica-world/stories/red-bunny/` was replaced by package-local temp-seeded pre-apply and full-world CLI tests. This is the stronger portable proof for the owned invariant and avoids depending on gitignored local world state.
- `tools/validators/dist/` was refreshed by package build and remains ignored generated output.
