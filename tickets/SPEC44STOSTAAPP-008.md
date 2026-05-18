# SPEC44STOSTAAPP-008: `active_records_full_shape` validator (warn severity)

**Status**: PENDING
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
5. **Canon Safety surface touched**: the new validator is a structural pre-apply gate under `tools/validators/src/structural/` per the per-ticket-type granularity rule. It gates page-record submission at `warn` severity; the change does NOT weaken the Mystery Reserve firewall — active-records completeness is internal snapshot consistency, distinct from mystery-resolution gating. Future Wave 3 upgrade to `fail` severity requires the `branching-story-compatibility-repair` skill to land first.

## Architecture Check

1. **Warn-level diagnostic bridges SPEC-44 to Wave 3.** Promoting to `fail` immediately would break every pre-SPEC-43 bundle currently being audited (their snapshots lack the new optional keys); SPEC-43's `compatibility-drift.ts` was designed exactly to preserve these bundles during the transition. The new validator emits `warn` so operators see consistent surfacing at commit time without breaking legitimate prior state.
2. **No backwards-compatibility shim.** The validator emits one diagnostic per missing class; it does not normalize, default-fill, or silently treat absent keys as empty. The `_helpers/state-snapshot-replay.ts` normalization remains in place for replay-equality checks; this validator is a surfacing-only diagnostic, not a normalizer.

## Verification Layers

1. **Validator registered with `warn` severity** → codebase grep-proof: `grep -n 'active_records_full_shape' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "warn"`.
2. **Validator fires per missing class** → synthetic-fixture test: a page record whose `state_snapshot.active_records` omits CLK / STSEC / STQ / DA returns 4 `warn` verdicts (one per missing class).
3. **Validator validates clean on full shape** → synthetic-fixture test: a page record whose `state_snapshot.active_records` has all 15 class keys (each as `[]` or populated) returns clean.
4. **Validator coexists with compatibility-drift classifications** → end-to-end fixture test: a pre-SPEC-43 bundle audit run shows BOTH the SPEC-43 `compat_missing_active_record_key` / `compatible_optional_absence` classifications AND the SPEC-44 `active_records_full_shape` `warn` verdicts; neither subsumes the other.

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

## Out of Scope

- Upgrading the validator severity from `warn` to `fail` (Wave 3 work, per SPEC-44 §Out of Scope).
- The Wave 3 `branching-story-compatibility-repair` skill (per SPEC-44 §Out of Scope).
- Changes to `story-page.schema.json` `active_records` shape (e.g., making all 15 keys `required`) — same Wave 3 dependency.
- Changes to `compatibility-drift.ts` classifications or `_helpers/state-snapshot-replay.ts` normalization — both remain owned by SPEC-43 era discipline.
- Adding a CLI flag to tune warn → fail severity (per SPEC-44 §Risks & Open Questions — defer to Wave 3 when the severity-mode flag is introduced).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- active-records-full-shape` passes all 5 test cases (2 diagnostic, 2 positive, 1 coexistence).
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression; pre-SPEC-43 bundle fixtures should now emit `warn` verdicts but not `fail`).
3. `npm run build --prefix tools/validators` exits 0.

### Invariants

1. The validator emits one `warn` verdict per missing class key in `state_snapshot.active_records`, naming the PG id and the missing class.
2. The validator does NOT normalize, default-fill, or silently treat absent keys as empty; it is a surfacing-only diagnostic.
3. The validator coexists with SPEC-43 `compatibility-drift.ts` classifications without one subsuming the other; both validators run in distinct contexts (compatibility classifies the bundle; full-shape surfaces per-PG at commit time).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/active-records-full-shape.test.ts` (new) — 5 test cases per §What to Change step 3.
2. No modifications to existing tests (the SPEC-43 `compatibility-drift` tests remain unchanged).

### Commands

1. `npm test --prefix tools/validators -- active-records-full-shape` — targeted validator test.
2. `npm test --prefix tools/validators` — full validator suite regression.
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` — end-to-end CLI run against a real bundle; expected output: `fail_count: 0`, `warn_count` may increase (this validator's new `warn` verdicts), `info_count` unchanged.
