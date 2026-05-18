# SPEC43PRECAUSTO-012: `compatibility_drift` Validator + Snapshot-Key Normalization

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/compatibility-drift.ts` (info/warn severities for Wave 2; fail deferred to Wave 3). Modifies existing `tools/validators/src/structural/snapshot-replay-equality.ts` and `tools/validators/src/structural/state-snapshot-integrity.ts` to normalize missing CLK / STSEC / STQ / DA keys on parent PG reads to empty arrays. Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-002.md

## Problem

SPEC-43 §Approach E + §Approach F + spec §Verification ("Old-style `PG.active_records` compatibility drift is reported but not hard-failed; replay normalizes missing keys to `[]`; new child PG emits full map") + §Verification ("`red-bunny` bundle passes `world-validate --story red-bunny` cleanly") require: (a) a new `compatibility_drift` validator that detects bundle-vs-current-schema drift (missing newer optional `_source/{clocks,secrets,story-questions,artifacts}/` subdirectories, missing CLK/STSEC/STQ/DA keys in PG snapshots) and emits info/warn-severity findings; (b) snapshot-key normalization in `snapshot-replay-equality.ts` + `state-snapshot-integrity.ts` so parent PG reads tolerate missing optional keys as empty arrays (without rewriting the parent PG — append-only / supersession discipline preserved). Without (a), authors have no visibility into compatibility drift; without (b), pre-SPEC-42 / pre-SPEC-38 bundles fail replay validation that assumes the newer optional keys.

## Assumption Reassessment (2026-05-18)

1. PG schema at `tools/validators/src/schemas/story-page.schema.json:49-68` defines `state_snapshot.active_records` with `additionalProperties: true` and no `required` keys constraint — schema-side support for missing optional keys is in place. The normalization is a REPLAY-SIDE change: `snapshot-replay-equality.ts` and `state-snapshot-integrity.ts` currently assume all enumerated keys exist; they must default missing keys to `[]` for the 4 newer optional classes (CLK / STSEC / STQ / DA).
2. `red-bunny` bundle (verified via brainstorm exploration) was bootstrapped 2026-05-17, one day before SPEC-42; missing all 4 post-SPEC-42 / SPEC-38 subdirectories AND missing CLK/STSEC/STQ keys in PG snapshots (DA: [] empty placeholder is present). Per SPEC-43 §Verification: `red-bunny` must pass `world-validate --story red-bunny` cleanly + emit `compatible_optional_absence` + `grandfathered_snapshot_shape` classifications in compatibility-mode audit.
3. Cross-skill boundary under audit: this validator is consumed by ticket 016 (health-audit `compatibility` mode + SAU report section). The Validator object's `applies_to` field includes `branching-story-health-audit` (audit mode) + `branching-story-turn-cycle` (per-commit warn-level for new PG omitting required keys). The classifications enumerate per SPEC-43 §Approach E: `current_contract`, `compatible_optional_absence`, `grandfathered_snapshot_shape`, `compatible_with_advisory`, `requires_compatibility_audit`, `requires_migration_patch`, `manual_review`, `blocked_contract_break`.
4. FOUNDATIONS §Story Bundles §4b (Canon Baseline Drift) restated: canon-baseline drift uses classifications (`compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, `promotion_or_retcon_conflict`). The new compatibility-drift validator uses ANALOGOUS classifications for SCHEMA drift (not canon drift); the two are operationally orthogonal — schema drift is structural, canon-baseline drift is fictional. SPEC-43 §Approach D's compatibility-drift validator inherits §4b's classification-ladder pattern.
5. HARD-GATE / Canon Safety surface: this ticket modifies two existing structural validators (`snapshot-replay-equality.ts` + `state-snapshot-integrity.ts`) — both run at branching-story-turn-cycle Phase 9 and gate story-bundle record writes at engine pre-apply time. The snapshot-key normalization is one-directional: parent PG reads tolerate missing optional CLK / STSEC / STQ / DA keys as empty arrays (preserves append-only / supersession discipline — no historical PG is rewritten); new child PG writes still require the full active-record map per ticket 013's Phase 9 gate enforcement. Does not weaken the Mystery Reserve firewall (`secret_mystery_firewall_compliance.ts` continues to gate MR interactions independently); does not weaken any existing Canon Safety surface — the normalization is a tolerant-read extension, not a permissive-write extension.

## Architecture Check

1. Cleaner than alternative #1 (fold normalization + drift detection into one validator): the normalization is a behavioral change in existing replay validators (the validators stop assuming keys exist); the drift detection is a new validator (it emits new findings). The two concerns serve different surfaces (normalization is engine-internal; drift detection is audit-facing).
2. Cleaner than alternative #2 (defer all of this to Wave 3): per spec, compatibility-drift reporting + snapshot normalization MUST ship in Wave 2 so pre-SPEC-42 bundles like red-bunny remain validatable. The hard `fail` severity for "new current-contract PG omits required active-record shape" defers to Wave 3 (needs the contract marker for deterministic detection); Wave 2 ships info/warn.
3. No backwards-compatibility aliasing/shims introduced: the normalization is the OPPOSITE of a shim — it makes the validator tolerant of pre-SPEC-42 bundle shape without modifying historical PG records (preserves append-only discipline).

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "compatibilityDrift\|compatibility_drift" tools/validators/src/public/registry.ts` returns import + array entry.
2. Drift detection → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `compatibility/legacy-snapshot.yaml` fixture (missing optional subdirs + missing parent keys) emits `compat_missing_active_record_key` (info) + `compat_optional_directory_absent` (info); a fixture where a NEW PG (post-SPEC-43) omits CLK/STSEC/STQ keys without grandfathered-parent explanation emits `compat_requires_migration_patch` (warn).
3. Snapshot normalization → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `compatibility/legacy-snapshot.yaml` parent PG (missing CLK/STSEC/STQ/DA keys) is read by `snapshot-replay-equality.ts` as if those keys were `[]`; replay succeeds (no parent-PG rewrite, no validator failure).
4. Red-bunny pass → integration: ticket 017's capstone test runs `world-validate --story red-bunny` and verifies clean exit + compatibility-mode audit emits expected classifications.

## What to Change

### 1. Create `tools/validators/src/structural/compatibility-drift.ts`

Validator object:
- `name: "compatibility_drift"`.
- `applies_to: ["branching-story-health-audit", "branching-story-turn-cycle"]`.
- `severity: "info"` (default; warn for specific cases).
- Walk the bundle structure:
  - Check `_source/{clocks,secrets,story-questions,artifacts}/` subdirectories — missing → emit `compat_optional_directory_absent` (info per subdir).
  - For each PG record, check `state_snapshot.active_records` for missing CLK/STSEC/STQ/DA keys — emit `compat_missing_active_record_key` (info for old-style parent PG; warn if a new PG omits keys without grandfathered explanation).
- Emit one classification per bundle: `current_contract` | `compatible_optional_absence` | `grandfathered_snapshot_shape` | `compatible_with_advisory` | `requires_compatibility_audit` | `requires_migration_patch` | `manual_review` | `blocked_contract_break` (per SPEC-43 §Approach E).
- Hard `fail` severity for "new current-contract PG omits required active-record shape" deferred to Wave 3 (needs contract marker for deterministic detection).

Failure / finding codes: `compat_missing_active_record_key`, `compat_optional_directory_absent`, `compat_requires_migration_patch`, `compat_missing_contract_marker` (info — Wave 3 marker absence is itself informational in Wave 2).

### 2. Modify `tools/validators/src/structural/snapshot-replay-equality.ts`

In the replay-equality logic that reads parent PG `state_snapshot.active_records.<class>[]`, default missing CLK / STSEC / STQ / DA keys to empty arrays (`[]`). Existing keys (STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / STSTAT) remain required for backwards-compatibility (they were always required since SPEC-13 / SPEC-34); only the 4 newer optional classes get normalization.

### 3. Modify `tools/validators/src/structural/state-snapshot-integrity.ts`

Same change: missing CLK / STSEC / STQ / DA keys on parent PG reads normalize to `[]`. Note: new child PG (post-SPEC-43 commits) MUST materialize the full current active-record map; this normalization is for PARENT PG reads only.

### 4. Register `compatibility-drift` in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-011 per §Step 6.5).

### 5. Add test `tools/validators/tests/structural/compatibility-drift.test.ts`

Test cases (using ticket 002's `compatibility/` fixtures):
- pre-SPEC-42 bundle: missing 4 subdirs + missing CLK/STSEC/STQ keys → emits `compat_optional_directory_absent` (×4 info) + `compat_missing_active_record_key` (×3 info per PG); classification = `compatible_optional_absence` + `grandfathered_snapshot_shape`.
- current-contract bundle: all subdirs present + all keys present → 0 findings; classification = `current_contract`.
- new PG omits CLK/STSEC/STQ keys without grandfathered parent → warn-level `compat_requires_migration_patch`.

### 6. Update `tools/validators/tests/structural/snapshot-replay-equality.test.ts` + `state-snapshot-integrity.test.ts`

Add test cases verifying parent PG with missing optional-class keys normalizes to `[]` on replay; existing tests continue to pass.

### 7. Update `tools/validators/tests/structural/registry.test.ts`

Add `compatibility_drift` to the validator-name assertion list (coordinate with tickets 003-011 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/compatibility-drift.ts` (new)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/compatibility-drift.test.ts` (new)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)

## Out of Scope

- Hard `fail` severity for "new current-contract PG omits required active-record shape" — deferred to Wave 3.
- `story_system_contract_revision` marker in STORY_KERNEL.md — deferred to Wave 3.
- Dedicated `branching-story-compatibility-repair` skill — deferred to Wave 3.
- CLK `linked_records[]` widening — deferred to Wave 3.
- Health-audit `compatibility` mode + SAU report section integration — handled by ticket 016.
- Auto-creation of optional CLK/STSEC/STQ records to "improve playability" — explicitly prohibited per SPEC-43 §Approach E.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- compatibility-drift` (test file passes).
2. `npm test --prefix tools/validators -- snapshot-replay-equality` (existing replay tests pass + new normalization tests pass).
3. `npm test --prefix tools/validators -- state-snapshot-integrity` (existing integrity tests pass + new normalization tests pass).
4. `npm test --prefix tools/validators` (full validator package test pass).
5. `grep -n "compatibilityDrift\|compatibility_drift" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. Snapshot-key normalization is one-directional: parent PG reads tolerate missing optional keys; new child PG WRITES must materialize the full current active-record map (boundary enforced at branching-story-turn-cycle Phase 9 per ticket 013).
2. No parent PG is ever rewritten to add empty optional keys (append-only discipline preserved; compatibility is a read-time normalization, not a write-time migration).
3. Compatibility-drift findings are info/warn only in Wave 2 (no hard fail); hard fail defers to Wave 3 once the contract marker exists.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/compatibility-drift.test.ts` — 3 test cases per §What to Change item 5.
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify) — add normalization-case test cases.
3. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify) — add normalization-case test cases.
4. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-011 per §Step 6.5).

### Commands

1. `npm test --prefix tools/validators -- compatibility-drift` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).
