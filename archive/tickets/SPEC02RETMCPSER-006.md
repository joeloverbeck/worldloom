# SPEC02RETMCPSER-006: Entity/anchor tools — find_impacted_fragments, find_named_entities, find_edit_anchors

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/world-mcp/src/tools/find-impacted-fragments.ts`, `src/tools/find-named-entities.ts`, `src/tools/find-edit-anchors.ts` plus their per-tool tests under `tools/world-mcp/tests/tools/`.
**Deps**: SPEC02RETMCPSER-003, SPEC02RETMCPSER-004

## Problem

Skills need three typed lookups over the entity and anchor surfaces: (1) which domain files are downstream-impacted by a proposed mutation (`find_impacted_fragments`, consumed by canon-addition Phase 12a), (2) which nodes canonically mention a set of named entities — with a clean precision/recall split surface (`find_named_entities`, consumed by canon-addition's pre-figuring scan), (3) the current `anchor_form` + `anchor_checksum` + `content_hash` for a set of node ids (`find_edit_anchors`, consumed by skills assembling patch plans). SPEC-10 defined the precision/recall contract; SPEC-11 landed the canonical-entity registry; this ticket builds the MCP-side consumers of both.

## Assumption Reassessment (2026-04-23)

1. SPEC-10 and SPEC-11 landed: `entities`, `entity_aliases`, and `entity_mentions` already exist in the live world-index schema (`tools/world-index/src/schema/migrations/001_initial.sql`; typed in `tools/world-index/src/schema/types.ts`). Anchor data is split across `nodes.anchor_checksum` (denormalized checksum) and `anchor_checksums.anchor_form` (authoritative text).
2. `specs/SPEC-02-retrieval-mcp-server.md` §Tool surface Tools 5-7 remains the authoritative contract: `find_impacted_fragments` is canonical-edge-only, `find_named_entities` separates `{canonical_matches, surface_matches}`, and `find_edit_anchors` must join `anchor_checksums` for `anchor_form`.
3. Cross-artifact boundary under audit: the SPEC-10 entity split between canonical entities, aliases, and unresolved mention evidence. This ticket is a read-only MCP consumer of that contract; it does not own schema changes.
4. Live repo reassessment showed the drafted ownership boundary was still real: `tools/world-mcp/src/tools/` only had `search-nodes.ts`, `get-node.ts`, `get-neighbors.ts`, plus shared helpers; the three entity/anchor tools and their tests were absent.
5. The truthful package-local proof surface is `cd tools/world-mcp && npm run build` followed by compiled Node test lanes from that package root. Those command shapes work unchanged in the live package.
6. Extends existing output schema? No. The landed code consumes the existing SPEC-10 / SPEC-01 schema and returns new tool-local response objects only.

## Architecture Check

1. Each tool is a direct SQL query + small post-processing layer; no speculative caching or memoization in Phase 1 (premature given per-request connection model). Cleaner than introducing an ORM or query-builder abstraction.
2. `find_impacted_fragments` encapsulates the SPEC-10 precision contract: phrase-fallback matches, if ever enabled, carry a distinct `noncanonical_fallback` flag so callers can weight them differently. The flag is present in the return shape from day one even if no fallback is wired in Phase 1.
3. No backwards-compatibility shims; new code.

## Verification Layers

1. `find_impacted_fragments` uses canonical edges only -> codebase grep-proof + targeted tool test: `grep -nE "surface_text|heuristic_phrase" tools/world-mcp/src/tools/find-impacted-fragments.ts` returns zero matches, and `tools/world-mcp/tests/tools/find-impacted-fragments.test.ts` proves unresolved mention evidence does not contribute to the impact set.
2. `find_named_entities` preserves SPEC-10's precision/recall split -> targeted tool test: `tools/world-mcp/tests/tools/find-named-entities.test.ts` covers canonical exact-name, exact-alias, unresolved exact-surface, and canonical-before-alias ordering.
3. `find_edit_anchors` reads authoritative anchor text from `anchor_checksums` -> codebase grep-proof + targeted tool test: `grep -nE "anchor_checksums" tools/world-mcp/src/tools/find-edit-anchors.ts` returns a live join, and `tools/world-mcp/tests/tools/find-edit-anchors.test.ts` proves batch and missing-node behavior.
4. The landed tool behavior stays inside FOUNDATIONS' machine-facing read boundary -> FOUNDATIONS alignment check: the new tools are read-only SQLite consumers under `tools/world-mcp/`; they do not mutate canon files or world content.

## What to Change

### 1. `tools/world-mcp/src/tools/find-impacted-fragments.ts`

Export async `findImpactedFragments(args: {world_slug, node_ids}): Promise<{impacted: ImpactedFragment[]} | McpError>`:

1. Open DB.
2. For each `node_id` in input, union two edge queries:
   - `SELECT target_node_id FROM edges WHERE source_node_id = ? AND edge_type = 'required_world_update'`
   - `SELECT source_node_id FROM edges WHERE target_node_id IN (SELECT entity_id FROM entities WHERE ...) AND edge_type = 'mentions_entity'` (canonical mentions_entity only; per SPEC-10 this edge fires only on resolved canonical mentions)
3. Deduplicate target node ids; fetch each node's `{id, node_type, file_path, heading_path}`.
4. Each result carries `fallback: 'canonical'` always in Phase 1. Schema includes `fallback: 'canonical' | 'noncanonical_fallback'` so Phase 2 can add the opt-in fallback without schema churn.

### 2. `tools/world-mcp/src/tools/find-named-entities.ts`

Export async `findNamedEntities(args: {world_slug, names}): Promise<{canonical_matches, surface_matches}>`:

1. Open DB.
2. For each `name`, compute three disjoint match buckets:
   - canonical exact name: `entities.canonical_name = ?`
   - canonical exact alias: `entity_aliases.alias_text = ?` → resolve to `entity_id`
   - unresolved surface: `entity_mentions.surface_text = ? AND resolution_kind = 'unresolved'` → no `entity_id`
3. Group `canonical_matches` by `entity_id`, then by mentioning `node_type` (join `entity_mentions.node_id` → `nodes.node_type`).
4. Group `surface_matches` by `node_type`; label `noncanonical`.
5. Sort canonical_matches: exact-name first, exact-alias second; surface_matches last (default sort order per SPEC-10 Deliverable 6 lines 261–265).

### 3. `tools/world-mcp/src/tools/find-edit-anchors.ts`

Export async `findEditAnchors(args: {world_slug, targets}): Promise<{anchors: EditAnchor[]} | McpError>`:

1. Open DB.
2. For each `target` (node_id), join `nodes.content_hash`, `nodes.anchor_checksum`, and `anchor_checksums.anchor_form` (authoritative text source per spec §Tool surface Tool 7 lines 107–108).
3. Return `[{node_id, content_hash, anchor_checksum, anchor_form}]`.

### 4. Tests

- `tests/tools/find-impacted-fragments.test.ts`
- `tests/tools/find-named-entities.test.ts`
- `tests/tools/find-edit-anchors.test.ts`

## Files to Touch

- `tools/world-mcp/src/tools/find-impacted-fragments.ts` (new)
- `tools/world-mcp/src/tools/find-named-entities.ts` (new)
- `tools/world-mcp/src/tools/find-edit-anchors.ts` (new)
- `tools/world-mcp/tests/tools/find-impacted-fragments.test.ts` (new)
- `tools/world-mcp/tests/tools/find-named-entities.test.ts` (new)
- `tools/world-mcp/tests/tools/find-edit-anchors.test.ts` (new)

## Out of Scope

- Phrase-search fallback for `find_impacted_fragments` — reserved behind the `noncanonical_fallback` flag; Phase 1 never produces it.
- Fuzzy or near-miss entity matching — SPEC-10 explicitly forbids heuristic canonical promotion; `find_named_entities` accepts exact inputs only.
- Writing to the entity tables — these tools are read-only; population is owned by world-index's parser.
- Wiring into the MCP server — lands in -011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — package test suite passes with the three new entity/anchor tool lanes included.
2. `find_impacted_fragments({node_ids: ['CF-0042']})` returns only fragments reachable via `required_world_update` or canonical `mentions_entity` edges; no unresolved surface-text contributions.
3. `find_named_entities({names: ['Brinewick']})` returns `canonical_matches` populated when a canonical entity or alias exists; `surface_matches` populated only when an unresolved surface phrase exists; both are empty arrays when neither is present.
4. `find_edit_anchors({targets: ['CF-0042']})` returns a record with non-null `content_hash`, `anchor_checksum`, `anchor_form` for an existing node; returns `node_not_found` for a bogus target.

### Invariants

1. `find_impacted_fragments` never reads `entity_mentions.surface_text` where `resolution_kind = 'unresolved'`; any contribution flagged `noncanonical_fallback` must be opt-in via a Phase 2 flag (not this ticket's scope).
2. `find_named_entities.canonical_matches` sort order: canonical exact name → canonical exact alias; `surface_matches` always sort last and carry a `noncanonical` label.
3. `find_edit_anchors` reads `anchor_form` from the `anchor_checksums` table (the authoritative text source), never from a denormalized column; a `find_edit_anchors` implementation that omits the `anchor_checksums` join is a bug.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-impacted-fragments.test.ts` — canonical edge-only impact resolution, empty input, and missing-node error.
2. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — canonical exact-name, alias, unresolved surface, and canonical-before-alias ordering.
3. `tools/world-mcp/tests/tools/find-edit-anchors.test.ts` — existing node, missing node, and batch lookup.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/find-impacted-fragments.test.js dist/tests/tools/find-named-entities.test.js dist/tests/tools/find-edit-anchors.test.js`
3. `cd tools/world-mcp && npm test`
4. SPEC-10 precision grep-proof: `grep -nE "surface_text|heuristic_phrase" tools/world-mcp/src/tools/find-impacted-fragments.ts` returns zero matches.
5. Anchor-table grep-proof: `grep -nE "anchor_checksums" tools/world-mcp/src/tools/find-edit-anchors.ts` returns >= 1 match.

## Outcome

- Completion date: 2026-04-23
- What changed:
  - Implemented `find-impacted-fragments.ts` to union direct `required_world_update` targets with other nodes connected through canonical `mentions_entity` edges only, returning a stable `fallback: 'canonical'` marker for every Phase 1 hit.
  - Implemented `find-named-entities.ts` to expose exact-match canonical-name and alias hits as `canonical_matches`, unresolved exact surface-text evidence as `surface_matches`, and canonical-before-alias ordering.
  - Implemented `find-edit-anchors.ts` to join `nodes` with `anchor_checksums` so `anchor_form` comes from the authoritative table, with batch lookup and `node_not_found` behavior covered by tests.
- Deviations from original plan: none after reassessment; the landed seam matched the active ticket's `tools/world-mcp` ownership boundary.
- Verification results:
  - `cd tools/world-mcp && npm run build`
  - `cd tools/world-mcp && node --test dist/tests/tools/find-impacted-fragments.test.js dist/tests/tools/find-named-entities.test.js dist/tests/tools/find-edit-anchors.test.js`
  - `cd tools/world-mcp && npm test`
  - `cd tools/world-mcp && grep -nE "surface_text|heuristic_phrase" src/tools/find-impacted-fragments.ts`
  - `cd tools/world-mcp && grep -nE "anchor_checksums" src/tools/find-edit-anchors.ts`

## Verification Result

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/find-impacted-fragments.test.js dist/tests/tools/find-named-entities.test.js dist/tests/tools/find-edit-anchors.test.js`
3. `cd tools/world-mcp && npm test`
4. `cd tools/world-mcp && grep -nE "surface_text|heuristic_phrase" src/tools/find-impacted-fragments.ts` returned no matches.
5. `cd tools/world-mcp && grep -nE "anchor_checksums" src/tools/find-edit-anchors.ts` returned the expected join.
