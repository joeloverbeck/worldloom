# SPEC40STOPIPELE-001: Flip `non_propagation_tag_shape` malformed-tag severity from warn to fail

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies the `non_propagation_tag_shape` structural validator at `tools/validators/src/structural/non-propagation-tag-shape.ts` and its paired test.
**Deps**: None

## Problem

At intake, D1 of SPEC-40 found that the `non_propagation_tag_shape` validator declared `severity_mode: "fail"` at `tools/validators/src/structural/non-propagation-tag-shape.ts`, and its `missing()` helper correctly constructed `expected_witness_tag_missing` verdicts at `severity: "fail"`, but the sibling `malformed()` helper constructed `expected_witness_tag_malformed` verdicts at hardcoded `severity: "warn"`. The within-validator drift was introduced when SPEC-35 D4 renamed the surface; the malformed-verdict severity was never flipped. A malformed `non_propagation:` tag in `SE.world_logic_rationale` looks like an intentional propagation exemption but is unparseable by the downstream `expected_witness_coverage` validator — exactly the "paperwork says covered, machine can't read it" failure mode the tag-shape validator is intended to prevent.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/validators/src/structural/non-propagation-tag-shape.ts:25` declares `severity_mode: "fail"`; `:111-121` `malformed()` emits `severity: "warn"` for `expected_witness_tag_malformed`; `:123-133` `missing()` correctly emits `severity: "fail"` for `expected_witness_tag_missing`. The within-validator inconsistency is the bug — both verdict-construction sites must emit `"fail"` to match the validator's declared mode.
2. Spec: SPEC-40 §D1 names the source flip + test rename + new assertion as the minimal remediation. The existing test at `tools/validators/tests/structural/non-propagation-tag-shape.test.ts:34-46` codifies the warning behavior with the test name `"non_propagation_tag_shape warns on malformed non-propagation tags"` — needs renaming + a positive severity assertion.
3. Cross-skill boundary: the verdict consumer is the downstream `expected_witness_coverage` validator at `tools/validators/src/structural/expected-witness-coverage.ts` (per the source-file comment at `non-propagation-tag-shape.ts:5-7`). The severity flip strengthens the upstream tag-shape check so the downstream witness validator never reads a tag the upstream validator silently approved.
4. Canon Safety surface: `non_propagation_tag_shape` is a structural validator under `tools/validators/src/structural/` that runs at pre-apply per the validator-severity contract — `severity_mode: "fail"` means any emitted verdict halts pre-apply. The flip brings the validator's per-verdict severity into alignment with its declared mode; it does NOT weaken the Mystery Reserve firewall (the validator's scope is witness-coverage tag syntax, not Mystery Reserve resolution). The change strengthens enforcement rather than relaxing it.

## Architecture Check

1. A one-line severity literal change at the verdict-construction site is the cleanest fix — the validator's declared `severity_mode: "fail"` is correct; only the `malformed()` helper's per-verdict construction was wrong. Alternatives (downgrading `severity_mode` to "warn" or filtering at the registry level) would weaken the validator without addressing the actual bug.
2. No backwards-compatibility aliasing or shims introduced — the verdict code (`expected_witness_tag_malformed`) is unchanged; only the severity literal changes. Existing consumers of the verdict code continue to receive it; the only behavior change is that consumers reading verdicts at fail-severity will now see this one too.

## Verification Layers

1. Severity contract → codebase grep-proof: `grep -nE 'severity: "(warn|fail)"' tools/validators/src/structural/non-propagation-tag-shape.ts` shows both verdict construction sites (lines 114 and 126) emit `severity: "fail"` with no remaining `"warn"` literals in this file.
2. Test assertion alignment → test run: `cd tools/validators && npm test` passes with the renamed test asserting `severity === "fail"` on the malformed verdict and the new negative test asserting that a well-formed tag does NOT emit the malformed verdict.
3. Single-layer ticket — codebase grep-proof plus test-run coverage together prove the change surface; no cross-skill dry-run needed because the downstream `expected_witness_coverage` validator does not branch on verdict severity (it reads parseable tags via the `missing()` path that already emits at `"fail"`).

## Landed Changes

### 1. Source flip

At `tools/validators/src/structural/non-propagation-tag-shape.ts`, `malformed()` now emits `severity: "fail"`. No other validator source changed.

### 2. Test rename + assertion update

At `tools/validators/tests/structural/non-propagation-tag-shape.test.ts`:
- Renamed the malformed-tag test from `"non_propagation_tag_shape warns on malformed non-propagation tags"` to `"non_propagation_tag_shape rejects malformed non-propagation tags"`.
- Added an explicit assertion that `expected_witness_tag_malformed` carries `severity === "fail"`.
- Added a negative test using `non_propagation:no_witness(group=public, records=[BEL-1])` inside `SE.world_logic_rationale` and asserting no `expected_witness_tag_malformed` verdict is emitted.

## Files to Touch

- `tools/validators/src/structural/non-propagation-tag-shape.ts` (modify)
- `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (modify)

## Out of Scope

- No registry change (`tools/validators/src/public/registry.ts` already exports `nonPropagationTagShape`).
- No schema change (no record schema or field shape is touched).
- No fixture cascade — the only fixture affected is the test file already in Files to Touch.
- No MCP, hook, or patch-engine changes.
- No downstream `expected_witness_coverage` modification (it reads parseable tags via the unaffected `missing()` path).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes with the renamed test asserting both `code === "expected_witness_tag_malformed"` AND `severity === "fail"` on the malformed verdict.
2. The new negative test (well-formed tag) passes by asserting the verdicts list contains no `expected_witness_tag_malformed` entry.
3. `cd tools/validators && npm run build` succeeds (TypeScript compilation passes).

### Invariants

1. Validator declared `severity_mode` and per-verdict `severity` values are aligned — a validator with `severity_mode: "fail"` does not emit any `severity: "warn"` verdicts.
2. Downstream `expected_witness_coverage` validator continues to consume parseable non-propagation tags via the existing `missing()` / `expected_witness_tag_missing` path unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (modify) — rename existing test from "warns on" to "rejects"; add explicit severity assertion; add one negative test for a well-formed tag confirming no malformed verdict is emitted.

### Commands

1. `cd tools/validators && npm test` — runs the full validators test suite including the renamed and new tests.
2. `cd tools/validators && npm run build` — TypeScript build (typecheck via tsc).

## Outcome

Completed: 2026-05-17.

What changed:
- `tools/validators/src/structural/non-propagation-tag-shape.ts` now aligns the malformed non-propagation tag verdict with the validator's declared fail severity.
- `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` now asserts the malformed verdict's fail severity and covers the well-formed-tag negative case.
- `specs/SPEC-40-story-pipeline-eleventh-iteration-fixes.md` now records that D1 is implemented while D2-D4 remain active.

Deviations from original plan:
- None. The implementation stayed within the planned validator source/test seam plus the same-family spec status note.

## Verification Result

Commands run from `tools/validators`:

1. `npm test` — passed. The package built first and then ran `node --test dist/tests/**/*.test.js`; result was 359 tests, 359 passed, 0 failed.
2. `npm run build` — passed. TypeScript compilation completed and refreshed `dist/src/cli/world-validate.js`.

Repo-root grep proof:

1. `grep -nE 'severity: "(warn|fail)"' tools/validators/src/structural/non-propagation-tag-shape.ts` — returned only the two fail-severity verdict construction sites.

Ignored artifact classification:
- `tools/validators/dist/` was refreshed by the build/test commands and remains an expected ignored generated artifact.
- `tools/validators/node_modules/` was pre-existing ignored package state and was left untouched.
