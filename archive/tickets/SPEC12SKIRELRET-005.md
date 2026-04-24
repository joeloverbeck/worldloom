# SPEC12SKIRELRET-005: `get_node` structured_links + scoped_references

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/get-node.ts` response with two new arrays; additive on `NodeDetail`.
**Deps**: SPEC12SKIRELRET-002, SPEC12SKIRELRET-003

## Problem

Per SPEC-12 D4, `get_node` needed to expose the new retrieval surfaces as structured fields: `structured_links` (exact record-to-record links from id-bearing fields, sourced from ticket 003) and `scoped_references` (source-local retrieval anchors declared on the node or derived from structured-edge adapters, sourced from tickets 002 and 003). Before this change, `get_node` returned `{edges, entity_mentions}` only, forcing every caller to filter the `edges` array by edge_type and cross-reference the `scoped_references` table manually. This ticket adds a curated projection so localization-first callers read the new surfaces directly.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-mcp/src/tools/get-node.ts:31-45` currently defines `NodeDetail` with `edges: NodeEdge[]` and `entity_mentions: NodeMention[]`. SPEC-12 D4 requires two additional top-level fields (`structured_links`, `scoped_references`).
2. Data sources are already live in the index seam: `tools/world-index/src/schema/migrations/002_scoped_references.sql`, `tools/world-index/src/parse/scoped.ts`, and `tools/world-index/src/parse/structured-edges.ts` populate `scoped_references`, `scoped_reference_aliases`, and `edges.edge_type='references_record'`. This ticket is now a `tools/world-mcp` projection gap rather than a schema/parser ticket.
3. Cross-package contract under audit: packet assembler (ticket 008) may read these fields from `get_node` output or query the same tables directly. Either way, the `NodeDetail` extension is additive (existing callers reading only `{edges, entity_mentions}` remain unaffected).
4. The drafted targeted proof command was stale. In the live `tools/world-mcp` package, `test` compiles first and runs Node against emitted JS. `node --test tests/tools/get-node.test.ts` fails with `ERR_UNKNOWN_FILE_EXTENSION`, so the truthful narrow proof is `pnpm --filter @worldloom/world-mcp build` followed by `pnpm --filter @worldloom/world-mcp exec node --test dist/tests/tools/get-node.test.js`.
5. The seeded `world-mcp` test harness already enforces the live scoped-reference schema contract from migration `002_scoped_references.sql`: each `scoped_references.reference_id` must reference a backing `nodes.node_id` row with `node_type='scoped_reference'`. The new tests therefore needed fixture backing nodes, not a schema workaround.

## Architecture Check

1. Curated projection avoids forcing every caller to filter the `edges` array by edge_type and re-query `scoped_references` separately. One tool call returns the full localization surface for a node.
2. Flat top-level fields (not nested under `localization: {...}`) match the existing response style (parallel to `edges`, `entity_mentions`).
3. No backwards-compatibility aliasing.

## Verification Layers

1. Node with `references_record` edges exposes them in `structured_links` with `source_field` populated -> unit test.
2. Node with frontmatter-declared `scoped_references` exposes them in the `scoped_references` field with `authority_level='explicit_scoped_reference'` -> unit test.
3. Node with structured-edge-derived scoped references exposes them in the `scoped_references` field with `authority_level='exact_structured_edge'` -> unit test.
4. Node without any scoped-reference or structured-edge data returns empty arrays (not `null`, not missing keys) -> unit test.
5. The same edges still appear in the existing `edges` array (backcompat) -> unit test.

## What to Change

### 1. Extend `NodeDetail` type

In `tools/world-mcp/src/tools/get-node.ts`, add:

```ts
export interface StructuredLink {
  edge_id: number;
  edge_type: "references_record";
  target_node_id: string | null;
  target_unresolved_ref: string | null;
  source_field: string;
}

export interface NodeScopedReference {
  reference_id: string;
  display_name: string;
  reference_kind: string | null;
  relation: string;
  authority_level: "explicit_scoped_reference" | "exact_structured_edge";
  target_node_id: string | null;
  aliases: string[];
}
```

Add `structured_links: StructuredLink[]` and `scoped_references: NodeScopedReference[]` to `NodeDetail`.

### 2. Add SQL queries

After the existing `outgoingEdges` / `incomingEdges` / `entityMentions` queries in `getNode`, add:

- Query joining `edges` WHERE `source_node_id = ? AND edge_type = 'references_record'` with `scoped_references` ON `edges.source_node_id = scoped_references.source_node_id AND scoped_references.authority_level = 'exact_structured_edge' AND scoped_references.target_node_id = edges.target_node_id` to populate `StructuredLink` rows with `source_field` pulled from the scoped_references row.
- Query `scoped_references` WHERE `source_node_id = ?` ORDER BY `reference_id`, then load aliases from `scoped_reference_aliases` for those `reference_id` values and aggregate them into `NodeScopedReference[]`. The alias lookup may be done in one bulk query rather than per-row.

### 3. Return extended response

Populate both arrays (empty arrays if no matches) and include them in the returned `NodeDetail`.

## Files to Touch

- `tools/world-mcp/src/tools/get-node.ts` (modify)
- `tools/world-mcp/tests/tools/get-node.test.ts` (modify)

## Out of Scope

- Traversal semantics (read-only projection, no graph walk)
- Filtering within the `structured_links` or `scoped_references` arrays (callers filter client-side)
- Response pagination / limits (deferred)

## Acceptance Criteria

### Tests That Must Pass

1. `get_node("CHAR-0002")` on a fixture where Melissa has two frontmatter-declared `scoped_references` returns those 2 entries in `scoped_references` with `authority_level='explicit_scoped_reference'`.
2. `get_node("DA-0002")` on a fixture where DA-0002 has `author_character_id: CHAR-0002` returns 1 entry in `structured_links` with `edge_type='references_record'`, `target_node_id='CHAR-0002'`, `source_field='author_character_id'`.
3. `get_node` on a node with no scoped-reference or structured-edge data returns `structured_links: []` and `scoped_references: []` (empty arrays, not `null`, not missing keys).
4. The same `references_record` edges also appear in the existing `edges` array (backcompat preserved).
5. `scoped_references[].aliases` populated correctly for references with aliases defined.
6. `pnpm --filter @worldloom/world-mcp build` and `pnpm --filter @worldloom/world-mcp exec node --test dist/tests/tools/get-node.test.js` pass.

### Invariants

1. `structured_links` entries ⊆ `edges` entries (every `structured_links` row has a corresponding `references_record` edge in the `edges` array).
2. `scoped_references` in the response equals `scoped_references` table rows filtered by `source_node_id = <requested node_id>`.
3. Additive surface — existing callers reading only `{edges, entity_mentions}` are unaffected.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-node.test.ts` — 4+ new cases covering the 6 acceptance bullets.

### Commands

1. `pnpm --filter @worldloom/world-mcp build`
2. `pnpm --filter @worldloom/world-mcp exec node --test dist/tests/tools/get-node.test.js`
3. Context only: `pnpm --filter @worldloom/world-mcp test` currently fails in `dist/tests/integration/server-stdio.test.js` when run under the full-suite `node --test` lane, even though `node dist/tests/integration/server-stdio.test.js` passes directly. That pre-existing suite issue is outside this ticket's `get_node` projection seam.

## Outcome

Completion date: 2026-04-24.

`tools/world-mcp/src/tools/get-node.ts` now returns additive `structured_links` and `scoped_references` arrays alongside the existing `edges` and `entity_mentions` fields. Structured links are projected from `references_record` edges joined to exact-structured-edge scoped-reference rows for `source_field`, and scoped references include their alias lists via a bulk lookup against `scoped_reference_aliases`.

`tools/world-mcp/tests/tools/get-node.test.ts` now seeds backing `scoped_reference` nodes plus explicit and exact-structured-edge scoped-reference rows, then proves the new response shape, alias hydration, empty-array behavior, and `edges` backcompat.

## Verification Result

1. Passed: `pnpm --filter @worldloom/world-mcp build`
2. Passed: `pnpm --filter @worldloom/world-mcp exec node --test dist/tests/tools/get-node.test.js`
3. Investigated: `pnpm --filter @worldloom/world-mcp test` fails only at `dist/tests/integration/server-stdio.test.js` in the aggregate `node --test` lane; `node dist/tests/integration/server-stdio.test.js` passes when run directly from `tools/world-mcp`, so the remaining failure is outside this ticket's owned seam.

## Deviations

The ticket draft treated the package-wide `pnpm --filter @worldloom/world-mcp test` lane as an acceptance command. Live verification showed that lane is already blocked by an unrelated integration-suite issue, so the honest acceptance boundary for this ticket is the package build plus the compiled `get-node` test file that directly proves the owned invariant.
