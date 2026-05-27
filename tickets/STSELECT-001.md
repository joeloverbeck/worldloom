# STSELECT-001: Storylet selector's predicate-class indexer drops existential-only SLTs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/parse/atomic.ts` (`predicateReferencedClasses`, `collectPredicateReferencedClasses`), `tools/world-mcp/src/tools/select-storylet-candidates.ts` (`matchesPredicateClass`), and accompanying regression tests under `tools/world-index/tests/` and `tools/world-mcp/tests/tools/`.
**Deps**: None.

## Problem

`mcp__worldloom__select_storylet_candidates` silently drops the canonical author-pool SLT for a turn when that SLT uses only existential predicates (`any_*`). The selector's `after_predicate_class` filter stage relies on a `storylet_predicate_class` edge index that extracts referenced record classes from the *wrong* fields, so the predicate's named class (STQ from `any_story_question_open`, STINT from `any_intention`, STEMO from `any_emotion_active`, SREL from `any_relationship_axis`, etc.) is never indexed; instead the index ends up populated with `holder_role` values like `"primary_actor"`. When the caller passes `intent_signature.grounding_record_classes` of legitimate record-class names, the intersection is empty and the SLT is dropped.

Observed at `red-bunny` PG-6 → SE-7 selection: call returned shortlist [`SLT-27`, `SLT-24`, `SLT-16`] and omitted `SLT-42` ("NPC commits a response register to a pending offer"), whose `reason_to_exist` literally documents that it is the canonical block for exactly this turn shape and whose hard preconditions (`any_story_question_open` → STQ-5, `any_intention[holder_role=primary_actor]` → STINT-10, `any_emotion_active[holder_role=primary_actor,min_intensity=medium]` → STEMO-15) all match the active state. The author had to bypass the projection filter, evaluate predicates in-process, and select SLT-42 manually — losing the `filter_trace` audit surface the selector exists to provide.

This is the most reliability-sensitive code path in the story system: every author-pool selection runs through it. A latent miss means the seed pool silently degrades to JIT or to wrong-shortlist picks across every future bundle.

## Assumption Reassessment (2026-05-27)

1. `predicateReferencedClasses` at `tools/world-index/src/parse/atomic.ts:1564` calls `collectPredicateReferencedClasses` (line 1572), which only collects values from three predicate fields: `record_class`, `holder_role`, `kind`. None of the existential predicates documented in `.claude/skills/_shared-templates/story-state-contract.md` §5 carry a `record_class` field; their semantic record class is encoded in the predicate name (`any_story_question_open` ⇒ STQ, `any_intention` ⇒ STINT, etc.). The current extractor therefore returns only `holder_role` values like `"primary_actor"` for an SLT whose preconditions are all existential, plus any `kind` values from predicates that have them (e.g. `any_clock_active` accepts a `kind` filter — but that filter restricts a CLK predicate to a clock_kind subtype, not the class STEMO/CLK/etc.).
2. `matchesPredicateClass` at `tools/world-mcp/src/tools/select-storylet-candidates.ts:363` does `intersects(candidate.predicateClasses, activeOrRequested)` and returns `false` when the intersection is empty AND the candidate has any indexed classes (the `candidate.predicateClasses.length === 0` wildcard branch is skipped when the broken extractor produced even one entry like `"primary_actor"`). So the bug is double-failure: the extractor populates the wrong values, AND those wrong values defeat the wildcard-pass that would otherwise have surfaced the SLT.
3. Cross-skill boundary: this ticket audits the contract between (a) the world-index parser at `tools/world-index/src/parse/atomic.ts` that builds `storylet_predicate_class` edge rows during indexing, (b) the storylet selector at `tools/world-mcp/src/tools/select-storylet-candidates.ts` that filters on those edges at retrieval time, and (c) the closed predicate DSL at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` that owns the canonical pred-name → record-class mapping the extractor needs.
4. FOUNDATIONS-aligned enforcement surface under audit: §Tooling Recommendation indirectly — the selector is the projection-filtered storylet-shortlisting tool the shared story-state contract §11a Character-Fit Selection Contract presupposes. A selector that drops the canonical author-pool SLT degrades the Layer 3 eligibility/ranking layer in that contract; downstream `chc_slt_selected_commitment_trace` and `slt_grounding_minimal_integrity` validators cannot recover an SLT the selector never surfaced.
5. The schema field under audit (`storylet_predicate_class` edge target) is consumed at retrieval-time as a set of record-class tokens (the consumer treats them as values from the closed class list STENT/STSTAT/STCHAR/STPLAN/STEMO/CLK/STSEC/STQ/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA per `story-state-contract.md` §3). Persisting `holder_role` values (`"primary_actor"`, `"witness"`, etc.) into the same edge type is a category error — they belong on a distinct edge type if they're indexed at all.
6. Adjacent contradictions exposed: the extractor at line 1573 also collects `kind` values into the same set. `kind` values for `any_clock_active` (`clock_kind` filter), `any_secret_unrevealed` (`secret_kind`), and `any_story_question_open` (`setup_kind`) are subtype filters within a class, not class names. Indexing those into `storylet_predicate_class` is the same category error as `holder_role`. This is a required consequence of the same fix.

## Architecture Check

1. Cleaner than alternatives because the predicate DSL grammar (`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`) already owns the closed pred-name → record-class mapping the extractor needs. Re-exporting that mapping and consuming it from `predicateReferencedClasses` removes the duplication implicit in trying to infer classes from arbitrary predicate fields. The alternative (relaxing `matchesPredicateClass` to wildcard-pass when intersection is empty) silently swallows real cases where an SLT genuinely references the wrong record classes, defeating the filter's purpose.
2. No backwards-compatibility aliasing/shims introduced. The `storylet_predicate_class` edge type is re-populated on next index rebuild; existing edge rows are replaced (not aliased). Any consumer reading `holder_role` strings from this edge type was already misusing the edge.

## Verification Layers

1. Pred-name → class mapping is single-sourced from the predicate DSL grammar -> codebase grep-proof (assert `predicateReferencedClasses` imports from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` or its package boundary; no per-predicate switch statement duplicated in the parser).
2. Existential-only SLTs surface in the projection filter when their predicates' classes intersect the request -> skill dry-run (re-run `select_storylet_candidates` against `red-bunny` PG-6 with the SE-7 driver signature; assert `SLT-42` in `shortlisted_candidate_ids`).
3. `holder_role` and `kind` values are not persisted as `storylet_predicate_class` edge targets -> schema validation (regression test asserts edge values for a fixture SLT match only members of the closed class set).
4. Existing valid SLTs (exact-id predicates like `record_active(STENT-X)`) continue to be classified correctly -> codebase grep-proof + test fixtures already in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`.

## What to Change

### 1. Predicate name → referenced record class mapping (`tools/world-index/src/parse/atomic.ts`)

Replace `collectPredicateReferencedClasses` (lines 1572-1587) so that it:

- Reads the predicate's `pred` field (line 1597's `predicateName` already exists).
- Maps the predicate name to its referenced record class(es) using a closed table derived from the predicate DSL grammar. The 39 individual predicates in `.claude/skills/_shared-templates/story-state-contract.md` §5 each touch one or more record classes; that mapping is the table this ticket adds.
- For `record_active(<record_id>)` and `record_age(<record_id>, ...)`, parse the class prefix off the record id (the predicate accepts the multi-class union STENT/STCHAR/STINT/SF/BEL/OBL/CNSQ/THR/CLK/STSEC/STQ/SREL/STPLAN/STEMO/STLOC/STOBJ/DA/STSTAT) — extract the class from the actual referenced id rather than treating `record_active` as inherently associated with all of them.
- Recurses into `predicate` and `predicates` containers (current behavior preserved).
- Drops the `holder_role` and `kind` field collection (these are intra-class filters, not class designators).

### 2. Edge-type discipline (`tools/world-index/src/parse/atomic.ts`)

If `holder_role` indexing is still useful for any downstream filter, persist it under a separate edge type (e.g. `storylet_predicate_holder_role`); do not mix it into `storylet_predicate_class`. Same for `kind`-as-subtype-filter values (`storylet_predicate_kind_filter`). If no consumer needs these today, drop them entirely — the parser cost is small and re-adding them is trivial.

### 3. Tightening `matchesPredicateClass` (`tools/world-mcp/src/tools/select-storylet-candidates.ts:363`)

No semantic change required once the upstream indexer is fixed — the existing `intersects` logic produces correct results. Add a defensive assertion (test-only or behind a debug flag) that every value in `candidate.predicateClasses` matches the closed class set; surface a clear error in test runs rather than silent dropping if the indexer regresses again.

### 4. Predicate-DSL grammar export (`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`)

Export a `PREDICATE_REFERENCED_CLASSES: Record<PredicateName, readonly RecordClass[]>` constant (or equivalent function) and re-export from `@worldloom/validators` (or whatever package boundary `tools/world-index` already imports from). This is the single source of truth the indexer consumes.

## Files to Touch

- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — add `PREDICATE_REFERENCED_CLASSES` constant or function)
- `tools/world-index/src/parse/atomic.ts` (modify — `predicateReferencedClasses` and `collectPredicateReferencedClasses` replaced; potentially add new edge types or drop holder_role/kind indexing)
- `tools/world-index/src/schema/types.ts` (modify — register any new edge types added in change 2)
- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify — optional defensive assertion in change 3)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — add regression case)
- `tools/world-index/tests/parse/atomic.test.ts` or sibling (modify or new — extractor unit tests)

## Out of Scope

- Changes to the predicate DSL grammar itself (no new predicates, no removed predicates).
- Changes to `matchesActionFamily`, `matchesSourceRecordIds`, `matchesMysteryPolicy`, `matchesCooldown`, or `rankCandidates`.
- Changes to the `mcp__worldloom__select_storylet_candidates` tool signature or response shape (the bug is in the upstream indexer; selector signature stays).
- Re-indexing live world snapshots in this ticket — the indexer is rebuilt on every snapshot rebuild; this ticket lands the code fix and the next normal index rebuild picks it up.

## Acceptance Criteria

### Tests That Must Pass

1. New regression test in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (or sibling): index a fixture bundle containing `SLT-42`-equivalent (a storylet whose preconditions use only `any_story_question_open`, `any_intention[holder_role=primary_actor]`, `any_emotion_active[holder_role=primary_actor,min_intensity=medium]`, and `any_relationship_axis[axis=attention]`), call `selectStoryletCandidates` with `intent_signature.grounding_record_classes = ["STQ", "STINT", "STEMO", "SREL"]` and a matching `npc_action` driver against a parent page where the existential predicates' filter conditions are satisfied — assert the SLT appears in `shortlisted_candidate_ids`.
2. New unit test in `tools/world-index/tests/parse/atomic.test.ts` (or sibling): assert `predicateReferencedClasses` for an existential-only SLT returns the predicate-name-derived class set (e.g. `["SREL", "STEMO", "STINT", "STQ"]`), not `["primary_actor"]`.
3. New unit test: assert `predicateReferencedClasses` for `record_active(STENT-1)` returns `["STENT"]` (class extracted from the referenced id prefix).
4. Full-pipeline: `pnpm -F @worldloom/world-mcp test` and `pnpm -F @worldloom/world-index test` pass.

### Invariants

1. Every value persisted to a `storylet_predicate_class` edge is a member of the closed record-class set defined in `.claude/skills/_shared-templates/story-state-contract.md` §3.
2. For any author-batch SLT whose `reason_to_exist` documents it as a canonical fit for a specific turn shape, when the call's driver + intent_signature match that shape, the SLT appears in `shortlisted_candidate_ids`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic.test.ts` — unit tests for the new `predicateReferencedClasses` extractor across every predicate name in `.claude/skills/_shared-templates/story-state-contract.md` §5 (39 individual predicates plus combinator passthroughs).
2. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — the SLT-42-shaped regression case described above, plus a parametric sweep that covers every existential predicate's class extraction end-to-end.
3. `tools/validators/tests/predicate-dsl-grammar.test.ts` (new or existing) — if the grammar package gains a new exported constant/function, add a guard test that its keys are the closed predicate-name set.

### Commands

1. `pnpm -F @worldloom/world-index build && pnpm -F @worldloom/world-mcp build` — confirm cross-package types resolve.
2. `pnpm -F @worldloom/world-index test -- --filter atomic` — extractor unit tests.
3. `pnpm -F @worldloom/world-mcp test -- --filter select-storylet-candidates` — selector regression.
4. After landing, rebuild `red-bunny` index and re-run the original PG-6 → SE-7 selection inputs against the live selector; assert `SLT-42 in shortlisted_candidate_ids`.
