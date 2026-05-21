# SPEC58STCHARCONENF-004: Require active_records.STCHAR key (snapshot-shape hardening)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`story-page.schema.json`, the `OPTIONAL_ACTIVE_RECORDS_CLASSES` helper, and its four consuming validators: `active_records_full_shape`, `state_snapshot_integrity`, `snapshot_replay_equality`, `compatibility_drift`); no impact on non-snapshot validators.
**Deps**: None

## Problem

`PG.state_snapshot.active_records.STCHAR` is treated as an optional/WARN-class key: it is listed in `OPTIONAL_ACTIVE_RECORDS_CLASSES`, the page schema has no `required` entry for it, and a missing STCHAR key only warns. Because STCHAR is the operational runtime character authority, the key should be structurally required for current bundles — snapshot-shape hardening (SPEC-58 C4).

**Severity framing (reframed from the source report):** this is *not* an authority hole. `stchar_active_for_bound_stent` (`severity_mode: "fail"`) already hard-fails any active non-background STENT whose bound STCHAR is not active on the page; the authority guarantee is already enforced. C4 only prevents a snapshot from omitting the STCHAR key entirely and silently passing — hence MEDIUM, not HIGH.

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/_helpers/state-snapshot-replay.ts:31-39` lists `STCHAR` in `OPTIONAL_ACTIVE_RECORDS_CLASSES`; `tools/validators/src/schemas/story-page.schema.json` (~lines 49–72) lists `STCHAR` among `active_records` `properties` with no `required` array; `active-records-full-shape.ts` / `state-snapshot-integrity.ts` emit warn-level (not fail) verdicts for the missing key. `stchar_active_for_bound_stent.ts` already hard-fails the active-STENT-without-active-STCHAR case (read directly this session).
2. `.claude/skills/_shared-templates/story-record-schemas.md:62-64` lists `STCHAR` under `active_records`; the contract treats it as load-bearing for runtime authority. **Precondition (named assumption):** no production story bundles predate STCHAR — if a legacy bundle is found, this change must instead route through a `migration_attestation`-style carve-out (NOT designed in this ticket; see Out of Scope).
3. Cross-artifact boundary: `OPTIONAL_ACTIVE_RECORDS_CLASSES` (defined in `state-snapshot-replay.ts`) is the shared seam — consumed by **four** files: `active-records-full-shape.ts`, `state-snapshot-integrity.ts`, `snapshot-replay-equality.ts`, and `compatibility-drift.ts`. Removing STCHAR from it changes behavior in all four; the spec narrative named only the first two (the latter two were surfaced by the spec-to-tickets (e)/(g) parity scan and added to Files to Touch).
4. FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority — STCHAR is the runtime authority, not a fallback to world `CHAR`) + §4a (Plan-Authority Boundary — page-plan-commit snapshot is the authoritative, replayable state). Requiring the key keeps the snapshot shape honest.
5. Canon Safety surface: the modified files are structural validators / snapshot helpers under `tools/validators/src/` that gate page-record writes at pre-apply. The change tightens shape enforcement; it weakens no Mystery Reserve firewall (Rule 7 untouched).
6. Output-schema extension: `PG` (`story-page.schema.json`) is a story-bundle output-record schema. Adding `STCHAR` to the `active_records` `required` set is a tightening (not additive-only) — but additive in practice under the no-legacy-bundle precondition (item 2). Consumers: the four `OPTIONAL_ACTIVE_RECORDS_CLASSES` users in item 3.
7. Rename/remove blast radius: removing `STCHAR` from `OPTIONAL_ACTIVE_RECORDS_CLASSES` is an enum-membership removal. Pipeline-wide grep (`tools/`) shows the constant is consumed only within `tools/validators` — by the four files in item 3 (`snapshot-replay-equality.ts` iterates it; `compatibility-drift.ts` derives a type from it and filters on it; `state-snapshot-integrity.ts` iterates it; `state-snapshot-replay.ts` defines it). No `.claude/skills/`, `docs/`, or other-package consumers. Each of the four must be reviewed so the reclassification (STCHAR optional → required) lands coherently.

## Architecture Check

1. Reclassifies STCHAR from the OPTIONAL set to a required snapshot key at the single canonical source (`OPTIONAL_ACTIVE_RECORDS_CLASSES`) plus the schema `required` array, then reviews each of the four consumers so the change is coherent everywhere — no per-consumer special-casing of STCHAR.
2. No backwards-compatibility aliasing/shims — no WARN-mode compatibility window for missing STCHAR; under the no-legacy-bundle precondition the required key applies unconditionally to current snapshots.

## Verification Layers

1. A current snapshot missing the `active_records.STCHAR` key fails (not warns) → codebase test (`active-records-full-shape.test.ts` / `state-snapshot-integrity.test.ts`).
2. `STCHAR: []` passes only when no active non-background STENT is present → codebase test.
3. STCHAR deltas replay as a non-optional active-record class → codebase test (`snapshot-replay-equality.test.ts`).
4. `compatibility_drift` no longer classifies a missing STCHAR key as benign drift → codebase test (`compatibility-drift.test.ts`).
5. An active non-background STENT with no active bound STCHAR still fails via the existing `stchar_active_for_bound_stent` validator (unchanged) → FOUNDATIONS alignment check + existing validator.

## What to Change

### 1. Make the STCHAR active-records key required

Add `"STCHAR"` to the `required` keys for `state_snapshot.active_records` in `story-page.schema.json`.

### 2. Remove STCHAR from the optional set

Remove `STCHAR` from `OPTIONAL_ACTIVE_RECORDS_CLASSES` in `state-snapshot-replay.ts`.

### 3. Make the missing-key verdict fail-level

In `active-records-full-shape.ts` and `state-snapshot-integrity.ts`, ensure a missing STCHAR key produces a fail-level verdict; `STCHAR: []` passes when no active non-background STENT is present.

### 4. Reconcile the other two OPTIONAL-set consumers (parity-scan additions)

Review and adjust `snapshot-replay-equality.ts` (STCHAR now replayed as a non-optional active-record class) and `compatibility-drift.ts` (STCHAR no longer treated as benign compatibility drift) so they behave coherently with STCHAR off the optional list.

## Files to Touch

- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify)
- `tools/validators/src/structural/active-records-full-shape.ts` (modify)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — parity-scan addition)
- `tools/validators/src/structural/compatibility-drift.ts` (modify — parity-scan addition)
- `tools/validators/tests/structural/active-records-full-shape.test.ts` (modify)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/validators/tests/structural/compatibility-drift.test.ts` (modify)
- `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (modify)

## Out of Scope

- C1/C2/C3 changes (separate tickets).
- Migration handling for legacy pre-STCHAR story bundles — §2.4 of the spec assumes none exist; if a legacy bundle is found, a `migration_attestation`-style carve-out is required and is NOT designed here.
- Any change to `stchar_active_for_bound_stent` (it already enforces the active-STENT→active-STCHAR guarantee and stays unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. A current snapshot missing the `active_records.STCHAR` key fails (not warns).
2. `STCHAR: []` passes when no active non-background STENT is present; an active non-background STENT with no active bound STCHAR still fails (via the existing validator).
3. STCHAR deltas replay correctly as a non-optional class; `compatibility_drift` does not treat a missing STCHAR key as benign.
4. `npm --prefix tools/validators test` passes (full validator suite).

### Invariants

1. `active_records.STCHAR` is a structurally required key for current page snapshots.
2. The four `OPTIONAL_ACTIVE_RECORDS_CLASSES` consumers agree on STCHAR's non-optional status (no validator treats it as optional after the change).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/active-records-full-shape.test.ts` — missing-key-fails + empty-array-passes cases.
2. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — fail-level missing-key verdict.
3. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — STCHAR replayed as non-optional.
4. `tools/validators/tests/structural/compatibility-drift.test.ts` — missing STCHAR key no longer benign drift.
5. `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` — `OPTIONAL_ACTIVE_RECORDS_CLASSES` no longer contains STCHAR.

### Commands

1. `npm --prefix tools/validators test -- snapshot` (targeted across snapshot/replay tests, after build).
2. `npm --prefix tools/validators test` (build + full suite).
