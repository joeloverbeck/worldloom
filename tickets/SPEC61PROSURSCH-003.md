# SPEC61PROSURSCH-003: Wire proposal-surface schemas into structural validation + per-surface fixtures

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`RECORD_TYPE_TO_SCHEMA`, scan-dir list, fixtures); `record-schema-compliance` validates the new surfaces automatically once wired.
**Deps**: SPEC61PROSURSCH-001, SPEC61PROSURSCH-002

## Problem

The eight schemas (SPEC61PROSURSCH-001) and the node types/enumeration (SPEC61PROSURSCH-002) are inert until the validator framework maps node types to schemas and scans the directories. This ticket wires `RECORD_TYPE_TO_SCHEMA` + the scan-dir list so `record-schema-compliance` validates PR/BATCH/EPE/EPE-sidecar/AU/RP/NWP/NWB frontmatter, and adds well-formed + malformed fixtures per surface.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session): `tools/validators/src/structural/utils.ts` carries `RECORD_TYPE_TO_SCHEMA` (lines ~78–114, node_type → schema-basename) and the directory scan list (line ~358); `record-schema-compliance.ts` consumes `RECORD_TYPE_TO_SCHEMA` and is the path NCP/NCB already use. Adding rows + scan dirs is the same shape as the NCP/NCB precedent.
2. Verified against the spec: SPEC-61 §2.3 first bullet — add the eight node-type → schema-basename rows to `RECORD_TYPE_TO_SCHEMA` and the new directories to the scan list; record-schema-compliance then validates automatically. §4 requires one well-formed + one malformed fixture per surface.
3. Cross-artifact boundary under audit: the schema↔node-type↔directory contract spanning SPEC61PROSURSCH-001 (schema basenames) and -002 (node types + enumerated dirs). Each `RECORD_TYPE_TO_SCHEMA` row's node_type must exist (from -002) and its schema basename must exist (from -001); the scan-dir entries must match the directories -002 enumerates. Confirm both before wiring.
4. FOUNDATIONS §Machine-Facing Layer — Validator Framework: this ticket extends executable structural validation to the surfaces that lacked it, using the existing CLI + engine-pre-apply path rather than a new mechanism. Restate that the validator runs over parsed records, not raw files.
5. Canon Safety surface: `utils.ts` drives `record-schema-compliance`, a structural validator under `tools/validators/src/structural/` that gates record schema conformance at the validator boundary. Confirm the new rows do not relax any existing surface's validation and that the additions are purely additive (new node_type keys; no edit to existing keys).

## Architecture Check

1. Reusing `RECORD_TYPE_TO_SCHEMA` + `record-schema-compliance` means zero new validator code for schema-conformance — the proposal surfaces validate through the exact path the mature surfaces use, which is the cleanest possible extension.
2. No backwards-compatibility shims — additive map rows + additive scan-dir entries; no existing row is aliased.

## Verification Layers

1. Each new surface's malformed fixture produces a `record-schema-compliance` FAIL -> schema validation (run the validator over the fixture set).
2. Each new surface's well-formed fixture passes -> schema validation.
3. `RECORD_TYPE_TO_SCHEMA` rows resolve to existing schema files (from -001) and existing node types (from -002) -> codebase grep-proof.
4. No existing surface's validation changed -> codebase grep-proof (diff `RECORD_TYPE_TO_SCHEMA` — only additive rows).

## What to Change

### 1. Add `RECORD_TYPE_TO_SCHEMA` rows

In `tools/validators/src/structural/utils.ts`, add one row per surface mapping node_type → schema basename: `proposal_card`→`proposal-card`, `proposal_batch`→`proposal-batch`, `pressure_event_card`→`pressure-event-card`, `pressure_event_sidecar_proposal`→`pressure-event-sidecar-proposal`, `audit_record`→`audit-report`, `retcon_proposal_card`→`retcon-proposal-card`, `world_proposal_card`→`world-proposal-card`, `world_proposal_batch`→`world-proposal-batch`. (`pressure-events/batches/` maps via the `proposal_batch` node type per SPEC-61 §2.2, unless §6 split adds a ninth.)

### 2. Add scan directories

Add `proposals/`, `pressure-events/`, `audits/`, `world-proposals/` (and their `batches/` / `retcon-proposals/` subdirs as needed) to the directory scan list at `utils.ts` ~line 358, mirroring the `character-proposals` entries.

### 3. Add per-surface fixtures

Under `tools/validators/tests/`, add one well-formed and one malformed (missing/invalid required field) fixture per surface, and a test asserting PASS / FAIL respectively through `record-schema-compliance`.

## Files to Touch

- `tools/validators/src/structural/utils.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — only if a new-surface dispatch arm is needed; otherwise no edit)
- `tools/validators/tests/` (new fixture files + a compliance test per surface)

## Out of Scope

- The `approval-semantics` `direct_user_approval` validator (SPEC61PROSURSCH-004).
- Authoring the schema files (SPEC61PROSURSCH-001) or node types (SPEC61PROSURSCH-002).
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

### Commands

1. `npm --prefix tools/validators test`
2. `npm --prefix tools/validators run build`
