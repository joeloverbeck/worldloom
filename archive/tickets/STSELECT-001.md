# STSELECT-001: Storylet selector's predicate-class indexer drops existential-only SLTs

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (shared predicate-name to node-type mapping), `tools/world-index/src/parse/atomic.ts` (`predicateReferencedClasses`, `collectPredicateReferencedClasses`), package dependency/export wiring, same-seam docs, and accompanying regression tests under `tools/world-index/tests/`, `tools/world-mcp/tests/tools/`, and `tools/validators/tests/`.
**Deps**: None.

## Problem

At intake, `mcp__worldloom__select_storylet_candidates` could silently drop the canonical author-pool SLT for a turn when that SLT used only existential predicates (`any_*`). The selector's `after_predicate_class` filter stage relies on a `storylet_predicate_class` edge index that extracted referenced node types from the *wrong* fields, so the predicate's named class (`story_question_record` from `any_story_question_open`, `intention_record` from `any_intention`, `story_emotion_record` from `any_emotion_active`, `relationship_record_story` from `any_relationship_axis`, etc.) was never indexed; instead the index could be populated with `holder_role` values like `"primary_actor"`. When the caller passed `intent_signature.grounding_record_classes` of legitimate node-type names, the intersection was empty and the SLT was dropped.

Observed at `red-bunny` PG-6 → SE-7 selection: call returned shortlist [`SLT-27`, `SLT-24`, `SLT-16`] and omitted `SLT-42` ("NPC commits a response register to a pending offer"), whose `reason_to_exist` literally documents that it is the canonical block for exactly this turn shape and whose hard preconditions (`any_story_question_open` → STQ-5, `any_intention[holder_role=primary_actor]` → STINT-10, `any_emotion_active[holder_role=primary_actor,min_intensity=medium]` → STEMO-15) all match the active state. The author had to bypass the projection filter, evaluate predicates in-process, and select SLT-42 manually — losing the `filter_trace` audit surface the selector exists to provide.

This is the most reliability-sensitive code path in the story system: every author-pool selection runs through it. A latent miss means the seed pool silently degrades to JIT or to wrong-shortlist picks across every future bundle.

## Assumption Reassessment (2026-05-27)

1. `predicateReferencedClasses` in `tools/world-index/src/parse/atomic.ts` calls `collectPredicateReferencedClasses`, which only collects values from three predicate fields: `record_class`, `holder_role`, `kind`. None of the existential predicates documented in `.claude/skills/_shared-templates/story-state-contract.md` §5 carry a `record_class` field; their semantic node type is encoded in the predicate name (`any_story_question_open` ⇒ `story_question_record`, `any_intention` ⇒ `intention_record`, etc.). The current extractor therefore returns only `holder_role` values like `"primary_actor"` for an SLT whose preconditions are all existential, plus any `kind` values from predicates that have them (e.g. `any_clock_active` accepts a `kind` filter — but that filter restricts a `pressure_clock_record` predicate to a clock-kind subtype, not the class `story_emotion_record`/`pressure_clock_record`/etc.).
2. `matchesPredicateClass` at `tools/world-mcp/src/tools/select-storylet-candidates.ts:363` does `intersects(candidate.predicateClasses, activeOrRequested)` and returns `false` when the intersection is empty AND the candidate has any indexed classes (the `candidate.predicateClasses.length === 0` wildcard branch is skipped when the broken extractor produced even one entry like `"primary_actor"`). So the bug is double-failure: the extractor populates the wrong values, AND those wrong values defeat the wildcard-pass that would otherwise have surfaced the SLT.
3. Cross-skill boundary: this ticket audits the contract between (a) the world-index parser at `tools/world-index/src/parse/atomic.ts` that builds `storylet_predicate_class` edge rows during indexing, (b) the storylet selector at `tools/world-mcp/src/tools/select-storylet-candidates.ts` that filters on those edges at retrieval time, and (c) the closed predicate DSL at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` that owns the canonical pred-name → node-type mapping the extractor needs.
4. FOUNDATIONS-aligned enforcement surface under audit: §Tooling Recommendation indirectly — the selector is the projection-filtered storylet-shortlisting tool the shared story-state contract §11a Character-Fit Selection Contract presupposes. A selector that drops the canonical author-pool SLT degrades the Layer 3 eligibility/ranking layer in that contract; downstream `chc_slt_selected_commitment_trace` and `slt_grounding_minimal_integrity` validators cannot recover an SLT the selector never surfaced.
5. The schema field under audit (`storylet_predicate_class` edge target) is consumed at retrieval time as a set of story-bundle node-type tokens. Live `tools/world-mcp/src/tools/select-storylet-candidates.ts` derives active/requested classes with `RECORD_PREFIX_TO_CLASS` (`STQ` ⇒ `story_question_record`, `CLK` ⇒ `pressure_clock_record`, etc.), and package tests seed `storylet_predicate_class` with those node types. Persisting `holder_role` values (`"primary_actor"`, `"witness"`, etc.) into the same edge type is a category error — they belong on a distinct edge type if they're indexed at all.
6. Adjacent contradictions exposed: the extractor also collects `kind` values into the same set. `kind` values for `any_clock_active` (`clock_kind` filter), `any_secret_unrevealed` (`secret_kind`), and `any_story_question_open` (`setup_kind`) are subtype filters within a class, not class names. Indexing those into `storylet_predicate_class` is the same category error as `holder_role`. This is a required consequence of the same fix.
7. Reassessment correction: drafted references to short class prefixes such as `STQ`, `STINT`, `STEMO`, and `SREL` were stale shorthand. The live MCP input and edge contract use node-type strings such as `story_question_record`, `intention_record`, `story_emotion_record`, and `relationship_record_story`; this ticket keeps that public contract unchanged and fixes only the producer.
8. Pre-edit baseline: `npm test` passed in `tools/world-index`, `tools/world-mcp`, and `tools/validators` before source edits.

## Architecture Check

1. Cleaner than alternatives because the predicate DSL grammar (`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`) already owns the closed pred-name → record-class mapping the extractor needs. Re-exporting that mapping and consuming it from `predicateReferencedClasses` removes the duplication implicit in trying to infer classes from arbitrary predicate fields. The alternative (relaxing `matchesPredicateClass` to wildcard-pass when intersection is empty) silently swallows real cases where an SLT genuinely references the wrong record classes, defeating the filter's purpose.
2. No backwards-compatibility aliasing/shims introduced. The `storylet_predicate_class` edge type is re-populated on next index rebuild; existing edge rows are replaced (not aliased). Any consumer reading `holder_role` strings from this edge type was already misusing the edge.

## Verification Layers

1. Pred-name → node-type mapping is single-sourced from the predicate DSL grammar -> codebase grep-proof (assert `predicateReferencedClasses` imports from `@worldloom/validators`; no per-predicate switch statement duplicated in the parser).
2. Existential-only SLTs surface in the projection filter when their predicates' node types intersect the request -> package regression test using the in-repo temp fixture for `selectStoryletCandidates`.
3. `holder_role` and `kind` values are not persisted as `storylet_predicate_class` edge targets -> parser regression test asserts edge values for a fixture SLT match only members of the node-type set.
4. Existing valid SLTs (exact-id predicates like `record_active(STENT-X)`) continue to be classified correctly -> parser regression test plus existing selector fixtures in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`.

## Landed Changes

1. Added a shared predicate-class contract in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`: `PREDICATE_REFERENCED_CLASSES`, `predicateRecordClassForRecordId`, and exported types for predicate names / referenced node types. The table maps predicate names to the node-type strings consumed by `select_storylet_candidates`, and exact-id predicates derive their node type from the referenced record id prefix.
2. Re-exported the public validator contract from `tools/validators/src/public/index.ts` and added the direct `@worldloom/validators/predicate-dsl-grammar` package subpath. `tools/world-index` now depends on the local validators package and imports the subpath to avoid a root-export cycle with world-index-backed validator helpers.
3. Reworked `tools/world-index/src/parse/atomic.ts` so `storylet_predicate_class` edges are derived from predicate names plus exact record-id-bearing fields. The collector still recurses through nested `predicate` / `predicates` containers, but no longer treats `record_class`, `holder_role`, or `kind` as class targets.
4. Updated storylet indexing tests to assert existential predicate classes, exact-id predicate classes, and roundtrip projection behavior using live node-type values such as `story_question_record`, `intention_record`, `story_emotion_record`, `relationship_record_story`, and `story_entity_record`.
5. Added a `selectStoryletCandidates` regression fixture proving an existential-only SLT survives `after_predicate_class` when `grounding_record_classes` intersects its predicate-name-derived classes.
6. Updated same-seam documentation in `docs/MACHINE-FACING-LAYER.md` to define `storylet_predicate_class` as a story-bundle node-type edge derived from the closed predicate DSL and exact record-id prefixes.
7. Adjusted existing parity/replay tests whose expected edge sets or filter-stage assertions were made stale by the corrected class projection.

## Files Touched

- `docs/MACHINE-FACING-LAYER.md`
- `archive/tickets/STSELECT-001.md`
- `tools/validators/package.json`
- `tools/validators/src/public/index.ts`
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`
- `tools/world-index/package.json`
- `tools/world-index/package-lock.json`
- `tools/world-index/src/parse/atomic.ts`
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts`
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`
- `tools/world-index/tests/storylet-projection-roundtrip.test.ts`
- `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts`
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`

## Out of Scope

- Changes to the predicate DSL grammar itself (no new predicates, no removed predicates).
- Changes to `matchesActionFamily`, `matchesSourceRecordIds`, `matchesMysteryPolicy`, `matchesCooldown`, or `rankCandidates`.
- Changes to the `mcp__worldloom__select_storylet_candidates` tool signature or response shape (the bug is in the upstream indexer; selector signature stays).
- Re-indexing live world snapshots in this ticket — the indexer is rebuilt on every snapshot rebuild; this ticket lands the code fix and the next normal index rebuild picks it up.

## Verification Result

Pre-edit baselines passed in all owned packages: `npm test` in `tools/world-index`, `tools/world-mcp`, and `tools/validators`.

Post-edit focused checks passed:

1. `npm run build` in `tools/validators`
2. `npm run build` in `tools/world-index`
3. `npm run build` in `tools/world-mcp`
4. `node --test dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js` in `tools/world-index`
5. `node --test dist/tests/storylet-projection-roundtrip.test.js` in `tools/world-index`
6. `node --test dist/tests/predicate-dsl-grammar-parity.test.js` in `tools/validators`
7. `node --test dist/tests/tools/select-storylet-candidates.test.js` in `tools/world-mcp`
8. `node --test dist/tests/integration/spec84-replay-and-branch-scope.test.js` in `tools/world-mcp`

Post-edit package checks passed:

1. `npm test` in `tools/validators` — 1094 passing, 0 failing.
2. `npm test` in `tools/world-index` — 126 non-CLI tests passing plus serial CLI tests passing, 0 failing.
3. `npm test` in `tools/world-mcp` — 496 passing, 0 failing.

## Deviations / Notes

1. The live `red-bunny` PG-6 -> SE-7 replay was not rerun in this implementation. The landed proof uses portable package fixtures that exercise the same producer/consumer contract without depending on checkout-local world state.
2. The original draft mentioned short class-prefix values (`STQ`, `STINT`, `STEMO`, `SREL`). Reassessment corrected this to the live node-type edge contract (`story_question_record`, `intention_record`, `story_emotion_record`, `relationship_record_story`).
3. The validator root export was not used by `tools/world-index` because it creates a TypeScript output collision through root-level validator helpers that import world-index surfaces. The direct `@worldloom/validators/predicate-dsl-grammar` subpath keeps the dependency narrow and buildable.
4. No selector production code change was needed. The existing `matchesPredicateClass` behavior is correct once the upstream indexer emits only node-type class targets.

## Outcome

Completed on 2026-05-27. The storylet predicate-class producer now emits `storylet_predicate_class` values from the closed predicate DSL and exact record-id prefixes, so existential-only SLTs can intersect legitimate `grounding_record_classes` at the selector's `after_predicate_class` stage. The implementation added a shared predicate-class mapping/export in `tools/validators`, consumed it from `tools/world-index`, corrected the machine-facing edge documentation, and added parser/selector/validator regression coverage.

Verification passed with package builds, focused regression tests, and full `npm test` runs in `tools/validators`, `tools/world-index`, and `tools/world-mcp`. Deviations are limited to proof shape: the live `red-bunny` replay was not rerun, and the implementation used a narrow validator subpath import rather than the validator root export to avoid a build-time output collision.
