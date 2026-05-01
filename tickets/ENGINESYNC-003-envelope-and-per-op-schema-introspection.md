# ENGINESYNC-003: Envelope and per-op nested-schema introspection for submit_patch_plan / validate_patch_plan

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extend `tools/world-mcp/src/tools/describe-capabilities.ts` (or add a new sibling tool `describe-envelope-schema.ts`); update `tools/world-mcp/src/server.ts` registration if a new tool is added; tests in `tools/world-mcp/tests/`; `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` documentation; defensive ripple to `.claude/skills/create-base-world/references/engine-envelope-shape.md` (cite the new introspection tool as canonical authority); same potential ripple to `.claude/skills/canon-addition/` envelope-assembly references.
**Deps**: `archive/tickets/ENGINESYNC-002-mcp-server-schema-introspection-and-deployed-currency-detection.md` (introduced `describe_capabilities` for top-level enums; this ticket extends that introspection surface to nested object schemas).

## Problem

`ENGINESYNC-002` introduced `mcp__worldloom__describe_capabilities()` returning a manifest with `tools[*].input_schema_enums: Record<string, string[]>`. This shape covers top-level **enum-typed parameters** of each tool — for example, the `id_class` parameter of `allocate_next_id`, or the `class` parameter of `get_canonical_vocabulary`. It does NOT traverse nested object schemas.

The `submit_patch_plan` and `validate_patch_plan` tools accept a `patch_plan` parameter that is a deeply-nested object: `PatchPlanEnvelope` → `patches[]: PatchOperationEnvelope[]` → each op's `payload: { <typed_record_key>: <record-shape> }` where the typed-record-key (`cf_record` / `ch_record` / `inv_record` / `m_record` / `oq_record` / `ent_record` / `sec_record`) and the inner record's full field schema vary per `op` kind. The deployed schema enforces all this via Zod, but `input_schema_enums` flattens to top-level enums only and the nested envelope shape is invisible to operators.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: three submission attempts failed pre-validation due to envelope-shape gaps that one introspection call would have surfaced:

1. **`patches[0].target_file must be a non-empty string`** — the per-op `target_file` field is undocumented in the skill prose; I had to read `tools/world-mcp/src/tools/_shared.ts` `PatchOperationEnvelope` to discover it.
2. **`patch_plan.approval_token must be a non-empty string`** — the envelope's placeholder `approval_token` field is undocumented in skill prose; I had to read `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token.
3. **`id_allocation_race: expected ONT-1, current next id is INV-1`** — the `inv_ids` flat-vs-category-prefix asymmetry (separately ticketed in `PATCHENG-001`); but even after that fix, the envelope-shape friction would persist.

Each round-trip cost ~5 minutes of source-reading and re-submission cycles. With nested-schema introspection, one `describe_envelope_schema(op_kind: "create_cf_record")` call would have returned the full required shape including `target_file: string`, `payload.cf_record: { id: string, title: string, status: enum[...], ... }`, `expected_id_allocations: { cf_ids: string[], ... }`, and `approval_token: string`.

This pattern will recur for every future skill that assembles a patch plan (currently `create-base-world` and `canon-addition`; future skills any time the engine adds a new op kind). Operators will continue to read source for the envelope shape as long as introspection stops at top-level enums.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/describe-capabilities.ts` exists (added by ENGINESYNC-002) and returns a manifest of `build_info` + `tools[*].name`/`description`/`input_schema_enums`. Confirmed via `tools/world-mcp/dist/src/tools/describe-capabilities.js` presence in the deployed CLI tree.
2. `tools/world-mcp/src/tools/_shared.ts` defines `PatchOperationEnvelope` and `PatchPlanEnvelope` interfaces; the canonical Zod schema enforcing them lives in the `submit_patch_plan` and `validate_patch_plan` tool registrations in `tools/world-mcp/src/server.ts`. Per-op payload shapes resolve through `tools/patch-engine/src/ops/types.ts` and per-op modules at `tools/patch-engine/src/ops/create-*-record.ts`.
3. Cross-tool boundary under audit: the contract between (a) the deployed MCP server's Zod schema enforcement on `submit_patch_plan` / `validate_patch_plan` and (b) every consumer skill that assembles an envelope (`create-base-world` Phase 11; `canon-addition` Phase 13a / Phase 15a). The shared contract is the runtime Zod schema's nested object structure; the failure mode is silent staleness — schema enforcement returns a generic `invalid_input` error naming a specific path (`patch_plan.patches[0].target_file`) but provides no machine-readable manifest of what the full shape SHOULD be.
4. **FOUNDATIONS principle motivating this ticket**: §Tooling Recommendation — "LLM agents should never operate on prose alone … the context-packet API is the machine-facing mechanism for delivering this set with completeness guarantees." The introspection contract is part of the same machine-facing mechanism: skills assembling patch plans should not have to read source code to discover required fields. The session evidence above is exactly the prose-driven assumption pattern §Tooling Recommendation rejects, applied to envelope shape rather than canon retrieval. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches a FOUNDATIONS-aligned enforcement surface (engine pre-apply validation) but does NOT weaken the Mystery Reserve firewall or any HARD-GATE — the change is purely on the introspection surface. Validators run unchanged; mystery firewall semantics are unchanged; the new tool only describes what existing schemas already enforce.
5. Schema extension: additive — either extending `describe_capabilities`'s response shape with a new `nested_schemas` field, or adding a new tool `describe_envelope_schema`. Existing consumers of `describe_capabilities` are unaffected; the new surface is opt-in.
6. Adjacent contradiction surfaced during reassessment: `mcp__worldloom__get_record_schema(record_type)` already exists per `tools/world-mcp/src/tools/get-record-schema.ts` and "Returns the validator JSON Schema and referenced schemas for a record node type." This covers the **inner record** shape (`cf_record`, `inv_record`, etc.) but does NOT cover the **outer envelope** shape (`PatchPlanEnvelope` / `PatchOperationEnvelope`). The outer envelope is a transport-layer construct (op routing, target_file paths, expected_id_allocations) distinct from the inner record-content schema; the two introspection surfaces complement each other rather than overlap. This ticket scopes specifically to the envelope/op outer shape; per-record introspection is delegated to the existing `get_record_schema`.
7. Pipeline-wide grep for current envelope-introspection patterns: no existing tool returns the envelope or per-op JSON Schema. The closest analog is the human-facing prose in `.claude/skills/create-base-world/references/engine-envelope-shape.md` (added by the create-base-world audit on 2026-05-01) and `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token. Both are documentation that drifts from the deployed schema unless manually maintained — the same drift surface ENGINESYNC-002 named.

## Architecture Check

1. Extending `describe_capabilities` with a `nested_schemas` field (or adding a sibling `describe_envelope_schema` tool) preserves the response-shape locality ENGINESYNC-002 chose. The alternative — embedding nested schema everywhere ad hoc — fragments introspection across many surfaces. A single dedicated introspection surface keeps the contract uniform.
2. Implementation walks existing Zod schemas via `zod-to-json-schema` (or equivalent stable JSON Schema rendering). No new schema authoring; the deployed schemas are the source of truth.
3. No backwards-compatibility shims. The new surface is additive; existing introspection responses unchanged.
4. Per-op resolution: when called with `op_kind: "create_cf_record"`, the response includes the full nested shape for that op's `payload` — matching the actual Zod schema at `tools/patch-engine/src/ops/create-cf-record.ts`. When called without `op_kind`, the response includes the full envelope shape with all op kinds enumerated.

## Verification Layers

1. New introspection call returns the JSON Schema for `submit_patch_plan.patch_plan` including `patches[].op` enum, `patches[].target_file: string`, `patches[].target_world: string`, `patches[].payload: object` → `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (or extension to existing `describe-capabilities.test.ts`).
2. Per-op resolution exposes the payload shape: `op: "create_cf_record"` → `payload.cf_record: { id, title, status, type, statement, scope, truth_scope, domains_affected, ... }` matching the FOUNDATIONS §Canon Fact Record Schema → same test file.
3. Per-op resolution covers all 7 atomic-record op kinds (`create_cf_record`, `create_ch_record`, `create_inv_record`, `create_m_record`, `create_oq_record`, `create_ent_record`, `create_sec_record`) plus the hybrid-file ops (`append_adjudication_record`, `append_character_record`, `append_diegetic_artifact_record`) and update ops (`update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`) → same test file.
4. The `expected_id_allocations` object schema is exposed: `cf_ids`, `ch_ids`, `inv_ids`, `m_ids`, `oq_ids`, `ent_ids`, `sec_ids` (post-PATCHENG-001 the `inv_ids` validation pattern aligns with per-op convention; this ticket exposes whatever the deployed Zod schema currently enforces) → same test file.
5. Skills citing the introspection contract (`.claude/skills/create-base-world/references/engine-envelope-shape.md`; `.claude/skills/canon-addition/...` envelope-assembly references) link to the new tool as the canonical authority → grep-proof: `rg -n "describe_envelope_schema|describe_capabilities" .claude/skills/` returns hits.
6. `docs/MACHINE-FACING-LAYER.md` "Schema currency verification" subsection extended to name the new tool as the envelope-shape introspection path → grep-proof.

## What to Change

### 1. Implement nested-schema traversal

Decide between (a) extending `describe-capabilities.ts` to add a `nested_schemas` field (one response includes everything) or (b) adding a new `describe-envelope-schema.ts` tool with optional `op_kind` parameter (separate dedicated tool). Either is acceptable; recommendation is (b) for response-size locality — `submit_patch_plan`'s nested schema is large and most callers want only one op kind's shape.

If (b): create `tools/world-mcp/src/tools/describe-envelope-schema.ts`:
- Input: `{ op_kind?: string }` — when omitted, returns full envelope + every op's payload shape; when supplied, returns envelope + only that op kind's payload shape.
- Output: structured manifest with `envelope_schema: JSONSchema` (top-level `PatchPlanEnvelope`) and `op_schemas: Record<op_kind, JSONSchema>` (per-op `PatchOperationEnvelope` shape with the typed payload key resolved). The JSONSchema is rendered from the deployed Zod schemas via `zod-to-json-schema` or equivalent.
- Implementation: introspect the registered tool registry (parallel to `describe_capabilities`'s tool walk); for `submit_patch_plan` and `validate_patch_plan`, walk the `patch_plan` parameter's nested Zod schema to emit JSON Schema; resolve per-op payload via the engine's op-discriminated union.

### 2. Register the tool

In `tools/world-mcp/src/server.ts`: add `server.tool("describe_envelope_schema", ...)` registration alongside `describe_capabilities`. Zod input schema is `z.object({ op_kind: z.string().optional() }).strict()`.

### 3. Tests

`tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`:
- Empty-input full-manifest assertion (envelope_schema present; op_schemas covers all op kinds).
- `op_kind: "create_cf_record"` resolution returns CF-record payload shape with all FOUNDATIONS §Canon Fact Record Schema fields.
- Specific field assertions: `target_file` is required string; `payload.cf_record.required_world_updates` is array of file-class enum values.
- Schema-source-vs-deployed parity: the rendered JSON Schema for a known op matches the Zod schema's structural fields.

### 4. Documentation

`docs/MACHINE-FACING-LAYER.md`:
- "Schema currency verification" subsection (added by ENGINESYNC-002) — extend with a paragraph naming `describe_envelope_schema` as the envelope-and-op-shape introspection path; cite this ticket and the create-base-world session evidence.

`tools/world-mcp/README.md`:
- Add brief tool entry alongside existing tool documentation.

### 5. Skill prose ripple (defensive)

`.claude/skills/create-base-world/references/engine-envelope-shape.md` (added by 2026-05-01 audit):
- §1 Envelope skeleton and §2 Per-op payload shape — add a one-line note: "For machine-readable retrieval of the current deployed envelope and per-op shapes, call `mcp__worldloom__describe_envelope_schema(op_kind?: string)` — see ENGINESYNC-003. The reference text below documents the operationally-relevant subset and discovered conventions."
- This positions the reference doc as a human-readable supplement to the machine-readable introspection rather than the primary source.

`.claude/skills/canon-addition/SKILL.md` Phase 13a envelope-assembly section:
- Same one-line note recommending `describe_envelope_schema` as the deployed-shape verification path before assembly.

## Files to Touch

- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (new)
- `tools/world-mcp/src/server.ts` (modify — register new tool)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (new)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add dispatch case)
- `tools/world-mcp/README.md` (modify — tool entry)
- `docs/MACHINE-FACING-LAYER.md` (modify — Schema currency verification subsection extension)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify — cite new tool)
- `.claude/skills/canon-addition/SKILL.md` (modify — Phase 13a envelope-assembly note; verify exact phase reference at implementation time)

## Out of Scope

- Per-record schema introspection (covered by existing `mcp__worldloom__get_record_schema`; this ticket scopes to envelope/op outer shape only).
- Engine schema fixes (PATCHENG-001 covers the `inv_ids` asymmetry; this ticket only describes whatever schema the engine currently enforces).
- Skill-prose-only documentation updates not motivated by this ticket's introspection surface.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes including new `describe-envelope-schema.test.ts`.
2. `mcp__worldloom__describe_envelope_schema({})` returns a manifest covering all current op kinds.
3. `mcp__worldloom__describe_envelope_schema({op_kind: "create_cf_record"})` returns CF-record payload shape including all FOUNDATIONS §Canon Fact Record Schema fields.
4. Full pipeline: a `create-base-world` dry-run can assemble a valid envelope using only the introspection tool's output (no source reads of `_shared.ts` or `tools/patch-engine/src/ops/`).

### Invariants

1. The new tool's response is derived from the deployed Zod schemas — no second-source schema authoring; drift is structurally impossible.
2. `describe_capabilities` (ENGINESYNC-002) and `describe_envelope_schema` (this ticket) are complementary, non-overlapping introspection surfaces — top-level enums vs. nested object shapes.
3. `get_record_schema` (existing) and `describe_envelope_schema` (this ticket) are complementary — inner record-content shape vs. outer envelope/op transport shape.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — new package-local test for the introspection tool.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — add MCP-server-boundary dispatch case for the new tool.

### Commands

1. `cd tools/world-mcp && npm test` — package-local pass.
2. `cd tools/world-mcp && npm run build && <restart MCP server>` — deployed schema currency confirmation per ENGINESYNC-002 §Schema currency verification.
3. Manual: invoke `mcp__worldloom__describe_envelope_schema({op_kind: "create_inv_record"})` and confirm response matches `tools/patch-engine/src/ops/create-inv-record.ts` Zod schema.
