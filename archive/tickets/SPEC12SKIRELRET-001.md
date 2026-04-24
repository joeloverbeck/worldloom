# SPEC12SKIRELRET-001: Schema + enum extension foundation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces numeric migration loading in `tools/world-index`, adds new SQLite schema surface (`scoped_references`, `scoped_reference_aliases`), and extends the closed `NODE_TYPES` / `EDGE_TYPES` public unions re-exported from `@worldloom/world-index/public/types`. No retrieval-behavior change on its own.
**Deps**: None

## Problem

SPEC-12 introduces a new retrieval layer (scoped references + structured record-to-record edges) that requires three pieces of foundation: (a) two new SQLite tables with their indexes, (b) a new `NODE_TYPES` union member `"scoped_reference"`, and (c) a new `EDGE_TYPES` category `SCOPED_EDGE_TYPES = ["references_scoped_name", "references_record"]`. Without this foundation, the tickets that follow (002-008) cannot parse, emit, or traverse the new retrieval surface. This ticket lands pure schema + type contract with no behavior change so each downstream ticket can be a small reviewable diff.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-index/src/schema/types.ts:6-60` currently defines `NODE_TYPES` (20 members) and `EDGE_TYPES` (13 members) as closed `as const` unions. `EDGE_TYPES` is partitioned into `YAML_EDGE_TYPES`, `ATTRIBUTION_EDGE_TYPES`, `ENTITY_EDGE_TYPES`. Adding `"scoped_reference"` to `NODE_TYPES` and a new `SCOPED_EDGE_TYPES = ["references_scoped_name", "references_record"] as const` category folded into `EDGE_TYPES` extends both unions without rename or collision.
2. The drafted migration assumption was stale: `tools/world-index/src/schema/migrations/` contains only `001_initial.sql`, and `tools/world-index/src/index/open.ts` hard-codes that single file instead of loading numeric migrations. To keep migration `002_scoped_references.sql` truthful for fresh and existing indexes, this ticket must also introduce numeric migration discovery/application and bump `CURRENT_INDEX_VERSION`.
3. Cross-package contract under audit: the extended enums flow from `tools/world-index/src/public/types.ts` into `tools/world-mcp` via `import type { NodeType, EdgeType } from "@worldloom/world-index/public/types"` (confirmed at `tools/world-mcp/src/tools/get-node.ts:1`, `get-neighbors.ts:1`, `_shared.ts:5`). The currently visible consumers are permissive (`Partial<Record<...>>` or pass-through filters), so this ticket can remain package-local to `tools/world-index` as long as the public re-export surface is truthful.
4. The drafted proof surface was also stale: `tools/world-index/tests/schema/migrations.test.ts` does not exist, and `tools/world-index/package.json` has `build` / `test` but no `typecheck` script. The truthful verification boundary is the existing package-local `schema.test.ts`, `types.test.ts`, `public-types.test.ts`, plus `cd tools/world-index && pnpm build && pnpm test`.
5. Extends existing output schema (public type surface consumed across the `tools/world-*` workspace): the extension is additive-only for consumers — new enum literals appended to the unions; no existing literal renamed or removed. Consumers that exhaustively switch on `NodeType` or `EdgeType` will surface new `never`-branch obligations at typecheck time, which is the intended signal for tickets 002-008 to handle the new values deliberately.

## Architecture Check

1. Introducing real numeric migration loading in the same package seam is required consequence fallout, not scope creep: without it, a new `002_*.sql` file would be dead text and existing v1 indexes could not upgrade truthfully. Keeping that loader work in `tools/world-index` still preserves the foundation-only boundary without pulling in parser or MCP behavior.
2. No backwards-compatibility aliasing: `EDGE_TYPES` grows via a new category spread, not a parallel union; `NODE_TYPES` appends one literal. No alias re-exports.

## Verification Layers

1. Fresh and existing indexes reach schema version 2 with both new tables/indexes present -> targeted tool command plus schema validation in `tools/world-index/tests/schema.test.ts`.
2. `NodeType` exposes `"scoped_reference"` and `EdgeType` exposes both `"references_scoped_name"` and `"references_record"` through source and public re-exports -> package-local type/runtime tests in `tools/world-index/tests/types.test.ts` and `tools/world-index/tests/public-types.test.ts`.
3. Existing package behavior remains green after the additive foundation change -> targeted tool command `cd tools/world-index && pnpm build && pnpm test`.

## What to Change

### 1. Add migration `002_scoped_references.sql`

Create `tools/world-index/src/schema/migrations/002_scoped_references.sql` containing the two CREATE TABLE statements + indexes from SPEC-12 D2 (scoped_references with indexes `idx_scoped_references_name`, `idx_scoped_references_source`; scoped_reference_aliases with indexes `idx_scoped_reference_alias_unique` UNIQUE, `idx_scoped_reference_alias_text`). Keep it forward-only.

### 2. Extend `NODE_TYPES`

In `tools/world-index/src/schema/types.ts:6-27`, append `"scoped_reference"` as the final element of the `NODE_TYPES` array.

### 3. Add `SCOPED_EDGE_TYPES` category

In `tools/world-index/src/schema/types.ts`, after `ENTITY_EDGE_TYPES` (around line 50-52), add:

```ts
export const SCOPED_EDGE_TYPES = ["references_scoped_name", "references_record"] as const;
export type ScopedEdgeType = (typeof SCOPED_EDGE_TYPES)[number];
```

Update `EDGE_TYPES` at line 54-58 to include `...SCOPED_EDGE_TYPES` in the spread.

### 4. Re-export new surfaces through public types

In `tools/world-index/src/public/types.ts`, add `ScopedEdgeType` to the `export type { … }` list and `SCOPED_EDGE_TYPES` to the `export { … }` value-re-export list.

### 5. Introduce real numeric migration loading

Replace the current single-file bootstrap in `tools/world-index/src/index/open.ts` with numeric migration discovery/application from `src/schema/migrations/*.sql`, applied in ascending order. Bump `CURRENT_INDEX_VERSION` to `2` and preserve the existing version-mismatch guard for out-of-band versions.

### 6. Update package-local tests to the live proof surface

Extend `tools/world-index/tests/schema.test.ts` to assert the new schema objects for fresh DBs and to prove an existing version-1 DB upgrades to version 2 when reopened. Update `tools/world-index/tests/types.test.ts` and `tools/world-index/tests/public-types.test.ts` for the new tuple lengths and re-exports.

## Files to Touch

- `tools/world-index/src/schema/migrations/002_scoped_references.sql` (new)
- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/public/types.ts` (modify)
- `tools/world-index/src/index/open.ts` (modify)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/tests/schema.test.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `tools/world-index/tests/public-types.test.ts` (modify)

## Out of Scope

- Emitting rows into the new tables (covered by tickets 002, 003)
- Wiring closed-enum consumers of the new `NodeType` / `EdgeType` members (covered by 002-008 as each deliberately opts in or opts out)
- MCP tool response shape changes (covered by 004-008)
- Ranking or packet-assembly semantics (covered by 007, 008)

## Acceptance Criteria

### Tests That Must Pass

1. Opening a fresh index creates schema version `2` and includes `scoped_references` plus `scoped_reference_aliases` with the expected indexes.
2. Reopening an existing version-1 index applies migration 002 in place, updates `index_version.txt` to `2`, and preserves the existing schema-version guard for unexpected versions.
3. `tools/world-index/src/schema/types.ts` declares `"scoped_reference"` inside `NODE_TYPES` and folds `SCOPED_EDGE_TYPES` into `EDGE_TYPES`.
4. `tools/world-index/src/public/types.ts` re-exports `ScopedEdgeType` and `SCOPED_EDGE_TYPES` alongside the existing public type/value surface.
5. `cd tools/world-index && pnpm build` passes.
6. `cd tools/world-index && pnpm test` passes with the new schema/type assertions.

### Invariants

1. `EDGE_TYPES` remains a disjoint union of named categories (`YAML_EDGE_TYPES` ∪ `ATTRIBUTION_EDGE_TYPES` ∪ `ENTITY_EDGE_TYPES` ∪ `SCOPED_EDGE_TYPES`); no duplicate literals.
2. Migration 002 is forward-only, and `open.ts` applies migrations in ascending numeric order rather than hard-coding a single SQL file.
3. No parser, emitter, or MCP retrieval behavior changes as a result of this ticket.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/schema.test.ts` — add assertions for fresh-schema creation plus in-place upgrade from version 1 to version 2, including the new tables and indexes.
2. `tools/world-index/tests/types.test.ts` — update tuple-count and duplicate checks for the extended node/edge registries.
3. `tools/world-index/tests/public-types.test.ts` — prove the new public re-exports match the schema source.

### Commands

1. `cd tools/world-index && pnpm build`
2. `cd tools/world-index && pnpm test`
3. `cd tools/world-index && pnpm build && pnpm test`

## Outcome

- Completed: 2026-04-24
- Added `tools/world-index/src/schema/migrations/002_scoped_references.sql` with the scoped-reference tables and indexes from SPEC-12.
- Replaced the single-file bootstrap in `tools/world-index/src/index/open.ts` with numeric migration discovery/application, and bumped `CURRENT_INDEX_VERSION` to `2` so fresh and existing indexes both land the new schema truthfully.
- Extended the closed node/edge registries with `"scoped_reference"` and `SCOPED_EDGE_TYPES`, then re-exported the new public type/value surfaces through `tools/world-index/src/public/types.ts`.
- Updated the existing package-local schema/type tests to prove fresh creation, in-place upgrade from version 1, and the new runtime/type re-exports.
- Reassessment widened the ticket slightly inside the same `tools/world-index` seam: the drafted ticket assumed numeric migration support already existed, but the live repo only hard-loaded `001_initial.sql`. Adding migration discovery/application was required consequence fallout so the new `002_scoped_references.sql` file was not dead text.
- Verification:
  - Passed `cd tools/world-index && pnpm build`
  - Passed `cd tools/world-index && pnpm test`
  - Passed `cd tools/world-mcp && pnpm build` as an extra additive-consumer check on the public type export surface
