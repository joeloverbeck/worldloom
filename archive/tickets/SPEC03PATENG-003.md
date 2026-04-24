# SPEC03PATENG-003: Update/append op modules + retcon_attestation gate

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 4 per-op modules under `tools/patch-engine/src/ops/` for in-place atomic-record mutation and extends shared patch-engine staging/error helpers. No impact on existing world-mcp code.
**Deps**: SPEC03PATENG-001

## Problem

SPEC-03's Update ops table in `specs/SPEC-03-patch-engine.md` defines 4 op types for mutating existing atomic records: `update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`. Unlike the Create ops in ticket 002 (which always write fresh files), these ops read an existing `_source/*.yaml` record, mutate its parsed representation, and stage a temp-file replacement. The `update_record_field` op additionally enforces SPEC-03's retcon-attestation discipline: structural-field mutations on accepted CFs require an explicit `retcon_attestation`, while `notes` / `modification_history` / `extensions` fields are freely appendable.

## Assumption Reassessment (2026-04-24)

1. `OpContext` (from ticket 002's `src/ops/types.ts`) carries the SQLite handle. These ops use it to resolve `target_record_id` → `file_path` via an index query, then read the file contents to compute the current `content_hash` for drift detection. The read is from disk (not from the index's `body` column) because Phase A §2 (spec line 177) requires verification against disk state, not against a possibly-stale index snapshot.
2. `CanonFactRecord.modification_history` is the structural surface for CF retcon attribution; `notes` is the prose/free-form surface. Both are append-only in the SPEC-03 discipline. The `extensions[]` array lives on INV/M/OQ/SEC records (per the interfaces added in ticket 001), not on CF — CF uses `modification_history[]` for structural attribution and `notes` for prose-format attribution lines.
3. Shared boundary: the retcon-attestation taxonomy (`retcon_type: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'`) mirrors the continuity-audit skill's classification surface. The engine does not validate WHICH retcon type is appropriate — that's continuity-audit's job. The engine only verifies the attestation is present on structural mutations.
4. FOUNDATIONS principle under audit: **Rule 6 No Silent Retcons** (docs/FOUNDATIONS.md §376). The `update_record_field` gate structurally enforces Rule 6 at the engine layer by refusing structural mutations without `retcon_attestation`. SPEC-04's `rule6_no_silent_retcons` validator provides the downstream check (CH entry exists, `modification_history` entry exists, extension-record exists); this ticket provides the upstream engine gate.
5. User-supplied reference path `specs/SPEC-03-phase2-tooling.md` was stale for this ticket; the live authority is `specs/SPEC-03-patch-engine.md`. `specs/SPEC-02-phase2-tooling.md` exists but is a different SPEC-02 surface, not this patch-engine contract.
6. Same-seam correction: `tools/world-index/src/hash/content.ts` computes record `content_hash` with the `yaml` package and `sortMapEntries: true`. The patch-engine shared serializer previously used `js-yaml`, which could make disk recomputation disagree with the index. This ticket updates `tools/patch-engine/src/ops/shared.ts` and the package manifest/lockfile to use the same stable YAML serializer before implementing update-op drift checks.
7. Adjacent contradictions: none. SPEC-04 is an independent validator that runs pre-apply (see ticket 006 Phase A step 5); its existence reinforces rather than duplicates the engine-level gate.

## Architecture Check

1. Splitting the four ops into separate files (rather than a single `update-or-append.ts`) keeps each op's retcon-logic and field-path-handling isolated, which matters because `update_record_field` has the most complex logic (distinguishes `set` / `append_list` / `append_text` operations across arbitrary `field_path` arrays and gates structural mutations behind retcon attestation).
2. `append_touched_by_cf` is a standalone op even though ticket 006's orchestrator auto-adds it when `append_extension` targets a SEC — the standalone version is still useful for migration/retrofit flows and for retrofitting existing SEC records whose `touched_by_cf[]` lags reality. Having it as a first-class op makes the auto-add mechanism transparent: ticket 006 just injects the same op the caller could have submitted directly.
3. `update_record_field` uses a structural `field_path: string[]` addressing scheme (e.g., `['distribution', 'why_not_universal']`) rather than a string "dotted path" (e.g., `"distribution.why_not_universal"`). The array form avoids escaping ambiguity if a field name ever contains a `.`. Matches CF schema conventions where nested keys like `distribution.who_can_do_it` are YAML nested mappings.
4. No backwards-compatibility aliasing/shims introduced. Pre-SPEC-13 ops `replace_yaml_field` and `append_list_item` merge into this ticket's `update_record_field` per SPEC-03 line 67; no alias export is provided.

## Verification Layers

1. Structural-field mutation without retcon attestation fails fast -> unit test (ticket 008 `update-record-field.test.ts` attempts `{op: 'update_record_field', target_record_id: 'CF-0001', field_path: ['statement'], operation: 'set', new_value: 'X'}` without `retcon_attestation`; expect `{code: 'retcon_attestation_required'}` error).
2. `notes` / `modification_history` / `extensions` append without retcon attestation succeeds -> unit test (ticket 008 appends to `notes` on CF-0001 without attestation; expect success).
3. `append_touched_by_cf` idempotence on duplicate CF-ID -> unit test (ticket 008 calls the op twice with the same CF-ID on the same SEC; second call should no-op, not duplicate).
4. `append_extension` with a new `originating_cf` on a SEC record does NOT auto-add `append_touched_by_cf` at this layer (that's ticket 006's orchestrator responsibility) -> codebase grep-proof (`grep -n "append_touched_by_cf" tools/patch-engine/src/ops/append-extension.ts` returns 0 matches).
5. Field-path validity -> unit test (ticket 008 attempts `field_path: ['nonexistent_field']` on CF-0001; expect `{code: 'field_path_invalid'}` error).

## What to Change

### 1. Create `tools/patch-engine/src/ops/update-record-field.ts`

Export `stageUpdateRecordField(env: PatchPlanEnvelope, op: PatchOperation & {op: 'update_record_field'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Resolve `op.payload.target_record_id` → `file_path` via `ctx.db` query on `nodes` table.
- Read file; parse YAML; compute `current_hash`.
- If `op.expected_content_hash !== current_hash`, throw a structured `PatchEngineOpError` with `{code: 'record_hash_drift', record_id, op_kind}`.
- Classify the field path:
  - **Freely-appendable fields**: `['notes']`, `['modification_history']`, `['extensions']`, `['touched_by_cf']` (on SEC records). Operation kinds `'append_list'` and `'append_text'` allowed without retcon attestation.
  - **Structural fields**: anything else on CF records (`['statement']`, `['scope']`, `['domains_affected']`, `['distribution', '*']`, `['visible_consequences']`, etc.) + structural fields on INV/M/OQ/SEC.
- For structural fields, require `op.retcon_attestation` present with `retcon_type ∈ {'A','B','C','D','E','F'}`, `originating_ch` matching `CH-\d{4}`, `rationale` non-empty. Missing/malformed → `{code: 'retcon_attestation_required', target_record_id, field_path}`.
- Apply the operation: `'set'` replaces the field value; `'append_list'` pushes to an array field; `'append_text'` concatenates to a string field (preserves trailing newline handling).
- Serialize via `serializeStableYaml()`; stage temp-file.

### 2. Create `tools/patch-engine/src/ops/append-extension.ts`

Export `stageAppendExtension(env: PatchPlanEnvelope, op: PatchOperation & {op: 'append_extension'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Resolve `op.payload.target_record_id` → `file_path`; read; parse; hash-check.
- Reject if target is a CF record — CF uses `modification_history[]`, not `extensions[]`. Error: `{code: 'op_target_class_mismatch', target_record_id, expected_classes: ['invariant','mystery_reserve_entry','open_question_entry','section']}`.
- Push `op.payload.extension` to the record's `extensions[]` array. Validate extension shape: `{originating_cf, change_id, date, label, body}` all present and non-empty.
- Serialize; stage temp-file.

This op does NOT auto-add `append_touched_by_cf` — the orchestrator (ticket 006) performs the auto-add at plan-assembly time, before the ops execute.

### 3. Create `tools/patch-engine/src/ops/append-touched-by-cf.ts`

Export `stageAppendTouchedByCf(env: PatchPlanEnvelope, op: PatchOperation & {op: 'append_touched_by_cf'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Resolve `op.payload.target_sec_id` → `file_path`; read; parse; hash-check.
- Reject if target is not a SEC record: `{code: 'op_target_class_mismatch', target_record_id, expected_class: 'section'}`.
- If `op.payload.cf_id` already present in `touched_by_cf[]`, return a staged write with unchanged content and `noop: true` — the caller (orchestrator in ticket 006) treats noops as success and can skip the rename.
- Otherwise push `op.payload.cf_id`; serialize; stage temp-file.

### 4. Create `tools/patch-engine/src/ops/append-modification-history-entry.ts`

Export `stageAppendModificationHistoryEntry(env: PatchPlanEnvelope, op: PatchOperation & {op: 'append_modification_history_entry'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Resolve `op.payload.target_cf_id` → `file_path`; read; parse; hash-check.
- Reject if target is not a CF record.
- Push `{change_id, originating_cf, date, summary}` from `op.payload` to `modification_history[]`. Validate all four fields non-empty and `change_id` matches `CH-\d{4}`.
- Serialize; stage temp-file.

This op does NOT require retcon attestation — `modification_history` is the canonical attestation surface itself, not a field being retconned.

## Files to Touch

- `tools/patch-engine/src/ops/update-record-field.ts` (new)
- `tools/patch-engine/src/ops/append-extension.ts` (new)
- `tools/patch-engine/src/ops/append-touched-by-cf.ts` (new)
- `tools/patch-engine/src/ops/append-modification-history-entry.ts` (new)
- `tools/patch-engine/src/ops/shared.ts` (modify — existing-record load/stage helpers, stable YAML serializer, op error codes)
- `tools/patch-engine/src/ops/types.ts` (modify — optional `noop` marker on `StagedWrite`)
- `tools/patch-engine/package.json` (modify — direct `yaml` dependency for serializer parity with world-index)
- `tools/patch-engine/package-lock.json` (modify)

## Out of Scope

- Create ops (ticket 002).
- Hybrid-file ops (ticket 004).
- Auto-addition of `append_touched_by_cf` during plan assembly — ticket 006's `commit/order.ts`.
- Retcon-type-appropriateness validation (which retcon_type should be used for which change) — continuity-audit skill's responsibility, not the engine's.
- SPEC-04 `rule6_no_silent_retcons` validator integration — ticket 006's Phase A step 5 delegates to it.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build` exits 0 with all 4 new files compiled.
2. `grep -h "^export .*function stage" tools/patch-engine/src/ops/update-record-field.ts tools/patch-engine/src/ops/append-extension.ts tools/patch-engine/src/ops/append-touched-by-cf.ts tools/patch-engine/src/ops/append-modification-history-entry.ts | wc -l` returns 4 (one export per file).
3. Each op type-checks against `PatchOperation` discriminated union per its `op` narrow.

### Invariants

1. `update_record_field` refuses structural-field mutations on accepted records without `retcon_attestation` — enforced structurally at the engine layer (Rule 6 upstream gate).
2. `append_extension` rejects CF records (CF uses `modification_history[]`, not `extensions[]`); `append_touched_by_cf` rejects non-SEC records; `append_modification_history_entry` rejects non-CF records. Op-target-class mismatches are caught at op execution, not at envelope validation — the envelope-level `OperationKind` narrow alone cannot prove the target record's class until the record is resolved.
3. `append_touched_by_cf` is idempotent: submitting the same op twice with the same `(target_sec_id, cf_id)` produces the same on-disk state (second call is a noop, not a duplicate entry).
4. Every op performs an `expected_content_hash` drift check before staging the write — records mutated between plan authoring and submission trigger `record_hash_drift`.
5. `notes` and `modification_history` fields are freely appendable on accepted CFs (no retcon attestation required). Structural fields (`statement`, `scope`, `distribution.*`, etc.) require attestation.

## Test Plan

### New/Modified Tests

1. `None — op modules only; behavioral testing consolidated in ticket 008 (per-op unit tests with fixture before/after snapshots).`

### Commands

1. `cd tools/patch-engine && npm run build` (targeted: confirms all 4 op modules compile).
2. `grep -c "retcon_attestation" tools/patch-engine/src/ops/update-record-field.ts` should be ≥2 (at least the gate check + error construction).
3. `grep "append_touched_by_cf" tools/patch-engine/src/ops/append-extension.ts | wc -l` should be 0 (confirms the auto-add is NOT implemented at the op layer — it's the orchestrator's job in ticket 006).

## Outcome

Completion date: 2026-04-24.

Implemented the four update/append op modules and the shared existing-record staging substrate:

1. `stageUpdateRecordField` resolves indexed records, recomputes disk YAML hashes, applies `set` / `append_list` / `append_text`, rejects invalid field paths, and requires valid retcon attestation for structural mutations.
2. `stageAppendExtension`, `stageAppendTouchedByCf`, and `stageAppendModificationHistoryEntry` enforce target-class checks, payload shape checks, hash drift checks, and staged temp-file output.
3. `append_touched_by_cf` is idempotent via an unchanged staged write marked `noop: true`.
4. Patch-engine YAML serialization now uses the same `yaml` serializer settings as `world-index` so update-op drift checks compare against the actual indexed `content_hash` contract.

## Verification Result

1. `cd tools/patch-engine && npm run build` — passed.
2. `grep -h "^export .*function stage" tools/patch-engine/src/ops/update-record-field.ts tools/patch-engine/src/ops/append-extension.ts tools/patch-engine/src/ops/append-touched-by-cf.ts tools/patch-engine/src/ops/append-modification-history-entry.ts | wc -l` — returned `4`.
3. `grep -c "retcon_attestation" tools/patch-engine/src/ops/update-record-field.ts` — returned `3`.
4. `grep "append_touched_by_cf" tools/patch-engine/src/ops/append-extension.ts | wc -l` — returned `0`.

`npm install` for the direct `yaml` dependency reported 10 funding notices and 1 moderate vulnerability; dependency-audit remediation is outside this ticket.

## Deviations

1. Corrected stale user reference `specs/SPEC-03-phase2-tooling.md` to the live authority `specs/SPEC-03-patch-engine.md`.
2. Added `tools/patch-engine/src/ops/shared.ts`, `tools/patch-engine/src/ops/types.ts`, `tools/patch-engine/package.json`, and `tools/patch-engine/package-lock.json` to the touched set because stable disk-hash recomputation and noop staging are required by the update-op contract.
