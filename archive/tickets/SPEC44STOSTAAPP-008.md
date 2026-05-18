# SPEC44STOSTAAPP-008: `active_records_full_shape` validator (warn severity)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `active_records_full_shape` registered in `tools/validators/src/public/registry.ts` at `warn` severity; complements the existing `compatibility-drift.ts` `compat_missing_active_record_key` diagnostic. No impact on existing validators.
**Deps**: None

## Problem

`tools/validators/src/schemas/story-page.schema.json` permits `PG.state_snapshot.active_records` to omit keys for any of the 15 documented record classes (the schema enumerates each class's array shape but does not list them under `required`). The existing SPEC-43 `compatibility-drift.ts` validator classifies missing optional keys (`CLK`, `STSEC`, `STQ`, `DA`) as `compatible_optional_absence` for old-style parent PGs OR `requires_migration_patch` for new pages omitting required keys; both classifications are intentional SPEC-43-era transition discipline to preserve pre-SPEC-43 bundles.

SPEC-44 §Approach Phase 3 step 12 introduces a consolidated `warn`-level diagnostic — `active_records_full_shape` — that fires whenever a `PG.state_snapshot.active_records` map omits any of the 15 documented classes. The check is intentionally `warn` (not `fail`) for the SPEC-44 → Wave-3 transition: pre-Wave-3 bundles continue to validate clean at `fail` severity, while operators see consistent `warn`-level surfacing of shape-completeness gaps at every PG commit. The Wave 3 `branching-story-compatibility-repair` skill (deferred per SPEC-44 §Out of Scope) will upgrade this validator to `fail` once the repair workflow is in place.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/schemas/story-page.schema.json:49-68` carries `active_records` with 15 classes (STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA/STSTAT/CLK/STSEC/STQ) enumerated as optional properties; `additionalProperties: true` permits but does not require any single key. `tools/validators/src/structural/compatibility-drift.ts:5,24,127,154` references `OPTIONAL_ACTIVE_RECORDS_CLASSES` from `_helpers/state-snapshot-replay.ts`; the helper defines the 4-class optional set (DA / CLK / STSEC / STQ) and the SPEC-43 classifications `compat_missing_active_record_key` / `compatible_optional_absence` / `requires_migration_patch`.
2. SPEC-44 §Approach Phase 3 step 12 specifies the validator's scope and severity (warn). §Out of Scope confirms that hard-fail and the Wave 3 repair skill are deferred. The validator's role is consolidated shape-completeness surfacing, not the bundle-classification work that `compatibility-drift.ts` owns.
3. **Cross-boundary surface under audit**: this validator complements `compatibility-drift.ts` — the existing validator owns bundle classification (`compatible_optional_absence` / `grandfathered_snapshot_shape` / `requires_migration_patch` / etc.); the new validator owns the per-page shape-completeness diagnostic uniformly at warn severity. The two run in distinct phases (compatibility classifies the bundle at audit-time; the new validator fires at each PG commit).
4. **FOUNDATIONS principle**: §Story Bundles §4b (Canon Baseline Drift) — drift between a parent PG snapshot and the current contract MUST classify; this validator surfaces shape-drift at commit time (per-PG) rather than only at audit time (per-bundle), keeping the audit-trail anchor visible at every commit gate.
5. **Canon Safety surface touched**: the new validator is a structural full-world validator under `tools/validators/src/structural/` with `applies_to` excluding `pre-apply`. It does not gate patch-plan submission or approval-token flows in this ticket; the change does NOT weaken the Mystery Reserve firewall — active-records completeness is internal snapshot consistency, distinct from mystery-resolution gating. Future Wave 3 upgrade to `fail` severity or pre-apply participation requires the `branching-story-compatibility-repair` skill to land first.
6. Live package reassessment found same-seam registry fallout beyond the original file list: `tools/validators/tests/structural/registry.test.ts` asserts the exact structural validator list, `tools/validators/tests/integration/spec04-verification.test.ts` asserts `structuralValidators.length === 49`, and `tools/validators/README.md` inventories the structural validator names. These surfaces must move with the new registry entry.
7. The drafted targeted command `npm test --prefix tools/validators -- active-records-full-shape` is not the truthful narrow lane for this package because the package `test` script always runs `npm run build && node --test dist/tests/**/*.test.js`. The targeted lane is `npm run build --prefix tools/validators` followed by direct `node --test tools/validators/dist/tests/structural/active-records-full-shape.test.js`.

## Architecture Check

1. **Warn-level diagnostic bridges SPEC-44 to Wave 3.** Promoting to `fail` immediately would break every pre-SPEC-43 bundle currently being audited (their snapshots lack the new optional keys); SPEC-43's `compatibility-drift.ts` was designed exactly to preserve these bundles during the transition. The new validator emits `warn` so operators see consistent surfacing at commit time without breaking legitimate prior state.
2. **No backwards-compatibility shim.** The validator emits one diagnostic per missing class; it does not normalize, default-fill, or silently treat absent keys as empty. The `_helpers/state-snapshot-replay.ts` normalization remains in place for replay-equality checks; this validator is a surfacing-only diagnostic, not a normalizer.

## Verification Layers

1. **Validator registered with `warn` severity** → codebase grep-proof: `grep -n 'active_records_full_shape' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "warn"`.
2. **Validator fires per missing class** → synthetic-fixture test: a page record whose `state_snapshot.active_records` omits CLK / STSEC / STQ / DA returns 4 `warn` verdicts (one per missing class).
3. **Validator validates clean on full shape** → synthetic-fixture test: a page record whose `state_snapshot.active_records` has all 15 class keys (each as `[]` or populated) returns clean.
4. **Validator coexists with compatibility-drift classifications** → synthetic-fixture and CLI smoke tests show BOTH the SPEC-43 `compat_missing_active_record_key` / `compatible_optional_absence` classifications AND the SPEC-44 `active_records_full_shape` `warn` verdicts; neither subsumes the other.

## What to Change

### 1. Author the validator module

Create `tools/validators/src/structural/active-records-full-shape.ts`. The module exports an `activeRecordsFullShape` validator following the existing structural-validator pattern. The validator:
- Targets the full validation phase (`applies_to: ["full"]`); does NOT run at pre-apply (the warn-level diagnostic shouldn't block patch plans).
- For each `PG` record:
  - Check `state_snapshot.active_records` for each of the 15 documented class keys (STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA/STSTAT/CLK/STSEC/STQ).
  - For each missing key, emit a `warn` verdict with `code: "active_records_class_key_missing"`, naming the PG id and the missing class.
- Embed the 15-class set as a typed constant (matching `story-page.schema.json`); the constant is the single source of truth for this validator's expected-class check.

### 2. Register the validator

Edit `tools/validators/src/public/registry.ts` to add an import for the new validator module and a registry entry with `severity_mode: "warn"` alongside the other PG-record structural validators.

### 3. Author the test module

Create `tools/validators/tests/structural/active-records-full-shape.test.ts` covering:
- **Diagnostic test 1 (4 missing classes)**: PG with `active_records` populated for 11 classes, missing DA / CLK / STSEC / STQ → expect 4 `warn` verdicts.
- **Diagnostic test 2 (single class missing)**: PG with `active_records` missing only STSTAT → expect 1 `warn` verdict naming STSTAT.
- **Positive test 1 (full shape, populated)**: PG with all 15 class keys, each populated with at least one id → expect clean.
- **Positive test 2 (full shape, empty arrays)**: PG with all 15 class keys, each `[]` → expect clean (empty array satisfies the shape-completeness check).
- **Coexistence test**: same fixture, run BOTH `compatibility-drift` AND `active_records_full_shape` validators; verify the fixture's verdict set contains both validator families' diagnostics without one subsuming the other.

## Files to Touch

- `tools/validators/src/structural/active-records-full-shape.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + registry entry)
- `tools/validators/tests/structural/active-records-full-shape.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — registry inventory)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — structural validator count)
- `tools/validators/README.md` (modify — validator inventory)

## Out of Scope

- Upgrading the validator severity from `warn` to `fail` (Wave 3 work, per SPEC-44 §Out of Scope).
- The Wave 3 `branching-story-compatibility-repair` skill (per SPEC-44 §Out of Scope).
- Changes to `story-page.schema.json` `active_records` shape (e.g., making all 15 keys `required`) — same Wave 3 dependency.
- Changes to `compatibility-drift.ts` classifications or `_helpers/state-snapshot-replay.ts` normalization — both remain owned by SPEC-43 era discipline.
- Adding a CLI flag to tune warn → fail severity (per SPEC-44 §Risks & Open Questions — defer to Wave 3 when the severity-mode flag is introduced).

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/validators` followed by `node --test tools/validators/dist/tests/structural/active-records-full-shape.test.js` passes all 6 test cases (1 run-mode scoping, 2 diagnostic, 2 positive, 1 coexistence).
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression; pre-SPEC-43 bundle fixtures should now emit `warn` verdicts but not `fail`).
3. `npm run build --prefix tools/validators` exits 0.

### Invariants

1. The validator emits one `warn` verdict per missing class key in `state_snapshot.active_records`, naming the PG id and the missing class.
2. The validator does NOT normalize, default-fill, or silently treat absent keys as empty; it is a surfacing-only diagnostic.
3. The validator coexists with SPEC-43 `compatibility-drift.ts` classifications without one subsuming the other; both validators run in distinct contexts (compatibility classifies the bundle; full-shape surfaces per-PG at commit time).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/active-records-full-shape.test.ts` (new) — 6 test cases covering run-mode scoping plus the 5 behavior cases from §What to Change step 3.
2. `tools/validators/tests/structural/registry.test.ts` (modified) — structural validator inventory includes `active_records_full_shape`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` (modified) — expected structural validator count increments from 49 to 50.
4. No modifications to compatibility-drift behavior tests (the SPEC-43 `compatibility-drift` tests remain unchanged).

### Commands

1. `npm run build --prefix tools/validators` — producer build for compiled test artifacts.
2. `node --test tools/validators/dist/tests/structural/active-records-full-shape.test.js` — targeted validator test.
3. `npm test --prefix tools/validators` — full validator suite regression.
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` — end-to-end CLI run against a real bundle; expected output in this checkout: `fail_count: 0`, `warn_count: 15` from `active_records_full_shape`, `info_count: 10` from existing `compatibility_drift` classifications.

## Outcome (2026-05-18)

- Added `active_records_full_shape` as a full-world-only structural validator with `severity_mode: "warn"`. It emits one `active_records_class_key_missing` verdict per missing `PG.state_snapshot.active_records` class key and does not participate in pre-apply validation.
- Registered the validator in the structural validator registry and updated same-seam inventory/count surfaces in `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`.
- Added `tools/validators/tests/structural/active-records-full-shape.test.ts` covering run-mode scoping, per-class warnings, full-shape positive cases, and coexistence with `compatibility_drift`.
- Deviation from draft: the targeted proof uses `npm run build --prefix tools/validators` plus direct `node --test tools/validators/dist/tests/structural/active-records-full-shape.test.js` because the package `test` script does not provide a narrow file selector. The real red-bunny smoke produced `fail_count: 0`, `warn_count: 15`, and `info_count: 10`; the info count is not unchanged because existing compatibility-drift informational verdicts are visible in this checkout.

## Verification Result (2026-05-18)

- `npm run build --prefix tools/validators` — passed.
- `node --test tools/validators/dist/tests/structural/active-records-full-shape.test.js` — passed (6 tests).
- `node --test dist/tests/integration/validate-patch-plan.test.js --test-name-pattern 'clean pre-apply plan'` from `tools/validators` — passed after the new validator was classified as skipped in pre-apply.
- `npm test --prefix tools/validators` — passed (530 tests).
- `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` — exited 0 with `fail_count: 0`, `warn_count: 15`, `info_count: 10`.
