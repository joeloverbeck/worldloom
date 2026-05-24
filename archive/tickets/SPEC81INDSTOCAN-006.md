# SPEC81INDSTOCAN-006: Capstone integration tests for §9.2-§9.7

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — integration test ticket; no production code. Exercises the pipeline composed by archive/tickets/SPEC81INDSTOCAN-001.md, archive/tickets/SPEC81INDSTOCAN-002.md, archive/tickets/SPEC81INDSTOCAN-003.md, archive/tickets/SPEC81INDSTOCAN-004.md, and archive/tickets/SPEC81INDSTOCAN-005.md.
**Deps**: archive/tickets/SPEC81INDSTOCAN-003.md, archive/tickets/SPEC81INDSTOCAN-004.md, archive/tickets/SPEC81INDSTOCAN-005.md

## Problem

SPEC-81 §9 declares 7 validation tests. §9.1 (index-build roundtrip correctness) is folded into archive/tickets/SPEC81INDSTOCAN-001.md's acceptance criteria + test plan since it directly verifies the world-index changes. §9.2-§9.7 require the full pipeline (world-index + MCP tool + consumer wiring + context packet) to be in place; they exercise the end-to-end retrieval surface on a synthetic 1000-SLT pool.

This capstone ticket lands the integration test suite covering §9.2-§9.7 plus a manual dry-run runbook for the skill-level verification tests (§9.4, §9.5) that require LLM-driven skill invocations not runnable from test-suite code.

## Assumption Reassessment (2026-05-24)

1. `tools/world-mcp/tests/` is the existing integration-test root for cross-tool tests (per the test-shape patterns in sibling integration tests under `tests/integration/`). Synthetic story-bundle fixtures live at the `tests/fixtures/` level (existing pattern, e.g., for context-packet tests).
2. SPEC-81 §9 validation tests:
   - §9.1: Index-build correctness (folded into archive/tickets/SPEC81INDSTOCAN-001.md).
   - §9.2: Synthetic 1000-SLT pool — `select_storylet_candidates(turn_driver=player_action)` returns ≤24; consumer's full-body read count is ≤24.
   - §9.3: Filter-trace counts — hand-crafted 100-SLT bundle with known per-stage counts; assert `filter_trace` matches.
   - §9.4: Turn-cycle end-to-end (skill dry-run; manual runbook).
   - §9.5: commitment-block-authoring end-to-end (skill dry-run; manual runbook).
   - §9.6: Backward compatibility (`list_records(record_type='storylet_record', include_full_body=true)` continues to work).
   - §9.7: Context packet integration (50-cap summary + 12-24-cap shortlist coexist).
3. Cross-skill boundary under audit: capstone exercises every prior ticket — world-index (001), MCP tool (002), turn-cycle wiring (003), commitment-block-authoring wiring (004), context packet wiring (005). Per the parallel-branch DAG rule in §Spec-Integration Ticket Shape, `Deps` enumerate the leaves 003/004/005 (each transitively reaches 001+002).
4. FOUNDATIONS §Tooling Recommendation: the capstone verifies the canonical `context-packet + targeted-retrieval pattern` is preserved end-to-end (the new MCP tool integrates cleanly with `get_records` for full-body retrieval; the context-packet shortlist embeds via the same mechanism).
5. Package reassessment corrected the fixture surface. The live `tools/world-mcp` test pattern seeds temp index databases through `tests/tools/_shared.ts` and deterministic builder functions; no existing integration test commits large generated fixture directories. This ticket therefore uses an in-test deterministic generator for the 1000-SLT pool and the 100-SLT hand-counted pool instead of adding checked-in fixture directories under `tests/fixtures/`.

## Architecture Check

1. A single capstone ticket aggregating §9.2-§9.7 is cleaner than per-test tickets because: (a) the synthetic 1000-SLT fixture is reusable across all 6 tests; (b) end-to-end assertions need the entire pipeline composed (testing §9.2 in isolation from §9.7 would require duplicate fixture-bootstrap code); (c) the manual dry-runs (§9.4, §9.5) belong adjacent to their automated counterparts in the test file's header runbook so the implementer follows one document. Alternative: split §9.2/§9.3 into the MCP-tool ticket (002) and §9.4/§9.5/§9.6/§9.7 into a separate capstone — rejected because §9.2's pool-scale assertion only meaningfully exercises the full pipeline; isolating it to 002 would test the tool's filter semantics but not the consumer integration §9.2 actually targets.
2. No backwards-compatibility aliasing/shims introduced. The test code reads through the production retrieval surfaces (the new MCP tool + the existing `list_records` for §9.6) and asserts behavior; no test-only abstractions.

## Verification Layers

1. §9.2 pool-scale assertion → schema validation (assert `shortlisted_candidate_ids.length ≤ max_candidates`) + targeted tool command (call `get_records(record_ids=requires_full_body_ids, ...)` and assert the full-body read count is ≤ `max_candidates`).
2. §9.3 filter-trace counts → schema validation (assert `filter_trace.after_<stage>` integer values match hand-counted expectations on a 100-SLT bundle).
3. §9.4 / §9.5 skill dry-runs → manual review (header-comment runbook in the test file documents the manual steps; Codex did not execute Claude skill invocations).
4. §9.6 backward compatibility → targeted tool command (invoke `list_records(record_type='storylet_record', include_full_body=true)` on a 1000-SLT fixture; assert response contains full bodies).
5. §9.7 context packet integration → schema validation (`get_context_packet` response for a story-pipeline task type with `parent_page_id` contains both `visible_storylets` (≤50) and the new shortlist (12-24)).

## What to Change

### 1. New deterministic synthetic fixture builders

Add deterministic fixture-builder functions inside the new integration test. They seed temp world-index databases through the existing `seedWorld` helper and contain:

- 1 CF seed, 1 PG with realistic `state_snapshot.active_records` and `branch_path`, 1 STCHAR grounding record, and story events where cooldown proof needs prior selected SLTs.
- 1000 SLT records distributed across representative projection axes used by the implemented retrieval surface: `move_family`, `exit_options[].action_family`, `saliency.urgency`, `grounding.compatible_turn_drivers[]`, and predicate-class edges. The hand-counted 100-SLT fixture separately varies scope, driver, action-family, predicate-shape, predicate-class, source-record, mystery-policy, and cooldown filters to prove every `filter_trace` stage.
- Deterministic generation from fixed builder inputs (so the synthetic SLTs' IDs and expected counts are stable without committing 1000 generated YAML files).

### 2. New test: `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts`

Cover §9.2-§9.3, §9.6, §9.7 as automated assertions:

- **§9.2 pool-scale**: Build world-index against the 1000-SLT fixture; invoke `select_storylet_candidates(turn_driver=player_action, ...)`; assert `shortlisted_candidate_ids.length ≤ 24`; assert the test's full-body read count (via `get_records(record_ids=requires_full_body_ids, ...)`) is ≤ 24.
- **§9.3 filter-trace counts**: Build world-index against a separate hand-crafted 100-SLT fixture with known per-stage counts (e.g., 70 global, 30 branch-scoped; 40 npc_action-compatible; etc.); invoke the tool; assert each `filter_trace.after_<stage>` value matches the hand-counted expectation.
- **§9.6 backward compatibility**: On the 1000-SLT fixture, invoke `list_records(record_type='storylet_record', world_slug, story_slug, include_full_body=true)`; assert the response contains full bodies for all 1000 SLTs (response shape contains the `body` field per the existing `list_records` contract).
- **§9.7 context packet integration**: On the 1000-SLT fixture, invoke `get_context_packet(world_slug, task_type='story_turn_cycle', story_slug, seed_nodes=[<world seed>], parent_page_id=<PG id>, token_budget=...)`; assert the response contains BOTH `story_bundle_context.visible_storylets` (length ≤ 50) AND the new shortlist (length in 12-24 range).

The test file's header comment is the **manual dry-run runbook** for §9.4 and §9.5:

- **§9.4 Turn-cycle end-to-end**: Manual step — seed the generated 1000-SLT fixture into a temp root; invoke `/branching-story-turn-cycle` against the temp world's bundle from a recent committed PG; verify the turn-cycle uses the SPEC-81 shortlist path rather than a full-pool `list_records(include_full_body=true)` scan.
- **§9.5 commitment-block-authoring end-to-end**: Manual step — seed the generated 1000-SLT fixture into a temp root; invoke `/commitment-block-authoring direct_batch` against the temp world's bundle; verify the gap-diagnostic output reads projection rows for `move_family`, `compatible_turn_drivers`, and predicate classes.

### 3. Fixture-world copy strategy

The test file seeds generated fixture records into a temp root before invoking the MCP tool. The real `worlds/<slug>/` tree is never mutated. Re-enumerate expected counts from the generated fixture data at test start (do not hardcode against opaque fixture content).

## Files to Touch

- `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (new)

## Out of Scope

- World-index foundational changes — landed in archive/tickets/SPEC81INDSTOCAN-001.md (and §9.1 verified there).
- MCP tool implementation — landed in archive/tickets/SPEC81INDSTOCAN-002.md.
- Consumer skill wiring (turn-cycle, commitment-block-authoring, context packet) — turn-cycle landed in archive/tickets/SPEC81INDSTOCAN-003.md; commitment-block-authoring landed in archive/tickets/SPEC81INDSTOCAN-004.md; context packet landed in archive/tickets/SPEC81INDSTOCAN-005.md.
- Phase-2-3 doc reconciliation — landed in archive/tickets/SPEC81INDSTOCAN-003.md as part of the shortlist rewrite; no separate capstone-owned follow-up remains.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all existing tests pass; new `spec81-storylet-candidate-retrieval.test.ts` passes.
2. The §9.2 pool-scale automated assertion passes: shortlist length ≤ 24, full-body read count ≤ 24.
3. The §9.3 filter-trace count automated assertion passes: every `filter_trace.after_<stage>` value matches the hand-counted expectation on the 100-SLT fixture.
4. The §9.6 backward-compatibility automated assertion passes: `list_records(record_type='storylet_record', include_full_body=true)` returns full bodies for all 1000 fixture SLTs.
5. The §9.7 context-packet automated assertion passes: response shape contains both `visible_storylets` (≤50) and the new shortlist (12-24).
6. The §9.4 and §9.5 manual dry-run runbooks are documented in the test file's header comment; Codex does not execute Claude skill invocations, so those manual checks remain operator-facing guidance rather than automated proof.

### Invariants

1. The synthetic 1000-SLT fixture is generated deterministically from fixed builder inputs so the fixture is regenerable and SLT IDs are stable across runs.
2. Tests seed a temp root before any state-mutating invocation; the real `worlds/<slug>/` tree is never touched.
3. Expected counts in assertions are re-enumerated from the fixture at test start, not hardcoded (so fixture growth does not silently break tests).
4. The capstone exercises every prior ticket's surface (001 world-index, 002 MCP tool, 003 turn-cycle wiring, 004 commitment-block-authoring wiring, 005 context packet) end-to-end.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (new) — automated assertions for §9.2 / §9.3 / §9.6 / §9.7; header-comment runbook for §9.4 / §9.5 manual dry-runs.
2. Inline deterministic fixture builders in `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` — synthetic 1000-SLT fixture and smaller hand-counted fixture with known per-stage filter counts for §9.3.

### Commands

1. `cd tools/world-mcp && npm test` — runs the new capstone test (covers §9.2 / §9.3 / §9.6 / §9.7 automated assertions).
2. Manual runbook in `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` — §9.4 `/branching-story-turn-cycle` dry-run guidance against the generated temp 1000-SLT fixture.
3. Manual runbook in `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` — §9.5 `/commitment-block-authoring direct_batch` dry-run guidance against the generated temp 1000-SLT fixture.

## Outcome

Completed on 2026-05-24.

Landed a new `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` capstone with deterministic temp-index fixture builders. The automated test covers SPEC-81 §9.2, §9.3, §9.6, and §9.7:

- §9.2: a generated 1000-SLT pool returns 24 shortlisted ids and `get_records` reads only those 24 full bodies.
- §9.3: a hand-counted 100-SLT pool asserts every `filter_trace` stage count.
- §9.6: `list_records(record_type='storylet_record', include_full_body=true)` still returns full bodies for all 1000 generated SLTs.
- §9.7: `get_context_packet` returns both the 50-cap visible-storylets summary and the 24-cap projection-only shortlist.

The implementation uses generated temp fixtures through the package's existing `seedWorld` helper rather than checked-in 1000-record fixture directories. The test header documents the manual §9.4 and §9.5 skill-run runbooks, but Codex did not execute Claude skill invocations.

## Verification Result

PASS — `cd tools/world-mcp && npm run build`

PASS — `cd tools/world-mcp && node --test dist/tests/integration/spec81-storylet-candidate-retrieval.test.js` (4 tests passed; §9.2, §9.3, §9.6, and §9.7 automated capstone assertions)

PASS — `cd tools/world-mcp && npm test` (442 tests passed)

PASS — `git status --short --ignored tools/world-mcp tools/world-index` was inspected before and after package proof; remaining ignored artifacts are expected package outputs/dependencies/secrets: `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`.

## Deviations

- The drafted checked-in fixture directories were replaced with deterministic in-test fixture builders because the live package pattern seeds temp index databases and avoids committing large generated fixture trees.
- The §9.4 and §9.5 Claude skill dry-runs were not executed in Codex; they are documented as manual operator runbooks in the test header. Automated proof covers the package/tool surfaces those skills consume.
