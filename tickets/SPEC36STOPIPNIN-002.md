# SPEC36STOPIPNIN-002: Extend context-packet seed-variant tests with PG/BEL/SE

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`

## Problem

`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` currently exercises the story-local-seed filter at `tools/world-mcp/src/tools/get-context-packet.ts:30` with only SF and STENT seed-id types. The filter pattern at `get-context-packet.ts:29-30` matches 20 story-local types (SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STENT, STSTAT, STLOC, STOBJ, BR, PG, CHC, SLT, SLB, SAU, SP, RSP). The ninth-iteration audit (`reports/story-related-improvements-ninth-iteration.md` §11.3 P2 test #5) flags that without PG/BEL/SE seed-variant coverage, a regression that broke filtering specifically for these high-frequency story-record types would slip past CI. SPEC-36 §D6 closes this gap as an extension of the F3 / SPEC-35-D3 test surface.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` exists and currently exercises SF / STENT seed-id types — verified by parallel-Explore-agent quote during the SPEC-36 brainstorm session. The filter `STORY_LOCAL_SEED_NODE_PATTERN` at `tools/world-mcp/src/tools/get-context-packet.ts:29-30` matches PG / BEL / SE among its 20 covered classes; the warning code `story_local_seed_nodes_ignored` at `get-context-packet.ts:31` is the same warning emitted under the SF / STENT path.
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D6 specifies three new test cases (one per added seed type) appended to the existing test file. SPEC-35 D3's archived ticket landed the original story-local seed filter and the SF / STENT test coverage; this ticket extends that surface.
3. Cross-artifact boundary under audit: the context-packet story-local seed filter is a contract between the MCP retrieval surface (`get_context_packet`) and story-pipeline-task-type consumers — story-local IDs must be filtered before assembly, with the documented warning emitted. The test surface is the mechanical proof that the contract holds for every story-local class the filter pattern covers.
4. FOUNDATIONS principle: §Story Bundles §3 (Read Discipline) — story-local records load through `story_slug`-scoped tools, not as world-scope context-packet seeds. Test coverage of additional seed types hardens the discipline by mechanically rejecting regressions that would silently widen the world-scope seed surface to include story-local IDs.

## Architecture Check

1. Test-only extension is the minimum change closing the audit gap. The filter logic at `get-context-packet.ts` already covers PG / BEL / SE (no production-code change needed); only the test surface is missing the per-class proofs. Alternative — refactoring the test to parametrize over all 20 covered classes — was rejected as over-engineering for a 3-case extension; if future regressions surface drift on additional classes, parametrization can land then.
2. No backwards-compatibility aliasing/shims introduced; tests append to the existing file in the existing helper-function shape established by SPEC-35 D3.

## Verification Layers

1. All three new seed types (PG / BEL / SE) trigger the `story_local_seed_nodes_ignored` warning → schema validation / unit test: each new test asserts the warning array contains the expected code and the world-canon seed (CF-1) is preserved.
2. The existing SF / STENT coverage continues to pass under the same test harness → regression check: full `npm test` in `tools/world-mcp/`.
3. Single-layer ticket targeting one test file; no cross-skill or schema invariants to verify beyond the three new cases passing.

## What to Change

### 1. Append three new test cases to `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`

Following the existing SF / STENT pattern, add:

- `get_context_packet_ignores_pg_seed_nodes` — supply `seed_nodes: ["PG-1", "CF-1"]`; assert PG-1 is filtered out of the assembled seed set; CF-1 is preserved; the response warnings array contains `story_local_seed_nodes_ignored`.
- `get_context_packet_ignores_bel_seed_nodes` — supply `seed_nodes: ["BEL-1", "CF-1"]`; assert BEL-1 is filtered out; CF-1 is preserved; warning emitted.
- `get_context_packet_ignores_se_seed_nodes` — supply `seed_nodes: ["SE-1", "CF-1"]`; assert SE-1 is filtered out; CF-1 is preserved; warning emitted.

Use the same fixture-building helpers, task-type setup, and assertion shape as the existing SF / STENT tests. Match the assertion granularity (warning name + seed-set composition) to the existing tests; no new helper functions required.

## Files to Touch

- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify)

## Out of Scope

- Production-code changes to `tools/world-mcp/src/tools/get-context-packet.ts`. The filter pattern already covers PG / BEL / SE among the 20 story-local types; only test coverage is added.
- Parametrized coverage over all 20 story-local classes (OBL / CNSQ / THR / SREL / STINT / STSTAT / STLOC / STOBJ / BR / CHC / SLT / SLB / SAU / SP / RSP). If future audits flag specific-class drift, those classes can be added one-at-a-time.
- Schema or contract changes to the `story_local_seed_nodes_ignored` warning shape.

## Acceptance Criteria

### Tests That Must Pass

1. The three new test cases (`get_context_packet_ignores_pg_seed_nodes`, `get_context_packet_ignores_bel_seed_nodes`, `get_context_packet_ignores_se_seed_nodes`) pass under `npm run build && npm test` in `tools/world-mcp/`.
2. All existing tests in `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` continue to pass (no regression).
3. Full `npm test` in `tools/world-mcp/` is green.

### Invariants

1. The story-local seed filter at `get-context-packet.ts:29-30` rejects every PG / BEL / SE seed supplied alongside world-canon seeds, preserving the world-canon seeds and emitting the `story_local_seed_nodes_ignored` warning.
2. The test file's existing SF / STENT cases continue to assert the same invariants under the same warning name.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — append three new test cases per the change list above; do not modify existing SF / STENT cases.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js` — targeted test-file run.
2. `cd tools/world-mcp && npm test` — full-suite proof.
