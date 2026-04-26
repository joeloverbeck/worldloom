# SPEC16MCPRETSUR-002: `get_record_schema` discovery tool

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small-Medium
**Engine Changes**: Yes — adds new MCP tool `mcp__worldloom__get_record_schema` to `@worldloom/world-mcp`; no impact on existing tools.
**Deps**: None

## Problem

`mcp__worldloom__get_canonical_vocabulary({class})` returns enum values for a few canonical fields (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`). There is no parallel tool for **record-shape contracts**: field names, types, optional/required, regex patterns. A skill author who wants to know "what fields can a CF have? what regex constrains `pre_figured_by`?" must read TypeScript source (`tools/world-index/src/schema/types.ts`), JSON Schema files (`tools/validators/src/schemas/canon-fact-record.schema.json`), or submit a draft and parse the validation failure messages. Live evidence: the 2026-04-26 PR-0015 run hit a `record_schema_compliance.pattern` failure for `pre_figured_by/0` precisely because the field's regex constraint was undiscoverable via MCP. Adding a structural-schema retrieval surface closes that gap.

## Assumption Reassessment (2026-04-26)

1. The 10 schema files referenced by this ticket all exist under `tools/validators/src/schemas/`: `canon-fact-record.schema.json`, `change-log-entry.schema.json`, `invariant.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `entity.schema.json`, `section.schema.json`, `character-frontmatter.schema.json`, `diegetic-artifact-frontmatter.schema.json`, `adjudication-frontmatter.schema.json`. Confirmed via directory listing. The shared `tools/validators/src/schemas/_shared/extension-entry.schema.json` is referenced via `$ref` from `canon-fact-record` and `section` schemas.
2. `specs/SPEC-16-mcp-retrieval-surface-refinements.md` §Track C4 (Approach + Deliverables) is the source of truth. The 2026-04-26 reassessment (Issue I1) aligned the supported `node_type` values to the existing `NodeType` enum in `tools/world-index/src/schema/types.ts:6` — so the three frontmatter-schema entries use `character_record`, `diegetic_artifact_record`, `adjudication_record` (NOT `*_frontmatter`); the implementation maps these `node_type` values internally to the `*-frontmatter.schema.json` filenames. Issue I3 added the `referenced_schemas` map to the response shape so consumers can dereference `$ref` URLs without an additional MCP call.
3. Cross-skill boundary: tool registration touches `tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/src/server.ts` (also touched by SPEC16MCPRETSUR-001 — different tool keys, no merge conflict if reviewed sequentially). Registration also requires same-package server inventory/dispatch test updates in `tools/world-mcp/tests/server/list-tools.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` so the new tool is asserted-registered and dispatch-routable. The schema files live in a different package (`@worldloom/validators`); the tool reads them as data files, not as imports, preserving package-boundary discipline.
4. Schema extension: this ticket extends the **read API** (a new tool), not an existing output schema. No CF/CH/M/OQ schema fields change; no consumer-side updates required. Additive-only.

## Architecture Check

1. Reading schema files as data (rather than importing TypeScript types) keeps the package boundary clean — `world-mcp` already consumes `validators` indirectly through patch-engine delegation; reading `validators/src/schemas/*.json` as data files is consistent with that posture and adds no new package dependency.
2. The `referenced_schemas` map preserves provenance (every schema returned with its `$id` URL) and avoids inlining `$ref` content in the primary schema, keeping the canonical-schema text byte-identical to the file on disk.
3. Mapping `character_record`/`diegetic_artifact_record`/`adjudication_record` to `*-frontmatter.schema.json` filenames internally lets skill authors pass the same `node_type` value they receive from `get_node`, `search_nodes`, etc., rather than learning a parallel naming scheme. The schema name divergence stays internal to this tool.
4. No backwards-compatibility shims. The tool is purely additive.

## Verification Layers

1. Tool registration → codebase grep-proof: `grep -n "get_record_schema" tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` returns matches in both files.
2. Schema file resolution → unit test: each of the 10 supported `node_type` values returns a schema whose `$id` matches the expected URL pattern.
3. `$ref` resolution → unit test: requesting the `canon_fact_record` or `section` schema returns a `referenced_schemas` map containing the `extension-entry` schema keyed by its `$id` URL.
4. NodeType-coupling → codebase grep-proof: `grep -nE "character_record|diegetic_artifact_record|adjudication_record" tools/world-mcp/src/tools/get-record-schema.ts` confirms the three frontmatter-schema cases are accepted under the canonical `NodeType` names.

## What to Change

### 1. New tool file `tools/world-mcp/src/tools/get-record-schema.ts`

Implement `getRecordSchema({ node_type }) → { schema, source_path, referenced_schemas } | McpError`.

- Maintain a `NODE_TYPE_TO_SCHEMA_FILE: Record<SupportedNodeType, string>` constant per the mapping table in §Track C4 of the spec.
- Load the schema file synchronously from disk on first request (or eagerly at module load — implementer's choice; an in-memory cache after first load is a §Risks open question, fine to defer).
- Walk the loaded schema for `$ref` strings. For each, resolve against `tools/validators/src/schemas/_shared/<stem>.schema.json` (currently only `extension-entry`); load and add to `referenced_schemas` keyed by the `$ref` URL. Empty `referenced_schemas` map when the schema has no `$ref` sites.
- Unknown `node_type` → `invalid_input` McpError listing the supported set.
- `source_path` is the relative path from repo root to the loaded schema file (for provenance).

### 2. Schema-name mapping table (in `get-record-schema.ts`)

| `node_type` | schema file |
|---|---|
| `canon_fact_record` | `canon-fact-record.schema.json` |
| `change_log_entry` | `change-log-entry.schema.json` |
| `invariant` | `invariant.schema.json` |
| `mystery_reserve_entry` | `mystery-reserve.schema.json` |
| `open_question_entry` | `open-question.schema.json` |
| `named_entity` | `entity.schema.json` |
| `section` | `section.schema.json` |
| `character_record` | `character-frontmatter.schema.json` |
| `diegetic_artifact_record` | `diegetic-artifact-frontmatter.schema.json` |
| `adjudication_record` | `adjudication-frontmatter.schema.json` |

### 3. Tool registration

`tools/world-mcp/src/tool-names.ts` — add `get_record_schema: "mcp__worldloom__get_record_schema"` to `MCP_TOOL_NAMES`; add to `MCP_TOOL_ORDER`.

`tools/world-mcp/src/server.ts` — declare a Zod input schema near `getRecordInputSchema`:

```ts
const getRecordSchemaInputSchema = z.object({
  node_type: z.enum([
    "canon_fact_record", "change_log_entry", "invariant",
    "mystery_reserve_entry", "open_question_entry", "named_entity",
    "section", "character_record", "diegetic_artifact_record",
    "adjudication_record"
  ])
});
```

Then register via `registerWrappedTool` (follow the pattern of `get_record`).

### 4. Test file `tools/world-mcp/tests/tools/get-record-schema.test.ts`

Cases:
- Each of the 10 supported `node_type` values returns a schema whose `$id` matches the expected file URL.
- `canon_fact_record` request returns a `referenced_schemas` map containing `extension-entry` keyed by `https://worldloom.local/schemas/extension-entry.schema.json`.
- `section` request returns the same `referenced_schemas` extension-entry entry.
- `mystery_reserve_entry` (no `$ref` sites) returns an empty `referenced_schemas` map.
- Unknown `node_type` (e.g., `"foo"`) → `invalid_input` McpError listing all 10 supported values.

## Files to Touch

- `tools/world-mcp/src/tools/get-record-schema.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (new)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — assert `mcp__worldloom__get_record_schema` in the registered-tools inventory)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — assert dispatch routes for the new tool)

## Out of Scope

- Computed-effective-schema mode (merging structural validators + rule-level constraints from FOUNDATIONS Rules 11/12). YAGNI until SPEC-09 lands and a skill needs the merged view.
- In-memory caching of schema files. Implementation may load on-demand; if profiling shows hot-path cost, add a startup-time cache via a follow-up. Not a release blocker.
- Field-slice retrieval (Track C3). Lives in SPEC16MCPRETSUR-001.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes after `get-record-schema.test.ts` is added.
2. Manual smoke: invoke `mcp__worldloom__get_record_schema("canon_fact_record")` and confirm (a) the response contains `properties.pre_figured_by.items.pattern` matching `^CF-[0-9]{4}$`, AND (b) `referenced_schemas` includes the `extension-entry` schema keyed by `https://worldloom.local/schemas/extension-entry.schema.json`.
3. Each of the 10 supported `node_type` values returns a schema whose `$id` matches the expected file.
4. `grep -nE "character_record|diegetic_artifact_record|adjudication_record" tools/world-mcp/src/tools/get-record-schema.ts` confirms the C4 tool accepts the canonical `NodeType` values for the three frontmatter-schema cases (catches future drift if `NodeType` is renamed without updating C4's mapping table).

### Invariants

1. The `node_type` parameter values are exactly the existing `NodeType` enum members for the supported subset; the three `_frontmatter` schema-file stems are an internal mapping detail, not part of the public surface.
2. `referenced_schemas` keys are `$id` URLs (verbatim from each schema's `"$id"` field), not relative file paths — provenance is URL-based.
3. The schema returned in `schema` is byte-identical to the file on disk (no inlining of `$ref` content in-place).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — covers all five test cases above.

### Commands

1. `cd tools/world-mcp && npm test` — full package test suite.
2. Smoke invocation through MCP after `cd tools/world-mcp && npm run build`.
