# WMCP-003: Implement `mcp__worldloom__get_record_schema` introspection tool

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — completed the already-shipped MCP tool in `tools/world-mcp/`; exported validator taxonomy constants through `@worldloom/validators`; updated machine-facing docs and canon-addition retrieval guidance
**Deps**: None (independent of archived siblings `archive/tickets/WMCP-001.md` and `archive/tickets/WMCP-002.md`, but conceptually adjacent)

## Problem

At intake, `canon-addition/references/retrieval-tool-tree.md` §Phase 0-2 line 14 instructed operators to call `mcp__worldloom__get_record_schema(node_type)` "as a one-time discovery call when the record class is unfamiliar. Use it before drafting or repairing records whose constraints are easy to misremember, such as `pre_figured_by`'s `CF-NNNN` pattern." The current checkout and deployed MCP connector now include a `get_record_schema` tool, but its response omits the `required_fields` and canon-safety conditional taxonomy metadata needed for routine structured-record drafting.

When the operator drafts a CF record and needs to confirm a less-obvious field constraint (e.g., `pre_figured_by` accepts `CF-NNNN` ids only; `derived_from` accepts `CF-NNNN | DA-NNNN`; `modification_history[].originating_cf` accepts `CF-NNNN | none_clarification_retcon`), the existing tool already returns the on-disk JSON schema. The remaining gap is that operators still must know that `record_schema_compliance` adds taxonomy-driven `epistemic_profile` / `exception_governance` requirements outside plain JSON Schema. Surfacing those exported validator constants through `get_record_schema` makes the retrieval API complete enough for routine pre-flight use.

## Assumption Reassessment (2026-05-01)

1. The current MCP tool registration already includes `get_record_schema`: `tools/world-mcp/src/tool-names.ts` lists `MCP_TOOL_NAMES.get_record_schema`, `tools/world-mcp/src/server.ts` registers it with `SUPPORTED_RECORD_SCHEMA_NODE_TYPES`, and the active MCP connector's `describe_capabilities` reports `mcp__worldloom__get_record_schema`.
2. The authored-record schemas live at `tools/validators/src/schemas/canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `invariant.schema.json`, `section.schema.json`, `entity.schema.json`, `character-frontmatter.schema.json`, `diegetic-artifact-frontmatter.schema.json`, `adjudication-frontmatter.schema.json`, plus `_shared/extension-entry.schema.json`. The live `get_record_schema` enum currently uses the source node-type names `invariant`, `mystery_reserve_entry`, `open_question_entry`, `named_entity`, `section`, `character_record`, `diegetic_artifact_record`, and `adjudication_record`; this ticket does not add alias names such as `invariant_record` or `section_record`.
3. Cross-skill shared boundary: `get_record_schema` is consumed by canon-addition, create-base-world, character-generation, diegetic-artifact-generation, and any other skill drafting structured records.
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 2 ("Retrieval MCP Server — structured read API over the world index"). The schema-introspection tool is part of the read API; the remaining work is to finish the tool's content-layer response rather than create the tool from scratch.
5. Schema extension shape: this ticket exposes existing JSON schemas via the MCP tool. No CF / CH / proposal / dossier / artifact schema is changed.
6. Conditional-block source: `tools/validators/src/structural/record-schema-compliance.ts` already exports `EPISTEMIC_PROFILE_REQUIRED_TYPES` and `EXCEPTION_GOVERNANCE_REQUIRED_TYPES`, but they are not yet exposed through the package-public `@worldloom/validators` entrypoint or surfaced by `get_record_schema`.
7. Adjacent contradictions: WMCP-001 (`describe_envelope_schema`) and WMCP-002 (`get_canonical_vocabulary`) are archived sibling tickets. Neither sibling is absorbed here; WMCP-003 owns only record-schema introspection response completeness and canon-addition prose alignment.

## Architecture Check

1. A dedicated record-schema introspection tool is cleaner than asking operators to read JSON schema files directly, because the JSON schemas live under `tools/validators/` (a different package from `tools/world-mcp/`) and may move during refactors. The MCP tool gives operators a stable contract regardless of internal validator package layout.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Tool registration exists -> codebase grep-proof and package-local MCP dispatch test: `tools/world-mcp/tests/server/dispatch.test.ts`.
2. Tool returns correct schema for each supported `node_type` -> handler test: `tools/world-mcp/tests/tools/get-record-schema.test.ts` asserts parsed schema content matches the source JSON file for all eleven node types.
3. Tool returns helpful error for unsupported `node_type` -> handler test asserts the existing `invalid_input` payload; server-boundary invalid input remains covered by `tools/world-mcp/tests/server/dispatch.test.ts`.

## What to Change

### 1. Existing MCP tool completion

Complete `tools/world-mcp/src/tools/get-record-schema.ts` so the existing handler loads and returns JSON-schema content from `tools/validators/src/schemas/`, including the shared extension-entry schema. Preserve the existing registered node-type names and add `extension_entry`:

```ts
{
  node_type: "canon_fact_record" | "change_log_entry" | "invariant"
           | "mystery_reserve_entry" | "open_question_entry"
           | "named_entity" | "section" | "character_record"
           | "diegetic_artifact_record" | "adjudication_record"
           | "extension_entry"
}
```

### 2. Output shape

```ts
{
  node_type: "canon_fact_record",
  schema: {/* full JSON schema content */},
  source_path: "tools/validators/src/schemas/canon-fact-record.schema.json",
  referenced_schemas: {/* transitive $ref schemas keyed by $id */},
  required_fields: [/* extracted from schema.required */],
  conditional_blocks: {/* e.g., epistemic_profile / exception_governance taxonomy from record-schema-compliance.ts */}
}
```

The `conditional_blocks` field surfaces taxonomy-driven required-block rules that aren't expressible in plain JSON Schema (e.g., `requiresEpistemicProfile(cf.type)` semantics) — without it, operators reading only the JSON schema might miss why their CF fails `record_schema_compliance` validation. Source the block list from `tools/validators/src/structural/record-schema-compliance.ts` `EPISTEMIC_PROFILE_REQUIRED_TYPES` / `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` via the package-public validators entrypoint.

### 3. Remove the "one-time discovery call" caveat from the skill prose

Edited `canon-addition/references/retrieval-tool-tree.md` line 14 to drop the "as a one-time discovery call when the record class is unfamiliar" hedge. The call is now documented as a routine pre-flight option for structured-record drafts and repairs.

## Files to Touch

- `tools/world-mcp/src/tools/get-record-schema.ts` (modified — complete response shape and add `extension_entry`)
- `tools/validators/src/public/index.ts` (modify — export `EPISTEMIC_PROFILE_REQUIRED_TYPES` / `EXCEPTION_GOVERNANCE_REQUIRED_TYPES`)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modified — handler proof)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modified — MCP boundary proof)
- `tools/world-mcp/README.md` (modified — tool response contract)
- `docs/MACHINE-FACING-LAYER.md` (modified — retrieval tool contract)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — drop the discovery-call hedge)

## Out of Scope

- Changing any authored-record JSON schema (this ticket exposes the existing schemas; it does not alter them).
- Implementing `describe_envelope_schema` (sibling ticket WMCP-001).
- Extending `get_canonical_vocabulary` enum coverage (archived sibling `archive/tickets/WMCP-002.md`).

## Acceptance Criteria

### Tests That Must Pass

1. The tool returns a complete JSON schema for each of the eleven supported `node_type` values.
2. The `conditional_blocks` field correctly enumerates the `EPISTEMIC_PROFILE_REQUIRED_TYPES` and `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` taxonomies for `canon_fact_record`.
3. Calling with an unsupported `node_type` returns the existing MCP `invalid_input` error payload or MCP input-validation error at the server boundary.

### Invariants

1. The schema returned matches the parsed on-disk JSON schema content; no manual mirroring or drift-prone copies.
2. The `conditional_blocks` field is sourced from the validator module's exported constants; no hand-maintained duplicate.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify) — exercises each `node_type`; asserts schema content matches the file under `tools/validators/src/schemas/`, including `extension_entry`, `required_fields`, and conditional blocks.
2. `tools/world-mcp/tests/server/dispatch.test.ts` (modify) — asserts `get_record_schema` dispatches through the MCP boundary for every registered node type and that `describe_capabilities` reports the full node-type enum.

### Commands

1. `cd tools/validators && npm run build`.
2. `cd tools/world-mcp && npm run build`.
3. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`.
4. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`.
5. `cd tools/world-mcp && npm test`.
6. Direct MCP current-state smoke: `mcp__worldloom__get_record_schema({node_type: 'canon_fact_record'})` before rebuild confirms the deployed tool exists; package-local tests are the truthful post-source-change proof until the MCP server is rebuilt and restarted.

## Outcome

Completed. The already-shipped `mcp__worldloom__get_record_schema` tool now returns the fuller record-schema introspection payload:

- `node_type`
- `schema`
- `source_path`
- `referenced_schemas`
- `required_fields`
- `conditional_blocks`

The supported `node_type` enum now includes `extension_entry` for `tools/validators/src/schemas/_shared/extension-entry.schema.json`. For `canon_fact_record`, `conditional_blocks` reports the `epistemic_profile` and `exception_governance` required-type taxonomies sourced from `record_schema_compliance` via the package-public `@worldloom/validators` entrypoint.

The canon-addition retrieval tree, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` now describe the routine pre-flight contract instead of treating the tool as a one-time unfamiliar-schema discovery call.

No authored record JSON schema, world content, approval-token behavior, submit ordering, or pre-apply validation gate was changed.

## Verification Result

Completed in this implementation pass:

1. `cd tools/validators && npm run build` — pass.
2. `cd tools/world-mcp && npm run build` — pass.
3. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js` — pass.
4. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — pass.
5. `cd tools/world-mcp && npm test` — pass; 241 tests passed.
6. Direct current-state MCP smoke before source edits: `mcp__worldloom__describe_capabilities()` and `mcp__worldloom__get_record_schema({node_type: "canon_fact_record"})` confirmed the deployed server already exposed the older `get_record_schema` tool and response shape.

Ignored/generated artifact state after verification is expected package state under `tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

The drafted ticket expected a brand-new tool implementation. Live reassessment found the tool already registered in source and in the active MCP connector, with existing handler, list-tools, dispatch, README, and machine-facing docs coverage. The active implementation therefore completed the response shape and coverage rather than creating the tool from scratch.

The ticket draft named alias-like node types such as `invariant_record`, `open_question_record`, `named_entity_record`, `section_record`, `character_dossier`, `diegetic_artifact_frontmatter`, and `adjudication_frontmatter`. The live tool already used source node-type names such as `invariant`, `open_question_entry`, `named_entity`, `section`, `character_record`, `diegetic_artifact_record`, and `adjudication_record`. This ticket preserved the live names and added only `extension_entry`, avoiding backwards-compatibility aliasing.

The active Codex MCP connector was not restarted after the source rebuild, so post-change acceptance uses package-local handler and in-memory MCP dispatch proof. A restarted MCP server will expose the new `extension_entry`, `required_fields`, and `conditional_blocks` contract through `describe_capabilities` and `get_record_schema`.
