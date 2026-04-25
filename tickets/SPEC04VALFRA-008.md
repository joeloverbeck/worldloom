# SPEC04VALFRA-008: Animalia bootstrap disposition - fix or grandfather validator findings

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes - resolves or explicitly grandfathers the current animalia `world-validate` bootstrap findings. May require world-content canon-addition-equivalent cleanup and/or a deliberate validator grandfather policy.
**Deps**: archive/tickets/SPEC04VALFRA-007.md

## Problem

`SPEC04VALFRA-007` landed the validator integration capstone and proved that the current animalia full-world validator baseline is structured and reproducible, but not clean:

- `world-validate animalia --json` exits 1.
- Current summary: `fail_count: 224`, `warn_count: 0`, `info_count: 0`.
- Rule 5 is correctly skipped in full-world mode because it is pre-apply-only.

The remaining work is the actual Bootstrap audit disposition required before the broader Phase 2 Tier 1 gate can be called clean: each finding must be fixed through an appropriate canon-addition-equivalent cleanup or grandfathered through an explicit, implemented policy that does not silently suppress validator failures.

## Assumption Reassessment (2026-04-25)

1. Re-run `node tools/validators/dist/src/cli/world-validate.js animalia --json` from the repo root after building `tools/validators`; do not trust the 224 count if the corpus or validators have changed.
2. `docs/FOUNDATIONS.md` controls canon mutation and Rule 6 No Silent Retcons. Directly editing high-trust world canon as a shortcut is not acceptable.
3. Shared boundary: this ticket owns the animalia Bootstrap audit disposition, not the SPEC-04 framework mechanics already landed by ticket 007.
4. Classify each current finding as one of: validator bug, source cleanup via canon-addition-equivalent flow, or explicit grandfather policy requiring production support.

## Architecture Check

1. Do not hide `fail` verdicts by inserting unrelated `info` rows into `validation_results`; the CLI recomputes verdicts and exits from emitted severities.
2. If grandfathering is chosen, implement a real policy surface with auditable rationale and tests, or keep the findings as visible failures.
3. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Current baseline inventory -> targeted CLI command with JSON summary and grouped counts.
2. Canon/source cleanup correctness -> FOUNDATIONS alignment check plus focused validator rerun.
3. Grandfather policy correctness, if implemented -> targeted unit/integration tests proving fail-to-info behavior is explicit and rationale-bearing.
4. Final gate -> `world-validate animalia --json` exits 0 only after every finding is fixed or lawfully grandfathered by the implemented policy.

## What to Change

### 1. Recompute the baseline

Run the CLI, group findings by validator/code/file, and record the exact current inventory before editing.

### 2. Decide disposition per finding family

Known finding families at ticket creation:

- `record_schema_compliance` on hybrid/adjudication surfaces.
- `adjudication_discovery_fields`.
- `touched_by_cf_completeness`.
- `modification_history_retrofit`.
- `rule2_no_pure_cosmetics`.
- `rule6_no_silent_retcons`.
- `rule7_mystery_reserve_preservation`.

### 3. Apply only lawful fixes or explicit grandfathering

Use the repo's canon discipline for source changes. If a policy-based grandfather path is needed, implement it as validator/framework behavior with tests and auditable rationale.

## Files to Touch

- `tickets/SPEC04VALFRA-008.md` (modify closeout)
- `worlds/animalia/...` (only through approved canon-addition-equivalent cleanup, if chosen)
- `tools/validators/...` (only if a real grandfather policy or validator bug fix is required)
- `specs/SPEC-04-validator-framework.md` (modify if the disposition policy changes the SPEC-04 contract)

## Out of Scope

- Reworking the SPEC-04 capstone matrix from ticket 007.
- Hook 5 or SPEC-06 skill migration work.
- Silent suppression of findings through DB-only row insertion.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `node tools/validators/dist/src/cli/world-validate.js animalia --json` exits 0 after disposition, or the ticket is closed as blocked/rejected with exact remaining findings and rationale.
3. Any new grandfather-policy code has focused tests.

### Invariants

1. Every remaining finding is accounted for by exact validator/code/file or node.
2. No canon source is changed without the repo's canon-mutating discipline.
3. Grandfathered findings, if any, carry human-authored rationale and are queryable/auditable.

## Test Plan

### New/Modified Tests

1. TBD after reassessment identifies whether this is source cleanup, validator bug fix, or policy implementation.

### Commands

1. `cd tools/validators && npm run build`
2. `node tools/validators/dist/src/cli/world-validate.js animalia --json`
