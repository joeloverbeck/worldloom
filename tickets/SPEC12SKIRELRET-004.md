# SPEC12SKIRELRET-004: `find_named_entities` scoped_matches tier

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/find-named-entities.ts` with a `scoped_matches` array in the response; additive field on `FindNamedEntitiesResponse`.
**Deps**: SPEC12SKIRELRET-002

## Problem

Per SPEC-12 D4, `find_named_entities` must surface scoped-reference matches as a distinct middle tier between canonical matches and surface evidence. Currently the tool returns `{canonical_matches, surface_matches}` only (`tools/world-mcp/src/tools/find-named-entities.ts:35-38`) — queries against names declared only as scoped references never produce structured hits, which is the observed production failure for names like `Mudbrook`, `Rill`, `Aldous`, `Registrar Copperplate`. This ticket adds the `scoped_matches` array with the documented sort invariant so downstream skills can localize those names without fallback to unresolved evidence.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-mcp/src/tools/find-named-entities.ts:35-38` currently defines `FindNamedEntitiesResponse` as `{canonical_matches: CanonicalMatch[]; surface_matches: SurfaceMatch[]}`. Sort rules at lines 175-199 sort canonical_matches by `match_kind` (canonical_name before alias) → query → canonical_name → entity_id; surface_matches by query → node_type. Parallel sort for `scoped_matches` follows SPEC-12 D4.
2. `scoped_references` table populated by ticket 002 provides `display_name`, `reference_id`, `reference_kind`, `relation`, `provenance_scope`, `source_node_id`, `target_node_id`; `scoped_reference_aliases` provides `alias_text`. Both tables are queried by world_slug + display_name/alias_text pair.
3. Cross-package contract under audit: the `scoped_matches` array is additive on `FindNamedEntitiesResponse` — downstream consumers (SPEC-06 Part A skills, not yet landed) will read the new field; existing consumers (if any) that destructure only `canonical_matches` + `surface_matches` continue to work unchanged.

## Architecture Check

1. Matching the existing two-tier shape (canonical + surface) with a middle scoped tier preserves the SPEC-10 precision-first discipline — scoped hits are a separate array, never merged into canonical.
2. Sort invariant parallel to canonical's existing rule (match_kind → query → display_name → reference_id) keeps the response shape predictable.
3. No backwards-compatibility aliasing: additive field on response type.

## Verification Layers

1. Query matching a scoped reference's `display_name` returns a row in `scoped_matches` with `match_kind='display_name'` -> unit test.
2. Query matching a scoped-reference alias returns a row with `match_kind='alias_text'` -> unit test.
3. Query matching a canonical entity appears in `canonical_matches` and NOT in `scoped_matches` -> unit test (tier disambiguation).
4. `scoped_matches` sorted by `match_kind → query → display_name → reference_id` -> unit test.

## What to Change

### 1. Extend response type

In `tools/world-mcp/src/tools/find-named-entities.ts`, add:

```ts
export interface ScopedMatch {
  query: string;
  reference_id: string;
  display_name: string;
  reference_kind: string | null;
  relation: string;
  provenance_scope: "world" | "proposal" | "diegetic" | "audit";
  source_node_id: string;
  target_node_id: string | null;
  match_kind: "display_name" | "alias_text";
  matched_text: string;
}
```

Add `scoped_matches: ScopedMatch[]` to `FindNamedEntitiesResponse`.

### 2. Add SQL queries for scoped matches

Inside the `for (const name of names)` loop in `findNamedEntities`, after the existing canonical + alias + unresolved queries, add:

- A query against `scoped_references` WHERE `world_slug = ? AND display_name = ?`, returning `reference_id, display_name, reference_kind, relation, provenance_scope, source_node_id, target_node_id`. Push one `ScopedMatch` per row with `match_kind='display_name'`, `matched_text=display_name`.
- A query against `scoped_reference_aliases` JOIN `scoped_references` ON `reference_id`, WHERE `scoped_references.world_slug = ? AND scoped_reference_aliases.alias_text = ?`, returning the same columns plus `alias_text`. Push one `ScopedMatch` per row with `match_kind='alias_text'`, `matched_text=alias_text`.

### 3. Apply the sort invariant

After the loop, sort `scopedMatches` by: `match_kind` (`display_name` before `alias_text`), then `query`, then `display_name`, then `reference_id`.

### 4. Return the extended response

`return { canonical_matches, scoped_matches, surface_matches };`

## Files to Touch

- `tools/world-mcp/src/tools/find-named-entities.ts` (modify)
- `tools/world-mcp/tests/tools/find-named-entities.test.ts` (modify)

## Out of Scope

- Widening the existing `entity_name` filter on `search_nodes` to include scoped references (explicitly forbidden by SPEC-12 D4 — `entity_name` stays canonical-only)
- `search_nodes` filter semantics (covered by ticket 006)
- `match_basis` result field on `search_nodes` (covered by ticket 006)

## Acceptance Criteria

### Tests That Must Pass

1. Query "Mudbrook" on a fixture where Melissa's `scoped_references` declares Mudbrook returns 1 `scoped_match` with `display_name='Mudbrook'`, `match_kind='display_name'`, and `source_node_id` pointing to Melissa's record.
2. Query "Mudbrook-on-the-Bend" on the same fixture returns 1 `scoped_match` with `match_kind='alias_text'` and `display_name='Mudbrook'`.
3. Query against a canonical entity (e.g., "Threadscar Melissa") returns a row in `canonical_matches` and NO row in `scoped_matches` for that canonical.
4. `scoped_matches` for a multi-query request returns rows grouped first by `match_kind` then `query`, with ties broken by `display_name` then `reference_id`.
5. Existing `canonical_matches` and `surface_matches` behavior unchanged for fixture queries.
6. `pnpm --filter @worldloom/world-mcp test tests/tools/find-named-entities.test.ts` passes.

### Invariants

1. `scoped_matches` NEVER contains canonical-entity rows (no row whose `reference_id` is actually an `entity:*` id).
2. `surface_matches` NEVER contains scoped-reference rows.
3. Existing callers that destructure only `canonical_matches` + `surface_matches` continue to work (the new field is additive).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — 4+ new test cases covering the 6 acceptance bullets above.

### Commands

1. `pnpm --filter @worldloom/world-mcp test tests/tools/find-named-entities.test.ts`
2. `pnpm --filter @worldloom/world-mcp test`
3. `pnpm --filter @worldloom/world-mcp build` (build runs `tsc -p tsconfig.json`, which is the typecheck surface; the `world-mcp` package does not ship a separate `typecheck` script)
