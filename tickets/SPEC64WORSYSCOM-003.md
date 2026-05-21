# SPEC64WORSYSCOM-003: world-compatibility CLI mode

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `--compatibility` CLI mode on `world-validate` (validator-subset selection). No new registered validator; no impact on the existing `--rules` / `--structural` modes.
**Deps**: archive/tickets/SPEC64WORSYSCOM-001.md, archive/tickets/SPEC64WORSYSCOM-002.md

## Problem

SPEC-64 D2 calls for a high-level world-compatibility check that aggregates schema + approval-semantics + maturity + index-consistency into one consolidated verdict. The reassessed spec realizes report §10.1's `world_compatibility_validator` as a **CLI mode**, not a registered meta-validator: the validator framework runs each registered `Validator` independently and flat, and the consolidated verdict is the run-loop's job (`aggregateSeverity`), so a validator that internally invoked other validators would double-count verdicts or re-implement aggregation. This ticket adds a `--compatibility` selection mode that runs the compatibility-relevant validator subset through the existing `runValidators` aggregation.

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/cli/world-validate.ts` parses options (`rules`, `structural`, `json`, `file`, `story`, `since`, `help`, `version`), hardcodes `run_mode: "full-world"` (line 89), and calls `selectValidators(structuralValidators, ruleValidators, values, ctx)` (line 95). `selectValidators` lives at `tools/validators/src/cli/_helpers.ts:135`; `validateOptions` enforces `--rules`/`--structural` mutual exclusion (line 83); `printHelp` documents flags. The compatibility subset names `record_schema_compliance` + `approval_semantics` (both already registered) + `artifact_maturity` (SPEC64WORSYSCOM-001) + `index_disk_consistency` (SPEC64WORSYSCOM-002).
2. SPEC-64 §D2 + §Acceptance specify the CLI-mode shape and the subset; report §10.1 names the original `world_compatibility_validator`; the reassessed spec's I1 resolution mandates "CLI mode + validator subset, not meta-validator."
3. Cross-artifact boundary under audit: the compatibility subset is a name set spanning four registry entries; it depends on `archive/tickets/SPEC64WORSYSCOM-001.md` and `archive/tickets/SPEC64WORSYSCOM-002.md` having registered `artifact_maturity` and `index_disk_consistency` respectively. The shared contract is the validator-name set the selection references.
4. FOUNDATIONS §Tooling Recommendation / §Machine-Facing Layer restated: validators + CLI are the executable enforcement layer (Validator Framework, item 4); the mode also runs `approval_semantics`, which enforces the §Canon Fact Record Schema reservation that `source_basis.direct_user_approval` is accepted-CF-only.

## Architecture Check

1. A CLI mode + validator-subset selection reuses the framework's `runValidators` aggregation (`aggregateSeverity`) for the consolidated verdict, rather than a meta-validator that invokes other validators — this matches the flat registry + run-loop model and avoids double-counting verdicts and losing per-validator execution reporting.
2. No backwards-compatibility shim; `--compatibility` is additive and mutually exclusive with `--rules` / `--structural`, following the existing option-validation discipline. Block-vs-warn is not new CLI work — it is emergent from the D1/D3 validators' run_mode-conditional severity (`fail` under `pre-apply`, `warn` under `full-world`).

## Verification Layers

1. `--compatibility` selects exactly `{record_schema_compliance, approval_semantics, artifact_maturity, index_disk_consistency}` → unit test on the `selectValidators` compatibility branch.
2. The mode reports one consolidated verdict aggregated by `runValidators` → integration test asserting the aggregated summary.
3. Read-only `full-world` invocation warns (does not block) → test asserting non-blocking exit behavior in full-world.
4. Help text documents `--compatibility` → grep-proof on `world-validate --help` output / `_helpers.ts` `printHelp`.

## What to Change

### 1. CLI option + selection (`world-validate.ts`)

Add a `--compatibility` boolean option to `parseArgs`. When set, select the compatibility validator subset (independent of `--rules` / `--structural`) and run it through `runValidators`, reporting the consolidated verdict.

### 2. Selection + validation + help (`_helpers.ts`)

Extend `selectValidators` with the compatibility-subset branch; extend `validateOptions` to make `--compatibility` mutually exclusive with `--rules` / `--structural`; add a `--compatibility` line to `printHelp`.

## Files to Touch

- `tools/validators/src/cli/world-validate.ts` (modify)
- `tools/validators/src/cli/_helpers.ts` (modify)
- `tools/validators/tests/integration/world-compatibility-cli.test.ts` (new)

## Out of Scope

- The `artifact_maturity` (`archive/tickets/SPEC64WORSYSCOM-001.md`) and `index_disk_consistency` (`archive/tickets/SPEC64WORSYSCOM-002.md`) validator implementations themselves.
- Patch-engine pre-apply wiring — the blocking behavior under `pre-apply` is emergent from the D1/D3 validators' run_mode-conditional severity once registered, not new CLI work.
- The continuity-audit reporting hook (SPEC64WORSYSCOM-004).

## Acceptance Criteria

### Tests That Must Pass

1. `--compatibility` runs exactly the four-validator subset and emits a single consolidated verdict.
2. Under `full-world`, compatibility defects warn rather than block (non-failing exit).
3. `world-validate --help` lists `--compatibility`; `--compatibility` with `--rules` or `--structural` is rejected as mutually exclusive.
4. `npm test --prefix tools/validators` passes.

### Invariants

1. No new registered meta-validator is added; the consolidated verdict comes from `runValidators` aggregation.
2. The compatibility subset is exactly `{record_schema_compliance, approval_semantics, artifact_maturity, index_disk_consistency}`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/world-compatibility-cli.test.ts` (new) — subset selection, consolidated-verdict aggregation, full-world warn behavior, mutual-exclusion option validation.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (covers `tsc`)
3. `node tools/validators/dist/src/cli/world-validate.js --help` (grep for `--compatibility` — narrow help-surface check after build)
