# WMCP-001: Implement `mcp__worldloom__describe_envelope_schema` introspection tool

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — existing MCP tool in `tools/world-mcp/` verified; references in `canon-addition/SKILL.md`, `canon-addition/references/engine-envelope-shape.md`, `create-base-world/SKILL.md`, `create-base-world/references/engine-envelope-shape.md` now drop the "anticipated but not yet shipped" hedge
**Deps**: None

## Problem

At intake, both `canon-addition/SKILL.md` Procedure step 7 and `create-base-world/references/engine-envelope-shape.md` §§1, 2 needed `mcp__worldloom__describe_envelope_schema(op_kind?)` as the canonical operational introspection path for the deployed envelope and per-op payload shapes, but the docs/skills still carried "anticipated but not yet shipped" hedge text from earlier audits.

Reassessment found that the MCP tool implementation, registration, package docs, and package tests had already landed before this ticket run. The remaining defect was stale cross-skill prose that still told operators to fall back to source-file reading instead of querying the deployed MCP tool. This ticket therefore closed as a validation-and-prose-alignment slice rather than a new handler implementation.

## Assumption Reassessment (2026-05-01)

1. The current world-mcp source already includes `describe_envelope_schema`: `tools/world-mcp/src/tools/describe-envelope-schema.ts` implements `describeEnvelopeSchema`, `tools/world-mcp/src/tool-names.ts` includes `MCP_TOOL_NAMES.describe_envelope_schema`, and `tools/world-mcp/src/server.ts` registers it with `op_kind: z.enum(OPERATION_KINDS).optional()`.
2. The canonical envelope and per-op payload contracts are exposed operationally through `describeEnvelopeSchema`, with source references to `tools/patch-engine/src/envelope/schema.ts`, `tools/world-mcp/src/tools/_shared.ts`, and JSON schemas under `tools/validators/src/schemas/`. The live response shape is `tool_names`, `source_paths`, `envelope_schema`, `op_schemas`, and `referenced_schemas`.
3. Cross-skill shared boundary: the introspection tool is consumed by both `canon-addition` and `create-base-world` (Category 3 canon-mutating skills); future canon-mutating siblings would also consume it. The tool's output schema must remain stable across MCP-server upgrades, parallel to the rest of the `mcp__worldloom__*` retrieval surface.
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 2 ("Retrieval MCP Server — structured read API over the world index"). The introspection tool extends the read API from world-content retrieval to engine-contract retrieval; both are read operations against existing source-of-truth artifacts, fitting the "structured read API" framing.
5. HARD-GATE / validation-signal check: this ticket surfaces envelope and payload schemas for `validate_patch_plan` / `submit_patch_plan` assembly but does not alter approval-token behavior, submit ordering, pre-apply validation, or canon-write gates. `docs/HARD-GATE-DISCIPLINE.md` still requires explicit user approval, plan-bound tokens, validation before submit, and engine-only patch application.
6. Schema extension shape: this ticket exposes existing engine contracts via MCP introspection. No CF / CH / proposal / dossier / artifact schema is changed. Consumers of the new tool's output are skill operators reading the introspection output during patch-plan assembly.
7. Adjacent contradictions: WMCP-002 and WMCP-003 remain sibling tickets covering similar tool-surface cleanup (`get_canonical_vocabulary` enum coverage gap, `get_record_schema`). Neither sibling is absorbed here.
8. Mismatch correction: the drafted source implementation tasks were already complete in the live repo, including `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`, `tests/server/list-tools.test.ts`, and `tests/server/dispatch.test.ts`. The active owned delta narrowed to verifying that shipped surface and removing stale "anticipated but not yet shipped" prose from the four skill/reference files.

## Architecture Check

1. Direct exposure of engine types via the MCP server is cleaner than asking each skill to read TypeScript source files; the engine source files are not stable at the line-number or filename level (they will move during refactors), so the MCP introspection tool gives operators a stable contract regardless of internal patch-engine changes.
2. No backwards-compatibility aliasing/shims introduced; this is a new tool added to the existing `mcp__worldloom__*` surface.

## Verification Layers

1. Tool registration exists -> codebase grep-proof: `rg -n 'describe_envelope_schema' tools/world-mcp/src/server.ts tools/world-mcp/src/tool-names.ts tools/world-mcp/tests`.
2. Tool returns full envelope schema when called without `op_kind` -> package-local handler test: `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` asserts `op_schemas` covers every `OPERATION_KINDS` member and `envelope_schema.properties.patches.items.oneOf` matches the operation count.
3. Tool returns per-op payload schema when called with `op_kind` -> package-local handler and in-memory MCP dispatch tests: `describeEnvelopeSchema({ op_kind: "create_cf_record" })` returns the typed payload shape and the referenced `canon-fact-record.schema.json`; `tests/server/dispatch.test.ts` proves the same through the MCP boundary.
4. Skill prose alignment -> manual review: drop the "anticipated but not yet shipped" hedges in the four files cited under §Problem.

## What to Change

### 1. New MCP tool registration

Verified existing `tools/world-mcp/src/tools/describe-envelope-schema.ts`, `tools/world-mcp/src/tool-names.ts`, and `tools/world-mcp/src/server.ts` registration. The tool is registered with the input schema:

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

When `op_kind` is omitted, the live handler returns the full envelope contract:

```ts
{
  tool_names: { validate_patch_plan: "...", submit_patch_plan: "..." },
  source_paths: [/* source contract paths */],
  envelope_schema: {/* PatchPlanEnvelope JSON-schema-equivalent */},
  op_schemas: {/* one schema per OPERATION_KINDS member */},
  referenced_schemas: {/* validator schemas used by returned op payloads */}
}
```

When `op_kind` is provided, the live handler filters `op_schemas` to that operation and includes any authored-record schema referenced by that payload:

```ts
{
  tool_names: { validate_patch_plan: "...", submit_patch_plan: "..." },
  source_paths: [/* source contract paths */],
  envelope_schema: {/* PatchPlanEnvelope JSON-schema-equivalent */},
  op_schemas: {
    create_cf_record: {/* per-op typed-record key, e.g. payload.cf_record */}
  },
  referenced_schemas: {/* canon-fact-record.schema.json when applicable */}
}
```

### 3. Update skill prose to drop the "not yet shipped" hedges

Edited the four files identified in §Problem to remove the cascade-edit hedges added by the canon-addition and create-base-world audits:

- `.claude/skills/canon-addition/SKILL.md` Procedure step 7 now tells operators to query `mcp__worldloom__describe_envelope_schema(op_kind?)`.
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` preamble now names the deployed tool as the operational introspection path.
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` §§1, 2 now names the deployed tool as the operational introspection path.
- `.claude/skills/create-base-world/SKILL.md` step 4 now points operators to the deployed introspection tool.

## Files to Touch

- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (verified existing)
- `tools/world-mcp/src/server.ts` (verified existing registration)
- `tools/world-mcp/src/tool-names.ts` (verified existing registration list)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (verified existing handler coverage)
- `tools/world-mcp/tests/server/list-tools.test.ts` (verified existing tool inventory coverage)
- `tools/world-mcp/tests/server/dispatch.test.ts` (verified existing MCP dispatch coverage)
- `.claude/skills/canon-addition/SKILL.md` (modified — drop hedge in Procedure step 7)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modified — drop hedge in preamble)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modified — drop hedges in §§1, 2)
- `.claude/skills/create-base-world/SKILL.md` (modified — add deployed-tool pointer in step 4)

## Out of Scope

- Changing any existing engine type or JSON schema (the tool exposes existing contracts; it does not alter them).
- Implementing `get_record_schema` (sibling ticket WMCP-003).
- Extending `get_canonical_vocabulary` enum coverage (sibling ticket WMCP-002).

## Acceptance Criteria

### Tests That Must Pass

1. New tool registers correctly: `rg -n 'describe_envelope_schema' tools/world-mcp/src/server.ts tools/world-mcp/src/tool-names.ts` shows the registration and tool-name inventory.
2. Calling the handler without `op_kind` returns a complete envelope-schema object with `tool_names`, `source_paths`, `envelope_schema`, `op_schemas`, and `referenced_schemas` covering every `OPERATION_KINDS` member.
3. Calling the handler with `op_kind: "create_cf_record"` returns only the CF operation schema plus the referenced `canon-fact-record.schema.json` schema.
4. The four skill files have their hedges removed after this ticket lands.

### Invariants

1. The introspection tool is read-only; it must not mutate engine state, world content, or the index.
2. The schema returned must match the deployed engine operation vocabulary and validator schemas; package tests compare the response to `OPERATION_KINDS` and referenced JSON schema `$id` values.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (existing) — exercises both no-`op_kind` and per-`op_kind` branches, asserts schema completeness against `@worldloom/patch-engine` exports.
2. `tools/world-mcp/tests/server/list-tools.test.ts` (existing) — asserts the MCP tool inventory includes all 19 registered tools.
3. `tools/world-mcp/tests/server/dispatch.test.ts` (existing) — asserts `describe_envelope_schema` dispatches through the MCP boundary with an op filter.
4. Skill-prose grep-proof — `rg -n 'anticipated but not yet shipped' .claude/skills/canon-addition/ .claude/skills/create-base-world/` returns 0 hits after the prose update.

### Commands

1. `npm test -- --test-name-pattern='describeEnvelopeSchema|describe_envelope_schema|listTools'` from `tools/world-mcp/` (npm's shell invocation ran the full package suite because of the pipe characters in the pattern; this is stronger than the intended focused lane).
2. `rg -n 'describe_envelope_schema' tools/world-mcp/src/server.ts tools/world-mcp/src/tool-names.ts tools/world-mcp/tests`.
3. `rg -n 'anticipated but not yet shipped' .claude/skills/canon-addition/ .claude/skills/create-base-world/` must return no matches.
4. Direct external `mcp__worldloom__describe_envelope_schema(...)` calls are post-restart operational smoke in this Codex session; package-local in-memory MCP dispatch is the truthful automated proof.

## Outcome

Completed. The world-mcp `describe_envelope_schema` implementation, registration, tool inventory, and package tests were already present in the live repo. This ticket verified that shipped surface and removed stale "anticipated but not yet shipped" prose from the two canon-mutating skills and their envelope references:

- `.claude/skills/canon-addition/SKILL.md`
- `.claude/skills/canon-addition/references/engine-envelope-shape.md`
- `.claude/skills/create-base-world/SKILL.md`
- `.claude/skills/create-base-world/references/engine-envelope-shape.md`

No world content, `_source/*.yaml` records, approval-token logic, submit ordering, or pre-apply validators were changed.

## Verification Result

Completed in this implementation pass:

- `npm test -- --test-name-pattern='describeEnvelopeSchema|describe_envelope_schema|listTools'` from `tools/world-mcp/` passed. Because npm's shell invocation interpreted the pipe characters in the pattern, the command ran the full package suite instead of only the focused tests: 236 tests passed, 0 failed.
- `rg -n 'describe_envelope_schema' tools/world-mcp/src/server.ts tools/world-mcp/src/tool-names.ts tools/world-mcp/tests` confirmed source registration, tool-name inventory, and MCP dispatch/list-tools coverage.
- `rg -n 'anticipated but not yet shipped' .claude/skills/canon-addition/ .claude/skills/create-base-world/` returned no matches.
- `git diff --check` passed.

Ignored artifact state after verification is expected/pre-existing package state under `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

The drafted ticket expected a new tool implementation. Live reassessment found the tool already implemented and documented in `tools/world-mcp/README.md` / `docs/MACHINE-FACING-LAYER.md`. The active change therefore narrowed to verification plus cross-skill hedge removal. Direct external MCP invocation was not used as acceptance because the current Codex toolset does not expose `mcp__worldloom__describe_envelope_schema`; existing package-local handler and in-memory MCP dispatch tests are the truthful proof surface.
