# WMCP-010: Add optional `node_type_filter` parameter to `find_named_entities`

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/find-named-entities.ts`, `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/canon-addition/references/proposal-normalization.md`, `.claude/skills/canon-addition/references/retrieval-tool-tree.md`
**Deps**: WMCP-001 (find_named_entities tool exists)

## Problem

The canon-addition pre-figuring scan documented at `.claude/skills/canon-addition/SKILL.md` §World-State Prerequisites needs ONLY matches whose mentions include `character_record` or `diegetic_artifact_record` node types — those are the records that pre-figure named-entity commitments and trigger Rule 6 (No Silent Retcons) `source_basis.derived_from` citation. The current `find_named_entities` tool returns ALL matches with full `mentions_by_node_type[]` arrays for every canonical match (the GazteluFit session's response contained matches with up to 7 different `node_type` entries per match — character_record, section, ontology_category, invariant, mystery_reserve_entry, open_question_entry, bullet_cluster). The operator must filter client-side.

Documented friction: prior to the canon-addition skill audit on 2026-05-01, the skill prose said *"use `mcp__worldloom__find_named_entities(names)` filtered to `node_type ∈ {character_record, diegetic_artifact_record}`"* — implying a tool-side filter parameter. The audit Issue 3 corrected the prose to client-side filtering because no such parameter exists; the fix landed in canon-addition's references at session-time. The corrected prose is operationally correct but expensive: every pre-figuring scan returns full `mentions_by_node_type[]` arrays the operator immediately discards, and the documented intent (filter to character / diegetic-artifact records) was always clear.

A server-side filter parameter restores the original documented intent, reduces response payload, and makes the pre-figuring scan operation self-evident from the call signature.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/find-named-entities.ts` lines 7-10 declare `FindNamedEntitiesArgs` with two fields: `world_slug: string` and `names: string[]`. No filter parameter exists today. Lines 12-15 declare `MentionNodeTypeGroup` with `node_type: NodeType` and `count: number`. Lines 17-26 declare `CanonicalMatch` with `mentions_by_node_type: MentionNodeTypeGroup[]` populated by `loadMentionGroups` (called at lines 231 and 267).
2. `loadMentionGroups` (referenced by line 231/267) executes a SQL `SELECT n.node_type, COUNT(*) AS count ... GROUP BY n.node_type` (line 176-182, 350-357). Adding a `WHERE n.node_type IN (...)` clause to filter at the SQL layer is the canonical implementation; the SQL surface already supports it.
3. Cross-artifact boundary: this ticket touches the MCP-side tool and three skill files (`SKILL.md`, `references/proposal-normalization.md`, `references/retrieval-tool-tree.md`) all of which document the `find_named_entities` filter intent. The shared interface is the tool's input schema; a new optional parameter is additive.
4. FOUNDATIONS principle under audit: §Rule 6 (No Silent Retcons) — pre-figured names MUST cite originating `DA-NNNN` / `CHAR-NNNN` records in `source_basis.derived_from`. The filter parameter does not weaken this discipline; it makes the relevant record-type lookup more efficient. Mystery Reserve firewall is unaffected (the filter is on node-type, not on M-record content).
5. Schema extension audit: existing callers passing only `world_slug` and `names` are unaffected; the new optional `node_type_filter: NodeType[]` parameter defaults to undefined, preserving prior behavior. Per `tickets/README.md` Pre-Implementation Check 10, the extension is additive-only with default-preservation semantics.
6. Pipeline-wide blast radius: `find_named_entities` is referenced in `.claude/skills/canon-addition/SKILL.md` line 27, line 75 (post-2026-05-01 audit edit) and `references/proposal-normalization.md` line ~98 + `references/retrieval-tool-tree.md` line 16. No other skill currently invokes `find_named_entities` per the cross-skill grep run during the canon-addition audit.

## Architecture Check

1. Adding a server-side filter at the SQL layer is structurally cleaner than the current "fetch everything, filter client-side" pattern. Per the canon-addition audit's Issue 3 wording, the documented intent always was a tool-side filter; this ticket realizes that intent. Alternative approaches (a separate `find_pre_figured_entities` tool, a derived view) introduce more surface area than the parameter-addition does.
2. No backwards-compatibility aliasing/shims introduced. The new parameter is optional with default-undefined behavior preserving prior semantics; no deprecated wrapper or alternative tool name is left behind.

## Verification Layers

1. New parameter is recognized at the tool input -> codebase grep-proof: `node_type_filter` appears in `FindNamedEntitiesArgs` declaration in `tools/world-mcp/src/tools/find-named-entities.ts`.
2. Filter restricts response payload at the SQL layer -> schema validation: response with `node_type_filter: ["character_record", "diegetic_artifact_record"]` returns `mentions_by_node_type[]` arrays containing only those two node types (no `section`, `invariant`, etc. entries).
3. Pre-figuring scan use case is preserved -> skill dry-run: canon-addition with a brief naming a previously-character-mentioned entity returns the canonical-match including its `character_record` mention; the `source_basis.derived_from` citation discipline (Rule 6) operates correctly.
4. Default behavior unchanged -> regression test: existing call signature `find_named_entities(world_slug, names)` returns the same response shape it always did.
5. FOUNDATIONS alignment check: §Rule 6 audit-trail discipline preserved; pre-figured-by-DA / CHAR citation pathway unchanged.

## What to Change

### 1. Add optional input parameter

In `tools/world-mcp/src/tools/find-named-entities.ts` lines 7-10, extend `FindNamedEntitiesArgs`:

```ts
export interface FindNamedEntitiesArgs {
  world_slug: string;
  names: string[];
  node_type_filter?: NodeType[];
}
```

Re-export `NodeType` if needed for tool-schema consumers; the type already exists in `@worldloom/world-index/public/types`.

### 2. Apply filter at SQL layer

In the `loadMentionGroups` SQL execution (around line 176-182 and 350-357), add a conditional `WHERE n.node_type IN (?, ?, ...)` clause when `node_type_filter` is provided. The clause uses parameterized values to prevent injection. When the filter is absent, fall through to the existing unfiltered query.

### 3. Filter empty-mention canonical matches

After SQL execution, when `node_type_filter` is provided AND a canonical match's `mentions_by_node_type[]` is empty post-filter, drop the canonical match from the response (the filter excluded all of its mentions; the match is no longer of-interest for the documented use case). Document this behavior in the response interface comment.

### 4. Update tool schema registration

In `tools/world-mcp/src/index.ts` (or wherever the tool's MCP schema is registered), declare the optional `node_type_filter` parameter with the `NodeType` enum's values as the permissible array members.

### 5. Rebuild dist and propagate

Rebuild `tools/world-mcp/dist/` per existing build flow.

### 6. Update canon-addition skill prose

In `.claude/skills/canon-addition/SKILL.md` §World-State Prerequisites, replace the current client-side-filter prescription (post-2026-05-01 audit edit) with the server-side filter usage:

> *"For pre-figuring scans of named entities the proposal commits, use `mcp__worldloom__find_named_entities(names, node_type_filter=['character_record', 'diegetic_artifact_record'])` — server-side filtering returns only canonical matches with mentions in those record types. Pre-figured names MUST cite the originating `DA-NNNN` / `CHAR-NNNN` in the new CF's `source_basis.derived_from` per Rule 6 (No Silent Retcons)."*

Mirror the change in `.claude/skills/canon-addition/references/proposal-normalization.md` §Pre-figuring diegetic-artifact citation and `.claude/skills/canon-addition/references/retrieval-tool-tree.md` §Phase 0-2 Normalize, Scope, Invariants.

## Files to Touch

- `tools/world-mcp/src/tools/find-named-entities.ts` (modify — add parameter + apply SQL filter)
- `tools/world-mcp/src/index.ts` (modify — tool schema registration, if separate)
- `tools/world-mcp/dist/**` (rebuilt)
- `.claude/skills/canon-addition/SKILL.md` (modify — §World-State Prerequisites usage)
- `.claude/skills/canon-addition/references/proposal-normalization.md` (modify — §Pre-figuring diegetic-artifact citation)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — §Phase 0-2)

## Out of Scope

- Filtering on `match_kind` (canonical vs alias) or `provenance_scope` (world / proposal / diegetic / audit) — separate parameters if needed; deferred to follow-up tickets.
- Adding similar filter parameters to `search_nodes` or other retrieval tools — those have richer existing filter shapes; addressed separately if friction emerges.
- Changing the response shape for unfiltered calls (existing callers preserved).

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__find_named_entities({world_slug, names, node_type_filter: ["character_record", "diegetic_artifact_record"]})` returns canonical matches whose `mentions_by_node_type[]` arrays contain ONLY those two node types.
2. A canonical match whose mentions are all of OTHER node types (e.g., `section`, `invariant`, `ontology_category`) is excluded from the response when the filter is applied.
3. `mcp__worldloom__find_named_entities({world_slug, names})` (no filter) returns the same response shape and content as it did pre-ticket (regression check).
4. Filter accepts a single-element array (e.g., `["character_record"]`) — no array-shape edge case.
5. Filter accepts the empty array — semantically equivalent to "no matches of any node type" and SHOULD return an empty `canonical_matches` array; document this clearly.
6. Canon-addition skill dry-run: a brief whose entity is mentioned in a prior `CHAR-NNNN` returns the character_record match; the new CF's `source_basis.derived_from` correctly cites the CHAR id.

### Invariants

1. Default behavior (no filter) is byte-compatible with prior responses.
2. Filter applies at SQL layer (not in TypeScript post-processing) for response-payload reduction.
3. Pre-figuring discipline (Rule 6 audit-trail citation) is preserved.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/find-named-entities.test.ts` (new test cases) — assert filter-with-matches, filter-excludes-all-mentions, filter-drops-canonical-match-with-empty-post-filter-mentions, no-filter-regression.
2. Integration test using a representative world (e.g., a fixture world with diverse mention types) — assert end-to-end filter behavior.

### Commands

1. `pnpm --filter @worldloom/world-mcp test` — runs new and existing tests.
2. Live MCP smoke test against `worlds/erotica-world` (or any populated world): `mcp__worldloom__find_named_entities({world_slug: "erotica-world", names: ["Donostia"], node_type_filter: ["character_record"]})` — confirm response includes only character_record mentions of Donostia (currently: 56 character_record mentions per CHAR-0001 et al.).
