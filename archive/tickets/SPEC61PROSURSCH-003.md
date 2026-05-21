# SPEC61PROSURSCH-003: Wire proposal-surface schemas into structural validation + per-surface fixtures

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`RECORD_TYPE_TO_SCHEMA`, scan-dir list, fixtures); `record-schema-compliance` validates the new surfaces automatically once wired.
**Deps**: archive/tickets/SPEC61PROSURSCH-001.md, archive/tickets/SPEC61PROSURSCH-002.md

## Problem

At intake, the nine schemas (`archive/tickets/SPEC61PROSURSCH-001.md`) and the node types/enumeration (`archive/tickets/SPEC61PROSURSCH-002.md`) were inert until the validator framework mapped node types to schemas and scanned the directories. This ticket wires `RECORD_TYPE_TO_SCHEMA` + the scan-dir list so `record-schema-compliance` validates PR/BATCH/EPE/EPE-sidecar/EPE-batch/AU/RP/NWP/NWB frontmatter, and adds well-formed + malformed fixtures per surface.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session): `tools/validators/src/structural/utils.ts` carries `RECORD_TYPE_TO_SCHEMA` (lines ~78–114, node_type → schema-basename) and the directory scan list (line ~358); `record-schema-compliance.ts` consumes `RECORD_TYPE_TO_SCHEMA` and is the path NCP/NCB already use. Adding rows + scan dirs is the same shape as the NCP/NCB precedent.
2. Verified against the spec: SPEC-61 §2.3 first bullet — add the nine node-type → schema-basename rows to `RECORD_TYPE_TO_SCHEMA` and the new directories to the scan list; record-schema-compliance then validates automatically. §4 requires one well-formed + one malformed fixture per surface.
3. Cross-artifact boundary under audit: the schema↔node-type↔directory contract spanning `archive/tickets/SPEC61PROSURSCH-001.md` (schema basenames) and `archive/tickets/SPEC61PROSURSCH-002.md` (node types + enumerated dirs). Each `RECORD_TYPE_TO_SCHEMA` row's node_type must exist (from `archive/tickets/SPEC61PROSURSCH-002.md`) and its schema basename must exist (from `archive/tickets/SPEC61PROSURSCH-001.md`); the scan-dir entries must match the directories `archive/tickets/SPEC61PROSURSCH-002.md` enumerates. `archive/tickets/SPEC61PROSURSCH-001.md` split `pressure-event-batch.schema.json`, so `pressure_event_batch` must map to `pressure-event-batch`.
4. FOUNDATIONS §Machine-Facing Layer — Validator Framework: this ticket extends executable structural validation to the surfaces that lacked it, using the existing CLI + engine-pre-apply path rather than a new mechanism. Restate that the validator runs over parsed records, not raw files.
5. Canon Safety surface: `utils.ts` drives `record-schema-compliance`, a structural validator under `tools/validators/src/structural/` that gates record schema conformance at the validator boundary. Confirm the new rows do not relax any existing surface's validation and that the additions are purely additive (new node_type keys; no edit to existing keys).
6. Implementation found one same-seam schema contradiction from `archive/tickets/SPEC61PROSURSCH-001.md`: `pressure-event-sidecar-proposal.schema.json` required `source_basis.derived_from_epe`, but the base `proposal-card.schema.json` rejected that property under `additionalProperties: false`. The fixture-backed fix was to permit optional `source_basis.derived_from_epe` in the base proposal schema while preserving the `direct_user_approval` prohibition.
7. Full-suite proof exposed same-seam baseline fallout: the animalia fixture now reports known legacy proposal-surface schema failures in addition to existing character/proposal gaps. `tools/validators/tests/integration/spec04-verification.test.ts` and `tools/validators/tests/integration/spec09-verification.test.ts` were truthed to the post-wiring baseline count (`1084`) and the expanded legacy proposal-surface classification.

## Architecture Check

1. Reusing `RECORD_TYPE_TO_SCHEMA` + `record-schema-compliance` means zero new validator code for schema-conformance — the proposal surfaces validate through the exact path the mature surfaces use, which is the cleanest possible extension.
2. No backwards-compatibility shims — additive map rows + additive scan-dir entries; no existing row is aliased.

## Verification Layers

1. Each new surface's malformed fixture produces a `record-schema-compliance` FAIL -> schema validation (run the validator over the fixture set).
2. Each new surface's well-formed fixture passes -> schema validation.
3. `RECORD_TYPE_TO_SCHEMA` rows resolve to existing schema files (from -001) and existing node types (from -002) -> codebase grep-proof.
4. No existing surface's validation changed -> codebase grep-proof (diff `RECORD_TYPE_TO_SCHEMA` — only additive rows).

## Landed Changes

### 1. Add `RECORD_TYPE_TO_SCHEMA` rows

In `tools/validators/src/structural/utils.ts`, added one row per surface mapping node_type → schema basename: `proposal_card`→`proposal-card`, `proposal_batch`→`proposal-batch`, `pressure_event_card`→`pressure-event-card`, `pressure_event_sidecar_proposal`→`pressure-event-sidecar-proposal`, `pressure_event_batch`→`pressure-event-batch`, `audit_record`→`audit-report`, `retcon_proposal_card`→`retcon-proposal-card`, `world_proposal_card`→`world-proposal-card`, `world_proposal_batch`→`world-proposal-batch`. The same node types were also added to `STRUCTURAL_NODE_TYPES` and the structural-authority path checks so indexed records are validated.

### 2. Add scan directories

Added `proposals/`, `pressure-events/`, `audits/`, `world-proposals/` and their `batches/` / `retcon-proposals/` subdirs to the raw world-file scan path, mirroring the `character-proposals` entries. `record-schema-compliance.ts` now parses those hybrid markdown frontmatter surfaces from explicit file inputs and world-root scans.

### 3. Add per-surface fixtures

Added inline per-surface fixtures in `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts`, covering valid file inputs, malformed missing-required-field file inputs, and indexed-record validation for all nine surfaces. Added a CLI smoke in `tools/validators/tests/cli/world-validate.test.ts` proving a malformed PR file produces a `record-schema-compliance.required` failure through `world-validate`.

### 4. Truth same-seam schema and baseline fallout

Allowed optional `source_basis.derived_from_epe` in `proposal-card.schema.json` so the EPE sidecar schema can validate its required parent-EPE provenance. Updated SPEC-04/SPEC-09 integration baseline tests for the new known legacy proposal-surface failures.

## Files to Touch

- `tools/validators/src/structural/utils.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/validators/src/schemas/proposal-card.schema.json` (modify)
- `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts` (new)
- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify)

## Out of Scope

- The `approval-semantics` `direct_user_approval` validator (SPEC61PROSURSCH-004).
- Authoring the schema files (`archive/tickets/SPEC61PROSURSCH-001.md`) or node types (`archive/tickets/SPEC61PROSURSCH-002.md`).
- Promoting any surface to a retrieval (`list_records`) record.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators test` passes including the new per-surface fixtures.
2. A PR/EPE/AU/RP/NWP/NWB card with a malformed/missing required frontmatter field produces a `record-schema-compliance` FAIL via the `world-validate` CLI.
3. `npm --prefix tools/validators run build` succeeds.

### Invariants

1. Each `RECORD_TYPE_TO_SCHEMA` row resolves to an existing schema basename and an existing node type.
2. Validation of pre-existing surfaces (CF/CH/CHAR/DA/NCP/NCB/story records) is unchanged — additive rows only.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/` — one well-formed + one malformed fixture per surface + a compliance assertion per pair. — covers What to Change §3 and §4 acceptance bullet 1/2.
2. `tools/validators/tests/cli/world-validate.test.ts` — malformed PR CLI smoke proving `world-validate --structural --json` emits `record_schema_compliance.required`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` / `tools/validators/tests/integration/spec09-verification.test.ts` — baseline truthing for the expanded legacy proposal-surface validation set.

### Commands

1. `npm --prefix tools/validators test`
2. `npm --prefix tools/validators run build`

## Outcome

Completed: 2026-05-21.

- Wired the nine SPEC-61 proposal/audit/pressure/world-proposal surfaces into `record-schema-compliance` through schema mapping, structural node enumeration, structural-authority filters, raw file scanning, and markdown frontmatter parsing.
- Added fixture-backed structural tests for valid and malformed file inputs plus indexed records for all nine surfaces.
- Added a `world-validate` CLI smoke proving malformed PR frontmatter is surfaced as a blocking `record_schema_compliance.required` verdict.
- Fixed the EPE sidecar schema fallout by allowing optional `source_basis.derived_from_epe` on proposal-card frontmatter while keeping `direct_user_approval` forbidden.
- Updated existing SPEC-04/SPEC-09 integration baselines to recognize the newly visible legacy proposal-surface failures in the animalia fixture.

## Verification Result

- `npm run build` in `tools/validators` passed.
- `node --test dist/tests/structural/proposal-surface-schema-compliance.test.js` in `tools/validators` passed: 3 tests, 3 pass.
- `npm test` in `tools/validators` passed: 802 tests, 802 pass.

## Deviations

- The drafted fixture plan implied standalone fixture files. The landed proof uses inline fixtures in a focused structural test because the existing validators test suite already uses inline frontmatter fixtures for comparable schema-compliance coverage.
- `archive/tickets/SPEC61PROSURSCH-001.md` left the EPE sidecar schema composition impossible for a valid sidecar carrying `source_basis.derived_from_epe`; this ticket corrected the schema as required fixture fallout.
- The full animalia validation baseline now reports `1084` known legacy character/proposal-surface failures instead of the prior `474`, because proposal/audit/pressure/world-proposal files are now actually in the schema-compliance surface.
- Verification commands were run from the `tools/validators` package root as `npm run build` and `npm test`; this is equivalent to the drafted `npm --prefix tools/validators ...` commands from the repo root.
