# SPEC04VALFRA-008: Animalia bootstrap disposition - fix or grandfather validator findings

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes - added explicit validator grandfather policy support and an animalia bootstrap audit policy. No high-trust canon source files were edited.
**Deps**: archive/tickets/SPEC04VALFRA-007.md

## Problem

At intake, `SPEC04VALFRA-007` had landed the validator integration capstone and proved that the animalia full-world validator baseline was structured and reproducible, but not clean:

- `world-validate animalia --json` exited 1.
- Intake summary: `fail_count: 224`, `warn_count: 0`, `info_count: 0`.
- Rule 5 is correctly skipped in full-world mode because it is pre-apply-only.

The remaining work was the actual Bootstrap audit disposition required before the broader Phase 2 Tier 1 gate could be called clean: each finding had to be fixed through an appropriate canon-addition-equivalent cleanup or grandfathered through an explicit, implemented policy that does not silently suppress validator failures.

## Assumption Reassessment (2026-04-25)

1. Re-ran `node tools/validators/dist/src/cli/world-validate.js animalia --json` from the repo root after building `tools/validators`; intake remained 224 failures before the grandfather policy was applied.
2. `docs/FOUNDATIONS.md` controls canon mutation and Rule 6 No Silent Retcons. Directly editing high-trust world canon as a shortcut was rejected.
3. Shared boundary: this ticket owns the animalia Bootstrap audit disposition, not the SPEC-04 framework mechanics already landed by ticket 007.
4. Findings were classified as pre-existing bootstrap corpus drift requiring either canon-addition-equivalent cleanup or explicit grandfathering, not validator bugs.
5. The implemented correction is explicit grandfathering: `worlds/animalia/audits/validation-grandfathering.yaml` lists 224 exact findings in 10 rationale groups; the validator runner only downgrades exact matches from `fail` to `info`.

## Architecture Check

1. Do not hide `fail` verdicts by inserting unrelated `info` rows into `validation_results`; the CLI recomputes verdicts and exits from emitted severities.
2. Grandfathering is a real policy surface: exact-match audit rows downgrade emitted verdicts before aggregation and persistence, while unmatched failures remain visible failures.
3. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Current baseline inventory -> targeted CLI command with JSON summary and grouped counts.
2. Canon/source cleanup correctness -> FOUNDATIONS alignment check confirming high-trust source files were not directly edited.
3. Grandfather policy correctness -> targeted CLI test proving fail-to-info behavior is explicit and rationale-bearing.
4. Final gate -> `world-validate animalia --json` exits 0 with `fail_count: 0`, `warn_count: 0`, `info_count: 224`.

## What to Change

### 1. Recompute the baseline

Run the CLI, group findings by validator/code/file, and record the exact current inventory before editing. Completed: 224 findings remained at intake and were grouped into 10 grandfather entries.

### 2. Decide disposition per finding family

Finding families dispositioned by this ticket:

- `record_schema_compliance` on hybrid/adjudication surfaces.
- `adjudication_discovery_fields`.
- `touched_by_cf_completeness`.
- `modification_history_retrofit`.
- `rule2_no_pure_cosmetics`.
- `rule6_no_silent_retcons`.
- `rule7_mystery_reserve_preservation`.

### 3. Apply only lawful fixes or explicit grandfathering

Implemented explicit grandfathering. The runner reads `audits/validation-grandfathering.yaml` from the world root, matches exact validator/code/file/node/message tuples, emits matched findings as `info` with `Grandfathered by GF-NNNN`, and leaves unmatched failures as `fail`.

## Files to Touch

- `archive/tickets/SPEC04VALFRA-008.md` (modify closeout after archival)
- `worlds/animalia/audits/validation-grandfathering.yaml` (new ignored world audit policy)
- `tools/validators/src/framework/grandfathering.ts` (new)
- `tools/validators/src/framework/run.ts` (modify)
- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `specs/SPEC-04-validator-framework.md` (modify)

## Out of Scope

- Reworking the SPEC-04 capstone matrix from ticket 007.
- Hook 5 or SPEC-06 skill migration work.
- Silent suppression of findings through DB-only row insertion.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `node tools/validators/dist/src/cli/world-validate.js animalia --json` exits 0 after disposition.
3. New grandfather-policy code has focused CLI and integration coverage.

### Invariants

1. Every grandfathered finding is accounted for by exact validator/code/file/node/message.
2. No canon source is changed without the repo's canon-mutating discipline.
3. Grandfathered findings carry human-authored rationale and are queryable/auditable as `info` verdicts.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/cli/world-validate.test.ts` — proves exact grandfather policy downgrades a known failure to an auditable `info` verdict.
2. `tools/validators/tests/integration/spec04-verification.test.ts` — proves animalia's full-world bootstrap baseline is now 224 `info` verdicts and zero failures.

### Commands

1. `cd tools/validators && npm run build`
2. `node tools/validators/dist/src/cli/world-validate.js animalia --json`

## Outcome

Implemented an explicit grandfather policy surface for validator runs. `worlds/animalia/audits/validation-grandfathering.yaml` records 224 exact bootstrap findings in 10 rationale groups. `runValidators` applies the policy after validators emit verdicts and before aggregation/persistence, so matching findings remain visible as `info` verdicts while unmatched or new failures still fail the gate.

No high-trust `_source/*.yaml`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, or other canon-bearing source file was edited.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && npm test` — passed, 47/47 tests.
3. `node tools/validators/dist/src/cli/world-validate.js animalia --json` — passed with `fail_count: 0`, `warn_count: 0`, `info_count: 224`; Rule 5 remains skipped as `pre-apply-only`.

## Deviations

Chose explicit grandfathering instead of direct source cleanup because the live findings are pre-existing bootstrap corpus drift and direct edits to high-trust canon/world content would violate FOUNDATIONS canon mutation discipline without a canon-addition-equivalent cleanup run.
