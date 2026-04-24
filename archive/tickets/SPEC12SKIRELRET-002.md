# SPEC12SKIRELRET-002: Frontmatter-declared scoped references

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds a new extraction stage in `tools/world-index` that parses `scoped_references` frontmatter and persists rows into `scoped_references` + `scoped_reference_aliases` + backing `nodes` rows with `node_type='scoped_reference'` + `references_scoped_name` edges. Reuses the schema/types foundation already landed in `archive/tickets/SPEC12SKIRELRET-001.md`; does not alter existing canonical-entity extraction.
**Deps**: SPEC12SKIRELRET-001

## Problem

SPEC-12 D1 introduces an optional structured `scoped_references` frontmatter block on authority-bearing records (character, character-proposal, diegetic-artifact, and proposal cards). SPEC-12 D2 requires these declarations to produce machine-readable retrieval rows. Without this ticket, frontmatter declarations are inert — the rows stay empty, and downstream tools (ticket 004's `scoped_matches`, 005's `get_node.scoped_references`, 006's filters, 007's ranking band, 008's packet class) have no data to surface.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `archive/tickets/SPEC12SKIRELRET-001.md` already landed the schema/types foundation: `tools/world-index/src/schema/migrations/002_scoped_references.sql` exists, `tools/world-index/src/schema/types.ts` already includes `node_type='scoped_reference'` plus `SCOPED_EDGE_TYPES`, and no parse/persist stage currently writes into the new tables. This ticket therefore narrows to parser-and-persistence work inside the existing `tools/world-index` seam.
2. `tools/world-index/src/parse/entities.ts` already exposes the reusable helpers this ticket needs only as file-local functions: `canonicalEntitySlug`, `parseAuthorityFrontmatter`, `normalizeSurface`, and `firstNonEmptyString`. The truthful minimal implementation is to export the helper surface rather than duplicate slug/frontmatter normalization in a second parser module.
3. Cross-artifact contract under audit: emitted rows must reuse the shared `scoped_references` / `scoped_reference_aliases` tables introduced by ticket 001, with `authority_level='explicit_scoped_reference'` distinguishing this ticket's frontmatter-declared rows from ticket 003's later `authority_level='exact_structured_edge'` rows.
4. `tools/world-index/src/commands/shared.ts:131-171` currently finalizes only canonical entities (`extractEntities`) and never clears or persists scoped-reference state. The real write seam is `finalizeEntityState` plus `clearEntityState`, not `parseWorldFile`.
5. The user-supplied reference glob `specs/SPEC-012-skill*` does not resolve exactly in the live repo, but the intended spec surface is present as `specs/SPEC-12-skill-reliable-retrieval.md`. The landed implementation remains aligned to that live spec plus the active ticket family, so the reassessment fallback was the exact ticket plus the nearby SPEC-12 spec rather than a missing-spec blocker.
6. The drafted test commands are stale for the live package layout: `tools/world-index/package.json` exposes only `build` and `test`, where `test` runs `node --test dist/tests/*.test.js` after compilation. A truthful targeted proof surface is `cd tools/world-index && pnpm build && node --test dist/tests/scoped.test.js`, followed by the existing full-package `cd tools/world-index && pnpm test`.
7. The drafted smoke command's working-directory assumption was also stale: `tools/world-index/src/cli.ts` resolves `worldRoot` from `process.cwd()`, so `build animalia` must run from repo root even when the compiled binary lives under `tools/world-index/dist/src/cli.js`.

## Architecture Check

1. Adding a new parser stage (`extractScopedReferences`) alongside `extractEntities` follows the existing pipeline shape — parallel stages reading persisted `proseNodes` and returning typed row sets. Cleaner than splicing scoped-reference emission into the canonical-entity `stageA/B/C` flow in `tools/world-index/src/parse/entities.ts`.
2. Reusing `canonicalEntitySlug` for scoped slug derivation keeps slug semantics consistent between canonical entities and scoped references (same NFC normalization, same kebab-case, same collision-resolution scheme).
3. No backwards-compatibility aliasing: records without a `scoped_references` block emit zero rows (strict additive).

## Verification Layers

1. Frontmatter with a `scoped_references` block emits rows into `scoped_references` -> unit test plus schema validation on an in-memory DB fixture.
2. `reference_id` follows the `${source_node_id}#scoped:<slug>:<ordinal>` format -> unit test with regex `^.+#scoped:[a-z0-9-]+:\d+$`.
3. Backing `nodes` row exists with `node_type='scoped_reference'` and `references_scoped_name` edge emitted from source record -> unit test over extracted rows plus schema validation after persistence.
4. Records without a `scoped_references` block emit zero rows (strict additive) -> unit test on a fixture with no block.
5. Malformed entry (missing `relation`) emits a `validation_results` row with severity `warn` and extraction continues -> unit test leveraging the existing `validationResults` surface.
6. FOUNDATIONS alignment: scoped-reference declarations remain retrieval-only metadata and do not promote local names into world-level ontology or mutate mandatory world files -> manual review against `docs/FOUNDATIONS.md`.

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

### 2. Wire the new stage into entity finalization

In `tools/world-index/src/commands/shared.ts`, add a parallel `extractScopedReferences` call inside `finalizeEntityState`, persist the emitted rows into `scoped_references`, `scoped_reference_aliases`, `nodes`, `edges`, and extend `clearEntityState` so rebuild/sync clears the scoped-reference rows it owns.

### 3. Export the shared parsing helpers

In `tools/world-index/src/parse/entities.ts`, export `canonicalEntitySlug`, `parseAuthorityFrontmatter`, `normalizeSurface`, and `firstNonEmptyString` so the new parser stage reuses the existing canonical normalization/frontmatter behavior instead of forking it.

## Files to Touch

- `tools/world-index/src/parse/scoped.ts` (new)
- `tools/world-index/src/parse/entities.ts` (modify — export shared parsing helpers reused by `scoped.ts`)
- `tools/world-index/src/schema/types.ts` (modify — add `ScopedReferenceRow`, `ScopedReferenceAliasRow` interface exports)
- `tools/world-index/src/index/nodes.ts` (modify — add insert helpers for scoped-reference tables)
- `tools/world-index/src/commands/shared.ts` (modify — finalize/persist/clear scoped-reference state)
- `tools/world-index/tests/scoped.test.ts` (new)

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
8. `cd tools/world-index && pnpm test` passes.

### Invariants

1. Scoped-reference rows NEVER appear in the `entities` or `entity_aliases` tables.
2. Scoped-reference edges NEVER use `edge_type='mentions_entity'`.
3. No scoped reference promotes a local name into world-level ontology: `ONTOLOGY.md`'s named-entity registry is unchanged by any scoped-reference declaration.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/scoped.test.ts` — fixture-based tests covering the extraction and persistence acceptance bullets above.

### Commands

1. `cd tools/world-index && pnpm build && node --test dist/tests/scoped.test.js`
2. `cd tools/world-index && pnpm test`
3. `cd /home/joeloverbeck/projects/worldloom && rm -rf worlds/animalia/_index && node tools/world-index/dist/src/cli.js build animalia && sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references"` — smoke test (expect `0` rows until ticket 010 adds frontmatter blocks to animalia records).

## Outcome

- Completed on 2026-04-24.
- Added `tools/world-index/src/parse/scoped.ts` to extract frontmatter-declared `scoped_references` from `character_record`, `character_proposal_card`, `diegetic_artifact_record`, and `proposal_card` prose nodes into backing scoped nodes, table rows, aliases, edges, and warning diagnostics.
- Extended `tools/world-index/src/parse/entities.ts` and `tools/world-index/src/schema/types.ts` with the shared helper/type exports needed for the new parser stage.
- Wired scoped-reference persistence into `tools/world-index/src/commands/shared.ts` and `tools/world-index/src/index/nodes.ts`, including rebuild-safe clearing of scoped-reference rows, aliases, edges, anchor checksums, and validation warnings.
- Added `tools/world-index/tests/scoped.test.ts` to prove extraction semantics, persistence into `scoped_references` / `scoped_reference_aliases`, backing `nodes` rows, emitted `references_scoped_name` edges, malformed-entry warnings, and the invariant that scoped rows do not touch `entities`.

## Verification Result

- Passed `cd tools/world-index && pnpm build`
- Passed `cd tools/world-index && node --test dist/tests/scoped.test.js`
- Passed `cd tools/world-index && pnpm test`
- Passed `rm -rf worlds/animalia/_index && node tools/world-index/dist/src/cli.js build animalia`
- Passed `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references"` -> `0`

## Deviations

- The smoke-test command in `Test Plan` was rewritten to the truthful repo-root form because `tools/world-index/src/cli.ts` resolves `worldRoot` from `process.cwd()`. The package-root variant fails with `Unknown world slug 'animalia'`.
