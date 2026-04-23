# SPEC02RETMCPSER-005: Localization tools — search_nodes, get_node, get_neighbors

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/world-mcp/src/tools/search-nodes.ts`, `src/tools/get-node.ts`, `src/tools/get-neighbors.ts` and their per-tool tests.
**Deps**: SPEC02RETMCPSER-003, SPEC02RETMCPSER-004

## Problem

Skills need three primitive localization operations against `world.db`: open-ended search by query + filters, exact fetch by `node_id`, and graph expansion by `edge_types` + `depth`. These three tools share the SQLite-read machinery landed in -003 and the ranking pipeline landed in -004. Without them, `get_context_packet` (which depends on them for seed-node expansion) cannot be built, and Hook 2's redirect from raw file reads has no destination.

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/src/db/open.ts` (landed in -003) returns a `better-sqlite3` `Database` handle; `tools/world-mcp/src/ranking/policy.ts` (landed in -004) exposes `rankCandidates`. These three tools consume both. World-index schema: `nodes`, `edges`, `entity_mentions`, `entities`, `entity_aliases`, `anchor_checksums`, `fts_nodes` — per `archive/specs/SPEC-01-world-index.md` §SQLite schema lines 78–189.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Tool surface §1–3 (lines 62–80) is the authoritative source. Tool 1 `search_nodes` returns top 20 with `{id, node_type, heading_path, summary, body_preview}`; Tool 2 `get_node` returns body + edges + mentions + hashes; Tool 3 `get_neighbors` returns per-hop labels at depth 1 or 2. `archive/specs/SPEC-10-entity-surface-redesign.md` §Deliverable 6 governs the `entity_name` filter semantics (exact `canonical_name` or `alias_text` only; never `entity_mentions.surface_text`).
3. Cross-artifact boundary under audit: these tools read the exact SQLite schema emitted by SPEC-01; any query must use the column names as they appear in migrations, not paraphrased names. The `summary` field may be NULL (SPEC-01 §Out of Scope line 345 defers Phase 1.5 summary population); callers must fall back to `body_preview`. This ticket must preserve that null-tolerance contract.

## Architecture Check

1. A shared `sqlToCandidates(rows, queryContext)` helper that maps raw SQLite rows to `RankingCandidate` shape is cleaner than inlining the transform in each of the three tools, because all three consume the same `nodes` table and the same ranking pipeline — inlining would guarantee drift on the next ranking signal added.
2. Each tool is its own file under `src/tools/` so per-tool test coverage is cleanly isolated; the shared sqlToCandidates lives in `src/tools/_shared.ts` (underscore prefix to mark non-tool internal).
3. No backwards-compatibility shims — new code.

## Verification Layers

1. search_nodes returns ≤ 20 results ranked per spec §Retrieval policy → unit test on fixture `seeded-world.db` with a known relevant-node set asserts ordering matches expected band + within-band order.
2. get_node returns full body + edges + mentions + hashes → unit test on a known CF node asserts every field is populated and types match `CanonFactRecord` (for YAML-backed nodes) via the public types entry from -002.
3. get_neighbors respects `edge_types` filter and `depth` bound → unit test asserts depth=1 returns only direct neighbors; depth=2 includes neighbors-of-neighbors; empty `edge_types` means all edge types.
4. `summary` null-fallback contract → unit test on a fixture where `nodes.summary IS NULL` confirms the response carries `summary: null` and `body_preview` is truncated to 200 chars.
5. `entity_name` filter exactness per SPEC-10 → unit test asserts `entity_name: 'Brinewick'` matches `entities.canonical_name = 'Brinewick'` or an alias, but does NOT match an unresolved `entity_mentions.surface_text` row.

## What to Change

### 1. `tools/world-mcp/src/tools/_shared.ts`

Export `sqlToCandidates(rows: NodeRow[], context: QueryContext): RankingCandidate[]` and `applyFilters(db, filters): string[]` (returning node_id list matching filter set). These consume the types re-exported via -002.

### 2. `tools/world-mcp/src/tools/search-nodes.ts`

Export async function `searchNodes(args: {query, filters}): Promise<{nodes: SearchNodeResult[]} | McpError>`:

1. Open DB via `openIndexDb(filters.world_slug)`; propagate `McpError` on failure.
2. Build candidate set: FTS5 `MATCH` query on `fts_nodes` + filter join on `nodes` (node_type, file_path, entity_name).
3. For `entity_name` filter, join `entities` / `entity_aliases` per SPEC-10 Deliverable 6; never join `entity_mentions.surface_text`.
4. Convert to `RankingCandidate[]`; call `rankCandidates(candidates, defaultProfile)` unless caller passes a profile override.
5. Truncate to top 20; project to `{id, node_type, heading_path, summary: summary ?? null, body_preview: body.slice(0, 200)}`.

### 3. `tools/world-mcp/src/tools/get-node.ts`

Export async function `getNode(args: {node_id}): Promise<NodeDetail | McpError>`:

1. Open DB (world_slug is implicit in the `node_id` prefix for `<world>:<file>:...` form; for structured ids like `CF-0042`, require a world_slug filter).
2. Fetch `nodes` row; on miss return `{code: 'node_not_found'}`.
3. Fetch outgoing + incoming edges (`edges` table).
4. Fetch entity mentions (`entity_mentions` table) and resolve each to `entities.canonical_name` where `resolved_entity_id` is not null.
5. Fetch `anchor_checksums.anchor_form` (per SPEC-01 §SQLite schema line 130).
6. Return full record.

### 4. `tools/world-mcp/src/tools/get-neighbors.ts`

Export async function `getNeighbors(args: {node_id, edge_types?: string[], depth: 1 | 2}): Promise<NeighborGraph | McpError>`:

1. Open DB; look up seed node.
2. Build direct-neighbor set via `edges` where `source_node_id = seed` or `target_node_id = seed`, optionally filtered by `edge_type IN (...)`.
3. If `depth = 2`, expand each direct neighbor once more (dedup seen nodes).
4. Return per-hop labeled graph: `{seed, hop1: [...], hop2?: [...]}`.

### 5. Tests

- `tests/tools/search-nodes.test.ts` — 4+ scenarios (query-only, with node_type filter, with entity_name filter per SPEC-10, summary-null fallback).
- `tests/tools/get-node.test.ts` — 3+ scenarios (YAML-backed CF node, prose section node, missing node).
- `tests/tools/get-neighbors.test.ts` — 3+ scenarios (depth 1, depth 2, edge_types filter).

## Files to Touch

- `tools/world-mcp/src/tools/_shared.ts` (new)
- `tools/world-mcp/src/tools/search-nodes.ts` (new)
- `tools/world-mcp/src/tools/get-node.ts` (new)
- `tools/world-mcp/src/tools/get-neighbors.ts` (new)
- `tools/world-mcp/tests/tools/search-nodes.test.ts` (new)
- `tools/world-mcp/tests/tools/get-node.test.ts` (new)
- `tools/world-mcp/tests/tools/get-neighbors.test.ts` (new)

## Out of Scope

- `find_impacted_fragments`, `find_named_entities`, `find_edit_anchors` — land in -006.
- `get_context_packet` — lands in -007 and consumes these three tools.
- Semantic search / vector retrieval — Phase 1 `semantic_similarity` weight is 0 (SPEC-02 §Out of Scope).
- Wiring tools into the MCP server (`src/server.ts`) — lands in -011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all three tool tests pass.
2. `search_nodes({query: 'brinewick', filters: {world_slug: 'seeded'}})` returns top 20 nodes with `id`, `node_type`, `heading_path`, `summary` (possibly null), `body_preview` (≤ 200 chars).
3. `search_nodes({query: '...', filters: {entity_name: 'Known Alias'}})` returns only nodes mentioning the canonical entity (via `entities` / `entity_aliases`); unresolved surface-text matches are excluded.
4. `get_node({node_id: 'CF-0001'})` on the fixture returns a fully-populated `NodeDetail` with edges + entity mentions + anchor_form + content_hash.
5. `get_neighbors({node_id: 'CF-0001', depth: 2})` returns `{seed, hop1, hop2}` with no cycles.

### Invariants

1. `search_nodes` never returns more than 20 nodes. Top-20 is hard-coded per spec §Tool surface Tool 1.
2. `summary` field in `search_nodes` responses is explicitly `string | null` (not omitted or `undefined`), so callers can detect the Phase 1.5 fallback case.
3. `entity_name` filter semantics match SPEC-10 Deliverable 6 — no unresolved surface-text matches.
4. `get_neighbors.depth` is exactly `1 | 2` at the TypeScript level; other values reject with a clear validation error.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/search-nodes.test.ts` — ranking-order spot-check, filter combinations, summary null fallback, SPEC-10 entity-name contract.
2. `tools/world-mcp/tests/tools/get-node.test.ts` — YAML-backed + prose-backed + missing-node paths.
3. `tools/world-mcp/tests/tools/get-neighbors.test.ts` — depth 1 + depth 2 + edge_types filter.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/search-nodes.test.js dist/tests/tools/get-node.test.js dist/tests/tools/get-neighbors.test.js`
2. `cd tools/world-mcp && npm test`
3. SPEC-10 entity-name-contract grep-proof: `grep -nE "entity_mentions.surface_text" tools/world-mcp/src/tools/search-nodes.ts` returns **zero** matches (the filter never reads surface_text).
