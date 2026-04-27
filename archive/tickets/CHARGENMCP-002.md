# CHARGENMCP-002: Add `list_records` bulk-typed retrieval primitive to world-mcp

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new MCP tool `tools/world-mcp/src/tools/list-records.ts`; `tools/world-mcp/src/server.ts` registration; `tools/world-mcp/src/tool-names.ts`; `docs/MACHINE-FACING-LAYER.md` retrieval table; `tools/world-mcp/README.md` tool inventory; `tools/world-mcp/tests/tools/list-records.test.ts`; server inventory/dispatch tests
**Deps**: none

## Problem

At intake, during the Namahan character-generation run (2026-04-27), satisfying Phase 7a (test against every invariant) and Phase 7b (record every M record into the firewall list) required one of three workarounds: (a) read every `worlds/animalia/_source/invariants/*.yaml` and `worlds/animalia/_source/mystery-reserve/*.yaml` file directly (Hook 2 carve-out for single-file reads — but the design intent is "always go through MCP for `_source/` reads"); (b) call `mcp__worldloom__search_nodes(node_type='invariant_record')` then N follow-up `mcp__worldloom__get_record(record_id)` calls (1 + N round-trips); (c) rely on `mcp__worldloom__get_context_packet` to bring all of them in (covered for `character_generation` by CHARGENMCP-001, but not a general solution for skills outside character-generation).

Before this ticket, the general primitive missing from the MCP surface was "give me every record of type X with optional field projection." `mcp__worldloom__search_nodes(node_type=...)` returned matching node IDs but did not deliver bodies. `mcp__worldloom__get_record(record_id)` was one record at a time. `mcp__worldloom__get_context_packet` was task-typed and locality-first, not a general bulk fetch. `mcp__worldloom__get_canonical_vocabulary` was vocabulary-only. There was no single-call "fetch all invariants" or "fetch every M record's `disallowed_cheap_answers`" primitive.

A typed bulk retrieval would cleanly serve: `continuity-audit` (sweeps over all invariants and all CFs); `propose-new-canon-facts` (broad scan of mystery-reserve open questions); `canon-addition` adjudication when the proposed CF affects multiple invariants and the audit needs each invariant's full break-conditions; `world-validate` follow-ups; and any future skill needing per-record-type sweeps.

## Assumption Reassessment (2026-04-27)

1. At reassessment before implementation, the MCP server (`tools/world-mcp/src/server.ts`, `tools/world-mcp/src/tool-names.ts`) exposed 15 source-registered tools. None matched the "list every record of type X with optional field projection" shape. Verified by inspecting `tools/world-mcp/src/tools/` (`allocate-next-id`, `find-edit-anchors`, `find-impacted-fragments`, `find-named-entities`, `find-sections-touched-by`, `get-canonical-vocabulary`, `get-context-packet`, `get-neighbors`, `get-node`, `get-record`, `get-record-field`, `get-record-schema`, `search-nodes`, `submit-patch-plan`, `validate-patch-plan`).
2. `tools/world-index/` (the SQLite world index) already supports per-node-type queries — `tools/world-mcp/src/tools/search-nodes.ts` filters by `node_type`. The data substrate is in place; only the bulk-body-delivery layer is missing.
3. Cross-skill / cross-artifact boundary under audit: the MCP retrieval surface contract documented in `docs/MACHINE-FACING-LAYER.md` §Localize, §Read full content, §Inspect a known field. The new tool slots into the "Read full content of multiple records of one type" axis, which is currently empty.
4. FOUNDATIONS principle under audit: §Tooling Recommendation's "skills should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current Invariants" and "mystery reserve entries touching the same domain". A bulk primitive strengthens "directly" — it adds a documented retrieval surface for the canonical "give me every X" use case without weakening either targeted or packet-based retrieval.
5. HARD-GATE / canon-write ordering: not touched. The new tool is read-only. It does not modify the patch engine, approval tokens, Hook 3, or canon-mutation flow.
6. Schema extension: the new tool's response shape is independent of any existing tool's response shape. No existing schema is extended or broken. Internal type reuse: `CanonFactRecord`, `InvariantRecord`, `MysteryRecord`, `OpenQuestionRecord`, etc., from `@worldloom/world-index/public/types`.
7. Field projection: callers can request a subset of fields per record (`fields: ['record_id', 'disallowed_cheap_answers']`) to keep response sizes small for large records. Default is full body; projection is opt-in.
8. Adjacent contradictions exposed by reassessment:
   - `mcp__worldloom__get_record_field` (already implemented, registered, but not exposed in the tool surface during the Namahan session — runtime staleness, not a code gap) is the per-record analog of this primitive's per-field projection. The new `list_records` tool composes naturally with it: skill workflows can use `list_records` for the bulk shape and `get_record_field` for narrow lookups on already-known IDs.
   - CHARGENMCP-001 makes the character_generation packet complete-by-construction for invariants and M records; this ticket's primitive is the general analog for non-character-generation flows.
9. Package-command mismatch corrected before implementation: this repo has no root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, or `turbo` surface. `tools/world-mcp/package.json` is the truthful command root; the proof lane is `cd tools/world-mcp && npm run build`, then a compiled direct test such as `node --test dist/tests/tools/list-records.test.js`, then package-local `npm test`.
10. Direct external `mcp__worldloom__list_records` invocation is not exposed in this Codex session before the tool lands. Registration and wrapped-tool behavior will be proved through the package's in-memory MCP client/server tests after build, not by overclaiming an external MCP probe.
11. Live Animalia source counts remain the ticket's motivating witness: `worlds/animalia/_source/invariants/*.yaml` has 16 records and `worlds/animalia/_source/mystery-reserve/*.yaml` has 20 records. The checked-in package test will use the existing temp-index harness rather than depending on gitignored live-world state.

## Architecture Check

1. A typed bulk-retrieval primitive is the cleanest closure over the MCP surface's existing axes: `search_nodes` (IDs by type) + `get_record` (one full body) + `get_record_field` (one field of one record) compose poorly when the question is "every record of type X." Adding a single direct primitive is cheaper than papering over with N+1 retrieval at every callsite.
2. No backwards-compatibility aliasing/shims introduced. `search_nodes` and `get_record` continue to exist with their current semantics; the new tool is additive.

## Verification Layers

1. The new `list_records` tool returns every record of the requested type from the world index — schema validation (response array length matches DB count for that node_type).
2. Field projection (`fields: [...]`) returns only requested fields plus `record_id` (always included) — schema validation.
3. The tool composes correctly with `get_record` and `get_record_field`: the IDs returned can be used as inputs to the per-record tools — codebase grep-proof of type compatibility.
4. The tool does not mutate the world (read-only contract) — codebase grep-proof of no `submitPatchPlan` / `writeFile` / `Edit` reachable from the implementation.
5. FOUNDATIONS alignment — strengthens §Tooling Recommendation "skills should always receive Invariants / mystery reserve entries" by making the underlying retrieval explicit — FOUNDATIONS alignment check.

## What to Change

### 1. Add tool implementation

Create `tools/world-mcp/src/tools/list-records.ts` with the signature:

```ts
export interface ListRecordsInput {
  world_slug: string;
  record_type:
    | "canon_fact"
    | "change_log_entry"
    | "invariant_record"
    | "mystery_record"
    | "open_question_record"
    | "named_entity_record"
    | "section_record";
  fields?: string[]; // optional field projection; record_id always included
}

export async function listRecords(input: ListRecordsInput): Promise<{
  records: Array<Record<string, unknown>>;
  total: number;
  truncated: false;
}>;
```

Implementation reads from the world index (the same DB layer used by `search-nodes` and `get-record`), iterates per-record-type, and returns the full or projected body. No pagination in the v1 — the bounded record types (invariants ≤30, M records ≤30, OQ ≤50) fit in a single response. CFs and sections may grow large; document the trade-off in MACHINE-FACING-LAYER.md and reserve a follow-up ticket for pagination if needed.

### 2. Register in server

Edit `tools/world-mcp/src/server.ts` to register the tool with description "Return all records of a given atomic node type, with optional field projection." Add the tool name to `tools/world-mcp/src/tool-names.ts`.

### 3. Document

Update `docs/MACHINE-FACING-LAYER.md` retrieval table to add `list_records` row: "Return all records of a given atomic record type. Use for bulk-type sweeps such as 'every invariant' or 'every M-NNNN firewall block'. Composes with `get_record` / `get_record_field` for follow-ups on specific IDs."

### 4. Tests

Add `tools/world-mcp/tests/tools/list-records.test.ts`:
- returns all records for a requested atomic record type from a temp-index fixture
- preserves the live Animalia motivating counts in reassessment without depending on gitignored world state
- field projection returns only `record_id` + requested fields
- unsupported `record_type` returns a typed error, not a partial result

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (new)
- `tools/world-mcp/src/server.ts` (modify — tool registration)
- `tools/world-mcp/src/tool-names.ts` (modify — name constant)
- `tools/world-mcp/tests/tools/list-records.test.ts` (new)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — tool inventory count)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — wrapped-tool dispatch)
- `docs/MACHINE-FACING-LAYER.md` (modify — retrieval table)
- `tools/world-mcp/README.md` (modify — tool inventory)

## Out of Scope

- Changes to `canon_addition`, `character_generation`, or any other context packet's task-typed completeness (CHARGENMCP-001 covers character_generation).
- Pagination of large record-type sweeps (CFs, sections) — reserved for a follow-up if a real callsite needs it.
- Skill-level adoption of `list_records` (each skill that wants to use it can land in its own ticket). The character-generation skill's Phase 7 audit will continue to draw from the packet (CHARGENMCP-001), not `list_records`, since the packet's locality-first guarantee is the right tool for that audit.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` passes.
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js` passes.
3. `cd tools/world-mcp && npm test` passes.
4. In-memory MCP dispatch test proves `mcp__worldloom__list_records(world_slug='seeded', record_type='invariant_record')` returns records through the registered server wrapper.
5. Handler-level test proves field projection for `record_type='mystery_record'` returns each record with `record_id` + requested fields and no unrelated fields.

### Invariants

1. The new tool is read-only — no canonical-state mutation reachable from its implementation.
2. The tool name `list_records` is unique across `tools/world-mcp/src/tool-names.ts`.
3. Field projection always includes `record_id` regardless of what `fields[]` carries.
4. The response is structurally complete — `total` matches `records.length` and `truncated` is `false` (v1 does not paginate).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` (new) — covers full-body retrieval, field projection, invalid record-type error path, and world-not-found error path.
2. `tools/world-mcp/tests/server/list-tools.test.ts` (modified) — proves the registered inventory count includes the new tool.
3. `tools/world-mcp/tests/server/dispatch.test.ts` (modified) — proves the wrapped MCP server dispatches the new tool.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js`
3. `cd tools/world-mcp && npm test`
4. Direct external MCP invocation after a Codex/Claude restart is an operational smoke only; it was not part of this run's acceptance surface because the new tool was not exposed in the active session before restart.

## Outcome

Completed on 2026-04-27.

Implemented `mcp__worldloom__list_records` as an additive read-only `tools/world-mcp` retrieval primitive. The tool queries the world index by supported atomic record type, parses record YAML through the existing `get_record` parser path, returns full parsed records by default, and supports top-level field projection with `record_id` always included.

The server registry, tool-name inventory, package README, and `docs/MACHINE-FACING-LAYER.md` now document the 16-tool MCP surface and the intended bulk-record sweep use case. Server inventory and dispatch tests were updated so registration is proved through the in-memory MCP wrapper, not only the direct handler.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js`
3. `cd tools/world-mcp && npm test`

Manual/source checks completed:

1. Confirmed live Animalia motivating counts: 16 invariant YAML records and 20 Mystery Reserve YAML records under `worlds/animalia/_source/`.
2. Confirmed no root pnpm workspace or turbo command surface exists; package-local npm commands are the truthful proof lane.
3. Confirmed the active Codex session did not expose a direct `mcp__worldloom__list_records` tool before restart; package-local in-memory MCP tests are the accepted substitute proof.

## Deviations

The drafted `pnpm --filter world-mcp ...` and `pnpm turbo test` commands were replaced with the live package-local npm proof surface. The drafted direct post-build MCP probes were also replaced with direct handler and in-memory MCP server tests because the session toolset cannot expose a newly added MCP tool until the server is rebuilt and the client session restarts.
