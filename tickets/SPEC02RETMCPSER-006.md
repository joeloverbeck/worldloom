# SPEC02RETMCPSER-006: Entity/anchor tools — find_impacted_fragments, find_named_entities, find_edit_anchors

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/world-mcp/src/tools/find-impacted-fragments.ts`, `src/tools/find-named-entities.ts`, `src/tools/find-edit-anchors.ts` and their per-tool tests.
**Deps**: SPEC02RETMCPSER-003, SPEC02RETMCPSER-004

## Problem

Skills need three typed lookups over the entity and anchor surfaces: (1) which domain files are downstream-impacted by a proposed mutation (`find_impacted_fragments`, consumed by canon-addition Phase 12a), (2) which nodes canonically mention a set of named entities — with a clean precision/recall split surface (`find_named_entities`, consumed by canon-addition's pre-figuring scan), (3) the current `anchor_form` + `anchor_checksum` + `content_hash` for a set of node ids (`find_edit_anchors`, consumed by skills assembling patch plans). SPEC-10 defined the precision/recall contract; SPEC-11 landed the canonical-entity registry; this ticket builds the MCP-side consumers of both.

## Assumption Reassessment (2026-04-23)

1. SPEC-10 and SPEC-11 landed: `entities`, `entity_aliases`, `entity_mentions` tables all exist in world-index's schema (`archive/specs/SPEC-10-entity-surface-redesign.md` §Deliverable 1 lines 96–157). Anchor data is split across `nodes.anchor_checksum` (denormalized) and `anchor_checksums` table (authoritative `anchor_form` text per `archive/specs/SPEC-01-world-index.md` §SQLite schema lines 130–135).
2. `specs/SPEC-02-retrieval-mcp-server.md` §Tool surface §5–7 (lines 90–126) is the authoritative source. Tool 5 `find_impacted_fragments` uses `required_world_update` + canonical `mentions_entity` edges only; Tool 6 `find_named_entities` returns `{canonical_matches, surface_matches}` per SPEC-10 Deliverable 6; Tool 7 `find_edit_anchors` reads `anchor_checksums.anchor_form` per the reassessed spec's M3 clarification. `archive/specs/SPEC-10-entity-surface-redesign.md` §Deliverable 6 remains authoritative for the precision/recall surface.
3. Cross-artifact boundary: the entity model's split (canonical entities backed by authority sources; entity aliases; unresolved mention evidence) is the contract these tools must preserve. `find_impacted_fragments` MUST NOT silently add phrase-search results without an explicit `noncanonical_fallback` flag (spec §Tool surface Tool 5 lines 94–95).
6. Extends existing output schema? No — these tools are consumers of the SPEC-10 schema, not extenders. Any change to `entities.canonical_name` or `entity_aliases.alias_text` column names requires a coordinated update in SPEC-10, not here.

## Architecture Check

1. Each tool is a direct SQL query + small post-processing layer; no speculative caching or memoization in Phase 1 (premature given per-request connection model). Cleaner than introducing an ORM or query-builder abstraction.
2. `find_impacted_fragments` encapsulates the SPEC-10 precision contract: phrase-fallback matches, if ever enabled, carry a distinct `noncanonical_fallback` flag so callers can weight them differently. The flag is present in the return shape from day one even if no fallback is wired in Phase 1.
3. No backwards-compatibility shims; new code.

## Verification Layers

1. `find_impacted_fragments` uses canonical edges only → grep-proof: `grep -nE "surface_text|heuristic_phrase" tools/world-mcp/src/tools/find-impacted-fragments.ts` returns zero matches; unit test confirms no unresolved mention contributes to the impact set.
2. `find_named_entities` split precision/recall per SPEC-10 → unit test constructs a fixture with one canonical entity `Brinewick`, one alias `Brinewick-the-Port`, one unresolved phrase `Brinewicker` (not a canonical match); asserts the canonical and alias land in `canonical_matches`, the unresolved phrase lands in `surface_matches` labeled `noncanonical`.
3. `find_edit_anchors` reads `anchor_checksums.anchor_form` → grep-proof: `grep -nE "anchor_checksums" tools/world-mcp/src/tools/find-edit-anchors.ts` returns ≥ 1 match; unit test confirms returned `anchor_form` strings match the authoritative table.
4. Default sort order for `find_named_entities` matches SPEC-10 Deliverable 6 line 261 → unit test constructs inputs triggering all three bands and asserts order: canonical exact name → canonical exact alias → unresolved exact surface text.

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

1. `cd tools/world-mcp && npm test` — all three entity-tool tests pass.
2. `find_impacted_fragments({node_ids: ['CF-0042']})` returns only fragments reachable via `required_world_update` or canonical `mentions_entity` edges; no unresolved surface-text contributions.
3. `find_named_entities({names: ['Brinewick']})` returns `canonical_matches` populated when a canonical entity or alias exists; `surface_matches` populated only when an unresolved surface phrase exists; both are empty arrays when neither is present.
4. `find_edit_anchors({targets: ['CF-0042']})` returns a record with non-null `content_hash`, `anchor_checksum`, `anchor_form` for an existing node; returns `node_not_found` for a bogus target.

### Invariants

1. `find_impacted_fragments` never reads `entity_mentions.surface_text` where `resolution_kind = 'unresolved'`; any contribution flagged `noncanonical_fallback` must be opt-in via a Phase 2 flag (not this ticket's scope).
2. `find_named_entities.canonical_matches` sort order: canonical exact name → canonical exact alias; `surface_matches` always sort last and carry a `noncanonical` label.
3. `find_edit_anchors` reads `anchor_form` from the `anchor_checksums` table (the authoritative text source), never from a denormalized column; a `find_edit_anchors` implementation that omits the `anchor_checksums` join is a bug.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-impacted-fragments.test.ts` — 3 scenarios (canonical impact, canonical-mentions_entity impact, empty input).
2. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — 4 scenarios (canonical name match, alias match, unresolved surface match, sort order).
3. `tools/world-mcp/tests/tools/find-edit-anchors.test.ts` — 3 scenarios (existing node, missing node, batch lookup).

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/find-*.test.js`
2. SPEC-10 precision grep-proof: `grep -nE "surface_text|heuristic_phrase" tools/world-mcp/src/tools/find-impacted-fragments.ts` returns zero matches.
3. Anchor-table grep-proof: `grep -nE "anchor_checksums" tools/world-mcp/src/tools/find-edit-anchors.ts` returns ≥ 1 match.
