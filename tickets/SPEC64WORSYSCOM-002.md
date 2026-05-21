# SPEC64WORSYSCOM-002: `index_disk_consistency` structural validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `index_disk_consistency` in `tools/validators` (registry append); reads `INDEX.md` files from the world root and diffs against indexed records. No impact on existing validators (additive registry append).
**Deps**: None

## Problem

There is no check for index drift between an `INDEX.md` and the artifacts on disk for the proposal/audit/pressure/character-proposal surfaces — an artifact present on disk may be missing from its `INDEX.md`, or an `INDEX.md` entry may point to a removed artifact. SPEC-64 D3 adds the index-consistency validator that report §9.5 step 3 names as the prerequisite *before* any future consideration of engine-routing (§9.5 step 4, deferred).

## Assumption Reassessment (2026-05-21)

1. `worldRootFrom(input, ctx)` (`tools/validators/src/structural/utils.ts:222`) returns the world root on disk; `tools/validators/src/structural/compatibility-drift.ts` is the precedent for reading the filesystem (`existsSync` against `worldRoot`) from a structural validator. Indexed records are enumerated via `queryStructuralRecords(ctx)` → `IndexedRecord` (`file_path`, `node_id`, `node_type`). Registration is the `structuralValidators` array at `tools/validators/src/public/registry.ts`; `Validator` shape per `framework/types.ts`.
2. SPEC-64 §D3 specifies `INDEX.md`-to-disk reconciliation for proposal/audit/pressure/character-proposal surfaces, both directions; report §9.5 step 3 names "index consistency checks" as the prerequisite ordered before engine-routing (step 4, deferred per SPEC-64 §Out of Scope).
3. Cross-artifact boundary under audit: `INDEX.md` files are **derived renderings, not indexed records** — the validator reads each `INDEX.md` from the world root on disk (via `worldRootFrom`) and diffs its entries against the indexed `proposal_card` / `audit_record` / `pressure_event_card` / `character_proposal_card` records. The shared surface is the `INDEX.md` entry format produced by the proposal/audit/pressure/character-proposal skills.
4. FOUNDATIONS Rule 6 (No Silent Retcons) restated: the posture is fail-fast validation + manual repair, with no silent migration or backwards-compatibility shim that would mutate artifacts (or rewrite an `INDEX.md`) without an audit trail.
5. Canon Safety surface: `index_disk_consistency` is a structural validator under `tools/validators/src/structural/`; under `run_mode: "pre-apply"` it emits `fail` (gating canon/hybrid writes), under `full-world` it emits `warn`. Confirm `applies_to` scopes the validator to worlds carrying the relevant surfaces and that it touches no `M-<integer>` record (Rule 7 firewall intact).

## Architecture Check

1. Reading `INDEX.md` from disk via `worldRootFrom` (rather than expecting `INDEX.md` to be a parsed record) matches the actual index shape — `INDEX.md` is a derived rendering — and the validator diffs the parsed `INDEX.md` entries against the indexed records, the authoritative on-disk artifact set.
2. No backwards-compatibility shim — drift is reported fail-fast for manual repair; the validator never rewrites an `INDEX.md`.

## Verification Layers

1. `index_disk_drift` is raised for an artifact present on disk but missing from its `INDEX.md` → unit test.
2. `index_disk_drift` is raised for an `INDEX.md` entry with no corresponding on-disk artifact → unit test (inverse direction).
3. Validator is wired into the framework → `tests/structural/registry.test.ts` name-list grep-proof includes `index_disk_consistency`.
4. Block-vs-warn follows run_mode → unit test asserting `fail` under `pre-apply`, `warn` under `full-world`.

## What to Change

### 1. New validator module

Create `tools/validators/src/structural/index-disk-consistency.ts` exporting `indexDiskConsistency: Validator` (`name: "index_disk_consistency"`). For each of the proposal/audit/pressure/character-proposal surfaces: read the surface's `INDEX.md` from the world root (via `worldRootFrom`), parse its entry list, and diff against the indexed records for that surface. Emit `code: "index_disk_drift"` naming the missing or orphaned entry, with run_mode-conditional severity.

### 2. Register the validator

Add the import and the `indexDiskConsistency` entry to the `structuralValidators` array in `tools/validators/src/public/registry.ts`.

### 3. Extend the registry test

Add `index_disk_consistency` to the structural-validator name-list assertion in `tools/validators/tests/structural/registry.test.ts`.

## Files to Touch

- `tools/validators/src/structural/index-disk-consistency.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/structural/index-disk-consistency.test.ts` (new)

## Out of Scope

- The `artifact_maturity` validator (SPEC64WORSYSCOM-001) and the world-compatibility CLI mode (SPEC64WORSYSCOM-003).
- Engine-routing of proposal direct-writes (report §9.5 step 4 / triage D6) — explicitly deferred per SPEC-64 §Out of Scope.
- Auto-repair / rewriting of any `INDEX.md` — the validator reports drift; repair is manual.

## Acceptance Criteria

### Tests That Must Pass

1. `index_disk_drift` is raised for an on-disk artifact missing from its `INDEX.md` (proposal/audit/pressure/character-proposal surface).
2. `index_disk_drift` is raised for an `INDEX.md` entry with no on-disk artifact (inverse direction).
3. A world whose `INDEX.md` files and on-disk artifacts agree produces no verdict.
4. `npm test --prefix tools/validators` passes, including the registry name-list assertion that now includes `index_disk_consistency`.

### Invariants

1. `INDEX.md` is read from disk via `worldRootFrom`, never expected as an indexed record; drift is detected in both directions.
2. The validator never mutates an `INDEX.md` and resolves no Mystery Reserve entry.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/index-disk-consistency.test.ts` (new) — both-direction drift, clean-pass, and run_mode-severity cases.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — assert `index_disk_consistency` is registered.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (covers `tsc`; the package defines no separate `typecheck` script)
