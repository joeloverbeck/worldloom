# SPEC52PROGRACHA-006: Validator wiring + memorability structural validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/utils.ts` (modify), `record-schema-compliance.ts` (modify), `character-memorability-structure.ts` (new), `tools/validators/src/public/registry.ts` (modify).
**Deps**: archive/tickets/SPEC52PROGRACHA-005.md

## Problem

The world index treats `character_proposal_card`/`character_proposal_batch` as first-class, but the validator lags entirely — a repo-wide search for `character_proposal` in `tools/validators/` returns zero matches. SPEC-52 D6 wires NCP/NCB into the structural-validation path and adds a body-structure validator for the protagonist-grade surfaces.

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/structural/utils.ts` defines `STRUCTURAL_NODE_TYPES`, `RECORD_TYPE_TO_SCHEMA`, `isStructuralAuthorityRecord`, and `listSupportedWorldFiles` — none include `character_proposal_card`/`character_proposal_batch`. `record-schema-compliance.ts` `hybridRecordsFromFiles` (line 312) scans only `characters/`, `diegetic-artifacts/`, `adjudications/`. `loadSchemaValidators()` (line 298) reads schema files named in `RECORD_TYPE_TO_SCHEMA`, so the two new schema files (005) must exist before this ticket adds their map entries (hence Deps: 005). `tools/validators/src/public/registry.ts` exports `structuralValidators` (line 89) as the registration array (75 existing structural-validator imports); `character-memorability-structure.ts` does NOT exist yet.
2. SPEC-52 §Phase 5 items 4-6 + Deliverable 6 enumerate the work: add the two node types to `STRUCTURAL_NODE_TYPES`/`RECORD_TYPE_TO_SCHEMA`/`isStructuralAuthorityRecord`/`listSupportedWorldFiles`; add the `character-proposals/` + `character-proposals/batches/` scan branches to `hybridRecordsFromFiles`; create the body-structure validator and register it in `registry.ts` (the registry edit was added at SPEC-52 reassessment Improvement M1). SPEC-52 reassessment Issue I2 scoped the body-heading checks to CHAR only.
3. Cross-artifact boundary: this ticket consumes the schema files (005, via `RECORD_TYPE_TO_SCHEMA`) and the world-index node types `character_proposal_card`/`character_proposal_batch` (already in `tools/world-index/src/schema/types.ts`). The new structural validator's CHAR body-heading list must match the six dossier sections emitted by 003; its NCP checks (`## Rejected Directions Audit`, canon-requiring implied facts) match the card shape emitted by `archive/tickets/SPEC52PROGRACHA-002.md`/004.
4. Canon-Safety surface (template item 5): this ticket modifies/creates surfaces under `tools/validators/src/structural/` that run at `world-validate` time. The new validator is additive and validates character/NCP body structure only — it does NOT touch the Mystery Reserve firewall or canon-record write paths, so it cannot silently resolve an M-record or weaken the firewall (Rule 7). Confirm the additions to `utils.ts` are append-only (no removal of existing node types — Rule 6).

## Architecture Check

1. Wiring the two node types through the existing four `utils.ts` surfaces + the `hybridRecordsFromFiles` branch (paralleling the `characters/` branch) + the `RECORD_TYPE_TO_SCHEMA` map gives NCP/NCB the same validation rigor as CHAR with no new mechanism. Scoping the body-heading checks to CHAR only (per I2) — NCP carries its engine in `memorability_profile` frontmatter validated by AJV (005) — avoids failing every NCP card on prose sections it never had.
2. No backwards-compatibility aliasing/shims — additions are append-only to existing registries.

## Verification Layers

1. `character_proposal_card`/`character_proposal_batch` present in all four `utils.ts` surfaces → codebase grep-proof.
2. `hybridRecordsFromFiles` scans `character-proposals/` + `character-proposals/batches/` → grep-proof + unit test.
3. New structural validator registered in `registry.ts` `structuralValidators` → grep-proof; runs under `world-validate`.
4. CHAR-only body-heading checks (six sections); NCP checks limited to `## Rejected Directions Audit` + canon-requiring implied facts → unit test + manual review (per I2).

## What to Change

### 1. `utils.ts`

Add `character_proposal_card` + `character_proposal_batch` to `STRUCTURAL_NODE_TYPES`; map them in `RECORD_TYPE_TO_SCHEMA` (`character-proposal-card`, `character-proposal-batch`); add path/id patterns to `isStructuralAuthorityRecord` (`/^character-proposals\/[^/]+\.md$/`, `/^character-proposals\/batches\/[^/]+\.md$/`); add `character-proposals` + `character-proposals/batches` to `listSupportedWorldFiles`.

### 2. `record-schema-compliance.ts` `hybridRecordsFromFiles`

Add a `character-proposals/` branch (node_id via `proposal_id`, node_type `character_proposal_card`) and a `character-proposals/batches/` branch (node_id via `batch_id`, node_type `character_proposal_batch`), paralleling the `characters/` branch at lines 319-331.

### 3. `character-memorability-structure.ts` (new) + `registry.ts`

Deterministic checks. **CHAR**: missing `## Protagonist-Grade Core` / `## Pressure Behavior` / `## Relational Charge` / `## Self-Mythology and Blind Spots` / `## Moral and Psychological Edge` / `## Signature Scene Behavior`; `dramatic_core.signature_scene_behaviors` < 3; duplicated/empty `pressure_behavior` values. **NCP**: missing `## Rejected Directions Audit` when `upgrade_lineage.origin_kind: upgraded_seed`; `canon-requiring` without implied facts. **Both**: placeholder/TODO text. (The six prose body sections are NOT checked on NCP.) Register the validator in `registry.ts`'s `structuralValidators` array (import + entry).

## Files to Touch

- `tools/validators/src/structural/utils.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/validators/src/structural/character-memorability-structure.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)

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

### Commands

1. `npm test --prefix tools/validators`
2. `grep -nE "character_proposal_card|character_proposal_batch" tools/validators/src/structural/utils.ts tools/validators/src/structural/record-schema-compliance.ts`
