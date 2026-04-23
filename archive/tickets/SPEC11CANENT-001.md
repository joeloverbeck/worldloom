# SPEC11CANENT-001: Surface malformed authority-source drops as validation failures

**Status**: ✅ COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` entity extraction, entity-finalization, and test proof surfaces now emit malformed-authority diagnostics instead of silently dropping canonical rows.
**Deps**: `specs/SPEC-11-canonical-entity-authority-surfaces.md`, `archive/specs/SPEC-10-entity-surface-redesign.md`, `docs/FOUNDATIONS.md`

## Problem

The current entity extractor silently drops intended canonical entities when an authority-bearing whole-file record has malformed frontmatter. In live `animalia`, `worlds/animalia/characters/melissa-threadscar.md` is indexed as a `character_record` but does not produce a canonical person because its `name` line is invalid YAML. That makes the canonical surface incomplete without any validation signal.

## Assumption Reassessment (2026-04-23)

1. `tools/world-index/src/parse/entities.ts` currently treats `character_record`, `character_proposal_card`, and `diegetic_artifact_record` as canonical authority sources via `CANONICAL_SOURCE_NODE_TYPES`.
2. The same file silently skips a record when `parseFrontmatter(node.body)` returns `null`; live `build`/`finalizeEntityState()` in `tools/world-index/src/commands/shared.ts` does not add any `validation_results` row for that omission.
3. Shared boundary under audit: whole-file record frontmatter parsing as used by canonical entity Stage A, plus the build-time entity-finalization validation surface that should expose malformed authority sources.
4. `docs/FOUNDATIONS.md` `Core Principle` and `Tooling Recommendation` favor structured truth surfaces over silent fallback. An intended authority source that fails to parse should be surfaced as malformed structured input, not quietly demoted to prose-only evidence.
5. This ticket does not widen canonical authority. It only makes current authority failures visible and testable.
6. The live `animalia` evidence is concrete: [melissa-threadscar.md](/home/joeloverbeck/projects/worldloom/worlds/animalia/characters/melissa-threadscar.md:4) contains `name: "Threadscar" Melissa`, which current YAML parsing rejects.
7. **SPEC-10 lineage**: `archive/specs/SPEC-10-entity-surface-redesign.md` §Deliverable 3 Stage A reserved `validator_name='frontmatter_parse'` / `severity='warn'` for this case but the behavior was absorbed into SPEC-10's Outcome without actually shipping (`grep frontmatter_parse tools/world-index/src/` returns zero matches). This ticket lands SPEC-10's reserved validator name at its intended place, with `code='malformed_authority_source'` distinguishing the stricter authority-bearing scope.
8. Live-corpus nuance: malformed frontmatter also prevents `tools/world-index/src/parse/prose.ts` whole-file ID extraction from reading `character_id`, so the emitted validation row correctly points at Animalia's fallback prose node id `animalia:melissa-threadscar.md:melissa-threadscar:0`, not `CHAR-0002`.

## Architecture Check

1. Emitting a validation result is cleaner than adding parser recovery hacks for malformed YAML because it preserves the structured-authority contract while making the omission visible.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Malformed authority-bearing frontmatter is visible to index consumers. -> schema validation / direct DB probe against `validation_results`.
2. Canonical entity omission is no longer silent. -> targeted entity-extractor/unit test plus live-corpus integration assertion.
3. Existing evidence-only behavior for malformed records remains truthful. -> integration test confirms the file still indexes for mention evidence.
4. FOUNDATIONS alignment remains precision-first. -> manual review against `docs/FOUNDATIONS.md` `Core Principle` and `Tooling Recommendation`.

## What to Change

### 1. Emit malformed-authority validation results

Update the entity-finalization path so malformed frontmatter on `character_record`, `character_proposal_card`, or `diegetic_artifact_record` produces a `validation_results` row with:

- `validator_name='frontmatter_parse'` (reusing SPEC-10's reserved validator name)
- `code='malformed_authority_source'` (distinguishing the authority-bearing stricter scope from a possible future broader frontmatter-parse case)
- `severity='warn'` (consistent with SPEC-10's reservation; non-blocking at build time)

The file still indexes as a prose node for mention-evidence purposes; only canonical-entity emission is suppressed for the malformed record. Implement this at the same seam that rebuilds entity state from persisted prose nodes, rather than by inventing a second per-file parser path. Reuse of `validator_name='frontmatter_parse'` matches the existing convention where one validator emits multiple `code` values (e.g., `yaml_parse_integrity` / `yaml_syntax_error`, `semantic_edge_extraction` / `unresolved_attribution_target`).

### 2. Expose the failure in proof surfaces

Add targeted unit and live-corpus build coverage so malformed authority-source omissions are visible during rebuild validation and live-corpus audits.

## Files to Touch

- `tools/world-index/src/parse/entities.ts` (modify)
- `tools/world-index/src/commands/shared.ts` (modify)
- `tools/world-index/tests/entities.test.ts` (modify)
- `tools/world-index/tests/integration/build-animalia.test.ts` (modify)

## Out of Scope

- Fixing `animalia` world content itself
- Expanding canonical authority to new source types
- Replacing the `ONTOLOGY.md` registry shape

## Acceptance Criteria

### Tests That Must Pass

1. A targeted test fixture with malformed authority-bearing frontmatter produces a `validator_name='frontmatter_parse'` / `code='malformed_authority_source'` / `severity='warn'` validation result and zero canonical entity rows.
2. `cd tools/world-index && npm run build`
3. `cd tools/world-index && node --test dist/tests/entities.test.js`
4. `cd tools/world-index && node dist/tests/integration/build-animalia.test.js`

### Invariants

1. Authority-bearing whole-file parse failures are visible, not silent.
2. Malformed structured input does not get parser-hacked into canon.
3. Evidence-only indexing for the same file remains possible.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/entities.test.ts` — malformed authority-source fixture coverage.
2. `tools/world-index/tests/integration/build-animalia.test.ts` — live-corpus proof that malformed authority sources surface as validation results.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/entities.test.js`
3. `cd tools/world-index && node dist/tests/integration/build-animalia.test.js`

## Outcome

Completion date: 2026-04-23

- `tools/world-index/src/parse/entities.ts` now classifies authority-record frontmatter as `missing`, `malformed`, or `parsed`, emits `frontmatter_parse` / `malformed_authority_source` warnings for malformed authority sources, and preserves the prior evidence-only omission of canonical rows.
- `tools/world-index/src/commands/shared.ts` now persists those entity-stage validation rows during `build`/`sync` finalization and clears stale copies on rebuild.
- `tools/world-index/tests/entities.test.ts` and `tools/world-index/tests/integration/build-animalia.test.ts` now prove both the synthetic malformed fixture case and the live `animalia` Melissa case.
- Deviations from original plan: the drafted integration acceptance command `node --test dist/tests/integration/build-animalia.test.js` failed opaquely at the harness level (`ERR_TEST_FAILURE`) without surfacing the offending subtest, so the truthful final proof surface became direct execution of the compiled file from the same package root.
- Verification results:
  - `cd tools/world-index && npm run build`
  - `cd tools/world-index && node --test dist/tests/entities.test.js`
  - `cd tools/world-index && node dist/tests/integration/build-animalia.test.js`
