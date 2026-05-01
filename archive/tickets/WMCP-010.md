# WMCP-010: Add optional `node_type_filter` parameter to `find_named_entities`

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/find-named-entities.ts`, `tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/canon-addition/references/proposal-normalization.md`, `.claude/skills/canon-addition/references/retrieval-tool-tree.md`, `.claude/skills/character-generation/SKILL.md`
**Deps**: WMCP-001 (find_named_entities tool exists)

## Problem

At intake, the canon-addition pre-figuring scan documented at `.claude/skills/canon-addition/SKILL.md` §World-State Prerequisites needed ONLY matches whose mentions include `character_record` or `diegetic_artifact_record` node types — those are the records that pre-figure named-entity commitments and trigger Rule 6 (No Silent Retcons) `source_basis.derived_from` citation. Before this ticket, `find_named_entities` returned ALL matches with full `mentions_by_node_type[]` arrays for every canonical match (the GazteluFit session's response contained matches with up to 7 different `node_type` entries per match — character_record, section, ontology_category, invariant, mystery_reserve_entry, open_question_entry, bullet_cluster). The operator had to filter client-side.

Documented friction: prior to the canon-addition skill audit on 2026-05-01, the skill prose said *"use `mcp__worldloom__find_named_entities(names)` filtered to `node_type ∈ {character_record, diegetic_artifact_record}`"* — implying a tool-side filter parameter. The audit Issue 3 corrected the prose to client-side filtering because no such parameter exists; the fix landed in canon-addition's references at session-time. The corrected prose is operationally correct but expensive: every pre-figuring scan returns full `mentions_by_node_type[]` arrays the operator immediately discards, and the documented intent (filter to character / diegetic-artifact records) was always clear.

A server-side filter parameter restores the original documented intent, reduces response payload, and makes the pre-figuring scan operation self-evident from the call signature.

## Assumption Reassessment (2026-05-01)

1. At intake, `tools/world-mcp/src/tools/find-named-entities.ts` declared `FindNamedEntitiesArgs` with two fields: `world_slug: string` and `names: string[]`. No filter parameter existed. `MentionNodeTypeGroup` already used `node_type: NodeType` and `count: number`, and `CanonicalMatch` already exposed `mentions_by_node_type: MentionNodeTypeGroup[]` populated by `loadMentionGroups`.
2. At intake, `loadMentionGroups` executed a SQL `SELECT n.node_type, COUNT(*) AS count ... GROUP BY n.node_type`. Adding an `AND n.node_type IN (...)` clause to filter at the SQL layer is the canonical implementation; the SQL surface already supported it.
3. Cross-artifact boundary: this ticket touches the MCP-side tool contract, package/repo command docs, and the skill files that document node-type-filtered `find_named_entities` use. The shared interface is the tool's input schema; a new optional parameter is additive.
4. FOUNDATIONS principle under audit: §Rule 6 (No Silent Retcons) — pre-figured names MUST cite originating `DA-NNNN` / `CHAR-NNNN` records in `source_basis.derived_from`. The filter parameter does not weaken this discipline; it makes the relevant record-type lookup more efficient. Mystery Reserve firewall is unaffected (the filter is on node-type, not on M-record content).
5. Schema extension audit: existing callers passing only `world_slug` and `names` are unaffected; the new optional `node_type_filter: NodeType[]` parameter defaults to undefined, preserving prior behavior. Per `tickets/README.md` Pre-Implementation Check 10, the extension is additive-only with default-preservation semantics.
6. Pipeline-wide blast radius: live grep showed the stale client-side filter contract in `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/canon-addition/references/proposal-normalization.md`, `.claude/skills/canon-addition/references/retrieval-tool-tree.md`, and `.claude/skills/character-generation/SKILL.md`. Other `find_named_entities` mentions remain generic resolution guidance and do not claim the old two-field schema.
7. Live package command correction (2026-05-02): the repository has package-local manifests under `tools/*` and no root `pnpm-workspace.yaml` / root `package.json` workspace command. The truthful proof is `npm test` from `tools/world-mcp`, which runs `npm run build && node --test "dist/tests/**/*.test.js"`.
8. Same-seam doc correction (2026-05-02): `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` document the user-facing `find_named_entities` command surface and were updated with the new optional parameter. `.claude/skills/character-generation/SKILL.md` also contained an explicit stale claim that the tool schema accepted only `world_slug` and `names`; that same-seam claim was corrected to use `node_type_filter=['character_record']`.

## Architecture Check

1. Adding a server-side filter at the SQL layer is structurally cleaner than the pre-ticket "fetch everything, filter client-side" pattern. Per the canon-addition audit's Issue 3 wording, the documented intent always was a tool-side filter; this ticket realizes that intent. Alternative approaches (a separate `find_pre_figured_entities` tool, a derived view) introduce more surface area than the parameter-addition does.
2. No backwards-compatibility aliasing/shims introduced. The new parameter is optional with default-undefined behavior preserving prior semantics; no deprecated wrapper or alternative tool name is left behind.

## Verification Layers

1. New parameter is recognized at the tool input -> codebase grep-proof: `node_type_filter` appears in `FindNamedEntitiesArgs` declaration in `tools/world-mcp/src/tools/find-named-entities.ts`.
2. Filter restricts response payload at the SQL layer -> schema validation: response with `node_type_filter: ["character_record", "diegetic_artifact_record"]` returns `mentions_by_node_type[]` arrays containing only those two node types (no `section`, `invariant`, etc. entries).
3. Pre-figuring scan use case is preserved -> manual review: canon-addition skill prose and references route named-entity pre-figuring scans through `node_type_filter=['character_record', 'diegetic_artifact_record']` while retaining Rule 6 `source_basis.derived_from` discipline.
4. Default behavior unchanged -> regression test: existing call signature `findNamedEntities({ world_slug, names })` returns the same unfiltered response shape.
5. FOUNDATIONS alignment check: §Rule 6 audit-trail discipline preserved; pre-figured-by-DA / CHAR citation pathway unchanged.

## Landed Changes

### 1. Add optional input parameter

`tools/world-mcp/src/tools/find-named-entities.ts` extends `FindNamedEntitiesArgs`:

```ts
export interface FindNamedEntitiesArgs {
  world_slug: string;
  names: string[];
  node_type_filter?: NodeType[];
}
```

`NodeType` remains imported from `@worldloom/world-index/public/types`; no new public type export was needed.

### 2. Apply filter at SQL layer

`loadMentionGroups` now adds a conditional `AND n.node_type IN (?, ?, ...)` clause when `node_type_filter` is provided. The clause uses parameterized values. When the filter is absent, the existing unfiltered query path remains.

### 3. Filter empty-mention canonical matches

When `node_type_filter` is provided and a canonical match's `mentions_by_node_type[]` is empty post-filter, the canonical match is dropped from the response. The response interface comment documents this behavior. An empty filter array returns no canonical matches.

### 4. Update tool schema registration

`tools/world-mcp/src/server.ts` declares optional `node_type_filter` with `NODE_TYPES` enum values and exposes that enum in `describe_capabilities`.

### 5. Rebuild dist and propagate

`npm test` rebuilt `tools/world-mcp/dist/` through the package's existing build flow.

### 6. Update canon-addition skill prose

`.claude/skills/canon-addition/SKILL.md` §World-State Prerequisites now uses the server-side filter:

> *"For pre-figuring scans of named entities the proposal commits, use `mcp__worldloom__find_named_entities(names, node_type_filter=['character_record', 'diegetic_artifact_record'])` — server-side filtering returns only canonical matches with mentions in those record types. Pre-figured names MUST cite the originating `DA-NNNN` / `CHAR-NNNN` in the new CF's `source_basis.derived_from` per Rule 6 (No Silent Retcons)."*

The same usage is mirrored in `.claude/skills/canon-addition/references/proposal-normalization.md` §Pre-figuring diegetic-artifact citation and `.claude/skills/canon-addition/references/retrieval-tool-tree.md` §Phase 0-2 Normalize, Scope, Invariants. Package-level and repo-level command docs also describe the new optional parameter.

## Files to Touch

- `tools/world-mcp/src/tools/find-named-entities.ts` (modify — add parameter + apply SQL filter)
- `tools/world-mcp/src/server.ts` (modify — tool schema registration)
- `tools/world-mcp/tests/tools/find-named-entities.test.ts` (modify — filtered handler coverage)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — MCP dispatch accepts filtered input)
- `tools/world-mcp/README.md` (modify — tool usage docs)
- `docs/MACHINE-FACING-LAYER.md` (modify — command-surface docs)
- `tools/world-mcp/dist/**` (rebuilt)
- `.claude/skills/canon-addition/SKILL.md` (modify — §World-State Prerequisites usage)
- `.claude/skills/canon-addition/references/proposal-normalization.md` (modify — §Pre-figuring diegetic-artifact citation)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — §Phase 0-2)
- `.claude/skills/character-generation/SKILL.md` (modify — same-seam stale schema claim)

## Out of Scope

- Filtering on `match_kind` (canonical vs alias) or `provenance_scope` (world / proposal / diegetic / audit) — separate parameters if needed; deferred to follow-up tickets.
- Adding similar filter parameters to `search_nodes` or other retrieval tools — those have richer existing filter shapes; addressed separately if friction emerges.
- Changing the response shape for unfiltered calls (existing callers preserved).

## Acceptance Criteria

### Tests That Passed

1. `findNamedEntities({world_slug, names, node_type_filter: ["character_record", "diegetic_artifact_record"]})` returns canonical matches whose `mentions_by_node_type[]` arrays contain ONLY those two node types.
2. A canonical match whose mentions are all of OTHER node types (e.g., `section`, `invariant`, `ontology_category`) is excluded from the response when the filter is applied.
3. `mcp__worldloom__find_named_entities({world_slug, names})` (no filter) returns the same response shape and content as it did pre-ticket (regression check).
4. Filter accepts a single-element array (e.g., `["character_record"]`) — no array-shape edge case.
5. Filter accepts the empty array — semantically equivalent to "no matches of any node type" and returns an empty `canonical_matches` array.
6. Canon-addition skill prose and references point operators to the filtered call that preserves `source_basis.derived_from` citation discipline for prior `CHAR-NNNN` / `DA-NNNN` mentions.

### Invariants

1. Default behavior (no filter) preserves prior response shape and content for existing callers.
2. Filter applies at SQL layer (not in TypeScript post-processing) for response-payload reduction.
3. Pre-figuring discipline (Rule 6 audit-trail citation) is preserved.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — asserts filter-with-matches, single-filter-without-matches, empty-filter semantics, canonical-match dropping, and no-filter regression through the package temp-world fixture.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — asserts the MCP registration/validation boundary accepts `node_type_filter`.

### Commands

1. `cd tools/world-mcp && npm test` — runs `npm run build && node --test "dist/tests/**/*.test.js"`.

## Outcome

Completion date: 2026-05-02.

`find_named_entities` now accepts optional `node_type_filter: NodeType[]`. The handler applies the filter in the mention-group SQL query, drops canonical matches that have no remaining mention groups when the filter is present, and preserves prior unfiltered response behavior. The MCP input schema and capability metadata expose the new parameter, and package/skill docs now use the server-side filter for canon-addition pre-figuring scans.

## Verification Result

- `cd tools/world-mcp && npm test` — PASS. This rebuilt `dist/` and ran the compiled package test suite: 256 passing tests, 0 failures.
- Stale-prose sweep for old client-side filter claims across `.claude/skills`, `docs`, `tools/world-mcp/README.md`, and this ticket found no remaining active consumer stale claims; the only remaining `client-side filtering` hit is labelled historical intake evidence in this ticket.
- `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were pre-existing ignored package artifacts before verification and remained ignored/generated artifacts after `npm test`.

## Deviations

- The drafted `pnpm --filter @worldloom/world-mcp test` command was replaced with the live package-local `npm test` command because this repo does not have a root pnpm workspace.
- No direct external `mcp__worldloom__find_named_entities` smoke was recorded after the source change because the active session does not prove a rebuilt/restarted external MCP server. Package-local handler tests plus in-memory MCP dispatch coverage are the truthful proof surface for the changed source.
