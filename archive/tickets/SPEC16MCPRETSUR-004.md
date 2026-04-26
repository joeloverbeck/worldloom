# SPEC16MCPRETSUR-004: `search_nodes` exhaustive mode

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `search_nodes` MCP tool with `exhaustive: boolean` parameter and a new `match_locations[]` response field. No new tool added; existing default behavior preserved.
**Deps**: None

## Problem

`mcp__worldloom__find_named_entities(names)` queries the entity registry's `canonical_name` + alias + scoped-reference fields. It does NOT lexically scan prose body content (section bodies, diegetic-artifact bodies, character-dossier bodies). For Rule 6 audit-trail / pre-figuring scans where the target string may appear ONLY in prose (e.g., a name mentioned in a diegetic artifact's body but never registered as a canonical entity), the current tool returns zero matches and the agent has to trust the proposal's self-claim or open the file directly. `mcp__worldloom__search_nodes(query)` runs FTS5 lexical search but ranks by relevance and caps at 20 results — useful for "find the most relevant" but not for "exhaustively confirm presence/absence." Adding an `exhaustive: true` mode to `search_nodes` is the right surface for Rule-6 audit scans (FOUNDATIONS Rule 6: No Silent Retcons — all canon changes must be logged with justification, and audit-trail scans need exhaustive confirmation, not best-N ranking).

## Assumption Reassessment (2026-04-26)

1. The 20-result cap is at `tools/world-mcp/src/tools/search-nodes.ts:429`: `rankSearchRows(rows, { query: args.query }, args.ranking_profile).slice(0, 20)`. Confirmed. The exhaustive branch now bypasses that cap at `tools/world-mcp/src/tools/search-nodes.ts:420-427`.
2. `SearchNodesArgs` lives in `tools/world-mcp/src/tools/_shared.ts:22-27`. Confirmed — the optional `exhaustive?: boolean` field is added there. The Zod input schema in `tools/world-mcp/src/server.ts:67-79` (`searchNodesInputSchema`) also has the `exhaustive` field. Same-package server contract tests in `tools/world-mcp/tests/server/dispatch.test.ts` passed; existing default-mode assertions continue to pass since `exhaustive` defaults to `false`.
3. The `fts_nodes` virtual table indexes three columns: `body`, `heading_path`, AND `summary` (`tools/world-index/src/schema/migrations/001_initial.sql:88-95`). The 2026-04-26 reassessment Issue I2 caught this — `match_locations` MUST enumerate all three. A `summary`-only match would otherwise return an empty `match_locations` array, losing the per-row attribution that exhaustive mode is designed to provide.
4. FOUNDATIONS Rule 6 (No Silent Retcons) motivates this ticket. Rule 6 reads: "All canon changes must be logged with justification." Exhaustive lexical scan is the surface a Rule-6 pre-figuring audit-trail check needs — confirming absence of a name across all prose bodies before claiming the new CF introduces it. The current `search_nodes` ranking + 20-cap is suited to "find the most relevant," not "confirm absence."
5. Schema extension: extends `SearchNodesArgs` (additive — new optional `exhaustive?: boolean` defaulting to `false`) and `SearchNodeResult` (additive — new optional `match_locations?: ('body' | 'heading_path' | 'summary')[]` populated only when `exhaustive === true`). Existing consumers continue to work unchanged.
6. Reassessment classified this as a `tool or script implementation` ticket with an index-backed `world-mcp` retrieval surface. The active Codex session does not expose an external `mcp__worldloom__search_nodes` tool, so the manual smoke is recorded as a built-handler package-local substitute after `npm test` builds `dist/`. SPEC16MCPRETSUR-005 owns package README, MACHINE-FACING-LAYER, and canon-addition retrieval-tree documentation for the new surface; those docs are intentionally left untouched here.

## Architecture Check

1. Adding an `exhaustive` parameter to the existing tool (rather than introducing a separate `search_nodes_exhaustive` tool) keeps the FTS5 query path shared — the same lexical-search infrastructure serves both the relevance-ranked default mode and the exhaustive audit mode.
2. Distinct from `find_named_entities`: parameterizing `find_named_entities` with `include_prose_body: true` would conflate "registered entity lookup" (canonical name / alias / scoped-reference resolution) with "lexical presence check" (FTS5 body search). They are different audit questions; both tools stay.
3. Deterministic node-id sort under exhaustive mode (instead of relevance ranking) gives reproducible output for audit trails; tests assert determinism via node-id ordering.
4. `match_locations` is computed by re-checking the query against each FTS-indexed column post-fetch (`body`, `heading_path`, `summary`). The FTS5 query already covered all three columns; the per-row attribution is the additional cost.
5. No backwards-compatibility shims. `exhaustive` defaults to `false`, preserving existing behavior; `match_locations` is populated only under exhaustive mode.

## Verification Layers

1. Default-mode preservation → unit test: `exhaustive: false` (default) preserves existing behavior — capped at 20 results, ranked by relevance.
2. Exhaustive-mode uncapping → unit test: against a corpus where the query matches >20 nodes, `exhaustive: true` returns all matches, sorted by `node_id`.
3. `match_locations` attribution → unit tests:
   - Each result includes `match_locations[]` populated per-row when `exhaustive: true`.
   - A node whose match falls only in the `summary` column produces `match_locations: ['summary']` (the third FTS-indexed column the spec's first draft omitted).
4. Determinism → manual review: confirm node-id sort produces stable ordering across repeated invocations against the same corpus.
5. Rule 6 alignment → FOUNDATIONS alignment check: exhaustive lexical scan is the appropriate surface for audit-trail / pre-figuring scans cited by FOUNDATIONS Rule 6; the spec's §FOUNDATIONS Alignment table explicitly names this.

## What to Change

### 1. Extend `SearchNodesArgs`

`tools/world-mcp/src/tools/_shared.ts:22-27` — add `exhaustive?: boolean` to the interface:

```ts
export interface SearchNodesArgs {
  query: string;
  filters?: SearchNodeFilters;
  ranking_profile?: RankingWeights;
  exhaustive?: boolean;
}
```

### 2. Extend `SearchNodeResult`

`tools/world-mcp/src/tools/_shared.ts:29-44` — add `match_locations?: ('body' | 'heading_path' | 'summary')[]` to the interface; populated only when the query was made with `exhaustive: true`.

### 3. Update Zod input schema

`tools/world-mcp/src/server.ts:67-79` — add `exhaustive: z.boolean().optional()` to `searchNodesInputSchema`.

### 4. Modify `search_nodes` to honor `exhaustive`

`tools/world-mcp/src/tools/search-nodes.ts:420-429` — branch on `args.exhaustive`:
- When `args.exhaustive === true`:
  - Skip the `.slice(0, 20)` cap.
  - Replace the ranking-profile sort with a deterministic node-id sort (`rows.sort((a, b) => a.node_id.localeCompare(b.node_id))`).
  - For each row, compute `match_locations` by re-checking the trimmed query against `body`, `heading_path`, and `summary` columns (case-insensitive substring match against each non-null column; record which columns matched).
- When `args.exhaustive` is `false` or omitted: existing behavior unchanged (capped at 20, ranked, no `match_locations`).

### 5. Test file `tools/world-mcp/tests/tools/search-nodes.test.ts`

Add cases (extend the existing test file if one exists; create if not):
- `exhaustive: false` (default) → existing behavior preserved (capped at 20, ranked).
- `exhaustive: true` against a corpus where the query matches >20 nodes → returns all matches, sorted by `node_id`.
- `exhaustive: true` → each result includes `match_locations[]` populated per-row.
- `exhaustive: true` against a node whose match falls only in the `summary` column → result's `match_locations` is `['summary']`.
- `exhaustive: true` with no matches → empty `nodes[]` array (not an error).

## Files to Touch

- `tools/world-mcp/src/tools/_shared.ts` (modify — `SearchNodesArgs` + `SearchNodeResult`)
- `tools/world-mcp/src/server.ts` (modify — `searchNodesInputSchema`)
- `tools/world-mcp/src/tools/search-nodes.ts` (modify — branch on `exhaustive` at line 420 area; compute `match_locations`)
- `tools/world-mcp/tests/tools/search-nodes.test.ts` (modify or create)

## Out of Scope

- Performance bounds on uncapped result sets. FTS5 queries are fast but uncapped result sets may surprise callers. If a future world produces multi-thousand-match results, callers can filter via the existing `filters` parameter; an explicit `max_results` cap can be added in a follow-up if needed. Not a release blocker.
- Replacing `find_named_entities` with `search_nodes` exhaustive-mode. The two tools serve different audit questions (registry lookup vs lexical-presence scan); both stay.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes after the new test cases land.
2. Package-local built-handler smoke after `cd tools/world-mcp && npm run build`: invoke `searchNodes({ query: 'corner-share', exhaustive: true, filters: { world_slug: 'animalia' } })`; response includes prose-body matches with `match_locations` populated. Current animalia result count is 11, so the live corpus does not exercise the >20 uncapping branch; the seeded unit test does.
3. Default-mode invocation `search_nodes(query='X')` without `exhaustive` returns existing capped/ranked behavior.

### Invariants

1. Existing `search_nodes` consumers (any skill calling without `exhaustive`) see identical responses pre- and post-change.
2. Exhaustive-mode result ordering is deterministic — repeated invocations against the same corpus produce identical `nodes[]` order.
3. `match_locations` enumerates ALL three FTS5-indexed columns (`body`, `heading_path`, `summary`) and is populated only when `exhaustive: true` was requested.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/search-nodes.test.ts` — covers all five test cases above.

### Commands

1. `cd tools/world-mcp && npm test` — full package test suite.
2. Built-handler smoke after `cd tools/world-mcp && npm run build`: `node -e "const { searchNodes } = require('./dist/src/tools/search-nodes.js'); searchNodes({ query: 'corner-share', exhaustive: true, filters: { world_slug: 'animalia' } }).then((result) => { if (!('nodes' in result)) { console.error(JSON.stringify(result)); process.exit(1); } console.log(JSON.stringify({ count: result.nodes.length, first: result.nodes[0], locations: [...new Set(result.nodes.flatMap((node) => node.match_locations || []))].sort() }, null, 2)); }).catch((error) => { console.error(error); process.exit(1); });"`

## Outcome

Completed on 2026-04-26.

Implemented `search_nodes` exhaustive mode in `tools/world-mcp`:

1. `SearchNodesArgs` now accepts optional `exhaustive?: boolean`; `SearchNodeResult` now accepts optional `match_locations?: ('body' | 'heading_path' | 'summary')[]`.
2. The MCP server input schema accepts `exhaustive`.
3. `searchNodes({ exhaustive: true })` now returns all rows without the 20-result cap, sorts by `node_id`, and emits per-row `match_locations`.
4. Default mode still uses the existing ranked/capped path and does not emit `match_locations`.
5. The fallback lexical query now includes `summary`, matching the three-column `fts_nodes` contract.
6. `tools/world-mcp/tests/tools/search-nodes.test.ts` now covers default cap preservation, exhaustive >20 uncapping, deterministic ordering, body/heading/summary match attribution, and empty exhaustive results.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed. The run built the package and reported `pass 137`, `fail 0`.
2. Built-handler smoke from `tools/world-mcp` after the package build — passed. `searchNodes({ query: 'corner-share', exhaustive: true, filters: { world_slug: 'animalia' } })` returned 11 nodes; the first result was `BATCH-0003`, and observed `match_locations` included `body` and `heading_path`.
3. FOUNDATIONS Rule 6 alignment checked against `docs/FOUNDATIONS.md`: exhaustive lexical presence/absence scanning supports the "All canon changes must be logged with justification" audit trail without changing write-path discipline.

## Deviations

1. External `mcp__worldloom__search_nodes` invocation was unavailable in this Codex session, so the manual smoke used the compiled package handler directly. This proves the same handler behavior but does not claim external transport coverage.
2. The current animalia corpus has 11 `corner-share` matches, not more than 20. The >20 uncapping invariant is therefore proven by the seeded unit test, not by the live-world smoke.
3. SPEC16MCPRETSUR-005 owns user-facing documentation updates for `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md`; those files were not edited by this implementation ticket.
