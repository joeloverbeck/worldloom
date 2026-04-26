# SPEC16MCPRETSUR-001: `get_record_field` slice tool

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds new MCP tool `mcp__worldloom__get_record_field` to `@worldloom/world-mcp`; no impact on existing tools.
**Deps**: None

## Problem

`mcp__worldloom__get_record(record_id)` returns the full parsed record. Large SEC records (animalia: SEC-ELF-001 ≈ 76KB) blow the agent's context budget when only a single field (`touched_by_cf`, `extensions[]`, `modification_history[]`) is needed. The agent currently has to either (a) accept the budget hit or (b) dispatch a subagent with `jq` queries against the file directly. Adding a field-slice retrieval surface keeps follow-up retrieval bounded for skills that already know exactly which field they need.

## Assumption Reassessment (2026-04-26)

1. `tools/world-mcp/src/tools/get-record.ts` exposes the resolution path the new tool reuses. Confirmed in `validateRecordId`, `resolveRecordRow`, and `parseRecordBody`: these helpers are currently file-local. This ticket exports those helpers from `get-record.ts` so `get_record_field` reuses the exact record-id validation, world resolution, and YAML parsing path without duplicating the `RECORD_ID_PATTERN`.
2. `specs/SPEC-16-mcp-retrieval-surface-refinements.md` §Track C3 (Approach + Deliverables) is the source of truth for this ticket. The `field_path` parameter accepts `(string | number)[]` per Improvement 1 of the 2026-04-26 reassessment — numeric segments index arrays; string segments index object keys. This pins the array-vs-object semantics at the Zod schema layer rather than at runtime.
3. Cross-artifact boundary: tool registration touches `tools/world-mcp/src/tool-names.ts` (`MCP_TOOL_NAMES` + `MCP_TOOL_ORDER`) and `tools/world-mcp/src/server.ts` (Zod input-schema declaration + `registerWrappedTool` call). Registration also requires same-package server inventory/dispatch test updates, and `record_field_not_found` requires extending the shared MCP error-code taxonomy in `tools/world-mcp/src/errors.ts`. These files are also touched by SPEC16MCPRETSUR-002 (Track C4) — different tool keys, no merge conflict if reviewed sequentially.
4. `specs/SPEC-16-mcp-retrieval-surface-refinements.md` still described Track C3's `field_path` as a string array in the Approach paragraph even though the Deliverables and this ticket require `(string | number)[]`. Same-seam spec wording is corrected before implementation so array-index semantics have one authoritative shape.

## Architecture Check

1. Reusing `get_record`'s resolution path keeps the tool's contract identical to `get_record` for all error paths (`invalid_input` for bad record IDs, `record_not_found` for missing records). Skills that already handle `get_record` errors handle `get_record_field` errors uniformly.
2. The `field_path: (string | number)[]` shape avoids string-segment ambiguity that a dot-notation form (`extensions.0.body`) would introduce — array indices are unambiguous at the schema layer.
3. No backwards-compatibility shims. The tool is purely additive.

## Verification Layers

1. Tool registration → codebase grep-proof: `grep -n "get_record_field" tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` returns matches in both files.
2. Field-path projection correctness → unit test: `tools/world-mcp/tests/tools/get-record-field.test.ts` covers scalar field, nested-array field, missing-path, invalid record ID, and missing record cases.
3. Reuse fidelity → codebase grep-proof: confirm no duplicated `RECORD_ID_PATTERN` regex strings after exporting the existing `get-record.ts` helpers.

## What to Change

### 1. New tool file `tools/world-mcp/src/tools/get-record-field.ts`

Implement `getRecordField({ record_id, field_path, world_slug? }) → { value, content_hash, file_path } | McpError`. Export and reuse `validateRecordId`, `resolveRecordRow`, and `parseRecordBody` from `get-record.ts`. After parsing the record body, walk `field_path` against the parsed record:
- Each segment is either `string` (object key) or `number` (array index).
- Numeric path segments are array indices when the parent is an array; otherwise treated as object keys.
- If any path segment resolves to `undefined`, return `record_field_not_found` McpError citing the segment that missed.

### 2. Tool registration

`tools/world-mcp/src/tool-names.ts` — add `get_record_field: "mcp__worldloom__get_record_field"` to `MCP_TOOL_NAMES`; add `MCP_TOOL_NAMES.get_record_field` to `MCP_TOOL_ORDER` (maintaining existing ordering convention — append after `get_record`).

`tools/world-mcp/src/server.ts` — declare a Zod input schema near `getRecordInputSchema` (around line 83):

```ts
const getRecordFieldInputSchema = z.object({
  record_id: z.string().min(1),
  field_path: z.array(z.union([z.string(), z.number().int()])).min(1),
  world_slug: z.string().min(1).optional()
});
```

Then register the tool via `registerWrappedTool` (follow the pattern of `get_record` at server.ts:213-219).

### 3. Shared error taxonomy and registration tests

`tools/world-mcp/src/errors.ts` — add `record_field_not_found` to `MCP_ERROR_CODES`.

`tools/world-mcp/tests/errors.test.ts`, `tools/world-mcp/tests/server/list-tools.test.ts`, and `tools/world-mcp/tests/server/dispatch.test.ts` — update same-package contract tests for the new error code and registered tool inventory.

### 4. Test file `tools/world-mcp/tests/tools/get-record-field.test.ts`

Cases:
- Valid record + valid scalar field path (e.g., `["touched_by_cf"]`) → returns the array value plus `content_hash` + `file_path`.
- Valid record + valid nested-array field path (e.g., `["extensions", 0, "body"]`) → returns the value at the index.
- Valid record + invalid field path → `record_field_not_found` McpError.
- Invalid `record_id` → reuses `get_record`'s `invalid_input` McpError.
- Missing record (record_id valid pattern but not in any indexed world) → reuses `get_record`'s `record_not_found` McpError.

## Files to Touch

- `tools/world-mcp/src/tools/get-record-field.ts` (new)
- `tools/world-mcp/src/tools/get-record.ts` (modify — export existing helpers)
- `tools/world-mcp/src/errors.ts` (modify)
- `tools/world-mcp/src/tool-names.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-field.test.ts` (new)
- `tools/world-mcp/tests/errors.test.ts` (modify)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `specs/SPEC-16-mcp-retrieval-surface-refinements.md` (modify — same-seam field-path wording correction)

## Out of Scope

- Multi-field-path retrieval in one call (e.g., `get_record_fields(record_id, [["touched_by_cf"], ["extensions"]])`). YAGNI; defer until a skill needs it.
- Schema-discovery tooling (Track C4). Lives in SPEC16MCPRETSUR-002.
- README/docs updates for this surface. Lives in SPEC16MCPRETSUR-005 once all four tools exist.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes after `get-record-field.test.ts` is added.
2. Manual smoke: invoke `mcp__worldloom__get_record_field("SEC-ELF-001", ["touched_by_cf"])` against the animalia world index; response is the `touched_by_cf` array only, not the full ~76KB body.
3. Existing `get_record` and server registration tests continue to pass — no shared-helper or inventory regressions from exporting the resolution helpers.

### Invariants

1. `get_record_field` and `get_record` produce identical error envelopes for the same (record_id, world_slug) inputs when the field path itself is well-formed; the only divergence is in the success-path response shape.
2. The `field_path` schema (`(string | number)[]`) is the sole authority on segment-type semantics — runtime walking does not silently coerce strings to numeric indices.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-field.test.ts` — covers all five test cases above.

### Commands

1. `cd tools/world-mcp && npm test` — full package test suite, gates on the new test file plus all existing tests passing.
2. Smoke invocation through MCP after `cd tools/world-mcp && npm run build` — exercises the registered tool end-to-end.

## Outcome

Completed on 2026-04-26.

Implemented `mcp__worldloom__get_record_field` as an additive MCP read tool in `@worldloom/world-mcp`.

- Added `tools/world-mcp/src/tools/get-record-field.ts` with `field_path: (string | number)[]` projection, `record_field_not_found` diagnostics, and provenance-preserving `{ value, content_hash, file_path }` responses.
- Exported the existing `get-record.ts` validation/resolution/parse helpers so the new tool reuses `get_record`'s record-id validation, world lookup, and YAML parsing path without duplicating `RECORD_ID_PATTERN`.
- Registered the tool in `MCP_TOOL_NAMES`, `MCP_TOOL_ORDER`, and the server's Zod schema/`registerWrappedTool` path.
- Extended the shared MCP error-code taxonomy with `record_field_not_found`.
- Added direct tool tests and updated server inventory/dispatch/error taxonomy tests.
- Corrected same-seam SPEC-16 wording for `(string | number)[]` field paths and the live five-ticket implementation split (`SPEC16MCPRETSUR-001` through `-005`).

## Verification Result

Passed:

1. `cd tools/world-mcp && npm test` — full package suite passed after implementation.
2. In-memory MCP smoke against built `dist` artifact and live `animalia` index:
   - call: `mcp__worldloom__get_record_field` with `{ record_id: "SEC-ELF-001", field_path: ["touched_by_cf"], world_slug: "animalia" }`
   - result: `value_is_array: true`, `value_length: 39`, `file_path: "_source/everyday-life/SEC-ELF-001.yaml"`, `content_hash_length: 64`
3. Codebase grep-proof: `RECORD_ID_PATTERN` remains defined once in `tools/world-mcp/src/tools/get-record.ts`; `get_record_field` is present in `tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/src/server.ts`.

Generated ignored package artifacts observed after verification: `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/.secret`. These are expected ignored package/test artifacts.

## Deviations

- The draft `Files to Touch` omitted shared error taxonomy and server contract tests. Reassessment classified those as same-package required fallout for a new registered MCP tool and patched the ticket before code edits.
- README and project/skill documentation remain out of scope for this code ticket and are owned by `SPEC16MCPRETSUR-005`, which exists in the active ticket family.
