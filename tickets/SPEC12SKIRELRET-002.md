# SPEC12SKIRELRET-002: Frontmatter-declared scoped references

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds a new extraction stage in `tools/world-index` that parses `scoped_references` frontmatter and persists rows into `scoped_references` + `scoped_reference_aliases` + backing `nodes` rows with `node_type='scoped_reference'` + `references_scoped_name` edges. Does not alter existing entity extraction.
**Deps**: SPEC12SKIRELRET-001

## Problem

SPEC-12 D1 introduces an optional structured `scoped_references` frontmatter block on authority-bearing records (character, character-proposal, diegetic-artifact, and proposal cards). SPEC-12 D2 requires these declarations to produce machine-readable retrieval rows. Without this ticket, frontmatter declarations are inert — the rows stay empty, and downstream tools (ticket 004's `scoped_matches`, 005's `get_node.scoped_references`, 006's filters, 007's ranking band, 008's packet class) have no data to surface.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-index/src/parse/entities.ts:413-454` currently handles `character_record`, `character_proposal_card`, and `diegetic_artifact_record` authority frontmatter via `authoritySourceForNode`. SPEC-12 D1 adds `proposal_card` to the initial supported list — this ticket's extraction stage must cover all four record types.
2. `canonicalEntitySlug` at `tools/world-index/src/parse/entities.ts:769` is currently file-local (not exported). SPEC-12 D2's `reference_id` format reuses it: `${source_node_id}#scoped:${canonicalEntitySlug(display_name)}:${ordinal}`. This ticket must export the function (rename-safe; no existing external consumer).
3. Cross-package contract under audit: emitted rows are consumed by the ranking SQL in ticket 007's `sqlToCandidates` extension, the `find_named_entities` scoped tier in ticket 004, and the `get_node` / packet-assembly in tickets 005 / 008. The shared table is `scoped_references` with `authority_level='explicit_scoped_reference'` — ticket 003 shares this table with `authority_level='exact_structured_edge'`, so the column is the disambiguator.

## Architecture Check

1. Adding a new parser stage (`extractScopedReferences`) alongside `extractEntities` follows the existing pipeline shape — parallel stages reading `proseNodes` and returning typed row sets. Cleaner than splicing a new branch into the canonical-entity `stageA/B/C` flow in `entities.ts:147-411`.
2. Reusing `canonicalEntitySlug` for scoped slug derivation keeps slug semantics consistent between canonical entities and scoped references (same NFC normalization, same kebab-case, same collision-resolution scheme).
3. No backwards-compatibility aliasing: records without a `scoped_references` block emit zero rows (strict additive).

## Verification Layers

1. Frontmatter with a `scoped_references` block emits rows -> schema validation (`SELECT ... FROM scoped_references WHERE source_node_id = ?`).
2. `reference_id` follows the `${source_node_id}#scoped:<slug>:<ordinal>` format -> unit test with regex `^.+#scoped:[a-z0-9-]+:\d+$`.
3. Backing `nodes` row exists with `node_type='scoped_reference'` -> schema validation on `nodes` table.
4. `references_scoped_name` edge emitted from source record to scoped-reference node -> schema validation on `edges` table.
5. Records WITHOUT `scoped_references` block emit ZERO rows (strict additive) -> unit test on a fixture with no block.
6. Malformed entry (missing `relation`) emits a `validation_results` row with severity `warn` (not throw) -> unit test leveraging the existing `validationResults` surface.

## What to Change

### 1. Add a scoped-reference extraction stage

Add `extractScopedReferences(proseNodes: NodeRow[]): ScopedReferenceExtractionOutput` in a new `tools/world-index/src/parse/scoped.ts` (or extension to `entities.ts` if minimal). Output type:

```ts
export interface ScopedReferenceExtractionOutput {
  scopedNodes: NodeRow[];        // backing nodes with node_type='scoped_reference'
  scopedReferences: ScopedReferenceRow[];
  scopedReferenceAliases: ScopedReferenceAliasRow[];
  edges: EdgeRow[];              // references_scoped_name edges
  validationResults: ValidationResultRow[];
}
```

For each `proseNode` of type `character_record`, `character_proposal_card`, `diegetic_artifact_record`, or `proposal_card`:

- Parse frontmatter using the existing `parseAuthorityFrontmatter` helper (`entities.ts:798`).
- If the frontmatter carries a `scoped_references` key that is a non-empty array, iterate entries.
- For each entry, require `name: string` and `relation: string`; optional `kind: string | null`, `aliases: string[]`.
- Missing/invalid fields emit a `validationResults` row (validator_name `scoped_reference_parse`, severity `warn`, code `malformed_scoped_reference`), and the entry is skipped.
- Valid entries:
  - `reference_id = ${source_node_id}#scoped:${canonicalEntitySlug(name)}:${ordinal}` where `ordinal` is the 0-based index within the record's `scoped_references` list.
  - Emit one `scoped_references` row with `authority_level='explicit_scoped_reference'`, `source_field='scoped_references'`, `target_node_id=null` (frontmatter-declared references don't resolve to a specific record node), `provenance_scope` derived from the source record type (`character_record` → `world`; `character_proposal_card` → `proposal`; `diegetic_artifact_record` → `diegetic`; `proposal_card` → `proposal`).
  - Emit one `scoped_reference_aliases` row per alias text (normalized via the existing `normalizeSurface` helper).
  - Emit one `nodes` row with `node_id = reference_id`, `node_type='scoped_reference'`, body `"Scoped reference: ${name} | Kind: ${kind ?? "unknown"} | Relation: ${relation}"`, `content_hash` and `anchor_checksum` computed via existing helpers.
  - Emit one `references_scoped_name` edge from source node to the scoped-reference node.

### 2. Wire the new stage into the index-build pipeline

In `tools/world-index/src/index/nodes.ts` (or wherever `extractEntities` output is persisted), add a parallel `extractScopedReferences` call + persist the emitted rows into `scoped_references`, `scoped_reference_aliases`, `nodes`, `edges` tables.

### 3. Export `canonicalEntitySlug`

In `tools/world-index/src/parse/entities.ts:769`, make `canonicalEntitySlug` a named export. Semantics unchanged.

## Files to Touch

- `tools/world-index/src/parse/scoped.ts` (new)
- `tools/world-index/src/parse/entities.ts` (modify — export `canonicalEntitySlug`)
- `tools/world-index/src/schema/types.ts` (modify — add `ScopedReferenceRow`, `ScopedReferenceAliasRow` interface exports)
- `tools/world-index/src/index/nodes.ts` or sibling index-write module (modify — persist new rows)
- `tools/world-index/tests/parse/scoped.test.ts` (new)

## Out of Scope

- Structured-edge adapters for id-bearing fields (`author_character_id`, `batch_id`, `source_artifact_id`) — covered by SPEC12SKIRELRET-003
- MCP tool response additions (covered by 004-008)
- Content edits to `worlds/animalia/` records (covered by 010)
- Widening `entities` or `entity_aliases` tables to include scoped references (explicitly forbidden by SPEC-12 D2 Invariants)

## Acceptance Criteria

### Tests That Must Pass

1. Fixture character record with 2 `scoped_references` entries emits exactly 2 rows in `scoped_references`, both with correct `source_node_id`.
2. Fixture entry with `aliases: [A, B]` emits 2 `scoped_reference_aliases` rows for that reference.
3. Fixture without a `scoped_references` block emits 0 rows in `scoped_references` (strict additive).
4. `reference_id` matches regex `^.+#scoped:[a-z0-9-]+:\d+$` for every emitted row.
5. A backing `nodes` row exists with `node_type='scoped_reference'` for every scoped-reference row (`reference_id == node_id`).
6. `references_scoped_name` edge is emitted from source record to scoped-reference node with matching `source_node_id`.
7. Malformed entry (missing `relation`) produces a `validation_results` row with `severity='warn'` and the extraction does not throw.
8. `pnpm --filter @worldloom/world-index test` passes.

### Invariants

1. Scoped-reference rows NEVER appear in the `entities` or `entity_aliases` tables.
2. Scoped-reference edges NEVER use `edge_type='mentions_entity'`.
3. No scoped reference promotes a local name into world-level ontology: `ONTOLOGY.md`'s named-entity registry is unchanged by any scoped-reference declaration.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/scoped.test.ts` — fixture-based tests covering the 8 acceptance bullets above.

### Commands

1. `pnpm --filter @worldloom/world-index test tests/parse/scoped.test.ts`
2. `pnpm --filter @worldloom/world-index test`
3. `rm -rf worlds/animalia/_index && pnpm --filter @worldloom/world-index run cli build animalia && sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references"` — smoke test (expect 0 rows until ticket 010 adds frontmatter blocks to animalia records).
