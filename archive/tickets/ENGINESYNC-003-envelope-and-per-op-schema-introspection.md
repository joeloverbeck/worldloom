# ENGINESYNC-003: Envelope and per-op nested-schema introspection for submit_patch_plan / validate_patch_plan

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — added `tools/world-mcp/src/tools/describe-envelope-schema.ts`; updated `tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/src/server.ts` registration; added tests in `tools/world-mcp/tests/`; updated `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md`; updated `.claude/skills/create-base-world/references/engine-envelope-shape.md` and `.claude/skills/canon-addition/SKILL.md` to cite the new introspection tool as the canonical machine-readable envelope authority.
**Deps**: `archive/tickets/ENGINESYNC-002-mcp-server-schema-introspection-and-deployed-currency-detection.md` (introduced `describe_capabilities` for top-level enums; this ticket extends that introspection surface to nested object schemas).

## Problem

`ENGINESYNC-002` introduced `mcp__worldloom__describe_capabilities()` returning a manifest with `tools[*].input_schema_enums: Record<string, string[]>`. This shape covers top-level **enum-typed parameters** of each tool — for example, the `id_class` parameter of `allocate_next_id`, or the `class` parameter of `get_canonical_vocabulary`. It does NOT traverse nested object schemas.

At intake, the `submit_patch_plan` and `validate_patch_plan` tools accepted a `patch_plan` parameter that is a deeply-nested object: `PatchPlanEnvelope` → `patches[]: PatchOperationEnvelope[]` → each op's `payload: { <typed_record_key>: <record-shape> }` where the typed-record-key (`cf_record` / `ch_record` / `inv_record` / `m_record` / `oq_record` / `ent_record` / `sec_record`) and the inner record's full field schema vary per `op` kind. The deployed MCP wrapper is permissive, but shared envelope validation plus patch-engine and validator contracts enforce the runtime shape. Before this ticket, `input_schema_enums` flattened to top-level enums only and the nested envelope shape was invisible to operators.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: three submission attempts failed pre-validation due to envelope-shape gaps that one introspection call would have surfaced:

1. **`patches[0].target_file must be a non-empty string`** — the per-op `target_file` field is undocumented in the skill prose; I had to read `tools/world-mcp/src/tools/_shared.ts` `PatchOperationEnvelope` to discover it.
2. **`patch_plan.approval_token must be a non-empty string`** — the envelope's placeholder `approval_token` field is undocumented in skill prose; I had to read `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token.
3. **`id_allocation_race: expected ONT-1, current next id is INV-1`** — the `inv_ids` flat-vs-category-prefix asymmetry (separately ticketed in `PATCHENG-001`); but even after that fix, the envelope-shape friction would persist.

Each round-trip cost ~5 minutes of source-reading and re-submission cycles. With nested-schema introspection, one `describe_envelope_schema(op_kind: "create_cf_record")` call would have returned the full required shape including `target_file: string`, `payload.cf_record: { id: string, title: string, status: enum[...], ... }`, `expected_id_allocations: { cf_ids: string[], ... }`, and `approval_token: string`.

Before this ticket, this pattern would recur for every future skill that assembles a patch plan (currently `create-base-world` and `canon-addition`; future skills any time the engine adds a new op kind). Operators had to read source for the envelope shape because introspection stopped at top-level enums.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/describe-capabilities.ts` exists (added by ENGINESYNC-002) and returns a manifest of `build_info` + `tools[*].name`/`description`/`input_schema_enums`. Confirmed via `tools/world-mcp/dist/src/tools/describe-capabilities.js` presence in the deployed CLI tree.
2. `tools/world-mcp/src/tools/_shared.ts` defines `PatchOperationEnvelope` and `PatchPlanEnvelope` interfaces, and `tools/world-mcp/src/server.ts` deliberately keeps the MCP wrapper permissive with `patchPlanInputSchema = z.object({}).passthrough()` before shared envelope validation runs in `validatePatchPlanEnvelopeShape`. The canonical nested operation authority is therefore split across `_shared.ts` for MCP envelope-shape errors, `tools/patch-engine/src/envelope/schema.ts` for operation kinds and payload typing, and `tools/validators/src/schemas/*.schema.json` for authored record payload schemas.
3. Cross-tool boundary under audit: the contract between (a) the deployed MCP server's envelope validation plus patch-engine operation contract on `submit_patch_plan` / `validate_patch_plan` and (b) every consumer skill that assembles an envelope (`create-base-world` Phase 11; `canon-addition` Phase 13a / Phase 15a). The shared contract is the runtime envelope/op structure; the failure mode is silent staleness — schema enforcement returns a generic `invalid_input` error naming a specific path (`patch_plan.patches[0].target_file`) but provides no machine-readable manifest of what the full shape SHOULD be.
4. **FOUNDATIONS principle motivating this ticket**: §Tooling Recommendation — "LLM agents should never operate on prose alone … the context-packet API is the machine-facing mechanism for delivering this set with completeness guarantees." The introspection contract is part of the same machine-facing mechanism: skills assembling patch plans should not have to read source code to discover required fields. The session evidence above is exactly the prose-driven assumption pattern §Tooling Recommendation rejects, applied to envelope shape rather than canon retrieval. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches a FOUNDATIONS-aligned enforcement surface (engine pre-apply validation) but does NOT weaken the Mystery Reserve firewall or any HARD-GATE — the change is purely on the introspection surface. Validators run unchanged; mystery firewall semantics are unchanged; the new tool only describes what existing schemas already enforce.
5. Schema extension: additive — the implementation adds a new tool, `describe_envelope_schema`, rather than extending `describe_capabilities` with a large nested payload. Existing consumers of `describe_capabilities` are unaffected; the new surface is opt-in.
6. Adjacent contradiction surfaced during reassessment: `mcp__worldloom__get_record_schema(record_type)` already exists per `tools/world-mcp/src/tools/get-record-schema.ts` and "Returns the validator JSON Schema and referenced schemas for a record node type." This covers the **inner record** shape (`cf_record`, `inv_record`, etc.) but does NOT cover the **outer envelope** shape (`PatchPlanEnvelope` / `PatchOperationEnvelope`). The outer envelope is a transport-layer construct (op routing, target_file paths, expected_id_allocations) distinct from the inner record-content schema; the two introspection surfaces complement each other rather than overlap. This ticket scopes specifically to the envelope/op outer shape; per-record introspection is delegated to the existing `get_record_schema`.
7. Pipeline-wide grep for current envelope-introspection patterns: no existing tool returns the envelope or per-op JSON Schema. The closest analog is the human-facing prose in `.claude/skills/create-base-world/references/engine-envelope-shape.md` (added by the create-base-world audit on 2026-05-01) and `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token. Both are documentation that drifts from the deployed schema unless manually maintained — the same drift surface ENGINESYNC-002 named.

## Architecture Check

1. Adding sibling `describe_envelope_schema` preserves the response-shape locality ENGINESYNC-002 chose. The alternative — embedding nested schema everywhere ad hoc, or making every `describe_capabilities` response carry the large envelope schema — fragments introspection across many surfaces. A single dedicated introspection surface keeps the contract uniform.
2. Implementation renders JSON Schema from the live engine/validator contract sources already used by the deployed package: `_shared.ts` envelope validation, `tools/patch-engine/src/envelope/schema.ts` operation payload types, and validator JSON Schema files for authored record payloads. No third-party schema-rendering dependency or tracked build-time source generation is introduced.
3. No backwards-compatibility shims. The new surface is additive; existing introspection responses unchanged.
4. Per-op resolution: when called with `op_kind: "create_cf_record"`, the response includes the full nested shape for that op's `payload` and references the Canon Fact Record validator schema. When called without `op_kind`, the response includes the full envelope shape with all op kinds enumerated.

## Verification Layers

1. New introspection call returns the JSON Schema for `submit_patch_plan.patch_plan` including `patches[].op` enum, `patches[].target_file: string`, `patches[].target_world: string`, and `patches[].payload: object` → `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`.
2. Per-op resolution exposes the payload shape: `op: "create_cf_record"` → `payload.cf_record` references the deployed Canon Fact Record JSON Schema with required `id`, `title`, `status`, `type`, `statement`, `scope`, `truth_scope`, `domains_affected`, ... matching the FOUNDATIONS §Canon Fact Record Schema → same test file.
3. Per-op resolution covers all 7 atomic-record op kinds (`create_cf_record`, `create_ch_record`, `create_inv_record`, `create_m_record`, `create_oq_record`, `create_ent_record`, `create_sec_record`) plus the hybrid-file ops (`append_adjudication_record`, `append_character_record`, `append_diegetic_artifact_record`) and update ops (`update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`) → same test file.
4. The `expected_id_allocations` object schema is exposed with the current engine keys: `cf_ids`, `ch_ids`, `inv_ids`, `m_ids`, `oq_ids`, `ent_ids`, `sec_ids`, `pa_ids`, `char_ids`, and `da_ids`; this ticket exposes the current deployed contract rather than correcting allocation semantics → same test file.
5. Skills citing the introspection contract (`.claude/skills/create-base-world/references/engine-envelope-shape.md`; `.claude/skills/canon-addition/...` envelope-assembly references) link to the new tool as the canonical authority → grep-proof: `rg -n "describe_envelope_schema|describe_capabilities" .claude/skills/` returns hits.
6. `docs/MACHINE-FACING-LAYER.md` "Schema currency verification" subsection extended to name the new tool as the envelope-shape introspection path → grep-proof.

## What to Change

### 1. Implement nested-schema traversal

Implemented option (b): a new `describe-envelope-schema.ts` tool with an optional `op_kind` parameter. This preserves response-size locality because `submit_patch_plan`'s nested schema is large and most callers want only one op kind's shape.

Created `tools/world-mcp/src/tools/describe-envelope-schema.ts`:
- Input: `{ op_kind?: string }` — when omitted, returns full envelope + every op's payload shape; when supplied, returns envelope + only that op kind's payload shape.
- Output: structured manifest with `envelope_schema: JSONSchema` (top-level `PatchPlanEnvelope`), `op_schemas: Record<op_kind, JSONSchema>` (per-op `PatchOperationEnvelope` shape with the typed payload key resolved), `source_paths`, and referenced record schemas for payload `$ref`s.
- Implementation: expose the registered `submit_patch_plan` / `validate_patch_plan` contract as JSON Schema from the live engine/validator authorities. The MCP wrapper remains permissive by design, so the rendered schema names `_shared.ts`, `tools/patch-engine/src/envelope/schema.ts`, and the referenced validator schema files as source paths rather than claiming the wrapper Zod object alone is the nested authority.

### 2. Register the tool

In `tools/world-mcp/src/server.ts`: register `describe_envelope_schema` alongside `describe_capabilities` through the package's existing `registerWrappedTool` / `registerToolWithCapability` path. Zod input schema is `z.object({ op_kind: z.enum(OPERATION_KINDS).optional() }).strict()`.

### 3. Tests

Implemented `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`:
- Empty-input full-manifest assertion (envelope_schema present; op_schemas covers all op kinds).
- `op_kind: "create_cf_record"` resolution returns CF-record payload shape with all FOUNDATIONS §Canon Fact Record Schema fields.
- Specific field assertions: `target_file` is required string; `payload.cf_record` references the Canon Fact Record schema, where `required_world_updates` is required.
- Schema-source-vs-deployed parity: the rendered JSON Schema for a known op matches the live engine/validator structural fields.

### 4. Documentation

Updated `docs/MACHINE-FACING-LAYER.md`:
- "Schema currency verification" subsection (added by ENGINESYNC-002) — extend with a paragraph naming `describe_envelope_schema` as the envelope-and-op-shape introspection path; cite this ticket and the create-base-world session evidence.

Updated `tools/world-mcp/README.md`:
- Added brief tool entry alongside existing tool documentation.

### 5. Skill prose ripple (defensive)

Updated `.claude/skills/create-base-world/references/engine-envelope-shape.md` (added by 2026-05-01 audit):
- §1 Envelope skeleton and §2 Per-op payload shape — added a one-line note: "For machine-readable retrieval of the current deployed envelope and per-op shapes, call `mcp__worldloom__describe_envelope_schema(op_kind?: string)` — see ENGINESYNC-003. The reference text below documents the operationally-relevant subset and discovered conventions."
- This positions the reference doc as a human-readable supplement to the machine-readable introspection rather than the primary source.

Updated `.claude/skills/canon-addition/SKILL.md` Phase 13a envelope-assembly section:
- Added the same one-line note recommending `describe_envelope_schema` as the deployed-shape verification path before assembly.

## Files to Touch

- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (new)
- `tools/world-mcp/src/server.ts` (modify — register new tool)
- `tools/world-mcp/src/tool-names.ts` (modify — tool inventory/order)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (new)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add dispatch case)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — inventory count remains exact)
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
2. In-memory MCP dispatch for `mcp__worldloom__describe_envelope_schema({op_kind: "create_cf_record"})` returns a manifest covering the requested op kind and referenced Canon Fact Record schema.
3. Direct handler tests prove `describeEnvelopeSchema({})` returns all current op kinds and `describeEnvelopeSchema({op_kind: "create_cf_record"})` returns CF-record payload shape including all FOUNDATIONS §Canon Fact Record Schema fields.
4. Skills now cite `describe_envelope_schema` as the canonical machine-readable path before envelope assembly; a full `create-base-world` dry-run is operational smoke after MCP rebuild/restart, not a package-local acceptance gate for this implementation session.

### Invariants

1. The new tool's response is derived from the deployed engine and validator contract sources — no second-source prose schema authoring.
2. `describe_capabilities` (ENGINESYNC-002) and `describe_envelope_schema` (this ticket) are complementary, non-overlapping introspection surfaces — top-level enums vs. nested object shapes.
3. `get_record_schema` (existing) and `describe_envelope_schema` (this ticket) are complementary — inner record-content shape vs. outer envelope/op transport shape.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — new package-local test for the introspection tool.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — add MCP-server-boundary dispatch case for the new tool.

### Commands

1. `cd tools/world-mcp && npm test` — package-local pass.
2. `cd tools/world-mcp && npm run build` — producer build emits the new runtime tool before package-local compiled tests.
3. In-memory MCP dispatch invokes `mcp__worldloom__describe_envelope_schema({op_kind: "create_cf_record"})` against `createServer()` and confirms the response exposes the deployed operation schema. A direct external MCP call remains post-restart operational smoke because this session cannot expose a newly registered tool until the external server/client is rebuilt and restarted.

## Outcome

Completed on 2026-05-01.

- Added `mcp__worldloom__describe_envelope_schema(op_kind?)` as a read-only MCP tool. It returns `tool_names`, `source_paths`, `envelope_schema`, `op_schemas`, and `referenced_schemas`.
- Registered the tool in the central MCP inventory and server, with `op_kind` constrained to the current operation-kind enum.
- Added direct handler tests for full-manifest and filtered-op behavior, and MCP-boundary/list-tools tests for dispatch and exact inventory.
- Updated `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `create-base-world` envelope reference prose, and `canon-addition` Phase 13a prose to cite the new tool as the machine-readable envelope/op-shape authority.
- Reassessed and corrected the ticket's authority model: the current MCP wrapper is permissive, so the new tool is derived from `_shared.ts`, `tools/patch-engine/src/envelope/schema.ts`, and validator JSON schemas rather than a nonexistent deep wrapper Zod schema.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — passed; 3 compiled test files passed.
3. `cd tools/world-mcp && npm test` — passed; package build plus 218 tests passed with 0 failures.
4. `rg -n "describe_envelope_schema|19 tools" tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md .claude/skills/create-base-world/references/engine-envelope-shape.md .claude/skills/canon-addition/SKILL.md tools/world-mcp/src tools/world-mcp/tests` — returned hits in registration, tests, docs, and skill references.

## Deviations

- The original draft described walking deployed nested Zod schemas via `zod-to-json-schema`. Reassessment showed the live wrapper schema is intentionally permissive and the nested authority is split across `_shared.ts`, `tools/patch-engine/src/envelope/schema.ts`, and validator JSON schemas. The implementation exposes that live contract directly and does not add a new dependency.
- A direct external `mcp__worldloom__describe_envelope_schema(...)` call was not run in this Codex session because the newly registered tool will not exist on the already-running external MCP server/client until the package is rebuilt and that server/client is restarted. The accepted proof is the package-local direct handler test plus in-memory MCP dispatch test.
- `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` are ignored package artifacts present after verification. `dist/` is expected generated output from build/test; `.secret` and `node_modules/` were already present in the initial package ignored-status snapshot and are not ticket-owned source edits.
