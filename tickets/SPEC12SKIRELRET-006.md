# SPEC12SKIRELRET-006: `search_nodes` filters + match_basis

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/{search-nodes.ts, _shared.ts}` with two new filters (`include_scoped_references`, `reference_name`) and a required `match_basis` field on `SearchNodeResult`.
**Deps**: SPEC12SKIRELRET-002, SPEC12SKIRELRET-003

## Problem

Per SPEC-12 D4, `search_nodes` must gain two new surfaces: (a) an `include_scoped_references: boolean` broad gate for opting open-text queries into scoped-reference matching (default `false`, preserving SPEC-02 caller semantics), (b) a dedicated `reference_name: string` filter mirroring the existing `entity_name` filter's exact-match shape (implicitly sets `include_scoped_references=true`), and (c) a required `match_basis` field on every `SearchNodeResult` so callers know which trust tier produced each hit. The existing `entity_name` filter must retain its SPEC-02 canonical-only semantics. Without this ticket, scoped references are invisible to lexical search and callers cannot tell which tier produced a given hit.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-mcp/src/tools/_shared.ts:13-18` currently defines `SearchNodeFilters` with `world_slug, node_type, file_path, entity_name`. `SearchNodeResult` at lines 26-34 has `{id, world_slug, node_type, heading_path, summary, body_preview}` — no `match_basis`. `applyFilters` at 150-191 implements `entity_name` via an `EXISTS` subquery against `entity_mentions` + `entities`/`entity_aliases`.
2. SPEC-12 D4 pre-declared filter interaction: `include_scoped_references` defaults to `false` (preserves existing SPEC-02 callers); `reference_name` presence implicitly sets `include_scoped_references=true` for that call. `entity_name` filter semantics unchanged — stays canonical-only.
3. Cross-package contract under audit: `match_basis` is consumed by ranking logic in ticket 007 (informing band priority visibility) and by downstream skills (SPEC-06 Part A). It is a required field on every `SearchNodeResult` — tests and typechecks in both `tools/world-mcp` and any future consumer must be updated alongside the interface change.
4. Extends existing output schema (`SearchNodeResult`): the `match_basis` field is REQUIRED on every result (not optional). No production consumer reads `SearchNodeResult` via a specific shape assertion today (verified: grep for `SearchNodeResult` across `tools/` and `.claude/skills/` returns only `tools/world-mcp/` internal uses and test assertions). Tests in `tests/tools/search-nodes.test.ts` need updating alongside the interface; this ticket bundles both.

## Architecture Check

1. Dedicated `reference_name` filter mirrors the existing `entity_name` shape — symmetric surface, one filter per trust tier. Avoids overloading a single filter with tier-blurring semantics.
2. `include_scoped_references` as a broad gate avoids polluting open-text search for callers who don't opt in, preserving SPEC-02 caller contracts.
3. `match_basis` on every result replaces implicit band reasoning with explicit attribution — callers no longer have to infer the tier from which filter they used or from ranking position.
4. No backwards-compatibility aliasing: `match_basis` is required; the tests updated in this ticket carry the interface change forward.

## Verification Layers

1. Query with `entity_name='X'` ignores scoped-reference rows regardless of `include_scoped_references` -> unit test (canonical-only semantics preserved).
2. Query with `reference_name='Y'` returns only nodes with a scoped-reference row whose `display_name='Y'` or whose `alias_text='Y'` matches -> unit test.
3. Query with `include_scoped_references=true` + open text matching a scoped-reference display_name returns those nodes -> unit test.
4. Query with `include_scoped_references=false` (default) + open text matching only a scoped-reference display_name returns zero results via that tier -> unit test.
5. Every result has `match_basis` populated with one of the 5 union values (`exact_id | canonical_entity | structured_record_edge | scoped_reference | lexical_evidence`) -> unit test.

## What to Change

### 1. Extend filter surface

In `tools/world-mcp/src/tools/_shared.ts:13-18`, add to `SearchNodeFilters`:

```ts
include_scoped_references?: boolean;
reference_name?: string;
```

### 2. Extend `applyFilters`

In `applyFilters` at lines 150-191, add a clause for `reference_name`:

```sql
EXISTS (
  SELECT 1
  FROM scoped_references sr
  LEFT JOIN scoped_reference_aliases sra ON sra.reference_id = sr.reference_id
  WHERE sr.source_node_id = n.node_id
    AND (sr.display_name = ? OR sra.alias_text = ?)
)
```

### 3. Thread the `include_scoped_references` gate into the lexical path

In `searchWorld` (`tools/world-mcp/src/tools/search-nodes.ts`), when `args.filters?.include_scoped_references === true` OR `args.filters?.reference_name !== undefined`, expand the candidate set with an additional UNION/JOIN against `scoped_references` + `scoped_reference_aliases` matching the query string. Otherwise leave the existing canonical-only/FTS behavior unchanged.

### 4. Add `match_basis` to `SearchNodeResult`

In `_shared.ts:26-34`, add the required field:

```ts
match_basis: "exact_id" | "canonical_entity" | "structured_record_edge" | "scoped_reference" | "lexical_evidence";
```

Populate it during the row → `SearchNodeResult` projection based on which predicate matched (check exact_id_match → canonical_entity match → structured_record_edge match → scoped_reference match → fallback `lexical_evidence`). Tie-breaks follow the band priority defined in ticket 007.

### 5. Surface new signal columns for ranking

To support ticket 007's `sqlToCandidates` extension, extend the main SELECT in `search-nodes.ts` with the new `exact_structured_record_edge_match` and `exact_scoped_reference_match` signal columns (via EXISTS subqueries parallel to the existing `exact_entity_match_in_target_field`). Ticket 007 wires them into ranking; this ticket makes them available.

## Files to Touch

- `tools/world-mcp/src/tools/_shared.ts` (modify — `SearchNodeFilters`, `SearchNodeResult`, `applyFilters`, `SearchRow` row shape)
- `tools/world-mcp/src/tools/search-nodes.ts` (modify — SQL expansions for scoped matching, `match_basis` projection, new signal columns)
- `tools/world-mcp/tests/tools/search-nodes.test.ts` (modify)

## Out of Scope

- Ranking band reshaping (covered by ticket 007)
- Packet-assembly consumption of `match_basis` (covered by ticket 008)
- New filters beyond `include_scoped_references` + `reference_name`
- `find_named_entities` scoped tier (covered by ticket 004)

## Acceptance Criteria

### Tests That Must Pass

1. `search_nodes({query: "Mudbrook", filters: {world_slug: "animalia"}})` with default `include_scoped_references=false` does NOT match Melissa's scoped-reference declaration of Mudbrook.
2. `search_nodes({query: "Mudbrook", filters: {world_slug: "animalia", include_scoped_references: true}})` matches Melissa's record via scoped tier.
3. `search_nodes({query: "", filters: {world_slug: "animalia", reference_name: "Mudbrook"}})` returns Melissa's record with `match_basis='scoped_reference'`.
4. Every result in every response has `match_basis` populated with one of the 5 union values.
5. Existing `entity_name` filter semantics unchanged (queries with `entity_name='Threadscar Melissa'` remain canonical-only; scoped hits do not leak in).
6. `pnpm --filter @worldloom/world-mcp test tests/tools/search-nodes.test.ts` passes.

### Invariants

1. `entity_name` filter's canonical-only semantics preserved (SPEC-02 contract).
2. Default `include_scoped_references=false` preserves backward compatibility for existing callers.
3. `reference_name` presence implies `include_scoped_references=true` for that call.
4. Every `SearchNodeResult` has `match_basis` populated; there is no path where the field is missing or empty.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/search-nodes.test.ts` — 6+ new cases covering the filter interactions and `match_basis` population; updates to existing tests to assert `match_basis` on results.

### Commands

1. `pnpm --filter @worldloom/world-mcp test tests/tools/search-nodes.test.ts`
2. `pnpm --filter @worldloom/world-mcp test`
3. `pnpm --filter @worldloom/world-mcp build` (build runs `tsc -p tsconfig.json`, which is the typecheck surface; the `world-mcp` package does not ship a separate `typecheck` script)
