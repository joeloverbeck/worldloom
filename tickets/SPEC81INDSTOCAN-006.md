# SPEC81INDSTOCAN-006: Capstone integration tests for §9.2-§9.7

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — integration test ticket; no production code. Exercises the pipeline composed by archive/tickets/SPEC81INDSTOCAN-001.md, archive/tickets/SPEC81INDSTOCAN-002.md, and active tickets 003 through 005.
**Deps**: SPEC81INDSTOCAN-003, SPEC81INDSTOCAN-004, SPEC81INDSTOCAN-005

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

## Architecture Check

1. A single capstone ticket aggregating §9.2-§9.7 is cleaner than per-test tickets because: (a) the synthetic 1000-SLT fixture is reusable across all 6 tests; (b) end-to-end assertions need the entire pipeline composed (testing §9.2 in isolation from §9.7 would require duplicate fixture-bootstrap code); (c) the manual dry-runs (§9.4, §9.5) belong adjacent to their automated counterparts in the test file's header runbook so the implementer follows one document. Alternative: split §9.2/§9.3 into the MCP-tool ticket (002) and §9.4/§9.5/§9.6/§9.7 into a separate capstone — rejected because §9.2's pool-scale assertion only meaningfully exercises the full pipeline; isolating it to 002 would test the tool's filter semantics but not the consumer integration §9.2 actually targets.
2. No backwards-compatibility aliasing/shims introduced. The test code reads through the production retrieval surfaces (the new MCP tool + the existing `list_records` for §9.6) and asserts behavior; no test-only abstractions.

## Verification Layers

1. §9.2 pool-scale assertion → schema validation (assert `shortlisted_candidate_ids.length ≤ max_candidates`) + grep-proof on consumer code paths (assert no `get_records` call in test trace requests > `max_candidates` ids).
2. §9.3 filter-trace counts → schema validation (assert `filter_trace.after_<stage>` integer values match hand-counted expectations on a 100-SLT bundle).
3. §9.4 / §9.5 skill dry-runs → manual review (header-comment runbook in the test file documents the manual steps).
4. §9.6 backward compatibility → skill dry-run (invoke `list_records(record_type='storylet_record', include_full_body=true)` on a 1000-SLT fixture; assert response contains full bodies).
5. §9.7 context packet integration → schema validation (`get_context_packet` response for a story-pipeline task type with `parent_page_id` contains both `visible_storylets` (≤50) and the new shortlist (12-24)).

## What to Change

### 1. New synthetic 1000-SLT fixture

Create a synthetic story-bundle fixture under `tools/world-mcp/tests/fixtures/spec81-1000-slt/` (or the equivalent existing fixture root). The fixture contains:

- 1 STORY record + minimal supporting records (1 BR, 1 PG with realistic `state_snapshot.active_records` and `branch_path`, a handful of STENT / STSTAT / SF / BEL / SREL for grounding).
- 1000 SLT records distributed across the SLT schema's enumerations: varied `scope.visibility` (global_author_pool / branch_prefix_scoped / branch_scoped); varied `provenance.origin`; varied `move_family` (all 16 enum values); varied `exit_options[].action_family`; varied `mystery_policy.allowed_authority`; varied `saliency.urgency` + `saliency.cooldown_pages`; varied `grounding.compatible_turn_drivers[]` (covering the 8 SPEC-77 enum values); varied predicate shapes (mix of `fact_true`, `belief_record`, existential predicates, etc.).
- Generation script that produces the fixture deterministically from a seed (so the fixture is regenerable and the synthetic SLTs' IDs are stable).

### 2. New test: `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts`

Cover §9.2-§9.3, §9.6, §9.7 as automated assertions:

- **§9.2 pool-scale**: Build world-index against the 1000-SLT fixture; invoke `select_storylet_candidates(turn_driver=player_action, ...)`; assert `shortlisted_candidate_ids.length ≤ 24`; assert the test's full-body read count (via `get_records(record_ids=requires_full_body_ids, ...)`) is ≤ 24.
- **§9.3 filter-trace counts**: Build world-index against a separate hand-crafted 100-SLT fixture with known per-stage counts (e.g., 70 global, 30 branch-scoped; 40 npc_action-compatible; etc.); invoke the tool; assert each `filter_trace.after_<stage>` value matches the hand-counted expectation.
- **§9.6 backward compatibility**: On the 1000-SLT fixture, invoke `list_records(record_type='storylet_record', world_slug, story_slug, include_full_body=true)`; assert the response contains full bodies for all 1000 SLTs (response shape contains the `body` field per the existing `list_records` contract).
- **§9.7 context packet integration**: On the 1000-SLT fixture, invoke `get_context_packet(world_slug, task_type='story_turn_cycle', story_slug, seed_nodes=[<parent_page_id>], token_budget=...)`; assert the response contains BOTH `story_bundle_context.visible_storylets` (length ≤ 50) AND the new shortlist (length in 12-24 range).

The test file's header comment is the **manual dry-run runbook** for §9.4 and §9.5:

- **§9.4 Turn-cycle end-to-end**: Manual step — copy the 1000-SLT fixture to a temp root with `fs.cpSync`; invoke `/branching-story-turn-cycle` against the temp world's bundle from a recent committed PG; verify the turn-cycle completes in measurably less wall time than the equivalent `list_records(include_full_body=true)` path would have taken (qualitative; the spec asserts measurable improvement, not a specific ms target).
- **§9.5 commitment-block-authoring end-to-end**: Manual step — copy the 1000-SLT fixture to a temp root; invoke `/commitment-block-authoring direct_batch` against the temp world's bundle; verify the gap-diagnostic output is consistent with what the prior `list_records` path would have produced (the projection records contain all fields the diagnostic reads: move_family, compatible_turn_drivers, predicate classes).

### 3. Fixture-world copy strategy

The test file uses `fs.cpSync` (or equivalent) to copy the 1000-SLT fixture to a temp root before invoking the MCP tool (and before manual dry-runs), so the real `worlds/<slug>/` tree is never mutated. Re-enumerate expected counts from the fixture at test start (do not hardcode against fixture content that could grow).

## Files to Touch

- `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (new)
- `tools/world-mcp/tests/fixtures/spec81-1000-slt/` (new — directory containing fixture YAML records + generator script)
- `tools/world-mcp/tests/fixtures/spec81-100-slt-hand-counted/` (new — directory containing the smaller hand-counted fixture for §9.3)

## Out of Scope

- World-index foundational changes — landed in archive/tickets/SPEC81INDSTOCAN-001.md (and §9.1 verified there).
- MCP tool implementation — landed in archive/tickets/SPEC81INDSTOCAN-002.md.
- Consumer skill wiring (turn-cycle, commitment-block-authoring, context packet) — landed in SPEC81INDSTOCAN-003/004/005.
- Phase-2-3 doc reconciliation (SPEC-81 §10 follow-up; cross-spec follow-up per Step 6 routing pattern (c)).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all existing tests pass; new `spec81-storylet-candidate-retrieval.test.ts` passes.
2. The §9.2 pool-scale automated assertion passes: shortlist length ≤ 24, full-body read count ≤ 24.
3. The §9.3 filter-trace count automated assertion passes: every `filter_trace.after_<stage>` value matches the hand-counted expectation on the 100-SLT fixture.
4. The §9.6 backward-compatibility automated assertion passes: `list_records(record_type='storylet_record', include_full_body=true)` returns full bodies for all 1000 fixture SLTs.
5. The §9.7 context-packet automated assertion passes: response shape contains both `visible_storylets` (≤50) and the new shortlist (12-24).
6. The §9.4 and §9.5 manual dry-run runbooks (in the test file's header comment) are followed against the 1000-SLT fixture; the implementer confirms qualitative behavioral expectations (measurably less wall time for turn-cycle; consistent gap-diagnostic output for commitment-block-authoring).

### Invariants

1. The synthetic 1000-SLT fixture is generated deterministically from a seed so the fixture is regenerable and SLT IDs are stable across runs.
2. Tests use `fs.cpSync` (or equivalent) to a temp root before any state-mutating invocation; the real `worlds/<slug>/` tree is never touched.
3. Expected counts in assertions are re-enumerated from the fixture at test start, not hardcoded (so fixture growth does not silently break tests).
4. The capstone exercises every prior ticket's surface (001 world-index, 002 MCP tool, 003 turn-cycle wiring, 004 commitment-block-authoring wiring, 005 context packet) end-to-end.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (new) — automated assertions for §9.2 / §9.3 / §9.6 / §9.7; header-comment runbook for §9.4 / §9.5 manual dry-runs.
2. `tools/world-mcp/tests/fixtures/spec81-1000-slt/` (new) — deterministic synthetic 1000-SLT fixture for pool-scale assertion.
3. `tools/world-mcp/tests/fixtures/spec81-100-slt-hand-counted/` (new) — smaller hand-counted fixture with known per-stage filter counts for §9.3.

### Commands

1. `cd tools/world-mcp && npm test` — runs the new capstone test (covers §9.2 / §9.3 / §9.6 / §9.7 automated assertions).
2. `/branching-story-turn-cycle` invoked against the temp-copied 1000-SLT fixture — §9.4 manual dry-run; verify qualitative wall-time improvement vs. the `list_records(include_full_body=true)` baseline.
3. `/commitment-block-authoring direct_batch` invoked against the temp-copied 1000-SLT fixture — §9.5 manual dry-run; verify gap-diagnostic output is consistent with the prior `list_records` path.
