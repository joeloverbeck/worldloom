# SPEC11CANENT-005: Exempt `ONTOLOGY.md` named-entity registry YAML from ledger-only `yaml_parse_integrity`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` YAML extraction and verification surfaces need to stop misclassifying the post-SPEC-11 ontology registry block as ledger noise.
**Deps**: `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md`, `archive/tickets/SPEC11CANENT-002.md`, `archive/tickets/SPEC11CANENT-004.md`, `docs/FOUNDATIONS.md`

## Problem

Fresh rebuild audit of `worlds/animalia/_index/world.db` on 2026-04-23 reproduced a live validator-routing defect after SPEC-11 landed. The rebuilt DB is structurally clean (`PRAGMA integrity_check = ok`, `0` dangling edges, `0` dangling `entity_mentions`, `0` unresolved edges), but `validation_results` now contains two rows instead of the one known Melissa warning accepted by the current proof surface:

1. `warn | frontmatter_parse | malformed_authority_source | characters/melissa-threadscar.md`
2. `info | yaml_parse_integrity | unexpected_yaml_section | ONTOLOGY.md` with message `YAML block is outside the canonical ledger sections (found under ONTOLOGY — Animalia > Named Entity Registry).`

That extra `yaml_parse_integrity` row is produced by the same fenced YAML block that SPEC-11 intentionally introduced as the canonical `## Named Entity Registry` authority surface in `worlds/animalia/ONTOLOGY.md`. The result is a live contradiction:

- `tools/world-index/src/parse/entities.ts` correctly consumes that registry block as canonical entity authority.
- `tools/world-index/src/parse/yaml.ts` still scans the same fenced YAML block through the ledger-only parser and records it as `unexpected_yaml_section`.

This breaks the current proof surfaces:

- `cd tools/world-index && npm run test:spec10-verification` fails with `integrity check failed for validation_results: 2 total rows vs 1 expected malformed-authority rows`
- `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js` fails because the live integration assertion still expects `countValidationRows(db, "yaml_parse_integrity") === 0`

The defect is therefore not stale artifact noise and not a world-content problem. It is a live parser/validator contract mismatch inside `tools/world-index`.

## Assumption Reassessment (2026-04-23)

1. `tools/world-index/src/parse/entities.ts` now intentionally reads a fenced YAML block under `## Named Entity Registry` and reports registry-shape problems under `validator_name='ontology_registry'`; the registry is a first-class canonical authority surface, not incidental prose.
2. `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md` and `archive/tickets/SPEC11CANENT-002.md` make that fenced YAML registry the authoritative post-SPEC-11 world-entity contract inside `ONTOLOGY.md`.
3. The shared boundary under audit is `tools/world-index/src/parse/yaml.ts` ledger-YAML extraction versus `tools/world-index/src/parse/entities.ts` ontology-registry extraction, plus the proof surfaces in `tools/world-index/tests/integration/build-animalia.test.ts` and `tools/world-index/tests/integration/spec10-verification.sh`.
4. `docs/FOUNDATIONS.md` treats `ONTOLOGY.md` as a mandatory world file and the durable home for ontology/category structure, so a machine-readable named-entity registry inside `ONTOLOGY.md` is aligned with the repo contract rather than malformed world content.
5. Rebuilt-live evidence shows the bug survives fresh producer output: repo-root `build animalia` and `verify animalia` both succeed, yet readonly DB query of `validation_results` still reports `unexpected_yaml_section` on `ONTOLOGY.md` line range `9-23`.
6. Archived ownership search found no active ticket already covering this seam. The closest archived owners are `SPEC11CANENT-002` for the registry contract and `SPEC11CANENT-004` for fixture proof alignment; neither owns the current validator-routing regression.
7. Mismatch + correction: the current capstone proof assumes total `validation_results` equals the single Melissa `malformed_authority_source` warning. That assumption was truthful before the registry YAML became a first-class non-ledger fenced block, but it is now false in live `animalia`.
8. Additional mismatch + correction from command dry run: `tools/world-index/tests/integration/build-animalia.test.ts` also now contains a stale registry-fixture subtest. The copied live `animalia` fixture already has a `## Named Entity Registry`, so `appendNamedEntityRegistry(...)` creates a duplicate-registry case that correctly emits no canonical rows from the ontology registry. This ticket absorbs that same-seam proof correction by switching the subtest to replace the copied registry instead of appending a second one.

## Architecture Check

1. The clean fix is to tighten responsibility boundaries: ledger-only YAML validation should ignore or explicitly exempt the `ONTOLOGY.md` named-entity registry block, while ontology-registry validation remains owned by `parse/entities.ts` under `validator_name='ontology_registry'`. That is cleaner than normalizing an accepted steady-state `yaml_parse_integrity` info row for a block the system intentionally introduced.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. The ontology registry no longer produces `yaml_parse_integrity` noise while remaining readable as canonical authority. -> targeted integration assertion on rebuilt `animalia`
2. Only genuine registry-shape problems report under the ontology-registry validator surface, not the ledger parser. -> codebase grep-proof plus focused parser/unit test
3. Package-level capstone proof treats the live validation surface truthfully after rebuild. -> `npm run test:spec10-verification`
4. FOUNDATIONS alignment remains unchanged: `ONTOLOGY.md` stays the structured authority home and the fix does not weaken canon gates or Mystery Reserve handling. -> FOUNDATIONS alignment check

## What to Change

### 1. Narrow ledger-YAML extraction

Update `tools/world-index/src/parse/yaml.ts` so fenced YAML that belongs to the post-SPEC-11 `## Named Entity Registry` contract in `ONTOLOGY.md` is not emitted as `unexpected_yaml_section` by `yaml_parse_integrity`.

The intended end state is:

- canonical-ledger YAML keeps its current behavior
- unrelated stray YAML in non-ledger sections still gets flagged when that remains the truthful behavior
- the explicit ontology registry block is treated as an owned non-ledger contract instead of generic noise

### 2. Restore truthful proof coverage

Tighten tests around this boundary so the live corpus and fixture coverage agree on the new contract:

- add or update a focused parser test proving the ontology registry block does not create `unexpected_yaml_section`
- update the animalia integration lane to keep `yaml_parse_integrity` at `0` while still accepting the single Melissa `malformed_authority_source` warning
- restore the capstone `spec10-verification` lane so it passes on the rebuilt live corpus when only the expected Melissa warning remains

## Files to Touch

- `tools/world-index/src/parse/yaml.ts` (modify)
- `tools/world-index/tests/yaml.test.ts` (modify)
- `tools/world-index/tests/integration/build-animalia.test.ts` (modify)

## Out of Scope

- Changing `worlds/animalia/ONTOLOGY.md`
- Fixing `characters/melissa-threadscar.md` malformed frontmatter
- Broadening canonical entity extraction beyond the SPEC-11 authority contract
- Reclassifying arbitrary non-ledger YAML blocks as valid world-index inputs

## Acceptance Criteria

### Tests That Must Pass

1. Rebuilt `animalia` no longer records `yaml_parse_integrity` / `unexpected_yaml_section` for the `## Named Entity Registry` block in `ONTOLOGY.md`.
2. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
3. `cd tools/world-index && npm run test:spec10-verification`

### Invariants

1. The explicit `ONTOLOGY.md` named-entity registry remains a structured canonical authority surface and is not treated as malformed ledger input.
2. `yaml_parse_integrity` remains reserved for the ledger-style YAML contract and truthful stray-YAML cases, not for the SPEC-11 ontology registry block.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/yaml.test.ts` — prove the ontology registry fenced block is exempt from `unexpected_yaml_section` while true stray YAML still reports correctly.
2. `tools/world-index/tests/integration/build-animalia.test.ts` — prove rebuilt live `animalia` records only the known Melissa authority warning and zero `yaml_parse_integrity` rows.
3. `tools/world-index/tests/integration/build-animalia.test.ts` — replace the copied registry in the registry-fixture subtest rather than appending a duplicate `## Named Entity Registry`, so the proof keeps asserting the live SPEC-11 registry contract instead of duplicate-registry rejection behavior.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/yaml.test.js`
3. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
4. `cd tools/world-index && npm run test:spec10-verification`
5. `cd /home/joeloverbeck/projects/worldloom && sqlite3 worlds/animalia/_index/world.db "SELECT severity, code, validator_name, file_path FROM validation_results ORDER BY severity, code, file_path;"`

## Outcome

- Completed 2026-04-23.
- `tools/world-index/src/parse/yaml.ts` now exempts the fenced YAML block under `ONTOLOGY.md` `## Named Entity Registry` from ledger-only `yaml_parse_integrity` noise while leaving genuine non-ledger stray YAML behavior unchanged elsewhere.
- `tools/world-index/tests/yaml.test.ts` now proves the named-entity registry block stays routable without emitting `unexpected_yaml_section`.
- `tools/world-index/tests/integration/build-animalia.test.ts` now keeps the registry-fixture proof truthful by replacing the copied `animalia` registry instead of appending a duplicate registry section to a world that already has one.
- Rebuilt live `animalia` now records only the known Melissa `frontmatter_parse` / `malformed_authority_source` warning, so the package capstone proof again matches the live validation surface.

## Verification Result

- Passed `cd tools/world-index && npm run build`
- Passed `cd tools/world-index && node --test dist/tests/yaml.test.js`
- Passed `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
- Passed `cd tools/world-index && npm run test:spec10-verification`
- Passed `cd /home/joeloverbeck/projects/worldloom && sqlite3 worlds/animalia/_index/world.db "SELECT severity, validator_name, code, file_path, line_range_start, line_range_end, message FROM validation_results ORDER BY result_id;"` and confirmed the only remaining row is `warn | frontmatter_parse | malformed_authority_source | characters/melissa-threadscar.md`

## Deviations

- Reassessment found an additional stale proof in `build-animalia.test.ts` beyond the drafted `yaml_parse_integrity` mismatch. Because that fixture edit lived in the same parser/proof seam, the ticket absorbed it without widening into a new ownership boundary.
