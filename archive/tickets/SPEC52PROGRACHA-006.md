# SPEC52PROGRACHA-006: Validator wiring + memorability structural validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/utils.ts`, `record-schema-compliance.ts`, `character-memorability-structure.ts`, `tools/validators/src/public/registry.ts`, validator tests, and `tools/validators/README.md`.
**Deps**: archive/tickets/SPEC52PROGRACHA-005.md

## Problem

At intake, the world index treated `character_proposal_card`/`character_proposal_batch` as first-class, but the validator lagged entirely — a repo-wide search for `character_proposal` in `tools/validators/` returned zero matches. SPEC-52 D6 wires NCP/NCB into the structural-validation path and adds a body-structure validator for the protagonist-grade surfaces.

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/structural/utils.ts` defines `STRUCTURAL_NODE_TYPES`, `RECORD_TYPE_TO_SCHEMA`, `isStructuralAuthorityRecord`, and `listSupportedWorldFiles` — none include `character_proposal_card`/`character_proposal_batch`. `record-schema-compliance.ts` `hybridRecordsFromFiles` scans only `characters/`, `diegetic-artifacts/`, `adjudications/`. `loadSchemaValidators()` reads schema files named in `RECORD_TYPE_TO_SCHEMA`, so the two new schema files (005) must exist before this ticket adds their map entries (hence Deps: 005). `tools/validators/src/public/registry.ts` exports `structuralValidators` as the registration array; `character-memorability-structure.ts` does NOT exist yet.
2. SPEC-52 §Phase 5 items 4-6 + Deliverable 6 enumerate the work: add the two node types to `STRUCTURAL_NODE_TYPES`/`RECORD_TYPE_TO_SCHEMA`/`isStructuralAuthorityRecord`/`listSupportedWorldFiles`; add the `character-proposals/` + `character-proposals/batches/` scan branches to `hybridRecordsFromFiles`; create the body-structure validator and register it in `registry.ts` (the registry edit was added at SPEC-52 reassessment Improvement M1). SPEC-52 reassessment Issue I2 scoped the body-heading checks to CHAR only.
3. Cross-artifact boundary: this ticket consumes the schema files (005, via `RECORD_TYPE_TO_SCHEMA`) and the world-index node types `character_proposal_card`/`character_proposal_batch` (already in `tools/world-index/src/schema/types.ts`). The new structural validator's CHAR body-heading list must match the six dossier sections emitted by 003; its NCP checks (`## Rejected Directions Audit`, canon-requiring implied facts) match the card shape emitted by `archive/tickets/SPEC52PROGRACHA-002.md`/004.
4. Canon-Safety surface (template item 5): this ticket modifies/creates surfaces under `tools/validators/src/structural/` that run at `world-validate` time. The new validator is additive and validates character/NCP body structure only — it does NOT touch the Mystery Reserve firewall or canon-record write paths, so it cannot silently resolve an M-record or weaken the firewall (Rule 7). Confirm the additions to `utils.ts` are append-only (no removal of existing node types — Rule 6).
5. Package inventory/count fallout is same-seam: `tools/validators/README.md` currently says the package has "the 72 structural validators" and omits NCP/NCB from the schema summary; `tools/validators/tests/structural/registry.test.ts` asserts the exact structural validator list; `tools/validators/tests/integration/spec04-verification.test.ts` asserts `structuralValidators.length`. These must move with the new registered structural validator.
6. Implementation proof updated the live package count to 75 structural validators / 87 total validators. The full-world `animalia` fixture now exposes 329 intended SPEC-52 legacy character/proposal gaps under `record_schema_compliance` and `character_memorability_structure`; the integration baselines were updated to name those known failures explicitly.

## Architecture Check

1. Wiring the two node types through the existing four `utils.ts` surfaces + the `hybridRecordsFromFiles` branch (paralleling the `characters/` branch) + the `RECORD_TYPE_TO_SCHEMA` map gives NCP/NCB the same validation rigor as CHAR with no new mechanism. Scoping the body-heading checks to CHAR only (per I2) — NCP carries its engine in `memorability_profile` frontmatter validated by AJV (005) — avoids failing every NCP card on prose sections it never had.
2. No backwards-compatibility aliasing/shims — additions are append-only to existing registries.

## Verification Layers

1. `character_proposal_card`/`character_proposal_batch` present in all four `utils.ts` surfaces → codebase grep-proof.
2. `hybridRecordsFromFiles` scans `character-proposals/` + `character-proposals/batches/` → grep-proof + unit test.
3. New structural validator registered in `registry.ts` `structuralValidators` → grep-proof; runs under `world-validate`.
4. CHAR-only body-heading checks (six sections); NCP checks limited to `## Rejected Directions Audit` + canon-requiring implied facts → unit test + manual review (per I2).

## Landed Changes

### 1. `utils.ts`

Added `character_proposal_card` + `character_proposal_batch` to `STRUCTURAL_NODE_TYPES`; mapped them in `RECORD_TYPE_TO_SCHEMA` (`character-proposal-card`, `character-proposal-batch`); added path/id patterns to `isStructuralAuthorityRecord`; added `character-proposals` + `character-proposals/batches` to `listSupportedWorldFiles`.

### 2. `record-schema-compliance.ts` `hybridRecordsFromFiles`

Added `character-proposals/` and `character-proposals/batches/` hybrid-file discovery branches, deriving `node_id` from `proposal_id` and `batch_id` and assigning the corresponding proposal node types.

### 3. `character-memorability-structure.ts` (new) + `registry.ts`

Added and registered `character_memorability_structure`. It checks CHAR body sections, `dramatic_core.signature_scene_behaviors`, empty/duplicated `pressure_behavior` values, NCP upgraded-seed rejected-direction audits, NCP canon-requiring implied facts, and placeholder/TODO text. The six CHAR prose sections are not checked on NCP.

## Files to Touch

- `tools/validators/src/structural/utils.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/validators/src/structural/character-memorability-structure.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/character-memorability-structure.test.ts` (new)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/README.md` (modify)

## Out of Scope

- The schema files themselves (005).
- The skill templates that produce the validated structure (`archive/tickets/SPEC52PROGRACHA-002.md`/003/004).
- World-index regex / CLAUDE.md (007).
- Any change to the Mystery Reserve firewall or canon-record validators.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — `hybridRecordsFromFiles` validates `character-proposals/NCP-*.md` and `character-proposals/batches/NCB-*.md`; the new validator rejects missing CHAR body headings + `signature_scene_behaviors` < 3 + duplicated `pressure_behavior`, and rejects NCP missing `## Rejected Directions Audit` when `origin_kind: upgraded_seed`; it does NOT flag NCP for the six prose headings.
2. `grep -c "character_proposal" tools/validators/src/structural/utils.ts` ≥ 4 (both types across the surfaces).
3. `grep -n "characterMemorabilityStructure\|character-memorability-structure" tools/validators/src/public/registry.ts` confirms registration.

### Invariants

1. `listSupportedWorldFiles` includes both `character-proposals` paths; structured edge `character_proposal_card.batch_id → character_proposal_batch` still emits (world-index unchanged).
2. The new validator runs under `world-validate` (registered in `structuralValidators`).
3. Additions to `utils.ts` are append-only; no existing node type removed (Rule 6); the Mystery Reserve firewall is untouched (Rule 7).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/character-memorability-structure.test.ts` (new) — CHAR + NCP accept/reject cases, incl. the NCP-not-checked-for-body-headings case.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — `character-proposals/` hybrid-file discovery.
3. `tools/validators/tests/structural/registry.test.ts` and `tools/validators/tests/integration/spec04-verification.test.ts` — same-seam registry/count assertions.

### Commands

1. `npm test --prefix tools/validators`
2. `grep -nE "character_proposal_card|character_proposal_batch" tools/validators/src/structural/utils.ts tools/validators/src/structural/record-schema-compliance.ts`
3. `grep -n "characterMemorabilityStructure\|character-memorability-structure" tools/validators/src/public/registry.ts`
4. `git diff --check -- archive/tickets/SPEC52PROGRACHA-006.md tools/validators/README.md tools/validators/src/public/registry.ts tools/validators/src/structural/record-schema-compliance.ts tools/validators/src/structural/utils.ts tools/validators/src/structural/character-memorability-structure.ts tools/validators/tests/structural/character-memorability-structure.test.ts tools/validators/tests/structural/record-schema-compliance.test.ts tools/validators/tests/structural/registry.test.ts tools/validators/tests/integration/spec04-verification.test.ts tools/validators/tests/integration/spec09-verification.test.ts tools/validators/tests/integration/validate-patch-plan.test.ts`

## Outcome

Completed. NCP/NCB records are now first-class validator structural records, `record_schema_compliance` discovers and validates their hybrid Markdown frontmatter, and `character_memorability_structure` runs through the public structural validator registry.

Same-seam test/doc fallout was also landed: the exact registry test, SPEC-04/SPEC-09 validator baselines, validate-patch-plan skipped-validator expectation, and validator README inventory now reflect the new registered validator and NCP/NCB schemas.

## Verification Result

Passed:

1. `npm test --prefix tools/validators` — 695 tests passed.
2. `grep -nE "character_proposal_card|character_proposal_batch" tools/validators/src/structural/utils.ts tools/validators/src/structural/record-schema-compliance.ts` — both proposal node types are present in the utility registry and hybrid discovery.
3. `grep -n "characterMemorabilityStructure\|character-memorability-structure" tools/validators/src/public/registry.ts` — import and `structuralValidators` registration are present.

4. `git diff --check -- archive/tickets/SPEC52PROGRACHA-006.md tools/validators/README.md tools/validators/src/public/registry.ts tools/validators/src/structural/record-schema-compliance.ts tools/validators/src/structural/utils.ts tools/validators/src/structural/character-memorability-structure.ts tools/validators/tests/structural/character-memorability-structure.test.ts tools/validators/tests/structural/record-schema-compliance.test.ts tools/validators/tests/structural/registry.test.ts tools/validators/tests/integration/spec04-verification.test.ts tools/validators/tests/integration/spec09-verification.test.ts tools/validators/tests/integration/validate-patch-plan.test.ts` — passed.

## Deviations

1. The implementation updated `tools/validators/tests/integration/spec09-verification.test.ts` and `tools/validators/tests/integration/validate-patch-plan.test.ts` in addition to the original file list because registering the new structural validator changed shared package baselines and pre-apply execution expectations.
2. The full-world `animalia` baseline now intentionally reports 329 SPEC-52 legacy character/proposal failures, rather than the previous four legacy atomic-source schema failures. The tests name those failures explicitly so this does not mask unrelated validator regressions.
3. One early focused command was run with the wrong `--prefix`/working-directory shape and failed before exercising project code; it was replaced with the correct package proof lane above.
