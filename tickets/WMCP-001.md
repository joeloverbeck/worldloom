# WMCP-001: Implement `mcp__worldloom__describe_envelope_schema` introspection tool

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new MCP tool in `tools/world-mcp/`; references in `canon-addition/SKILL.md`, `canon-addition/references/engine-envelope-shape.md`, `create-base-world/SKILL.md`, `create-base-world/references/engine-envelope-shape.md` get to drop the "anticipated but not yet shipped" hedge
**Deps**: None

## Problem

Both `canon-addition/SKILL.md` Procedure step 7 and `create-base-world/references/engine-envelope-shape.md` §§1, 2 currently document `mcp__worldloom__describe_envelope_schema(op_kind?)` as the canonical authority for the deployed envelope and per-op payload shapes. The tool is NOT registered in the world-mcp server (verified via ToolSearch enumeration of `mcp__worldloom__*` tools during the canon-addition session that produced PA-0001).

When the operator runs canon-addition's Phase 13a patch-plan assembly, the prose directs them to query the introspection tool. With the tool absent, the operator must instead read TypeScript source files (`tools/patch-engine/src/envelope/schema.ts`, `tools/world-mcp/src/tools/_shared.ts`, `tools/validators/src/schemas/*.json`) directly, which is slower and leaks engine-internal detail into skill operation. The audit on canon-addition (this session) and a prior audit on create-base-world both flagged this as a HIGH-severity Issue 1; both audits applied stop-gap "anticipated but not yet shipped" framing as cascade edits across the four files cited above. Implementing the tool resolves both audits' Issue 1 cleanly and lets the cascade-edit hedges be removed.

## Assumption Reassessment (2026-05-01)

1. The current world-mcp tool registration (`tools/world-mcp/src/server.ts` and per-tool files under `tools/world-mcp/src/tools/`) does not include `describe_envelope_schema`; the deployed `mcp__worldloom__*` enumeration loaded into Claude Code at session start lists `validate_patch_plan` and `submit_patch_plan` for the patch-engine surface but no `describe_envelope_schema`.
2. The canonical envelope and per-op payload schemas live at `tools/patch-engine/src/envelope/schema.ts` (`PatchPlanEnvelope`, `PatchOperation`, `OPERATION_KINDS`, `IdAllocations`, `RetconAttestation`, `ExtensionPayload`) and the JSON schemas under `tools/validators/src/schemas/` (`canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `invariant.schema.json`, `section.schema.json`, `adjudication-frontmatter.schema.json`, `_shared/extension-entry.schema.json`).
3. Cross-skill shared boundary: the introspection tool is consumed by both `canon-addition` and `create-base-world` (Category 3 canon-mutating skills); future canon-mutating siblings would also consume it. The tool's output schema must remain stable across MCP-server upgrades, parallel to the rest of the `mcp__worldloom__*` retrieval surface.
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 2 ("Retrieval MCP Server — structured read API over the world index"). The introspection tool extends the read API from world-content retrieval to engine-contract retrieval; both are read operations against existing source-of-truth artifacts, fitting the "structured read API" framing.
6. Schema extension shape: this ticket exposes existing engine types via a new MCP tool. No CF / CH / proposal / dossier / artifact schema is changed. Consumers of the new tool's output are skill operators reading the introspection output during patch-plan assembly; no automated downstream consumer exists yet.
7. Adjacent contradictions: WMCP-002 and WMCP-003 are sibling tickets covering similar "anticipated but not shipped" tools (`get_canonical_vocabulary` enum coverage gap, `get_record_schema`); each is shippable independently.

## Architecture Check

1. Direct exposure of engine types via the MCP server is cleaner than asking each skill to read TypeScript source files; the engine source files are not stable at the line-number or filename level (they will move during refactors), so the MCP introspection tool gives operators a stable contract regardless of internal patch-engine changes.
2. No backwards-compatibility aliasing/shims introduced; this is a new tool added to the existing `mcp__worldloom__*` surface.

## Verification Layers

1. Tool registration exists -> codebase grep-proof: `grep -r 'describe_envelope_schema' tools/world-mcp/src/`.
2. Tool returns full envelope schema when called without `op_kind` -> manual MCP call dry-run: `mcp__worldloom__describe_envelope_schema()` returns the `PatchPlanEnvelope` interface and the `OPERATION_KINDS` union.
3. Tool returns per-op payload schema when called with `op_kind` -> manual MCP call dry-run for each op kind in `OPERATION_KINDS` (currently 14 kinds): `mcp__worldloom__describe_envelope_schema({op_kind: 'create_cf_record'})` returns the typed payload shape AND the relevant authored-record JSON schema (e.g., `canon-fact-record.schema.json`).
4. Skill prose alignment -> manual review: drop the "anticipated but not yet shipped" hedges in the four files cited under §Problem.

## What to Change

### 1. New MCP tool registration

Add `tools/world-mcp/src/tools/describe-envelope-schema.ts` exporting a handler that reads from `@worldloom/patch-engine` envelope types and `@worldloom/validators` JSON schemas. Register the tool in `tools/world-mcp/src/server.ts` with the input schema:

```ts
{
  op_kind?: "create_cf_record" | "create_ch_record" | "create_inv_record"
          | "create_m_record" | "create_oq_record" | "create_ent_record"
          | "create_sec_record" | "update_record_field" | "append_extension"
          | "append_touched_by_cf" | "append_modification_history_entry"
          | "append_adjudication_record" | "append_character_record"
          | "append_diegetic_artifact_record"
}
```

### 2. Output shape

When `op_kind` is omitted, return the full envelope contract:

```ts
{
  envelope_schema: {/* PatchPlanEnvelope JSON-schema-equivalent */},
  operation_kinds: [/* OPERATION_KINDS union members */],
  shared_payload_types: {
    RetconAttestation: {...},
    ExtensionPayload: {...},
    IdAllocations: {...}
  }
}
```

When `op_kind` is provided, return the per-op payload schema plus any authored-record schema embedded in the payload:

```ts
{
  op: "create_cf_record",
  required_envelope_fields: ["op", "target_world", "target_file", "payload"],
  payload_schema: {/* per-op typed-record key, e.g., cf_record */},
  authored_record_schema: {/* canon-fact-record.schema.json content, when applicable */}
}
```

### 3. Update skill prose to drop the "not yet shipped" hedges

After the tool ships, edit the four files identified in §Problem to remove the cascade-edit hedges added by the canon-addition and create-base-world audits:

- `canon-addition/SKILL.md` Procedure step 7: replace the source-of-truth note with a pointer to `mcp__worldloom__describe_envelope_schema`.
- `canon-addition/references/engine-envelope-shape.md` preamble: same.
- `create-base-world/references/engine-envelope-shape.md` §§1, 2 (three sites currently hedged): same.
- `create-base-world/SKILL.md` step 4 (if it references the tool): same.

## Files to Touch

- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (new)
- `tools/world-mcp/src/server.ts` (modify — register the tool)
- `tools/world-mcp/src/tools/_shared.ts` (modify if shared input-validation utilities are added)
- `.claude/skills/canon-addition/SKILL.md` (modify — drop hedge in Procedure step 7)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify — drop hedge in preamble)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify — drop hedges in §§1, 2)
- `.claude/skills/create-base-world/SKILL.md` (modify — only if it currently references the tool name)

## Out of Scope

- Changing any existing engine type or JSON schema (the tool exposes existing contracts; it does not alter them).
- Implementing `get_record_schema` (sibling ticket WMCP-003).
- Extending `get_canonical_vocabulary` enum coverage (sibling ticket WMCP-002).

## Acceptance Criteria

### Tests That Must Pass

1. New tool registers correctly: `grep -n 'describe_envelope_schema' tools/world-mcp/src/server.ts` shows the registration.
2. Calling the tool without `op_kind` returns a complete envelope-schema object including all fields enumerated in `tools/patch-engine/src/envelope/schema.ts` `PatchPlanEnvelope`.
3. Calling the tool for each `op_kind` in `OPERATION_KINDS` returns a payload schema that round-trips against the actual op type — i.e., a valid op constructed from the schema passes `validatePatchPlanEnvelopeShape` and `validate_patch_plan`.
4. The four skill files have their hedges removed after this ticket lands.

### Invariants

1. The introspection tool is read-only; it must not mutate engine state, world content, or the index.
2. The schema returned must match the deployed engine types byte-for-byte; no manual mirroring or drift-prone copies.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/describe-envelope-schema.test.ts` (new) — exercises both no-`op_kind` and per-`op_kind` branches, asserts schema completeness against `@worldloom/patch-engine` exports.
2. Skill-prose grep-proof — `grep -rn 'anticipated but not yet shipped' .claude/skills/canon-addition/ .claude/skills/create-base-world/` returns 0 hits after the prose update.

### Commands

1. `pnpm --filter @worldloom/world-mcp test` (or the project-equivalent test runner).
2. Manual MCP call: `mcp__worldloom__describe_envelope_schema()` in a Claude Code session — output must include the full envelope shape.
3. Manual MCP call per op kind: `mcp__worldloom__describe_envelope_schema({op_kind: 'create_cf_record'})` and similar for the other 13 op kinds.
