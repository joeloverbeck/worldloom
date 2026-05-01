# WMCP-006: Add `mcp__worldloom__get_records` for batched parallel record retrieval

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — registered `mcp__worldloom__get_records` in `tools/world-mcp/src/server.ts` and `tools/world-mcp/src/tool-names.ts`; implemented under `tools/world-mcp/src/tools/`; updated package inventory tests/docs, machine-facing docs, and consumer skill guidance for known-id batch retrieval
**Deps**: None

## Problem

At intake, `mcp__worldloom__get_record(record_id)` retrieved a single record by id. Skills that needed multiple records after the initial context packet — typical of Phase 5 capability validation, Phase 7c distribution conformance, and post-fallback recovery — had to call `get_record` sequentially, one record per round-trip. Each call was small and fast individually; the round-trip count was the friction. There was no batched retrieval surface.

During the character-generation session that produced CHAR-0001 for `worlds/erotica-world`, after the context-packet response was redirected to persisted-output (per WMCP-005's overflow scenario), the recovery flow needed `SEC-INS-001` (institutions section, for Spanish state / Catholic Church / cuadrilla institutional axes) and `CF-0002` (the load-bearing CF for Marla's intersex anatomy distribution) plus several other records the subagent extracted from the persisted file. These were retrieved via two sequential `get_record` calls. With a richer brief (a character whose Phase 5 capabilities span 5+ CFs across 3 SEC contexts and intersect 2-3 invariants beyond the packet's seed locality), the sequential count climbs to 8-12 calls. Each costs ~200-500ms; a single batched call against the same SQLite-backed index would parallelize internally and return all records in approximately the latency of one call.

At intake, the MCP tool surface already included batch-shaped tools (`mcp__worldloom__find_named_entities` takes `names: string[]`, `mcp__worldloom__get_firewall_content` returns every M-record in one call, `mcp__worldloom__list_records` filters by class). Single-record retrieval was the only retrieval shape that was not batchable.

## Assumption Reassessment (2026-05-01)

1. The current single-record retrieval is implemented in `tools/world-mcp/src/tools/get-record.ts` and registered in `tools/world-mcp/src/server.ts`. It accepts `record_id` and optional `world_slug`/`section_path`. Returns parsed YAML for atomic records (CF, CH, INV, M, OQ, ENT, SEC) or parsed frontmatter + body sections for hybrid records (CHAR, DA, PA). The implementation reads from `tools/world-index/`'s SQLite index and shares `validateRecordId`, `resolveRecordRow`, and `parseRecordBody` with adjacent retrieval helpers.
2. FOUNDATIONS principle under audit: §Tooling Recommendation ("LLM agents should never operate on prose alone... directly or via the documented context-packet + targeted-retrieval pattern"). The targeted-retrieval leg of the contract currently has only single-record granularity. Batched retrieval is an additive extension that preserves the contract while reducing round-trip cost — no new completeness claims, just better delivery shape for a load that was already permitted as N sequential calls.
3. Cross-skill shared boundary: every skill that performs post-packet targeted retrieval consumes `get_record` — `canon-addition` (Phase 7 invariant + MR + CF lookups), `character-generation` (Phase 5 capability CF lookups + Phase 7c distribution conformance), `diegetic-artifact-generation` (Phase 3 claim CF lookups + Phase 7b MR firewall), `continuity-audit` (cross-record audits). All would benefit from batched retrieval; none would break under additive new tool registration.
4. FOUNDATIONS alignment: §Tooling Recommendation already enumerated `mcp__worldloom__get_record` and `mcp__worldloom__get_record_field` as targeted-retrieval surfaces. Adding `mcp__worldloom__get_records` (plural) is a parallel batched form of the same pattern; the FOUNDATIONS text needed an additive mention so the authoritative targeted-retrieval list matched the landed tool surface.
5. Existing same-seam behavior to preserve: `get_record` (singular) keeps working unchanged. `get_record_field` keeps working unchanged. The new batched tool returns each successful singular `get_record` response under the per-entry `record` key, wrapped in a `records: [...]` array indexed by request order.
6. Schema extension shape: additive — adds a new MCP tool name, new input schema, new output shape. No existing schema is modified.
7. Adjacent contradictions: `mcp__worldloom__list_records` (existing) returns every record of a class; `mcp__worldloom__get_firewall_content` returns every M-record. Those whole-class projections are different shape from id-list batched retrieval — they don't replace this ticket.
8. Mismatch + correction: the live `tools/world-mcp` registration contract also requires `tools/world-mcp/src/tool-names.ts`, `tools/world-mcp/tests/server/list-tools.test.ts`, and `tools/world-mcp/README.md` updates for a new tool. Those surfaces are same-seam fallout and are added to this ticket's owned file set before source edits.

## Architecture Check

1. **A batched-by-id tool is cleaner than a per-call cache or sequential auto-batching layer.** The consumer knows which records it needs as a set; the MCP tool can fetch them in parallel from the index. Auto-batching (queuing single-record calls and dispatching them as a batch) would require client-side coordination invisible to the call shape; explicit batching is honest about the round-trip savings.
2. **Batched retrieval composes with `get_record_field` semantics via per-id projection.** A future extension can accept `[{record_id, section_path?}, ...]` to allow per-record narrow projection within a single batch. This ticket scopes to full-record retrieval per id; per-id projection is a follow-up if usage shows demand.
3. No backwards-compatibility aliasing/shims introduced. The new tool is additive; the singular `get_record` continues to be the right tool for one-off retrievals where batching has no benefit.

## Verification Layers

1. Batched retrieval returns the same per-record content as N sequential `get_record` calls -> `tools/world-mcp/tests/tools/get-records.test.ts` (new) constructs a 5-record id list spanning atomic and hybrid record classes, compares each returned record to the result of a singular `get_record(id)` call, and proves byte-equality.
2. Batched retrieval handles missing ids gracefully -> the same test proves a partial-failure case (4 valid ids + 1 nonexistent) returns 4 records + 1 explicit error entry under the same response shape, without aborting the whole batch.
3. Batched retrieval is registered and advertised through the MCP inventory -> `tools/world-mcp/tests/server/list-tools.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts`.
4. FOUNDATIONS alignment -> manual review of `docs/FOUNDATIONS.md` §Tooling Recommendation; the new tool is listed as a targeted-retrieval surface alongside `get_record` and `get_record_field`.

## What to Change

### 1. Implement the new tool

Created `tools/world-mcp/src/tools/get-records.ts` with this tool signature:

```ts
input: {
  world_slug?: string,
  record_ids: string[]   // 1..N record ids (atomic or hybrid)
}

output: {
  records: Array<{
    record_id: string,
    found: boolean,
    record?: <same response shape as singular get_record>,
    content_hash?: string,
    file_path?: string,
    error?: { code: string, message: string, details?: object }   // populated when found=false
  }>
}
```

The `records` array is ordered to match the request's `record_ids` array — same length, same order, so consumers can match request to response by index.

### 2. Register the tool in the MCP server

Updated `tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/src/server.ts` to register `mcp__worldloom__get_records` alongside the existing single-record `get_record` registration through the existing `registerToolWithCapability` pattern.

### 3. Wire the tool through the worldloom-mcp dispatcher

Extended `tools/world-mcp/tests/server/dispatch.test.ts` with a `get_records` in-memory MCP call and validation-boundary coverage.

### 4. Document the new tool

Updated the machine-facing layer documentation:

- `docs/FOUNDATIONS.md` §Tooling Recommendation — add a one-line mention of `mcp__worldloom__get_records` alongside the existing `mcp__worldloom__get_record` and `mcp__worldloom__get_record_field` entries (additive sentence).
- `docs/MACHINE-FACING-LAYER.md` (if present) — document the new tool's input/output shape and the batched-vs-sequential rationale.
- `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern — note that consumers needing N records can use the batched form for parallel delivery.

### 5. Update consumer SKILLs to use the batched form where applicable

Audited the character-generation, canon-addition, diegetic-artifact-generation, and continuity-audit retrieval guidance for sites where multiple `get_record` calls are prescribed in a tight loop. Replaced those sites' guidance with `mcp__worldloom__get_records(record_ids: [...])` where the call is a known-set fetch.

This step is conservative: only update SKILL prescriptions where the call shape is currently "for each X in known_set: get_record(X)". Calls where the known-set is discovered iteratively (e.g., follow-on lookups after reading the first record) stay as singular `get_record`.

## Files to Touch

- `tools/world-mcp/src/tools/get-records.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify) — add the public tool name and deterministic inventory order
- `tools/world-mcp/src/server.ts` (modify) — register the new tool
- `tools/world-mcp/tests/tools/get-records.test.ts` (new) — proves contract + parity with singular form
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify) — extend dispatcher coverage to include the new tool
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify) — update exact registered tool inventory count
- `tools/world-mcp/README.md` (modify) — document package-local tool inventory
- `docs/FOUNDATIONS.md` (modify) — add `get_records` to §Tooling Recommendation list
- `docs/MACHINE-FACING-LAYER.md` (modify if present) — document the batched form
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify) — note batched retrieval in §Index + Follow-Up Retrieval Pattern
- `.claude/skills/character-generation/SKILL.md` (modify) — update top-level fallback summary to name known-id batched retrieval
- `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` (modify) — update Phase 7c guidance to prefer batched retrieval for known CF sets
- `.claude/skills/character-generation/references/phases-1-6-character-construction.md` (modify) — update Phase 5 capability guidance similarly
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify) — update dropped-layer and fallback retrieval guidance
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify) — update known-set proposal/SEC retrieval guidance
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify) — update top-level fallback summary to name known-id batched retrieval
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify) — update dropped-layer and fallback retrieval guidance
- `.claude/skills/diegetic-artifact-generation/references/phase-7-canon-safety-check.md` (modify) — update Phase 7c known-set CF retrieval guidance
- `.claude/skills/continuity-audit/references/retrieval-tool-tree.md` (modify) — update known CH window and target-CF verification guidance

## Out of Scope

- Per-id projection within a batch (`[{record_id, section_path?}, ...]` — defer until usage shows demand).
- Streaming response shape (single response per record as it's fetched — defer; the response is small enough that batched-then-returned suffices).
- Auto-batching client-side wrapper around singular `get_record` calls — explicit batched form is the right interface; auto-batching invites surprising latency.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-records.test.js` — proves batched retrieval behavior, partial-failure handling, and parity with singular form.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/server/dispatch.test.js` — proves the new tool is registered and dispatched correctly.
3. `cd tools/world-mcp && npm test` — full test suite passes.

### Invariants

1. `get_records({record_ids: [a, b, c]})` returns 3 records in [a, b, c] order, where each record's content is byte-equal to the result of a singular `get_record({record_id: x})` call for the same x.
2. Missing or invalid record ids in a batch return a `found: false` entry with an `error` shape; the rest of the batch is unaffected.
3. The new tool is registered and dispatchable from the MCP server alongside the existing single-record tool.
4. The new tool is mentioned in the FOUNDATIONS §Tooling Recommendation list of targeted-retrieval surfaces.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-records.test.ts` — fixture test proving (a) byte-parity with singular form across 5 records (CF, SEC, M, CHAR, DA); (b) partial-failure handling for missing and invalid ids; (c) preserved order in response; (d) hybrid records returned in batch alongside atomic records.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — extended existing dispatcher coverage with one case proving `get_records` is registered and reachable.
3. `tools/world-mcp/tests/server/list-tools.test.ts` — updated exact tool inventory count to 20.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-records.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — targeted verification.
2. `cd tools/world-mcp && npm test` — full pipeline.
3. Manual MCP invocation is not part of this closeout because newly added tools require rebuilt `dist/` plus MCP client/server restart before the live connector can see them; package-local in-memory dispatch is the truthful post-change proof surface.

## Outcome

Implemented `mcp__worldloom__get_records` as an additive read-only MCP tool. The handler accepts `record_ids: string[]` plus optional `world_slug`, returns one ordered entry per requested id, wraps the same successful payload shape as singular `get_record`, and keeps missing or invalid ids as per-entry `{ found: false, error }` results without aborting the batch.

Registered the tool in the centralized inventory and server, updated exact list-tools and dispatch coverage, and documented the new known-id retrieval path in `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, and `tools/world-mcp/README.md`.

Updated consumer skill guidance where the live instruction was a known-set `get_record` loop: character-generation Phase 5 / Phase 7c / fallback guidance, canon-addition proposal and SEC retrieval guidance, diegetic-artifact fallback and Phase 7c guidance, and continuity-audit known-window / target-CF verification guidance. Singular `get_record` remains documented for one-off and iterative follow-up retrieval.

## Verification Result

Completed:

1. `cd tools/world-mcp && npm run build` — passed after fixing a TypeScript narrowing issue in the new test.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-records.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — passed.
3. `cd tools/world-mcp && npm test` — passed, 248 tests.

The package command regenerated `tools/world-mcp/dist/`; `tools/world-mcp/node_modules/` and `tools/world-mcp/.secret` were pre-existing ignored package artifacts in the initial ignored-aware status and remain ignored.

## Deviations

- The proof target changed from a manual latency measurement to behavioral and registration proof. The ticket's own text already described the latency check as non-strict proof-of-life, so it is not kept as an acceptance gate.
- Direct live `mcp__worldloom__get_records` invocation was not run because the active Codex toolset does not expose newly added MCP tools until the package is rebuilt and the MCP client/server session is restarted. The in-memory MCP dispatch test proves the registered tool boundary against the rebuilt package artifact.
