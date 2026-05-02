# WMCP-013: Add `get_records_field(record_ids, field_path)` batch field-projection MCP tool

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-records-field.ts` (new), `tools/world-mcp/src/tool-names.ts`, `tools/world-mcp/src/server.ts`, `tools/world-mcp/tests/tools/get-records-field.test.ts` (new), `tools/world-mcp/tests/server/dispatch.test.ts`, `tools/world-mcp/tests/server/list-tools.test.ts`, `tools/world-mcp/README.md`, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`, `.claude/skills/canon-addition/references/retrieval-tool-tree.md`
**Deps**: `archive/tickets/WMCP-001.md` (retrieval tool family exists), `archive/tickets/WMCP-005-reconcile-context-packet-budget-harness-ceiling.md` (harness-ceiling discipline established)

## Problem

At intake, `mcp__worldloom__get_records(record_ids, world_slug?)` returned full record bodies for a known-id batch. For batches of `≤ 5-7` records, the response fit within the harness inline cap. For larger batches, the response could exceed the cap and be redirected to a persisted file requiring `jq`-on-file recovery.

In the May 2 character-generation session against `worlds/erotica-world`, `mcp__worldloom__get_records(world_slug='erotica-world', record_ids=['ONT-1', 'ONT-2', 'CAU-1', 'CAU-2', 'DIS-1', 'DIS-2', 'SOC-1', 'SOC-2', 'AES-1', 'AES-2', 'M-1', 'M-2', 'M-3', 'M-4', 'CF-0001', 'CF-0002', 'CF-0003'])` returned a 61.1-KB response that exceeded the harness inline cap and was persisted. The operator only needed specific fields per record (e.g., for invariants: `statement`, `category`, `break_conditions`, `examples`, `distribution`; for Mystery Reserve: `title`, `status`, `knowns`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`, `domains_touched`; for CFs: `title`, `statement`, `distribution`, `costs_and_limits`). Returning full record bodies (including `extensions[]`, `modification_history[]`, `notes`, `provenance`, etc.) exceeded the budget by ~3x what the operator's actual use case required.

The existing tools force a binary choice:

- `get_records(record_ids)` — full body, large response, frequent harness-cap recovery for batches > ~7.
- `get_record_field(record_id, field_path)` — single record, single field; N records × M fields = N×M tool calls.

Neither matched the common Phase 7a / 7b / 7c shape: "for these N records, give me this field." The landed batched field-projection tool lets the operator request `get_records_field(record_ids=[...10 invariant ids], field_path=['statement'])` in one call, then `get_records_field(record_ids=[...10 invariant ids], field_path=['break_conditions'])` in a second call — two bounded calls instead of one full-body blast.

The friction surfaces at every Canon Safety Check phase: Phase 7a needs invariant statements + break_conditions across all INVs; Phase 7b needs MR firewall fields across all M records (already addressed by `get_firewall_content(world_slug)` for the world-wide bulk case, but not for arbitrary id-batch projections); Phase 7c needs distribution blocks across capability CFs. Across all skills, this shape recurs.

## Assumption Reassessment (2026-05-02)

1. `tools/world-mcp/src/tools/get-records.ts` implements known-id batch retrieval. `tools/world-mcp/src/tools/get-record-field.ts` implements single-record-single-field projection for parsed atomic records and is listed in `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md`. Combining these — batch + projection — is not yet a tool.
2. Live contract correction: `mcp__worldloom__get_record(record_id, section_path?)` handles hybrid-record projection through string `section_path`, while `mcp__worldloom__get_record_field(record_id, field_path, world_slug?)` projects parsed atomic records with `field_path: Array<string | number>` (for example `["distribution", "who_can_do_it"]` or `["extensions", 0, "body"]`). The new `get_records_field` tool inherits the array-segment field-path contract and atomic-record boundary from `get_record_field`; hybrid section projection remains owned by `get_record(section_path)`.
3. Cross-artifact boundary: this is a new MCP tool. It does not modify existing tools' responses. Direct consumers in this ticket are `character-generation`, `diegetic-artifact-generation`, and `canon-addition` targeted-retrieval prose; broader skill migration remains optional additive guidance outside this ticket.
4. FOUNDATIONS principle under audit: §Tooling Recommendation lines 488-490 — "completeness guarantees" of the targeted-retrieval family. Adding a batched field-projection tool extends the family without breaking the existing contract; the pattern remains "context-packet + targeted retrieval", with `get_records_field` as a new bounded targeted-retrieval surface.
5. Schema extension audit per `tickets/README.md` Pre-Implementation Check 10: this ticket is additive — a new tool, no changes to existing tool schemas. Existing consumers continue to use `get_records` and `get_record_field` as before; new consumers can opt into the batched projection.
6. Adjacent contradictions: `mcp__worldloom__get_firewall_content(world_slug)` already implements a bulk firewall-fields projection across all M records (per `.claude/skills/character-generation/references/world-state-prerequisites.md:17`). It is the world-wide bulk variant of what `get_records_field(record_ids=[all M ids], field_path=['disallowed_cheap_answers'])` does for an explicit id list. Both coexist: `get_firewall_content` for the canonical Phase 7b bulk audit; `get_records_field` for arbitrary id-batch projections (e.g., a subset of M records the auditor wants to re-check for a specific revision).
7. Per-record error handling: `get_records` returns a per-id success/error wrapper (`{records: [{record_id, found, record?, error?}]}`). `get_records_field` mirrors this shape as `{records: [{record_id, found, field_value?, error?}]}` so a partial-failure batch returns successes alongside per-id errors without aborting the batch.

## Architecture Check

1. **A new tool is structurally cleaner than overloading `get_records` with a `field_path` parameter.** Overloading would change the response shape conditionally (full record vs. projected field), breaking the existing `{records: [{record_id, found, record}]}` discriminated-union contract for callers that don't pass `field_path`. A new tool with its own response shape preserves discriminated-union purity.
2. **Delegating to the singular projection handler is structurally cleaner than duplicating field traversal.** The live `get_record_field` implementation owns record-id validation, row resolution, YAML parsing, field traversal, provenance, and per-field error details. The batch tool calls that handler once per id and only adds ordered per-id aggregation.
3. No backwards-compatibility aliasing/shims introduced. The new `get_records_field` tool stands alongside `get_records` and `get_record_field`; no existing consumer is forced to migrate. Future skill-prose updates to recommend `get_records_field` for the batched-projection use case are additive guidance, not breaking changes.

## Verification Layers

1. New tool dispatchable via MCP -> codebase grep-proof: `get_records_field` registered in `tools/world-mcp/src/server.ts`; capability metadata exposes the new tool name.
2. Field projection through the existing singular handler -> targeted tool command: response with `field_path=["distribution"]` for a CF id list returns only the `distribution` field per record, not the full body. Response size scales linearly with `len(field_value) × len(record_ids)`, not with full-record-body size.
3. Per-record partial-failure shape preserved -> regression test: response includes per-id errors for invalid record_ids alongside successes for valid ones, parallel to `get_records`'s shape.
4. FOUNDATIONS alignment check: §Tooling Recommendation targeted-retrieval family extended; completeness guarantee preserved (each requested record's projection is either delivered or explicitly errored per id).
5. Cross-skill SKILL prose update -> manual review that `character-generation/references/world-state-prerequisites.md`, `diegetic-artifact-generation/references/world-state-prerequisites.md`, and `canon-addition/references/retrieval-tool-tree.md` recommend `get_records_field` for batched-projection use cases.

## Landed Changes

### 1. Implement `get_records_field` tool

`tools/world-mcp/src/tools/get-records-field.ts` (new):

```ts
export interface GetRecordsFieldArgs {
  record_ids: string[];
  field_path: Array<string | number>;
  world_slug?: string;
}

export interface GetRecordsFieldEntry {
  record_id: string;
  found: boolean;
  field_value?: unknown;
  error?: { code: string; message: string };
}

export interface GetRecordsFieldResponse {
  records: GetRecordsFieldEntry[];
  field_path: Array<string | number>;  // echo input for downstream auditing
}
```

Implemented: for each `record_id`, delegate to the same retrieval path `get_record_field` uses, collecting per-id results into the response array. Shape mirrors `get_records` but the per-entry payload is the projected `field_value` (any JSON type) instead of the full `record`.

### 2. Register the tool in the MCP server

`tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/src/server.ts` expose `get_records_field` in the tool registry and capability metadata. Input schema: `record_ids: string[]` (min 1 item), `field_path: Array<string | number>` (min 1 item), optional `world_slug: string` (min 1 when present).

### 3. Document the tool

- `tools/world-mcp/README.md` — add `get_records_field` to the tool listing with usage examples.
- `docs/FOUNDATIONS.md` — add `get_records_field` to the targeted-retrieval family named by §Tooling Recommendation.
- `docs/MACHINE-FACING-LAYER.md` — add the new tool to the tool inventory table.
- `.claude/skills/character-generation/references/world-state-prerequisites.md` — `Targeted record retrieval (during reasoning)` section adds `get_records_field` with usage example: "for Phase 7c distribution conformance across N capability CFs, prefer `get_records_field(record_ids=[...CF-ids...], field_path=['distribution', 'who_can_do_it'])` over batched `get_records` to avoid harness-cap recovery."
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` — parallel addition.
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` — parallel addition.

### 4. Optional enhancement (deferred to follow-up): multi-field projection

A natural extension would be `get_records_fields(record_ids, field_paths: string[])` returning a per-id map of `{field_path: field_value}` entries. This is out of scope for WMCP-013; defer to a follow-up if the single-field-per-call shape proves insufficient in practice.

## Files to Touch

- `tools/world-mcp/src/tools/get-records-field.ts` (new — handler)
- `tools/world-mcp/src/tool-names.ts` (modify — tool-name inventory)
- `tools/world-mcp/src/server.ts` (modify — tool registration + capability metadata)
- `tools/world-mcp/tests/tools/get-records-field.test.ts` (new — handler test cases)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — MCP dispatch accepts the new tool)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — MCP inventory count)
- `tools/world-mcp/README.md` (modify — tool documentation)
- `docs/FOUNDATIONS.md` (modify — targeted-retrieval family)
- `docs/MACHINE-FACING-LAYER.md` (modify — tool inventory table)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — targeted-retrieval section)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify — targeted-retrieval section)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — targeted-retrieval section)

## Out of Scope

- Multi-field projection per call (deferred per §Landed Changes item 4).
- Replacing `get_records` or `get_record_field` (the new tool extends the family; existing tools remain).
- Extending the field-path syntax beyond what `get_record_field` already supports (array segments are the established contract).
- Streaming responses for very large batches (out of scope; harness inline cap covers the common case once batches are field-projected).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-records-field.test.js` — proves the handler returns per-id projections, mirrors `get_records` partial-failure shape, and respects the array-segment field-path contract.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — proves MCP dispatch and inventory route the new tool name correctly.
3. `cd tools/world-mcp && npm test` — full package suite passes.

### Invariants

1. `get_records_field(record_ids, field_path, world_slug?)` returns `{records: [{record_id, found, field_value?, error?}], field_path}` with one entry per requested id, in request order.
2. Per-record errors do not abort the batch (parallel to `get_records` semantics).
3. Response size scales with `Σ(field_value_size)` not `Σ(full_record_body_size)`; a batch projection of 17 records' single fields fits well under the harness inline cap.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-records-field.test.ts` — cases: (a) batch of valid atomic record_ids returns projected `field_value` per id; (b) mix of valid + invalid record_ids returns per-id errors alongside successes; (c) invalid `field_path` returns per-id error with descriptive message; (d) array field paths with numeric segments work; (e) response size stays bounded for a 17-id batch with a typical field path (asserts the harness-cap regression risk is closed).
2. `tools/world-mcp/tests/server/dispatch.test.ts` — adds dispatch coverage for the new tool name.

### Commands

1. `cd tools/world-mcp && npm test` — full package proof.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-records-field.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — targeted verification of the new tool.

## Outcome

Completed on 2026-05-02. Added `mcp__worldloom__get_records_field(record_ids, field_path, world_slug?)` as a read-only batch field-projection MCP tool for parsed atomic records.

The new handler reuses `getRecordField`, preserves request order, echoes `field_path`, and returns per-id success or error entries without aborting the batch. The server registry, tool-name inventory, list-tools/dispatch coverage, package README, machine-facing layer docs, FOUNDATIONS targeted-retrieval list, and the three named skill-reference consumers now include the new tool.

No world content, `_source/*.yaml` records, approval-token behavior, patch submission, or canon-mutating gate was changed.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/get-records-field.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js`
3. `cd tools/world-mcp && npm test` — 264 tests passed.

Manual/grep review confirmed `tools/world-mcp/README.md`, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md` now describe `get_records_field` as a targeted retrieval surface.

Ignored package artifacts after verification are expected/pre-existing generated state under `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

- The drafted ticket described `field_path` as dot-notation in several places. Live `get_record_field` already uses `Array<string | number>`, so `get_records_field` follows the existing array-segment contract instead of introducing a second path grammar.
- The drafted test plan mentioned hybrid `CHAR-NNNN` field paths. Live hybrid projection is handled by `get_record(record_id, section_path)`; this tool intentionally inherits `get_record_field`'s parsed atomic-record boundary.
