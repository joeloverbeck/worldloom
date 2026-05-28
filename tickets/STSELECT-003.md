# STSELECT-003: End-to-end indexer→selector regression coverage for production-shape existential-predicate storylet pools

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new fixture under `tools/world-mcp/tests/integration/` (and accompanying fixture YAML / generator), built via `@worldloom/world-index/commands/build` and exercised against `selectStoryletCandidates`. No production-code changes.
**Deps**: None. Complementary to `archive/tickets/STSELECT-001.md` (predicate-class indexer fix) and `tickets/MCPENH-074.md` (per-stage rejected-sample observability) — this ticket adds the integration-layer regression that closes the gap between the selector-only unit tests and the production failure shape both prior tickets remediated.

## Problem

The most reliability-sensitive code path in the story system — the `mcp__worldloom__select_storylet_candidates` MCP tool that shortlists eligible SLTs at every page-cycle invocation — has comprehensive selector-only unit coverage at `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (7 tests, 3 fixtures) and a tightly-scoped indexer→selector integration test at `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` (5 SLTs across 4 tests). What it lacks is a regression test that runs the **production-shape SLT distribution** through the **full indexer→selector pipeline**.

Production-shape, as observed in `worlds/erotica-world/stories/red-bunny/_source/storylets/`, has these distinguishing characteristics:

1. **34 of 42 SLTs use existential predicates (`any_*`).** Predicate-name distribution: `any_emotion_active` (34), `any_belief` (20), `any_thread_active` (17), `any_relationship_axis` (14), `any_intention` (11), `any_consequence_pending` (9), `any_story_question_open` (7), `any_secret_unrevealed` (5), `any_obligation_open` (3), `any_clock_active` (2), `any_plan_active` (2), plus `record_age` (2) and `emotion_pressure` (1).
2. **Zero SLTs use exact-id predicates** (`record:` field with `[A-Z]+-[0-9]+` target).
3. **Multi-class hard preconditions are the norm** (SLT-42 mixes `any_story_question_open` + `any_intention` + `any_emotion_active`; SLT-1 mixes `any_thread_active` + `any_emotion_active`; etc.).
4. **All SLTs are `visibility: global_author_pool`** in the production bundle; branch-scoped variants exist conceptually but are unused at red-bunny scale.
5. **Cooldown variation is present** (`cooldown_pages > 0` on SLT-35, SLT-36, SLT-39, SLT-40, SLT-41).
6. **Saliency-urgency mix** spans high / medium / low.

The existing selector-only fixture at `select-storylet-candidates.test.ts` seeds edges directly into the temp DB, bypassing the indexer entirely. The existential-pool regression added by STSELECT-001 (`buildExistentialCandidateWorld`, lines 180-222) is a 1-SLT synthetic case — it proves the selector consumes correctly-indexed existential predicate classes but does not prove the indexer produces them correctly for production-shape inputs. The SPEC-84 fixture uses 5 SLTs with hand-rolled YAML chosen to exercise branch-scope replay, not predicate-class breadth.

The STSELECT-001 production failure (red-bunny PG-6 → SE-7: shortlist `[SLT-27, SLT-24, SLT-16]` instead of the canonical `SLT-42`) was caught only because an author noticed an obviously-missing SLT during turn-cycle invocation. The codebase had no automated test that would have caught the regression at indexer-rebuild time. If `predicateReferencedClasses` re-broke for, say, `any_consequence_pending` or `any_obligation_open` (predicates present in `PREDICATE_REFERENCED_CLASSES` at `tools/world-index/src/public/predicate-dsl-projection.ts` but unrepresented in red-bunny's regression tests), the existing test layers would all pass.

## Assumption Reassessment (2026-05-28)

1. **Codebase reassessment**: confirmed at `tools/world-mcp/src/tools/select-storylet-candidates.ts:264-280` that `loadProjectionRows` reads `slt_projections` directly and `buildCandidates` (lines 321-337) joins five edge types (`storylet_compatible_driver`, `storylet_predicate_pred`, `storylet_predicate_class`, `storylet_action_family`, `storylet_predicate_ref`) — every join depends on indexer-produced rows. The selector cannot validate the upstream producer; coverage proving end-to-end correctness must build the index from realistic YAML.
2. **Existing fixture inventory**: `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts:190-226` generates a 1000-SLT pool — but every SLT shares `record_active` + `story_character_authority_record` preconditions; the realism axis is pool size, not predicate-class diversity. `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts:42-58` loads a 5-SLT fixture from `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json`; the realism axis is branch-scope semantics, not predicate-class breadth.
3. **Cross-skill / cross-artifact boundary**: this ticket audits the contract between (a) `@worldloom/world-index/commands/build` rebuilding storylet edges from YAML, (b) the shared `PREDICATE_REFERENCED_CLASSES` projection table at `tools/world-index/src/public/predicate-dsl-projection.ts`, and (c) the selector's eight filter stages running against the rebuilt index. The boundary under audit is the producer/consumer seam STSELECT-001 fixed; STSELECT-003 prevents future regressions at that seam under production-shape inputs.
4. **FOUNDATIONS principle restatement**: §Tooling Recommendation ("Reading and writing canon-shaped content must happen through `mcp__worldloom__*` tools whenever such a tool exists") is the principle this ticket strengthens. The selector is the MCP retrieval surface authors depend on for storylet shortlisting; the STSELECT-001 production failure showed that authors fall back to direct file inspection when the surface degrades silently. A regression test at the production-shape end-to-end layer protects the contract operators rely on. §Story Bundles §5a (Commitment Blocks Are Causal Moves) is engaged because the predicate DSL is the schema layer this fixture exercises — every existential predicate name in the DSL must round-trip from YAML → index → projection → selector successfully.
5. **Cross-ticket coordination**: STSELECT-001 added `selectStoryletCandidates keeps existential SLTs whose predicate classes intersect requested grounding classes` (selector unit test) and `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` parser coverage. SPEC-84 added 4 integration tests covering branch-scope semantics. STSELECT-003 fills the remaining diagonal: production-shape predicate-class breadth at the end-to-end pipeline layer.
6. **Pre-edit baseline**: `cd tools/world-mcp && npm test` and `cd tools/world-index && npm test` are expected to pass before this ticket's edits (must be verified during implementation).

## Architecture Check

1. **Cleaner than alternatives.** Option A (this ticket — generator-built fixture exercising every predicate name in `PREDICATE_REFERENCED_CLASSES` against a realistic ~30-50 SLT pool) directly mirrors production shape and re-uses the `withSpec84World` / `materializeFixture` pattern already in `spec84-replay-and-branch-scope.test.ts`. Option B (import the live red-bunny bundle as a test fixture) violates the git-ignore boundary the user explicitly flagged. Option C (extend SPEC-81 §9.3's hand-counted fixture to cover all 13 predicate names) bloats a fixture whose value is deterministic stage counts, not predicate-class breadth. Option D (add per-predicate-name unit tests in `tools/world-index/tests/parse/`) covers the indexer side but not the end-to-end contract.
2. **No backwards-compatibility aliasing/shims introduced.** Purely additive test coverage. No production code changes; no existing test is modified.

## Verification Layers

1. Every predicate name in `PREDICATE_REFERENCED_CLASSES` (at `tools/world-index/src/public/predicate-dsl-projection.ts`) appears in at least one SLT in the new fixture → codebase grep-proof of fixture-vs-projection-table parity.
2. The fixture, when built via `@worldloom/world-index/commands/build`, produces `storylet_predicate_class` edges whose target node-type tokens intersect a representative `intent_signature.grounding_record_classes` request → integration assertion.
3. The selector, given the rebuilt fixture and a turn driver shaped like the STSELECT-001 production failure case (`npc_action` initiator with multi-class grounding), returns a non-empty shortlist that includes an SLT with the multi-class `any_*` precondition profile → regression assertion.
4. Per-stage filter-trace counts are deterministic and asserted in the new fixture (parallel to SPEC-81 §9.3's hand-counted approach but with predicate-class diversity as the realism axis instead of stage-count breadth) → integration assertion.
5. Adding a new predicate name to `PREDICATE_REFERENCED_CLASSES` without extending the fixture causes the parity grep-proof to fail → meta-assertion that the fixture stays in lockstep with the projection table.

## Files to Touch

- `tools/world-mcp/tests/integration/stselect003-production-shape-existential-pool.test.ts` (new — integration test)
- `tools/world-mcp/tests/integration/fixtures/stselect003-production-shape/fixture.json` (new — generator-built fixture; OR co-locate generator in the test file if simpler) — exact path subject to existing-pattern alignment with `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/`
- `tools/world-mcp/tests/integration/stselect003-production-shape-existential-pool.test.ts` (new — parity assertion: every key in `PREDICATE_REFERENCED_CLASSES` is represented in the fixture)

## Out of Scope

- Re-running the live `red-bunny` PG-6 → SE-7 replay (the production data is git-ignored; the fixture must be portable).
- Changing `PREDICATE_REFERENCED_CLASSES` or any other predicate-DSL semantics.
- Changing `select_storylet_candidates` request/response shape.
- Modifying the indexer at `tools/world-index/src/parse/atomic.ts` (STSELECT-001's surface; this ticket consumes the indexer as-is).
- Adding per-stage `<stage>_rejected_samples` assertions for the new fixture beyond what is needed to prove the predicate-class stage retains existential SLTs (those samples are MCPENH-074's surface; covered separately).
- Test coverage for the ranking algorithm (STSELECT-004's scope).
- Test coverage for branch/scope/cooldown boundary cases (STSELECT-005's scope).
- Test coverage for page-state and source-ref boundary cases (STSELECT-006's scope).

## Acceptance Criteria

### Tests That Must Pass

1. New integration test at `tools/world-mcp/tests/integration/stselect003-production-shape-existential-pool.test.ts` builds a ~30-50 SLT fixture covering every predicate name in `PREDICATE_REFERENCED_CLASSES`, runs `world-index build`, and asserts the selector returns a non-empty shortlist that includes an SLT whose hard preconditions mix at least three existential predicates.
2. Parity assertion: enumerate the keys of `PREDICATE_REFERENCED_CLASSES` at test time and assert each appears in at least one fixture SLT's `preconditions.hard[].pred`. A future contributor adding a predicate name to the projection table without extending the fixture fails this assertion.
3. The fixture exercises multi-class preconditions (≥1 SLT mixes ≥3 existential predicates of different classes), cooldown variation (≥1 SLT with `cooldown_pages > 0` plus a prior `SE` selection that exercises the cooldown rejection), and saliency-urgency mix (`high`/`medium`/`low` each represented).
4. Per-stage filter_trace counts are deterministic and asserted in the test (hand-counted from the fixture, parallel to SPEC-81 §9.3's pattern).
5. Existing `npm test` in `tools/world-mcp`, `tools/world-index`, and `tools/validators` continues to pass with no regression.

### Invariants

1. The fixture is portable: no dependency on git-ignored production world data; all YAML records authored inline or in a versioned `fixtures/` subdirectory.
2. The parity assertion in §1.2 is mechanically enforced: a new predicate name in `PREDICATE_REFERENCED_CLASSES` without fixture coverage fails the test.
3. The fixture mirrors production shape on at least these dimensions: predicate-name distribution (heavily existential), multi-class hard preconditions, cooldown variation, saliency-urgency mix, all `global_author_pool` scope.
4. The integration test runs the FULL indexer→selector pipeline (no shortcut that bypasses `world-index build`).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/stselect003-production-shape-existential-pool.test.ts` (new) — generator-built fixture + assertions.
2. (Optional) `tools/world-mcp/tests/integration/fixtures/stselect003-production-shape/fixture.json` (new) — if the fixture is materialized rather than generated in-test.

### Commands

1. `cd tools/world-mcp && npm test` — full suite passes including the new integration test.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/stselect003-production-shape-existential-pool.test.js` — focused compiled proof.
3. `cd tools/world-index && npm test` — confirm no regression in the producer side.
4. `cd tools/validators && npm test` — confirm no regression in the shared predicate-DSL surface.

## Outcome

(To be populated post-implementation.)

## Verification Result

(To be populated post-implementation.)
