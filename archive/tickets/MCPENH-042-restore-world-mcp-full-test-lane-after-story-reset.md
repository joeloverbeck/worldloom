# MCPENH-042: Restore world-mcp full test lane after story-family reset

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes - `tools/world-mcp` schema-discovery surfaces, tests, capability metadata text, and machine-facing docs.
**Deps**: `archive/tickets/MCPENH-041-rename-legacy-story-pipeline-task-types.md`

## Problem

At intake, `cd tools/world-mcp && npm test` built, then failed 6 tests after the greenfield story-family reset. MCPENH-041 intentionally used a focused proof lane for the task-type rename, but the package-wide lane remained a broken handoff surface.

The failures were not caused by the task-type rename. They were stale package tests and schema surfaces still straddling the retired SPEC-22 ARC_TRACE/page-cycle family and the new BEL/no-ARC_TRACE story contract.

## Assumption Reassessment (2026-05-13)

1. `npm test` in `tools/world-mcp` runs `npm run build && node --test "dist/tests/**/*.test.js"`. On 2026-05-13 it rebuilt successfully and reported `# pass 348`, `# fail 6`.
2. The failing tests are concrete package-local proof-lane failures, not MCPENH-041 owned behavior. MCPENH-041's focused build, task-type/profile tests, MCP boundary rejection test, and grep proofs passed before archival.
3. The shared boundary under audit is `tools/world-mcp`'s public package test contract: MCP retrieval/schema/patch-plan handlers must expose the current story-bundle vocabulary while the full package test lane stays green.
4. The current `tools/world-mcp/tests/integration/spec22-capstone.test.ts` still reads deleted legacy skill files such as `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` and `.claude/skills/branching-story-page-cycle/SKILL.md`, and still asserts SPEC-22 ARC_TRACE behavior.
5. `tools/world-mcp/src/tools/get-record-schema.ts` and `tools/world-mcp/tests/tools/get-record-schema.test.ts` still expose `arc_trace_node` backed by missing `tools/validators/src/schemas/story-arc-trace.schema.json`; the validators package now has `story-belief.schema.json` instead.
6. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` expects `validatePatchPlan` to accept `create_bel_record` through pre-apply validation, but the current result is `fail` instead of `pass`. The validator verdict is fixture under-specification: `record_schema_compliance` requires `story_id`, `created_at_page`, `confidence`, `basis`, and `consequences` for `story-belief.schema.json`.
7. The greenfield plan at `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` explicitly says there is no ARC_TRACE class in the new family and that BEL is a day-one first-class record class.
8. This was a separate package-maintenance bug exposed by the MCPENH-041 review. It did not block the archived task-type rename, and this ticket restores `tools/world-mcp && npm test` as a clean broad proof lane for future tickets.
9. The live `tools/world-mcp` package still has passing legacy index-backed ARC_TRACE retrieval fixtures under `get_record`, `list_records`, and `search_nodes`; removing the underlying `world-index` ARC_TRACE storage/retrieval substrate would cross into a broader world-index migration and is out of scope here. This ticket owns removal of current schema-discovery support, docs that advertise ARC_TRACE as current schema/authoring guidance, stale capstone assertions, and validation fixtures that block the full package lane.

## Architecture Check

1. Repair the full package lane by aligning tests and public schema surfaces to the current story-bundle contract rather than reviving deleted legacy skills or ARC_TRACE schemas.
2. No backwards-compatibility aliases or shims should be introduced. If ARC_TRACE is retired for the greenfield family, remove it from current public schema enumeration instead of preserving it as a dead supported node type.

## Verification Layers

1. Full package lane restored -> `cd tools/world-mcp && npm test`.
2. Public schema vocabulary current -> focused get-record-schema tests prove BEL schema exposure and retired ARC_TRACE absence or explicit unsupported handling.
3. Patch-plan BEL pre-apply behavior current -> focused `validate-patch-plan` test proves `create_bel_record` produces `pass` when the generated plan is valid.
4. Greenfield story contract respected -> grep proof over `tools/world-mcp/src`, `tools/world-mcp/tests`, and current docs shows no current-contract dependency on deleted `.claude/skills/branching-story-page-cycle` or retired ARC_TRACE schema support.

## Landed Changes

### 1. Rewrote stale SPEC-22 capstone tests

`tools/world-mcp/tests/integration/spec22-capstone.test.ts` now proves the current greenfield story contract: retired `create_arc_trace_record` is rejected before validator delegation, BEL schema discovery is live, the retired ARC_TRACE schema is absent, and deleted legacy skill files are not required by capstone coverage.

### 2. Align record-schema support with BEL/no-ARC_TRACE

`tools/world-mcp/src/tools/get-record-schema.ts`, `tools/world-mcp/tests/tools/get-record-schema.test.ts`, `tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` now expose `belief_record` / `story-belief.schema.json` as the current schema-discovery surface and no longer advertise the missing ARC_TRACE schema.

### 3. Corrected the BEL pre-apply fixture

`tools/world-mcp/tests/tools/validate-patch-plan.test.ts` now supplies the required `story-belief.schema.json` fields for `create_bel_record`; pre-apply validation returns `pass` for the valid BEL plan.

## Files to Touch

- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (modify)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify public `get_record_schema` description)
- `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` (modify schema-discovery/current-authoring prose)

## Out of Scope

- Reintroducing `story-arc-trace.schema.json`.
- Recreating deleted legacy story skills as test fixtures.
- Changing MCPENH-041's renamed task-type contract.
- Broad story-family skill authoring outside the package test repair needed here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js dist/tests/tools/validate-patch-plan.test.js dist/tests/integration/spec22-capstone.test.js` passes.
3. Schema-discovery/current-authoring surfaces no longer advertise `story-arc-trace.schema.json` or `arc_trace_node`; intentional legacy rejection coverage and existing index-backed ARC_TRACE retrieval fixtures may remain outside this ticket's owned schema-discovery boundary.

### Invariants

1. `tools/world-mcp` does not expose missing validator schemas as supported public node types.
2. BEL story records are supported consistently across allocator, patch-plan validation, schema introspection, and tests.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` - remove or rewrite stale SPEC-22 assertions around deleted legacy skills and ARC_TRACE ingestion.
2. `tools/world-mcp/tests/tools/get-record-schema.test.ts` - prove current BEL schema exposure and retired ARC_TRACE handling.
3. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` - prove valid `create_bel_record` pre-apply validation.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js dist/tests/tools/validate-patch-plan.test.js dist/tests/integration/spec22-capstone.test.js`
3. `cd tools/world-mcp && npm test`

## Outcome

Restored the full `tools/world-mcp` package test lane after the story-family reset. `get_record_schema` now exposes BEL schema discovery instead of a missing ARC_TRACE schema, the server/package docs describe the current schema-discovery contract, the SPEC-22 capstone no longer depends on deleted legacy skills, and the BEL patch-plan validation fixture now satisfies the live schema.

No backwards-compatibility alias or retired ARC_TRACE schema shim was introduced.

## Verification Result

1. `cd tools/world-mcp && npm run build` - passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js dist/tests/tools/validate-patch-plan.test.js dist/tests/integration/spec22-capstone.test.js` - passed, 20 tests.
3. `cd tools/world-mcp && npm test` - passed, 351 tests.
4. `rg -n 'story-arc-trace.schema.json|arc_trace_node' tools/world-mcp/src/tools/get-record-schema.ts tools/world-mcp/src/server.ts tools/world-mcp/tests/tools/get-record-schema.test.ts tools/world-mcp/tests/integration/spec22-capstone.test.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` - returned only intentional negative assertions in `tools/world-mcp/tests/integration/spec22-capstone.test.ts`.
5. `rg -n 'belief_record|story-belief.schema.json|create_bel_record' tools/world-mcp/src/tools/get-record-schema.ts tools/world-mcp/src/server.ts tools/world-mcp/tests/tools/get-record-schema.test.ts tools/world-mcp/tests/tools/validate-patch-plan.test.ts tools/world-mcp/tests/integration/spec22-capstone.test.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` - returned the expected current BEL schema-discovery and validation hits.

## Deviations

The drafted acceptance wording implied a zero-hit ARC_TRACE sweep across all `tools/world-mcp` tests. Reassessment narrowed that to schema-discovery/current-authoring surfaces because passing legacy index-backed ARC_TRACE retrieval fixtures still exist in `get_record`, `list_records`, and `search_nodes`; removing the underlying `world-index` ARC_TRACE substrate is broader than this package-lane repair.
