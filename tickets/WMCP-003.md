# WMCP-003: Implement `mcp__worldloom__get_record_schema` introspection tool

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new MCP tool in `tools/world-mcp/`; reference in `canon-addition/references/retrieval-tool-tree.md` to lose the "as a one-time discovery call" framing once it ships
**Deps**: None (independent of WMCP-001 and WMCP-002, but conceptually adjacent)

## Problem

`canon-addition/references/retrieval-tool-tree.md` §Phase 0-2 line 14 instructs operators to call `mcp__worldloom__get_record_schema(node_type)` "as a one-time discovery call when the record class is unfamiliar. Use it before drafting or repairing records whose constraints are easy to misremember, such as `pre_figured_by`'s `CF-NNNN` pattern." The tool is NOT registered in the world-mcp server (verified via ToolSearch enumeration during the canon-addition session that produced PA-0001).

When the operator drafts a CF record and needs to confirm a less-obvious field constraint (e.g., `pre_figured_by` accepts `CF-NNNN` ids only; `derived_from` accepts `CF-NNNN | DA-NNNN`; `modification_history[].originating_cf` accepts `CF-NNNN | none_clarification_retcon`), they must instead read JSON schemas under `tools/validators/src/schemas/` directly. This is fine but slower; a structured introspection call is the kind of "structured read API" the §Machine-Facing Layer commitment names.

## Assumption Reassessment (2026-05-01)

1. The current MCP tool registration does not include `get_record_schema`; the deployed `mcp__worldloom__*` enumeration covers `get_record`, `get_record_field`, `list_records`, `find_named_entities`, `search_nodes`, `get_neighbors`, `find_sections_touched_by`, `find_impacted_fragments`, `get_canonical_vocabulary`, `get_context_packet`, `validate_patch_plan`, `submit_patch_plan`, `allocate_next_id` — but not `get_record_schema`.
2. The authored-record schemas live at `tools/validators/src/schemas/canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `invariant.schema.json`, `section.schema.json`, `entity.schema.json`, `character-frontmatter.schema.json`, `diegetic-artifact-frontmatter.schema.json`, `adjudication-frontmatter.schema.json`, plus `_shared/extension-entry.schema.json`. The TypeScript types live at `tools/world-index/src/schema/types.ts` (exported via `tools/world-index/src/public/types.ts`).
3. Cross-skill shared boundary: `get_record_schema` is consumed by canon-addition, create-base-world, character-generation, diegetic-artifact-generation, and any other skill drafting structured records.
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 2 ("Retrieval MCP Server — structured read API over the world index"). The schema-introspection tool is part of the read API; not shipping it leaves a documented retrieval surface absent.
6. Schema extension shape: this ticket exposes existing JSON schemas via a new MCP tool. No CF / CH / proposal / dossier / artifact schema is changed.
7. Adjacent contradictions: WMCP-001 (`describe_envelope_schema`) is a sibling ticket covering the envelope-and-op-payload introspection; WMCP-003 covers the authored-record-schema introspection. The two are complementary — WMCP-001 returns transport-layer schemas, WMCP-003 returns content-layer schemas — and neither subsumes the other.

## Architecture Check

1. A dedicated record-schema introspection tool is cleaner than asking operators to read JSON schema files directly, because the JSON schemas live under `tools/validators/` (a different package from `tools/world-mcp/`) and may move during refactors. The MCP tool gives operators a stable contract regardless of internal validator package layout.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Tool registration exists -> codebase grep-proof: `grep -n 'get_record_schema' tools/world-mcp/src/`.
2. Tool returns correct schema for each supported `node_type` -> manual MCP call dry-run for each: `mcp__worldloom__get_record_schema({node_type: 'canon_fact_record'})` returns the JSON schema content of `canon-fact-record.schema.json`; similar for each of the eleven schemas.
3. Tool returns helpful error for unsupported `node_type` -> dry-run with an unknown value; expect `InputValidationError`.

## What to Change

### 1. New MCP tool registration

Add `tools/world-mcp/src/tools/get-record-schema.ts` exporting a handler that loads and returns JSON-schema content from `tools/validators/src/schemas/`. Register the tool in `tools/world-mcp/src/server.ts` with the input schema:

```ts
{
  node_type: "canon_fact_record" | "change_log_entry" | "invariant_record"
           | "mystery_reserve_entry" | "open_question_record"
           | "named_entity_record" | "section_record"
           | "character_dossier" | "diegetic_artifact_frontmatter"
           | "adjudication_frontmatter" | "extension_entry"
}
```

### 2. Output shape

```ts
{
  node_type: "canon_fact_record",
  schema: {/* full JSON schema content */},
  required_fields: [/* extracted from schema.required */],
  conditional_blocks: {/* e.g., epistemic_profile / exception_governance taxonomy from record-schema-compliance.ts */}
}
```

The `conditional_blocks` field surfaces taxonomy-driven required-block rules that aren't expressible in plain JSON Schema (e.g., `requiresEpistemicProfile(cf.type)` semantics) — without it, operators reading only the JSON schema might miss why their CF fails `record_schema_compliance` validation. Source the block list from `tools/validators/src/structural/record-schema-compliance.ts` `EPISTEMIC_PROFILE_REQUIRED_TYPES` / `EXCEPTION_GOVERNANCE_REQUIRED_TYPES`.

### 3. Remove the "one-time discovery call" caveat from the skill prose

After the tool ships, edit `canon-addition/references/retrieval-tool-tree.md` line 14 to drop the "as a one-time discovery call when the record class is unfamiliar" hedge — the call becomes a routine pre-flight option for any structured-record draft.

## Files to Touch

- `tools/world-mcp/src/tools/get-record-schema.ts` (new)
- `tools/world-mcp/src/server.ts` (modify — register the tool)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify only if exporting `EPISTEMIC_PROFILE_REQUIRED_TYPES` / `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` requires a public-API change)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — drop the discovery-call hedge)

## Out of Scope

- Changing any authored-record JSON schema (this ticket exposes the existing schemas; it does not alter them).
- Implementing `describe_envelope_schema` (sibling ticket WMCP-001).
- Extending `get_canonical_vocabulary` enum coverage (sibling ticket WMCP-002).

## Acceptance Criteria

### Tests That Must Pass

1. The tool returns a complete JSON schema for each of the eleven supported `node_type` values.
2. The `conditional_blocks` field correctly enumerates the `EPISTEMIC_PROFILE_REQUIRED_TYPES` and `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` taxonomies for `canon_fact_record`.
3. Calling with an unsupported `node_type` returns `InputValidationError`.

### Invariants

1. The schema returned matches the on-disk JSON schema content byte-for-byte; no manual mirroring or drift-prone copies.
2. The `conditional_blocks` field is sourced from the validator module's exported constants; no hand-maintained duplicate.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/get-record-schema.test.ts` (new) — exercises each `node_type`; asserts schema content matches the file under `tools/validators/src/schemas/`.

### Commands

1. `pnpm --filter @worldloom/world-mcp test`.
2. Dry-run MCP call: `mcp__worldloom__get_record_schema({node_type: 'canon_fact_record'})` — output matches `tools/validators/src/schemas/canon-fact-record.schema.json` content.
