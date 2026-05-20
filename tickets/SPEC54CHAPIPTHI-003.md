# SPEC54CHAPIPTHI-003: Expose NCP/NCB via get_record_schema

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (`get-record-schema` node-type support + map) + its test. The `server.ts` capability enum is derived from the supported-types constant and updates automatically.
**Deps**: None

## Problem

SPEC-53 added `get_record`/`list_records` hybrid support for `character_proposal_card` / `character_proposal_batch`, and `list_records` error guidance tells callers to consult the record schema — but `get_record_schema`'s `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` (and the `server.ts` capability enum derived from it) omit both proposal types, even though their JSON schemas exist in `tools/validators/src/schemas/`. The describe surface is asymmetric with the retrieve surface SPEC-53 landed. SPEC-54 Phase 3.

## Assumption Reassessment (2026-05-20)

1. `tools/world-mcp/src/tools/get-record-schema.ts` — confirmed `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` (lines 13–47) lacks `character_proposal_card` / `character_proposal_batch`; `NODE_TYPE_TO_SCHEMA_FILE` (lines 64–98) maps node types to schema filenames (e.g., `character_record` → `character-frontmatter.schema.json`); `validatorsSchemaRoot()` (lines 128–129) resolves `tools/validators/src/schemas/` via a repo-root walk; `getRecordSchema()` loads `join(schemaRoot, NODE_TYPE_TO_SCHEMA_FILE[node_type])`. The parametrized "every supported node type" test exercises each entry.
2. SPEC-54 Phase 3. The two schema files `character-proposal-card.schema.json` + `character-proposal-batch.schema.json` exist in `tools/validators/src/schemas/` (confirmed). `server.ts`'s `get_record_schema` capability enum is registered as `{ node_type: SUPPORTED_RECORD_SCHEMA_NODE_TYPES }` — derived from the constant, so it picks up the additions with no separate `server.ts` edit.
3. Cross-artifact boundary under audit: `get_record_schema` is the MCP describe surface; this completes the asymmetry with the `get_record`/`list_records` retrieve surface SPEC-53 landed. The schema files are owned by `tools/validators`; `get-record-schema` reads them cross-package via the existing, sanctioned `validatorsSchemaRoot()` mechanism (no boundary violation).
4. FOUNDATIONS §Canonical Storage Layer — Read discipline (hybrid records retrievable; schema-backed describe surface). Making `get_record_schema` symmetric with `get_record`/`list_records` for the proposal types aligns with the documented read discipline.

## Architecture Check

1. Purely additive — two `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` values + two `NODE_TYPE_TO_SCHEMA_FILE` entries. Reuses the existing repo-root-walk resolution; no new mechanism, no new schema-loading path. The parametrized test validates the additions automatically.
2. No backwards-compatibility aliasing/shims.

## Verification Layers

1. `get_record_schema(character_proposal_card)` returns the `character-proposal-card.schema.json` payload (no error code) -> MCP tool test.
2. `get_record_schema(character_proposal_batch)` returns the `character-proposal-batch.schema.json` payload -> MCP tool test.
3. Server capability enum advertises both node types -> parametrized "every supported node type" test (derived enum).

## What to Change

### 1. Node-type support + schema-file map

In `tools/world-mcp/src/tools/get-record-schema.ts`, add `"character_proposal_card"` and `"character_proposal_batch"` to `SUPPORTED_RECORD_SCHEMA_NODE_TYPES`, and add the corresponding `NODE_TYPE_TO_SCHEMA_FILE` entries pointing at `"character-proposal-card.schema.json"` and `"character-proposal-batch.schema.json"`.

### 2. Test

In `tools/world-mcp/tests/tools/get-record-schema.test.ts`, add explicit assertions that both node types resolve (no error code; `source_path` ends in the expected schema filename). The existing parametrized "every supported node type" test will also exercise them and would fail loudly if a mapped schema file could not be loaded.

## Files to Touch

- `tools/world-mcp/src/tools/get-record-schema.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify)

## Out of Scope

- A new MCP task type, ranking profile, token budget, or context-packet entry (deferred per SPEC-52/SPEC-53).
- Any change to `get_record`/`list_records` hybrid behavior (landed in SPEC-53).
- Any edit to `server.ts` (the capability enum is derived from the supported-types constant).

## Acceptance Criteria

### Tests That Must Pass

1. `get_record_schema({ node_type: "character_proposal_card" })` and `({ node_type: "character_proposal_batch" })` each return their schema payload with `source_path` = `tools/validators/src/schemas/<file>`.
2. The parametrized "every supported node type" test passes with the two new entries.
3. `npm test --prefix tools/world-mcp` passes.

### Invariants

1. Schema resolution uses the existing `validatorsSchemaRoot()` mechanism — no hardcoded absolute paths.
2. The `server.ts` capability enum stays derived from `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` (no divergent hardcoded list).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — explicit NCP/NCB resolution assertions.

### Commands

1. `npm test --prefix tools/world-mcp`
