# SPEC12SKIRELRET-003: Structured record-edge adapters

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small-Medium
**Engine Changes**: Yes — adds adapter functions in `tools/world-index` that emit `references_record` edges + corresponding `scoped_references` rows (with `authority_level='exact_structured_edge'`) from existing id-bearing frontmatter fields. Also adds a negative-invariant test in `tools/world-mcp` proving `find_impacted_fragments` does not traverse the new edges.
**Deps**: SPEC12SKIRELRET-001

## Problem

Per SPEC-12 D3, the retrieval graph must materialize exact id-bearing cross-record links already present in frontmatter (`author_character_id` on diegetic artifacts, `source_artifact_id` on mining-batch manifests, `batch_id` on proposal cards and character proposal cards). Without adapters, these links stay invisible to `get_neighbors`, ranking, and packet assembly — even though they carry higher trust than lexical search. The observed production failure (DA-0002 visibly carries `author_character_id: CHAR-0002` but the retrieval graph treats them as unrelated) is this gap made concrete. This ticket emits structured edges from those fields and confirms the SPEC-12 D2 invariant that `find_impacted_fragments` does NOT traverse the new edges.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Field presence confirmed in current repo: `author_character_id: CHAR-0002` at `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md:8`; `batch_id` on proposal cards per `.claude/skills/propose-new-canon-facts/SKILL.md:100`; `batch_id` on character proposal cards per `.claude/skills/propose-new-characters/SKILL.md:126`; `source_artifact_id` on mining-batch manifests per `.claude/skills/canon-facts-from-diegetic-artifacts/templates/batch-manifest.md:20`; `source_artifact_id` on mining-derived proposal cards per `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md:35`.
2. Mining batches vs general proposal batches: only mining batches (from `canon-facts-from-diegetic-artifacts`) carry `source_artifact_id`; general proposal batches (from `propose-new-canon-facts`) do not. Adapter must no-op cleanly when the field is absent on a given batch.
3. Cross-package contract under audit: structured-edge rows share the `scoped_references` table with ticket 002's frontmatter-declared rows. The `authority_level` column disambiguates: `'exact_structured_edge'` for this ticket vs `'explicit_scoped_reference'` for 002. Consumers (004-008) read the table filtered by `authority_level` when they need tier-specific behavior.
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) enforcement surface under audit: `find_impacted_fragments` currently traverses only `mentions_entity` + `required_world_update` edges (`tools/world-mcp/src/tools/find-impacted-fragments.ts:88-105`). SPEC-12 D2 Invariants require this traversal set to stay canonical-only in v1; widening to `references_record` / `references_scoped_name` would silently extend impact surfaces and risk Rule 7 MR-firewall drift. This ticket adds a negative-invariant test proving the current traversal remains unchanged.

## Architecture Check

1. Packaging the adapters as a single extraction stage (parallel to ticket 002's frontmatter-declared stage) keeps the structured-edge pathway separate from the frontmatter-declared pathway while sharing the table — `authority_level` disambiguates in the shared `scoped_references` rows without duplicating storage.
2. Adapter-per-field pattern scales cleanly if a future spec adds new id-bearing fields; the adapter table (see below) is the single point of extension.
3. No backwards-compatibility aliasing: existing frontmatter readers of `author_character_id` / `batch_id` / `source_artifact_id` remain untouched; this ticket adds a read-side projection into the retrieval graph.

## Verification Layers

1. DA-0002 with `author_character_id: CHAR-0002` emits a `references_record` edge DA-0002 → CHAR-0002 + a matching `scoped_references` row with `authority_level='exact_structured_edge'` -> schema validation on `edges` + `scoped_references` tables.
2. Proposal card with `batch_id: BATCH-0001` emits a `references_record` edge card → BATCH-0001 -> schema validation.
3. Mining batch with `source_artifact_id: DA-0001` emits a `references_record` edge batch → DA-0001 -> schema validation.
4. General proposal batch WITHOUT `source_artifact_id` emits 0 edges for that field -> unit test on a fixture.
5. Unresolvable reference (e.g., `batch_id: BATCH-9999` with no matching batch present in the index) emits an edge with `target_node_id=null` and `target_unresolved_ref='BATCH-9999'` -> unit test.
6. `find_impacted_fragments` returns zero impacted nodes via `references_record` or `references_scoped_name` edges in a fixture containing only those edge types -> negative-invariant unit test.

## What to Change

### 1. Add structured-edge adapter stage

Add `extractStructuredRecordEdges(proseNodes: NodeRow[]): StructuredEdgeExtractionOutput` in `tools/world-index/src/parse/structured-edges.ts` (new file; parallel to ticket 002's `scoped.ts`). Adapter table:

| Source node type | Source field | Target node lookup | `relation` value |
|---|---|---|---|
| `diegetic_artifact_record` | `author_character_id` | find `character_record` whose frontmatter `character_id` matches the value | `author_character_id` |
| `proposal_batch` | `source_artifact_id` | find `diegetic_artifact_record` whose frontmatter `artifact_id` matches the value | `source_artifact_id` |
| `proposal_card` | `batch_id` | find `proposal_batch` whose frontmatter `batch_id` matches the value | `batch_id` |
| `character_proposal_card` | `batch_id` | find `character_proposal_batch` whose frontmatter `batch_id` matches the value | `batch_id` |

For each adapter hit:

- Emit a `scoped_references` row with `source_node_id=<source>`, `target_node_id=<resolved>` (or `null` if unresolvable), `display_name=<target's canonical name or title>`, `reference_kind` derived from target node type (`character_record` → `person`; `diegetic_artifact_record` → `artifact`; `proposal_batch` → `proposal_batch`; `character_proposal_batch` → `character_proposal_batch`), `relation=<source_field>`, `provenance_scope` from the source node's scope mapping, `authority_level='exact_structured_edge'`, `source_field=<adapter's source field>`.
- `reference_id` format: `${source_node_id}#structured:${source_field}:0` (ordinal always `0` since id fields are singleton per record).
- Emit a `references_record` edge source → target (or source → `null` with `target_unresolved_ref=<field value>` when unresolvable).

### 2. Handle missing fields gracefully

When the source field is absent on a record (e.g., general proposal batch without `source_artifact_id`), skip silently — emit zero rows for that field on that record. When the source field is present but resolves to no existing node (e.g., `batch_id: BATCH-9999` in a world with no such batch), emit the edge with `target_node_id=null` and `target_unresolved_ref=<field value>` per the existing `EdgeRow` contract.

### 3. Wire into the index-build pipeline

Persist emitted `scoped_references` rows and `references_record` edges alongside ticket 002's output in the same index-write pass.

### 4. Negative invariant: `find_impacted_fragments` does not traverse new edges

Add a unit test in `tools/world-mcp/tests/tools/find-impacted-fragments.test.ts` asserting that a fixture node with only `references_record` and `references_scoped_name` edges (no `mentions_entity`, no `required_world_update`) returns zero impacted fragments. This is a Rule-7-preserving regression guard.

## Files to Touch

- `tools/world-index/src/parse/structured-edges.ts` (new)
- `tools/world-index/src/index/nodes.ts` or sibling index-write module (modify — persist structured-edge rows alongside 002's output)
- `tools/world-index/tests/parse/structured-edges.test.ts` (new)
- `tools/world-mcp/tests/tools/find-impacted-fragments.test.ts` (modify — add negative invariant)

## Out of Scope

- MCP tool response additions (covered by 004-008)
- Including the new edges in `find_impacted_fragments` expansion (explicitly forbidden by SPEC-12 D2 Invariants and §Out of Scope)
- Adapter extensions to non-initial fields (deferred to a future spec)

## Acceptance Criteria

### Tests That Must Pass

1. DA-0002 fixture with `author_character_id: CHAR-0002` emits exactly 1 `references_record` edge DA-0002 → CHAR-0002 and 1 `scoped_references` row with `authority_level='exact_structured_edge'` and `source_field='author_character_id'`.
2. Proposal card fixture with `batch_id: BATCH-0001` emits 1 `references_record` edge card → BATCH-0001.
3. Mining batch fixture with `source_artifact_id: DA-0001` emits 1 `references_record` edge batch → DA-0001.
4. General proposal batch fixture WITHOUT `source_artifact_id` emits 0 edges for that field.
5. Unresolvable fixture (e.g., `batch_id: BATCH-9999` with no matching batch) emits 1 edge with `target_node_id=null` and `target_unresolved_ref='BATCH-9999'`.
6. `findImpactedFragments` on a fixture whose seed has only `references_record` and `references_scoped_name` edges returns `impacted: []`.
7. `pnpm --filter @worldloom/world-index test` + `pnpm --filter @worldloom/world-mcp test` pass.

### Invariants

1. `authority_level` column distinguishes structured-edge rows (`'exact_structured_edge'`) from frontmatter-declared rows (`'explicit_scoped_reference'`) in the shared `scoped_references` table.
2. `find_impacted_fragments` traversal edge set remains exactly `{mentions_entity, required_world_update}` — no widening.
3. `references_record` edges respect the `target_unresolved_ref` convention for unresolved targets, consistent with existing yaml-edge semantics (see `tools/world-index/src/parse/semantic.ts:149-161`).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/structured-edges.test.ts` — fixture-based tests for 5 adapter cases + unresolvable + absent-field.
2. `tools/world-mcp/tests/tools/find-impacted-fragments.test.ts` — add negative-invariant test per §Verification Layers bullet 6.

### Commands

1. `pnpm --filter @worldloom/world-index test tests/parse/structured-edges.test.ts`
2. `pnpm --filter @worldloom/world-mcp test tests/tools/find-impacted-fragments.test.ts`
3. `pnpm -r test`
