# SPEC12SKIRELRET-004: `find_named_entities` scoped_matches tier

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/find-named-entities.ts` with a `scoped_matches` array in the response; additive field on `FindNamedEntitiesResponse`.
**Deps**: archive/tickets/SPEC12SKIRELRET-002.md

## Problem

Per SPEC-12 D4, `find_named_entities` must surface scoped-reference matches as a distinct middle tier between canonical matches and surface evidence. Currently the tool returns `{canonical_matches, surface_matches}` only (`tools/world-mcp/src/tools/find-named-entities.ts:35-38`) — queries against names declared only as scoped references never produce structured hits, which is the observed production failure for names like `Mudbrook`, `Rill`, `Aldous`, `Registrar Copperplate`. This ticket adds the `scoped_matches` array with the documented sort invariant so downstream skills can localize those names without fallback to unresolved evidence.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-mcp/src/tools/find-named-entities.ts` currently defines `FindNamedEntitiesResponse` as `{canonical_matches: CanonicalMatch[]; surface_matches: SurfaceMatch[]}` and does not query `scoped_references` or `scoped_reference_aliases`. Canonical matches are sorted by `match_kind` (`canonical_name` before `alias`) -> `query` -> `canonical_name` -> `entity_id`; surface matches are sorted by `query` -> `node_type`. A parallel scoped sort remains the truthful additive delta.
2. The draft dependency path was stale: `tickets/SPEC12SKIRELRET-002.md` does not exist in the live repo. The scoped-reference substrate this ticket depends on is already archived as [archive/tickets/SPEC12SKIRELRET-002.md](/home/joeloverbeck/projects/worldloom/archive/tickets/SPEC12SKIRELRET-002.md), and the schema is live in `tools/world-index/src/schema/migrations/002_scoped_references.sql`.
3. Cross-package contract under audit: `scoped_matches` is an additive field on `FindNamedEntitiesResponse`, so existing callers that read only `canonical_matches` and `surface_matches` remain valid while future SPEC-06 consumers gain the middle tier.
4. Same-package proof fallout: `tools/world-mcp/tests/tools/_shared.ts` still seeded only `001_initial.sql`, so any truthful scoped-reference test in this package must also apply `002_scoped_references.sql` and expose scoped-reference seed inputs. That harness correction stays inside the active `tools/world-mcp` test seam.

## Architecture Check

1. Matching the existing two-tier shape (canonical + surface) with a middle scoped tier preserves the SPEC-10 precision-first discipline — scoped hits are a separate array, never merged into canonical.
2. Sort invariant parallel to canonical's existing rule (match_kind → query → display_name → reference_id) keeps the response shape predictable.
3. No backwards-compatibility aliasing: additive field on response type.

## Verification Layers

1. Query matching a scoped reference's `display_name` returns a row in `scoped_matches` with `match_kind='display_name'` -> targeted package test.
2. Query matching a scoped-reference alias returns a row with `match_kind='alias_text'` -> targeted package test.
3. Query matching a canonical entity appears in `canonical_matches` and not in `scoped_matches` -> targeted package test.
4. `scoped_matches` are sorted by `match_kind -> query -> display_name -> reference_id` -> targeted package test.
5. The package-local test harness seeds the scoped-reference schema before those assertions run -> targeted package test support plus manual diff review.

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

### 3. Make the package test harness truthful for scoped rows

In `tools/world-mcp/tests/tools/_shared.ts`:

- apply `002_scoped_references.sql` after `001_initial.sql`
- extend `SeedWorldInput` with `scopedReferences` and `scopedReferenceAliases`
- persist those rows into `scoped_references` and `scoped_reference_aliases`

This is required same-package fallout for the ticket's proof surface; otherwise the new tests would be exercising a stale schema boot path instead of the live package contract.

### 4. Apply the sort invariant

After the loop, sort `scopedMatches` by: `match_kind` (`display_name` before `alias_text`), then `query`, then `display_name`, then `reference_id`.

### 5. Return the extended response

`return { canonical_matches, scoped_matches, surface_matches };`

## Files to Touch

- `tools/world-mcp/src/tools/find-named-entities.ts` (modify)
- `tools/world-mcp/tests/tools/_shared.ts` (modify)
- `tools/world-mcp/tests/tools/find-named-entities.test.ts` (modify)

## Out of Scope

- Widening the existing `entity_name` filter on `search_nodes` to include scoped references (explicitly forbidden by SPEC-12 D4 — `entity_name` stays canonical-only)
- `search_nodes` filter semantics (covered by ticket 006)
- `match_basis` result field on `search_nodes` (covered by ticket 006)

## Acceptance Criteria

### Tests That Must Pass

1. Query `Mudbrook` on a fixture with a scoped-reference row returns 1 `scoped_match` with `display_name='Mudbrook'`, `match_kind='display_name'`, and Melissa's `source_node_id`.
2. Query `Mudbrook-on-the-Bend` on the same fixture returns 1 `scoped_match` with `match_kind='alias_text'` and `display_name='Mudbrook'`.
3. Query against a canonical entity (for the live fixture, `Brinewick`) returns a row in `canonical_matches` and no row in `scoped_matches`.
4. `scoped_matches` for a multi-query request return rows ordered by `match_kind`, then `query`, then `display_name`, then `reference_id`.
5. Existing `canonical_matches` and `surface_matches` behavior remains unchanged for the pre-existing fixture queries.
6. `cd tools/world-mcp && pnpm build && node --test dist/tests/tools/find-named-entities.test.js` passes.
7. `cd tools/world-mcp && pnpm test` passes.

### Invariants

1. `scoped_matches` never contains canonical-entity rows (no row whose `reference_id` is an `entity:*` id).
2. `surface_matches` NEVER contains scoped-reference rows.
3. Existing callers that destructure only `canonical_matches` + `surface_matches` continue to work because `scoped_matches` is additive.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/_shared.ts` — extend the test seeder with scoped-reference schema/row support so the package can prove the live contract.
2. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — add scoped display-name, scoped alias, canonical-tier disambiguation, and scoped sort-order coverage.

### Commands

1. `cd tools/world-mcp && pnpm build && node --test dist/tests/tools/find-named-entities.test.js`
2. `cd tools/world-mcp && pnpm test`
3. `cd tools/world-mcp && pnpm build` (package-local typecheck surface; `test` already depends on it, but keeping the explicit build step documents the producer/consumer order)

## Outcome

- Completed on 2026-04-24.
- Added `ScopedMatch` and `scoped_matches` to `FindNamedEntitiesResponse`, plus exact display-name and alias lookups over `scoped_references` / `scoped_reference_aliases` in `tools/world-mcp/src/tools/find-named-entities.ts`.
- Applied the documented scoped sort invariant (`match_kind -> query -> display_name -> reference_id`) and preserved the existing canonical and surface tiers unchanged.
- Extended `tools/world-mcp/tests/tools/_shared.ts` so the package test harness applies the live scoped-reference migration and can seed scoped-reference rows and aliases truthfully.
- Expanded `tools/world-mcp/tests/tools/find-named-entities.test.ts` with scoped display-name, scoped alias, canonical-vs-scoped disambiguation, and scoped sort-order coverage.

## Verification Result

- Passed `cd tools/world-mcp && pnpm build`
- Passed `cd tools/world-mcp && node --test dist/tests/tools/find-named-entities.test.js`
- Passed `cd tools/world-mcp && pnpm test`

## Deviations

- The drafted dependency reference was corrected from the missing active path `tickets/SPEC12SKIRELRET-002.md` to the real live authority `archive/tickets/SPEC12SKIRELRET-002.md`.
- The ticket boundary widened inside the same `tools/world-mcp` seam to include test-harness truthing in `tests/tools/_shared.ts`; without that migration/seed support, the scoped-match proof surface would have remained stale.
