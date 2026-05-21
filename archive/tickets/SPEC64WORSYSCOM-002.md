# SPEC64WORSYSCOM-002: `index_disk_consistency` structural validator

**Status**: COMPLETED
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
6. Reassessment widened the same-seam proof surface before source edits: registering a structural validator also requires the live inventory/count witnesses to move with the registry. `tools/validators/README.md`, `tools/validators/tests/cli/world-validate.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/world-mcp/tests/server/capability-parity.test.ts` were included as owned registry witnesses, matching the precedent from `archive/tickets/SPEC64WORSYSCOM-001.md`.

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

### 4. Extend same-seam registry witnesses

Update the validators README structural inventory/count, CLI selected-validator expectation, SPEC-04 validator-count assertion, and downstream `world-mcp` capability parity expected validator list to include `index_disk_consistency`.

## Files to Touch

- `tools/validators/src/structural/index-disk-consistency.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/structural/index-disk-consistency.test.ts` (new)
- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)

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
3. `tools/validators/tests/cli/world-validate.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/world-mcp/tests/server/capability-parity.test.ts` (modify) — registry/count/consumer witnesses updated for the new structural validator.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (covers `tsc`; the package defines no separate `typecheck` script)
3. `(cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js)` — downstream registry parity proof

## Outcome

Completed: 2026-05-21

Implemented `index_disk_consistency` as an additive structural validator over proposal, audit, pressure-event, and character-proposal INDEX surfaces. The validator reads each surface `INDEX.md` from the world root, compares markdown links against indexed records plus disk artifacts, reports `index_disk_drift` in both directions, emits `fail` outside `full-world` and `warn` in `full-world`, and never rewrites any `INDEX.md`.

Registered the validator in the validators package and updated same-seam registry/count/inventory witnesses plus the downstream `world-mcp` validator-registry parity test.

## Verification Result

1. `npm run build` from `tools/validators` — PASS.
2. `node --test dist/tests/structural/index-disk-consistency.test.js dist/tests/structural/registry.test.js dist/tests/cli/world-validate.test.js` from `tools/validators` — first run exposed a same-seam overreach where `.proposal.md` pressure sidecars were treated as `pressure_event_card` artifacts; after tightening the matcher, PASS (13 tests).
3. `npm test` from `tools/validators` — PASS (822 tests).
4. `npm run build` from `tools/world-mcp` — PASS.
5. `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp` — PASS (5 tests).
6. Manual FOUNDATIONS alignment check — PASS: the validator enforces §Artifact Authority and Maturity / machine-facing validation discipline by detecting INDEX drift, adds no migration or auto-repair path, mutates no canon or hybrid artifact, and does not resolve Mystery Reserve content.

## Deviations

- Same-seam registry witnesses beyond the drafted file list were required and updated: `tools/validators/README.md`, `tools/validators/tests/cli/world-validate.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/world-mcp/tests/server/capability-parity.test.ts`.
- Pressure-event sidecar proposal files (`*.proposal.md`) are intentionally excluded from this validator's `pressure_event_card` surface; they are proposal-sidecar artifacts, not top-level `EPE-*` pressure-event cards.
- Existing ignored package artifacts were present before verification (`tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`). Builds refreshed `dist/`; ignored artifacts are not tracked source changes.
