# SPEC10ENTSUR-001: Baseline-replace schema with `entities`, `entity_aliases`, and redesigned `entity_mentions`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/world-index` schema, entity extraction pipeline, insert helpers, inspect payload, and entity-surface tests now all use the three-surface contract.
**Deps**: `specs/SPEC-10-entity-surface-redesign.md`, `archive/specs/SPEC-01-world-index.md`, `docs/FOUNDATIONS.md`

## Problem

The old `entity_mentions(entity_name, entity_kind)` surface conflated canonical entities, aliases, and free-form mention evidence. That violated the design intent in `specs/SPEC-10-entity-surface-redesign.md` and was no longer alignable with `docs/FOUNDATIONS.md` once the contract became explicit: canonical entities must be modeled authority-backed records, while unresolved phrases remain evidence only.

## Assumption Reassessment (2026-04-23)

1. The foundational schema change was real, but it was not independently landable: `tools/world-index/tsconfig.json` compiles `src/**/*` and `tests/**/*`, so changing `EntityMentionRow` immediately broke downstream producer and test consumers in the same package.
2. `docs/FOUNDATIONS.md` `Change Control Policy` requires downstream files to be updated before the change is complete. That made the original serial split across `001`, `003`, `004`, `005`, and `006` too narrow for truthful completion.
3. The real owned seam is one same-package contract slice: schema/types, write helpers, extraction semantics, inspect observability, and the directly coupled tests in `tools/world-index/`.
4. `docs/FOUNDATIONS.md` `Core Principle`, `Ontology Categories`, and `Relation Types` rule out a compile-only compatibility shim. The entity surface had to be made semantically explicit, not merely type-compatible.
5. `SPEC10ENTSUR-003`, `SPEC10ENTSUR-004`, `SPEC10ENTSUR-005`, and `SPEC10ENTSUR-006` were therefore absorbed into this ticket. Their work landed as required-consequence fallout inside the same architectural seam.
6. `SPEC10ENTSUR-002` was not absorbed. The live implementation re-parses whole-file frontmatter directly from persisted whole-file `body` content inside `entities.ts`, which is sufficient for the Stage A adapters without changing `parse/prose.ts`.
7. `FOUNDATIONS.md` Rule 7 remains enforced at this seam: Mystery Reserve titles can surface as unresolved mention evidence, but they are not promoted to canonical `named_entity` rows without an authority-backed source.

## Architecture Check

1. The landed design is cleaner than compatibility aliasing because it gives each surface one job: `entities` for canonical records, `entity_aliases` for exact alternate forms, and `entity_mentions` for resolved or unresolved evidence.
2. No backwards-compatibility shim was introduced. The old `entity_name` / `entity_kind` columns and the old `EntityMentionRow` shape were removed in place.

## Verification Layers

1. Baseline schema was replaced truthfully. -> schema validation via `schema.test.ts` and direct SQLite object enumeration.
2. Insert/write ordering and FK integrity hold across the new three-surface contract. -> CRUD helper tests.
3. Canonical construction, alias generation, heuristic evidence emission, and Mystery Reserve firewall behavior hold. -> `entities.test.ts`.
4. Consumer observability matches the new schema. -> `commands.test.ts` inspect payload assertions.
5. Live corpus behavior remains aligned after rebuild. -> `integration/build-animalia.test.ts`.
6. The full package remains coherent after the breaking contract change. -> `npm run build` and `npm test`.

## What Changed

### 1. Schema and row types

- Replaced the old `entity_mentions(entity_name, entity_kind)` table with `entities`, `entity_aliases`, and redesigned `entity_mentions` in `tools/world-index/src/schema/migrations/001_initial.sql`.
- Replaced `EntityMentionRow` and added `EntityRow` and `EntityAliasRow` in `tools/world-index/src/schema/types.ts`.
- Kept `CURRENT_INDEX_VERSION = 1` unchanged.

### 2. Write path and command orchestration

- Added `insertEntities` and `insertEntityAliases`, and rewrote `insertEntityMentions` in `tools/world-index/src/index/nodes.ts`.
- Updated `tools/world-index/src/commands/shared.ts` to clear and rebuild derived entity state against the new schema, keep canonical-source types narrow, and keep mention-evidence loading broad enough for Stage C scanning.

### 3. Extraction semantics

- Rewrote `tools/world-index/src/parse/entities.ts` as a three-stage pipeline:
  - Stage A builds canonical entities from ontology registry entries and structured whole-file authority sources.
  - Stage B emits exact structured aliases.
  - Stage C emits exact canonical matches, exact alias matches, and unresolved heuristic phrase evidence.
- Restricted canonical promotion so heuristic phrases and Mystery Reserve headings no longer become `named_entity` rows.
- Updated `tools/world-index/src/parse/stoplist.ts` documentation so the stoplist is explicitly Stage C-only.

### 4. Consumer observability and test surface

- Expanded `tools/world-index/src/commands/inspect.ts` to emit `entity_record` and `entity_aliases`.
- Rewrote the entity-surface test suite in `schema.test.ts`, `crud.test.ts`, `entities.test.ts`, `commands.test.ts`, `integration/build-animalia.test.ts`, and updated `types.test.ts` for the live tuple count.

## Files to Touch

- `tools/world-index/src/schema/migrations/001_initial.sql`
- `tools/world-index/src/schema/types.ts`
- `tools/world-index/src/index/nodes.ts`
- `tools/world-index/src/commands/shared.ts`
- `tools/world-index/src/commands/inspect.ts`
- `tools/world-index/src/parse/entities.ts`
- `tools/world-index/src/parse/stoplist.ts`
- `tools/world-index/tests/schema.test.ts`
- `tools/world-index/tests/crud.test.ts`
- `tools/world-index/tests/entities.test.ts`
- `tools/world-index/tests/commands.test.ts`
- `tools/world-index/tests/integration/build-animalia.test.ts`
- `tools/world-index/tests/types.test.ts`

## Out of Scope

- `SPEC10ENTSUR-002` frontmatter parse substrate changes in `parse/prose.ts`
- `SPEC10ENTSUR-007` downstream SPEC-02 documentation updates
- `SPEC10ENTSUR-008` separate shell-level capstone ticket beyond the passing integration test surface

## Acceptance Criteria

### Tests That Passed

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/schema.test.js dist/tests/entities.test.js dist/tests/crud.test.js dist/tests/commands.test.js`
3. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
4. `cd tools/world-index && npm test`

### Invariants

1. Canonical entities now come only from authority-backed sources.
2. Exact aliases resolve to canonical entities without inventing new canonical rows.
3. Heuristic phrases remain unresolved evidence only.
4. Mystery Reserve titles are not promoted to canonical `named_entity` rows without an authority source.
5. The inspect payload and tests observe the same three-surface schema the package writes.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/schema.test.ts` — table/index expectations updated for the new schema.
2. `tools/world-index/tests/crud.test.ts` — three-surface insert and FK integrity coverage.
3. `tools/world-index/tests/entities.test.ts` — Stage A/B/C and Mystery Reserve firewall coverage.
4. `tools/world-index/tests/commands.test.ts` — inspect payload coverage for `entity_record` and `entity_aliases`.
5. `tools/world-index/tests/integration/build-animalia.test.ts` — live-corpus canonical-vs-evidence assertions.
6. `tools/world-index/tests/types.test.ts` — tuple-count truthing after the live type set changed.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/schema.test.js dist/tests/entities.test.js dist/tests/crud.test.js dist/tests/commands.test.js`
3. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
4. `cd tools/world-index && npm test`

## Outcome

- Completed: 2026-04-23
- Landed the full three-surface entity contract in `tools/world-index`, including schema, extraction, persistence, inspect output, and direct consumer tests.
- Absorbed the work originally drafted in `SPEC10ENTSUR-003`, `SPEC10ENTSUR-004`, `SPEC10ENTSUR-005`, and `SPEC10ENTSUR-006` because the package-level breaking contract was not independently landable under `docs/FOUNDATIONS.md`.
- Kept `SPEC10ENTSUR-002` separate by using a narrower, truthful frontmatter reread path inside `entities.ts` instead of changing `parse/prose.ts`.

## Verification Result

- `cd tools/world-index && npm run build` ✅
- `cd tools/world-index && node --test dist/tests/schema.test.js dist/tests/entities.test.js dist/tests/crud.test.js dist/tests/commands.test.js` ✅
- `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js` ✅
- `cd tools/world-index && npm test` ✅

## Deviations

- The original decomposition assumed `001` could land ahead of its direct consumers. Live repo validation disproved that.
- The final live corpus assertions were rewritten to the truthful authority-backed contract: some previously retained names now remain unresolved evidence rather than canonical entities, which is the intended redesign.
