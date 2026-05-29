# SPEC95SCECOVIND-001: Remove legacy page-prose inventory from world-index

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` enumerate inventory sets + a new schema migration + `CURRENT_INDEX_VERSION` bump. No impact on validators, patch-engine, or MCP.
**Deps**: None

## Problem

`tools/world-index/src/enumerate.ts` still treats `pages-prose`, `pages-prose-plans` (markdown) and `pages-prose-receipts` (yaml) as indexable story-bundle directories. Page-plan authoring was retired by SPEC-93, no live bundle produces these artifacts (0 page-prose files exist on disk across all worlds), and the scene-first explorer (SPEC-96/97) replaces the page-prose read routes that justified keeping them. The entries are dead inventory that perpetuates the page-as-prose model. Remove them so the indexable surface reflects the scene-first reality. (SPEC-95 §2 D1, §4.)

## Assumption Reassessment (2026-05-29)

1. `tools/world-index/src/enumerate.ts` defines `STORY_BUNDLE_MARKDOWN_DIRECTORIES` (a `Set` containing `pages-prose`, `pages-prose-plans`, `scene-prose`, `scene-prose-plans`, plus `audits` / `character-proposals` / `story-characters` / `storylet-batches` / `story-promotions`) and `STORY_BUNDLE_YAML_DIRECTORIES = new Set(["pages-prose-receipts", "scene-prose-receipts"])`. `isIndexablePath` reads both Sets for the `stories/<slug>/<dir>/<file>` length-4 markdown branch and the length-4 yaml branch; removing the three entries from the Sets is the operative change, and non-listed dirs fall through to the `unexpected` bucket (verified: `enumerate.ts` `walk` pushes non-`isIndexablePath` files to `unexpected`). Confirmed `STORY_BUNDLE_MARKDOWN_DIRECTORIES` / `STORY_BUNDLE_YAML_DIRECTORIES` are consumed ONLY by `enumerate.ts` (no other `tools/world-index/src/**` reader).
2. SPEC-95 §2 D1 + §4: remove `pages-prose`, `pages-prose-plans` from the markdown set and `pages-prose-receipts` from the yaml set; retain `scene-prose`, `scene-prose-plans`, `scene-prose-receipts`. SPEC-95 AC#1 requires a test asserting `pages-prose*` paths are not indexed. SPEC-99 §3 independently expects `pages-prose*` to classify as `unexpected` outside archive — consistent with this de-indexing.
3. Cross-artifact boundary under audit: the world-index **indexable-path contract**. Downstream consumers (MCP retrieval, `tools/story-explorer`) read indexed nodes; this ticket removes page-prose nodes from the indexable surface. `tools/story-explorer`'s page-prose READ routes (`read/story-list.ts`, `read/page-detail.ts`, `read/prose-direct.ts`, `server/routes/prose.ts`) read page-prose files directly from disk (not via the index), so de-indexing does not break them; their retirement is SPEC-96's concern (noted, not edited here). `story-fact-promotion-to-canon` reads `pages-prose-receipts/*.yaml` directly from disk for legacy bundles — also unaffected by de-indexing.
4. FOUNDATIONS — rendered prose is non-authoritative, not a state engine (`_shared-templates/story-state-contract.md` §1; SPEC-95 §6 alignment row). De-indexing `pages-prose*` removes dead publication-artifact inventory; it touches no canon record, no story-bundle `_source/` record, and no FOUNDATIONS principle beyond reinforcing the SPEC-92/93 prose-is-non-authoritative stance. Non-canon story-bundle indexer surface — no Mystery Reserve / canon-write impact.
5. (was template item 7 — removal blast radius) The removed inventory is referenced across the pipeline; the authoritative gate is SPEC-95 §5's completeness sweep. In-scope here: `enumerate.ts` inventory sets + colocated `enumerate.test.ts` / `atomic-fixture.ts`. Out of scope (noted, not edited): `tools/story-explorer/src/**` page-prose read routes (SPEC-96), `story-fact-promotion-to-canon` legacy receipt reads (deferred per SPEC95SCECOVIND-004), `docs/REPOSITORY-MAP.md` legacy-dir annotations and `_shared-templates/*` legacy-prose mentions (SPEC-99 docs closeout). No production reader of the removed indexable entries exists outside `enumerate.ts` itself.

## Architecture Check

1. Removing the entries from the inventory `Set`s (rather than special-casing the paths) keeps `isIndexablePath` a pure lookup against the canonical inventory; non-listed legacy dirs fall through to `unexpected` exactly like any other unrecognized path, which is the intended scene-first end-state SPEC-99 §3 asserts. The accompanying migration honors the world-index row-staleness contract so the de-indexing is correct for any index that had previously recorded page-prose nodes.
2. No backwards-compatibility shim: the legacy dirs are removed outright, not gated behind a flag. Legacy bundles' on-disk page-prose files remain readable by the direct-disk readers that still need them (story-explorer, story-fact-promotion); only the *index* stops recognizing them.

## Verification Layers

1. `pages-prose*` removed from indexable sets → codebase grep-proof: `grep -n "pages-prose" tools/world-index/src/enumerate.ts` returns zero matches; `scene-prose*` retained → grep returns the three scene entries.
2. `pages-prose*` paths classify as `unexpected` → schema/behavior test: a new `enumerate.test.ts` case feeds a fixture story bundle containing a `pages-prose/PG-1.md` (and `pages-prose-receipts/PG-1.yaml`) path and asserts it lands in `unexpected`, not `indexable`.
3. De-indexing is row-correct → migration review: migration `008` deletes any `nodes`/`file_versions` rows for the de-indexed dirs so a prior-version index re-parses; verified no-op in practice (0 page-prose files on disk) but present for correctness per the world-index migration discipline (`README.md` §Migration authoring discipline).
4. SPEC-95 §5 completeness sweep shows no unexpected live references to the removed inventory introduced by this ticket → grep-proof (the widened §5 sweep over `tools/world-index/src` + `tools/world-index/tests`).

## What to Change

### 1. Remove legacy entries from the inventory sets (`tools/world-index/src/enumerate.ts`)

Remove `"pages-prose"` and `"pages-prose-plans"` from `STORY_BUNDLE_MARKDOWN_DIRECTORIES`; remove `"pages-prose-receipts"` from `STORY_BUNDLE_YAML_DIRECTORIES`. Retain `scene-prose`, `scene-prose-plans` (markdown) and `scene-prose-receipts` (yaml). No change to `isIndexablePath`'s branch structure is required — it reads the Sets — but confirm the length-4 markdown and yaml branches still resolve correctly for the retained scene entries.

### 2. Add the de-index migration (`tools/world-index/src/schema/migrations/008_<slug>.sql` — new) + version bump

Bump `CURRENT_INDEX_VERSION` in `tools/world-index/src/schema/version.ts` from `7` to `8`. Add migration `008_deindex_legacy_page_prose.sql` (next sequence after `007_slt_projection_columns.sql`) honoring the row-staleness contract (`README.md` §Migration authoring discipline): delete `nodes` rows whose `file_path` matches the de-indexed `pages-prose` / `pages-prose-plans` / `pages-prose-receipts` story-bundle dirs, delete dependent rows (edges referencing those node ids), and clear the corresponding `file_versions` rows so incremental sync re-parses. In practice a no-op (0 page-prose files on disk → 0 rows reclassified), but required for correctness per the spec §4 migration step and the discipline's rule that comment-only migrations are acceptable only when zero existing rows would be reclassified.

### 3. Update colocated tests + fixtures

Update `tools/world-index/tests/enumerate.test.ts` to drop any assertion that `pages-prose*` paths are indexable, and add the AC#1 assertion that `pages-prose` / `pages-prose-plans` / `pages-prose-receipts` paths classify as `unexpected`. Update `tools/world-index/tests/helpers/atomic-fixture.ts` if it seeds page-prose directories into a fixture bundle (remove or repurpose those fixture entries; scene-prose fixture entries stay).

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/src/schema/migrations/008_deindex_legacy_page_prose.sql` (new)
- `tools/world-index/tests/enumerate.test.ts` (modify)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify)

## Out of Scope

- `tools/story-explorer/src/**` page-prose read routes — SPEC-96's concern; not edited here.
- `story-fact-promotion-to-canon`'s legacy `pages-prose-receipts` reads — left intact (legacy-compat); the §4.6 schema-doc deferral is SPEC95SCECOVIND-004.
- `docs/REPOSITORY-MAP.md` / `_shared-templates/*` legacy-prose annotations — SPEC-99 docs closeout.
- The scene-coverage layer (SPEC95SCECOVIND-002) and validator rename (SPEC95SCECOVIND-003).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "pages-prose" tools/world-index/src/enumerate.ts` → zero matches; `grep -nE "scene-prose|scene-prose-plans|scene-prose-receipts" tools/world-index/src/enumerate.ts` → the three retained entries present.
2. New `enumerate.test.ts` case: a fixture story bundle with `pages-prose/PG-1.md` + `pages-prose-receipts/PG-1.yaml` resolves those paths into `unexpected`, and `scene-prose/SCN-1.md` + `scene-prose-receipts/SCN-1.yaml` into `indexable`.
3. `cd tools/world-index && npm run build && npm test` passes.

### Invariants

1. `STORY_BUNDLE_MARKDOWN_DIRECTORIES` / `STORY_BUNDLE_YAML_DIRECTORIES` contain no `pages-prose*` member; the scene-prose triplet remains.
2. The migration deletes only de-indexed-dir rows; it never deletes scene-prose rows or any non-story-bundle node.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/enumerate.test.ts` — drop indexable-page-prose assertions; add the AC#1 `unexpected`-classification assertion for `pages-prose*` and a retained-`indexable` assertion for `scene-prose*`.
2. `tools/world-index/tests/helpers/atomic-fixture.ts` — remove page-prose fixture seeding if present; retain scene-prose seeding.

### Commands

1. `cd tools/world-index && npm run build && npm test`
2. `grep -rn "pages-prose" tools/world-index/src/enumerate.ts` (expect zero matches)
3. The narrower world-index build+test is the correct boundary: the inventory change is local to `enumerate.ts` + its migration, and no other package consumes the removed inventory entries.
