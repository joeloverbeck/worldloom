# SPEC12SKIRELRET-005: `get_node` structured_links + scoped_references

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/get-node.ts` response with two new arrays; additive on `NodeDetail`.
**Deps**: SPEC12SKIRELRET-002, SPEC12SKIRELRET-003

## Problem

Per SPEC-12 D4, `get_node` must expose the new retrieval surfaces as structured fields: `structured_links` (exact record-to-record links from id-bearing fields, sourced from ticket 003) and `scoped_references` (source-local retrieval anchors declared on the node or derived from structured-edge adapters, sourced from tickets 002 and 003). Currently `get_node` returns `{edges, entity_mentions}` only (`tools/world-mcp/src/tools/get-node.ts:31-45`), forcing every caller to filter the `edges` array by edge_type and cross-reference the `scoped_references` table manually. This ticket adds a curated projection so localization-first callers read the new surfaces directly.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-mcp/src/tools/get-node.ts:31-45` currently defines `NodeDetail` with `edges: NodeEdge[]` and `entity_mentions: NodeMention[]`. SPEC-12 D4 requires two additional top-level fields (`structured_links`, `scoped_references`).
2. Data sources are tables populated by tickets 002 + 003: `scoped_references` (filtered by `source_node_id`), `scoped_reference_aliases` (joined via `reference_id`), and `edges` WHERE `edge_type='references_record'` (already surfaced in `edges` but projected here with `source_field` pulled from the parallel `scoped_references` row).
3. Cross-package contract under audit: packet assembler (ticket 008) will read these fields from `get_node` output — or, more likely, query the same tables directly. Either way, the `NodeDetail` extension is additive (existing callers reading only `{edges, entity_mentions}` remain unaffected).

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
- Query `scoped_references` WHERE `source_node_id = ?` ORDER BY `reference_id`. For each row, execute a second query against `scoped_reference_aliases` filtered by `reference_id` to build the `aliases: string[]` list. Aggregate into `NodeScopedReference[]`.

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
6. `pnpm --filter @worldloom/world-mcp test tests/tools/get-node.test.ts` passes.

### Invariants

1. `structured_links` entries ⊆ `edges` entries (every `structured_links` row has a corresponding `references_record` edge in the `edges` array).
2. `scoped_references` in the response equals `scoped_references` table rows filtered by `source_node_id = <requested node_id>`.
3. Additive surface — existing callers reading only `{edges, entity_mentions}` are unaffected.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-node.test.ts` — 4+ new cases covering the 6 acceptance bullets.

### Commands

1. `pnpm --filter @worldloom/world-mcp test tests/tools/get-node.test.ts`
2. `pnpm --filter @worldloom/world-mcp test`
3. `pnpm --filter @worldloom/world-mcp build` (build runs `tsc -p tsconfig.json`, which is the typecheck surface; the `world-mcp` package does not ship a separate `typecheck` script)
