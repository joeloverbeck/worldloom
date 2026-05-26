# MCPENH-070: select_storylet_candidates grounding_record_ids filter eliminates existential-predicate SLTs

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/select-storylet-candidates.ts` (`matchesSourceRecordIds` filter semantics); `tools/world-mcp/src/server.ts` (tool description); `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` (tool-row clarification); `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` and `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (existential-predicate-SLT coverage).
**Deps**: None

## Problem

At intake, `select_storylet_candidates` applied a strict-intersect `grounding_record_ids` filter in `tools/world-mcp/src/tools/select-storylet-candidates.ts` (`matchesSourceRecordIds`):

```typescript
const groundingRecordIds = args.intent_signature?.grounding_record_ids ?? [];
return groundingRecordIds.length === 0 || intersects(candidate.sourceRecordIds, groundingRecordIds);
```

`candidate.sourceRecordIds` is loaded from the `storylet_predicate_ref` edge table, which carries only the **exact record IDs explicitly named in an SLT's predicates** (e.g., `record_active(BEL-1)`, `belief_record(holder, BEL-9)`). SLTs whose predicates use only existential `any_*` forms (`any_thread_active`, `any_emotion_active`, `any_belief`, `any_relationship_axis`, `any_obligation_open`, `any_consequence_pending`, `any_intention`, `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`) have **empty `sourceRecordIds`** because existential predicates bind aliases at runtime rather than naming concrete record IDs at authoring time.

The mismatch surfaces because two contracts collide:
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md:11` prescribes the input shape: *"For `driver.kind: player_action | player_write_in`, set `intent_signature.action_families` from the chosen `CHC.target_or_action_families`, set `intent_signature.grounding_record_ids` from `CHC.grounded_in.records`, and derive `intent_signature.grounding_record_classes` from those grounded record ids."* This shape is the canonical input for player-action turn-cycles.
- `.claude/skills/_shared-templates/story-state-contract.md` §11a (Character-Fit Selection Contract) requires `global_author_pool` SLTs to express character relevance through existential predicates: *"Global-author-pool SLTs (`scope.visibility: global_author_pool`) must express character relevance through: existential predicates over current-state classes (`any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`, `any_obligation_open`, etc.); or role-keyed predicates referencing `holder_role: primary_actor` / `holder_role: relevant_actor` plus a current-state class; or driver-record overlap..."*

At intake, following both contracts produced an empty shortlist for every routine player-action turn whose `CHC.grounded_in.records[]` was non-empty (which is every CHC the skill emits, since the skill requires CHC grounding in active records). The operator was forced to fall back to direct `Read` of every author-pool SLT to evaluate eligibility, losing the `filter_trace` audit primitive the skill says is the load-bearing reason to use the MCP path (*"for routine selection the MCP path is required because `select_storylet_candidates` runs the projection filter the in-process predicate evaluator depends on, and bypassing it discards the `filter_trace` that audits selection decisions"* — `.claude/skills/branching-story-turn-cycle/SKILL.md` Procedure step 4).

Concrete observed failure at the `red-bunny` PG-3 turn-cycle (2026-05-26): I called `select_storylet_candidates(parent_page_id='PG-2', turn_driver={kind: 'player_action', driver_records: [], initiator: 'player'}, intent_signature={action_families: ['communicate', 'bond'], grounding_record_classes: [...10 classes...], grounding_record_ids: [16 ids from CHC-5.grounded_in.records]})` and received `filter_trace.after_predicate_class: 2 → after_source_record_id: 0`. The expected SLT (SLT-2 — `Cold-approach contact: open a relational register on a present stranger`, the canonical bond_shift seed pool block for CHC-5) was eliminated because its preconditions use `any_thread_active`, `any_emotion_active`, and `any_belief` — all existential — and its `effects.create/supersede/close` are empty (effects are produced by the SE state delta, not by bond-shift SLT bodies). I fell back to direct `Read` of `_source/storylets/SLT-2.yaml` to verify eligibility and bind aliases manually.

Before this ticket, the tool description in `tools/world-mcp/src/server.ts` did not explain the `grounding_record_ids` filter semantics, so an operator following the skill prose had no signal that the prescribed input shape would produce an empty shortlist for the seed-pool architecture.

## Assumption Reassessment (2026-05-26)

1. Before implementation, the strict-intersect implementation was in `tools/world-mcp/src/tools/select-storylet-candidates.ts` (`matchesSourceRecordIds`); `sourceRecordIds` is loaded from the `storylet_predicate_ref` edge table via `loadEdgeTargets(db, storySlug, "storylet_predicate_ref")`. The edge table carries only exact record IDs from predicate `record:`, `holder:`, and `target:` fields — existential predicates contribute no entries. The `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` predicate registry confirms which predicates carry record-id arguments (`record_active`, `belief_record`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, `clock_at_least`/`below`/`full`, `secret_unrevealed`/`revealed`, `revelation_ready`, `story_question_open`, `story_question_status`, `promise_due`, `location`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`, `plan_active`, `plan_blocked`, `emotion_active`, `emotion_pressure`) versus which are existential (`any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`, `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`). Existential SLTs are the dominant pattern in seed pools per shared-contract §11a, so the gap affected routine turn-cycles.
2. At intake, `docs/MACHINE-FACING-LAYER.md` described the tool's filter pipeline by stage name (*"story scope, branch visibility, driver kind, optional intent action family, predicate shape/class, source-record id, mystery-policy, cooldown..."*) but did not document the `source-record id` stage's semantics or the existential-predicate edge case. `tools/world-mcp/src/server.ts` and `tools/world-mcp/README.md` similarly described the response shape without explaining why `after_source_record_id` could drop an existential pool to zero.
3. Cross-skill / cross-artifact boundary: `select_storylet_candidates` is consumed by every story-pipeline skill that runs at PG-authoring scope — directly by `branching-story-turn-cycle` Phase 2-3 per `.claude/skills/branching-story-turn-cycle/SKILL.md` Procedure step 4, and indirectly by `get_context_packet` task types whose `story_bundle_context.selection_shortlist` invokes the same projection per `docs/CONTEXT-PACKET-CONTRACT.md`. The shared boundary under audit is the `intent_signature.grounding_record_ids` field semantics: filter-strictness, operator-facing tool-description text, and the skill-prose-prescribed input shape must compose without mutually eliminating the candidate pool. The fix landed in the MCP tool implementation, tool description, package README, machine-facing docs, and tests; the separate optional skill-prose clarification remains out of scope.
4. FOUNDATIONS principle restated: `docs/FOUNDATIONS.md` §Story Bundles §5b (Schema-Minimalism At Story Scope) requires every field in every story-bundle record schema to be load-bearing. The `intent_signature.grounding_record_ids` field is load-bearing for narrowing exact-ID-predicate SLTs (the minority case in well-architected pools), but its current strict-intersect semantics make it actively harmful for the existential-predicate-dominated majority case the shared-contract §11a Character-Fit Selection Contract prescribes — the field eliminates valid candidates rather than narrowing them. The fix preserves the field's narrowing intent for exact-ID-predicate SLTs while treating SLTs with empty `sourceRecordIds` (no exact-ID predicates) as wildcard-matches, restoring composition with §11a's existential-predicate architecture. This is a semantic widening, not a contract change; FOUNDATIONS §Story Bundles §11a (cited above in the Problem section) explicitly requires global_author_pool SLTs to use existential predicates, so the contract-level expectation is that existential SLTs are the dominant pool shape and the MCP filter must accommodate them.
5. **Adjacent contradictions surfaced during reassessment**: the colliding skill-prose at `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` prescribes `intent_signature.grounding_record_ids = CHC.grounded_in.records[]` as the canonical input without anticipating the existential-predicate filter incompatibility. Now that this ticket has landed, the skill prose's prescribed shape is correct (the widened filter accommodates existential SLTs), so the skill prose itself does not need normative update — but the prose could be clarified to name the filter behavior the operator gets back (e.g., "the filter narrows exact-ID-predicate SLTs and wildcard-passes existential SLTs, so `filter_trace.after_source_record_id` reflects the post-narrowing exact-ID pool plus all existential candidates"). This clarification is a Phase 8 path-(a) `/skill-audit .claude/skills/branching-story-turn-cycle` follow-up cleanup, not a load-bearing scope item for this ticket; routing it as a separate follow-up keeps this MCPENH ticket scoped to the MCP-side implementation + docs + tests.

## Architecture Check

1. Cleaner than alternatives because (a) treating empty `sourceRecordIds` as a wildcard match composes the filter with FOUNDATIONS-derived §11a's existential-predicate architecture rather than fighting it — no operator-facing input-shape escape hatch required; (b) the fix preserves the filter's narrowing intent for the minority case of exact-ID-predicate SLTs (which DO have `sourceRecordIds`) without weakening their narrowing — exact-ID SLTs continue to be filtered by `intersects(candidate.sourceRecordIds, groundingRecordIds)`; (c) the alternative of requiring operators to omit `grounding_record_ids` for existential-predicate-dominated pools forces an inverted contract — the operator would have to know in advance which pool shape the bundle uses before calling the tool, defeating the projection-only abstraction the tool is meant to provide.
2. No backwards-compatibility shim introduced. The filter semantics widen (empty-sourceRecordIds candidates pass instead of being eliminated); call-sites that pass non-empty `grounding_record_ids` continue to see narrowing on exact-ID-predicate SLTs; call-sites that pass empty `grounding_record_ids` see no behavior change. No new input field, no new response field, no new edge type.

## Verification Layers

1. FOUNDATIONS §Story Bundles §11a (Character-Fit Selection Contract) composition preserved → FOUNDATIONS alignment check (after the fix, an existential-predicate-only SLT survives `after_source_record_id` when `grounding_record_ids` is non-empty, matching §11a's prescription that global_author_pool SLTs use existential predicates).
2. `matchesSourceRecordIds` wildcard-passes empty-`sourceRecordIds` SLTs → schema validation (a unit test against `tools/world-mcp/src/tools/select-storylet-candidates.ts` with a synthetic SLT whose predicate refs are all existential confirms `after_source_record_id` retains the SLT when `grounding_record_ids` is non-empty).
3. Exact-ID-predicate SLT narrowing preserved → schema validation (existing test for an exact-ID-predicate SLT continues to pass; the SLT is excluded when its `sourceRecordIds` does not intersect `grounding_record_ids`, included when it does).
4. Empty-`grounding_record_ids` no-op preserved → schema validation (existing test with empty `grounding_record_ids` continues to return the full predicate-class-narrowed pool unchanged).
5. Skill-prescribed input shape produces non-empty shortlist for canonical seed pools → compiled integration regression (a synthetic seed-pool-shaped invocation with non-empty `intent_signature.grounding_record_ids` returns a non-empty `shortlisted_candidate_ids` covering an existential-predicate SLT whose action-family and driver-kind match).
6. Tool description and machine-facing docs accurately describe the filter behavior → manual review (`tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` updated to name the wildcard-pass semantics for empty `sourceRecordIds`).

## Landed Changes

### 1. Widen `matchesSourceRecordIds` to wildcard-pass empty `sourceRecordIds`

`matchesSourceRecordIds` now returns `true` when no `grounding_record_ids` were supplied, wildcard-passes candidates whose `sourceRecordIds` is empty, and preserves `intersects(candidate.sourceRecordIds, groundingRecordIds)` for exact-ID-predicate SLTs. The existing source-ref existence check and global-author-pool story-local-id defensive rejection remain unchanged.

### 2. Update tool description in `tools/world-mcp/src/server.ts`

The registered `select_storylet_candidates` description now says `intent_signature.grounding_record_ids` narrows SLTs with exact-id predicate refs and wildcard-passes SLTs with only existential predicates because alias binding happens later against active records.

### 3. Update package and repo docs

`docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` now document the source-record-id stage: exact-id predicate refs narrow by intersection, while existential-only SLTs have no exact source refs and wildcard-pass this stage.

### 4. Extend tests at `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`

Added coverage for the modified `matchesSourceRecordIds`:

1. Existential-predicate-only SLT (empty `sourceRecordIds`) with non-empty `grounding_record_ids` → INCLUDED in `after_source_record_id` (new behavior).
2. Exact-ID-predicate SLT whose `sourceRecordIds` does not intersect `grounding_record_ids` → EXCLUDED (existing behavior preserved).
3. Exact-ID-predicate SLT whose `sourceRecordIds` does intersect `grounding_record_ids` → INCLUDED (existing behavior preserved).

`tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` now has a regression case for the seed-pool-shape invocation: global-author-pool existential-predicate SLTs survive a player-action request with non-empty `grounding_record_ids`.

## Files to Touch

- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify — `matchesSourceRecordIds` filter)
- `tools/world-mcp/src/server.ts` (modify — tool description)
- `docs/MACHINE-FACING-LAYER.md` (modify — `select_storylet_candidates` row)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — add three existential / exact-ID / intersect cases per Change Area 4)
- `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (modify — seed-pool-shape regression with non-empty `grounding_record_ids`)
- `tools/world-mcp/README.md` (modify — package-local tool description)

## Out of Scope

- Any change to the `intent_signature` schema shape (`action_families`, `grounding_record_classes`, `grounding_record_ids` fields are unchanged at the input-schema level).
- Any change to the `storylet_predicate_ref` edge table or its load query (`loadEdgeTargets`) — the data source is unchanged.
- Any change to the predicate DSL grammar at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — the existential-vs-exact-ID predicate set is unchanged.
- Skill-prose clarification at `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — that clarification is a Phase 8 path-(a) `/skill-audit` follow-up surfaced as an adjacent contradiction in Assumption Reassessment item 5; after this ticket lands, the skill prose's prescribed input shape becomes correct (the widened filter accommodates the prescription), so the prose update is cleanup-grade rather than load-bearing.
- The `get_context_packet` `selection_shortlist` projection at `docs/CONTEXT-PACKET-CONTRACT.md` — that consumer calls `select_storylet_candidates` with the default `player_action` turn driver and no explicit `intent_signature`, so the wildcard-pass widening already covers it without consumer-side changes.
- Any change to `branching-story-bootstrap` Phase 2 or `commitment-block-authoring` selection flows — those skills do not currently call `select_storylet_candidates` at the same input shape; the fix is purely additive for them.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — passed after the change with the new unit and integration cases plus existing package coverage.
2. Integration regression: `select_storylet_candidates` against a synthetic seed-pool-shaped fixture with non-empty `grounding_record_ids` returns non-empty `shortlisted_candidate_ids` and includes an existential-predicate SLT.
3. `bash scripts/build-all.sh` and `bash scripts/check-all.sh` — full-pipeline build + test verification passed.

### Invariants

1. SLTs whose `sourceRecordIds` is empty (existential-predicate-only) MUST wildcard-pass the `after_source_record_id` filter regardless of the supplied `grounding_record_ids`.
2. SLTs whose `sourceRecordIds` is non-empty MUST be filtered by `intersects(candidate.sourceRecordIds, groundingRecordIds)` (existing narrowing behavior preserved for exact-ID-predicate SLTs).
3. The defensive-belt rejection for story-local-id refs on global_author_pool SLTs, plus the `sourceRefExists` precondition, MUST be preserved unchanged.
4. The tool description in `tools/world-mcp/src/server.ts` MUST name the wildcard-pass semantics so operators can discover the behavior without reading the implementation.
5. FOUNDATIONS §Story Bundles §11a (Character-Fit Selection Contract) composition with `select_storylet_candidates` MUST hold — the contract requires existential predicates for global_author_pool SLTs, and the MCP filter must not eliminate them.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — added unit coverage for existential wildcard-pass, exact-ID non-intersect exclude, and exact-ID intersect include; rationale: covers the modified filter behavior across the three relevant SLT-shape classes.
2. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` — added a regression case for the seed-pool-shape invocation with global-author-pool existential-predicate SLTs and non-empty `grounding_record_ids`; rationale: covers the end-to-end pipeline path the turn-cycle skill exercises in routine selection.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/select-storylet-candidates.test.js dist/tests/integration/spec81-storylet-candidate-retrieval.test.js` — focused compiled proof for the modified unit and integration surfaces.
2. `cd tools/world-mcp && npm test` — package-local broad proof.
3. `bash scripts/build-all.sh` — full workspace build proof.
4. `bash scripts/check-all.sh` — full workspace build + test proof.

## Outcome

`select_storylet_candidates` now composes with existential-predicate seed-pool SLTs when callers supply `intent_signature.grounding_record_ids`: existential-only candidates wildcard-pass the source-record-id filter, while exact-ID candidates still require intersection with supplied grounding ids. The discoverable MCP description, package README, and machine-facing docs now name that behavior.

## Verification Result

1. Pre-edit baseline: `cd tools/world-mcp && npm test` passed with 473 tests, 0 failures.
2. Focused post-change proof: `cd tools/world-mcp && npm run build && node --test dist/tests/tools/select-storylet-candidates.test.js dist/tests/integration/spec81-storylet-candidate-retrieval.test.js` passed with 9 tests, 0 failures.
3. Package post-change proof: `cd tools/world-mcp && npm test` passed with 476 tests, 0 failures.
4. Workspace build proof: `bash scripts/build-all.sh` passed.
5. Workspace verification proof: `bash scripts/check-all.sh` passed; all packages green.
6. Manual public-surface review: `tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` all describe exact-ID narrowing plus existential wildcard-pass semantics.

## Deviations

- `tools/world-mcp/README.md` was added to the landed file set during reassessment because package-local public docs are a same-seam surface for MCP tool behavior.
- The integration regression uses the existing synthetic SPEC-81 hand-counted pool shape rather than the checkout-local `red-bunny` story bundle. This keeps the proof portable while preserving the owned invariant: non-empty `grounding_record_ids` no longer eliminate existential-predicate global-author-pool SLTs.
- The optional branching-story-turn-cycle prose clarification remains out of scope; after the MCP-side widening, the skill-prescribed input shape composes correctly, and any wording clarification belongs to a separate skill-audit cleanup.
