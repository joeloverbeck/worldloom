# SPEC04VALFRA-007: Integration capstone - SPEC-04 verification matrix

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes - added the SPEC-04 integration capstone test and corrected validator full-world authority filtering. No canon/world source files were changed.
**Deps**: archive/tickets/SPEC04VALFRA-006.md

## Problem

SPEC-04's Verification section needs one capstone proof that composes the validator framework across the package registry, full-world runner, pre-apply entry point, incremental applicability filter, Phase 14a mechanized/skill-owned split, engine-facing `validatePatchPlan` entry, schema conformance, and bootstrap-baseline visibility.

At intake, this ticket also claimed the animalia Bootstrap audit could be completed by inserting `info`-severity grandfather rows so `world-validate animalia` would exit 0. Live reassessment disproved that mechanism: the CLI recomputes validator verdicts every run and exits 1 on any emitted `fail`. Persisted `validation_results` rows are an audit/cache surface, not an allowlist or severity-override mechanism.

## Assumption Reassessment (2026-04-25)

1. `tools/validators/src/public/registry.ts` currently exports 7 structural validators and 6 rule-derived validators. Rule 3 remains skill-judgment only, matching `specs/SPEC-04-validator-framework.md` Verification and Phase 14a migration text.
2. `specs/SPEC-04-validator-framework.md` now says the full-world/false-positive baseline compares animalia verdicts against a hand-audit baseline; it does not truthfully promise zero findings before cleanup. The live CLI now reports 224 pre-existing fail verdicts on animalia after this ticket's full-world raw-file fix.
3. Shared boundary: this ticket owns the `@worldloom/validators` full-world runner/CLI proof seam plus the integration test matrix in `tools/validators/tests/integration/`. It does not own canon-mutating cleanup of `worlds/animalia/`.
4. FOUNDATIONS principle under audit: the Machine-Facing Layer tooling recommendation and Rule 6 No Silent Retcons. Validator failures must remain visible until a canon-addition-equivalent cleanup or explicit grandfather policy is implemented; they must not be hidden by stale DB rows.
5. Required-consequence validator fix: the live world-index DB contains derived lexical `named_entity` and prose `section` nodes that share node types with atomic authority records. Structural validators must validate only canonical authority surfaces (`_source/.../*.yaml`, characters, diegetic artifacts, adjudications), not derived index nodes such as `entity:*` or `WORLD_KERNEL.md` prose sections.
6. Required-consequence full-world fix: the CLI passed `files: []` in full-world mode, causing raw-file validators to skip world-root fallback. `fileInputsFrom` now treats an empty explicit file list as "no explicit scope" and falls back to `world_root`, so full-world validation includes hybrid and adjudication files.
7. Bootstrap cleanup split: because no live grandfather allowlist existed and changing canon/source records was a separate high-trust world-content operation, the remaining grandfather-or-fix disposition was split to `archive/tickets/SPEC04VALFRA-008.md`.

## Architecture Check

1. Filtering structural records by canonical authority file path keeps validators aligned with FOUNDATIONS' atomic-source contract while preserving world-index's derived lexical nodes for retrieval.
2. Letting empty `files: []` fall through to `world_root` preserves explicit scoped validation when files are provided and restores full-world raw-file coverage when no scope is provided.
3. The capstone uses a fixture-copied animalia world and does not mutate the real `worlds/animalia/` source tree.
4. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. SPEC-04 matrix coverage -> targeted tool command (`node --test dist/tests/integration/spec04-verification.test.js`).
2. Package-wide validator regression -> targeted tool command (`cd tools/validators && npm run test`).
3. CLI full-world baseline -> targeted tool command (`node tools/validators/dist/src/cli/world-validate.js animalia --json`) reports 224 fail verdicts, 0 warn, 0 info, with Rule 5 skipped as pre-apply-only.
4. Atomic-source schema conformance -> runtime assertion in the capstone: no `record_schema_compliance` verdict points at `_source/`.
5. Authority-node filtering -> unit regression in `record-schema-compliance.test.ts` proving derived `entity:*` / `WORLD_KERNEL.md` nodes are ignored by schema compliance.

## What to Change

### 1. Structural authority filtering

Restrict `queryStructuralRecords` to canonical authority records. This prevents schema, ID, and cross-reference validators from treating world-index lexical nodes as source records.

### 2. Full-world raw-file fallback

Update `fileInputsFrom` so `files: []` does not suppress `world_root` discovery. This makes CLI full-world mode include adjudication and hybrid-file validators.

### 3. SPEC-04 capstone test and coverage README

Add `tools/validators/tests/integration/spec04-verification.test.ts` and `tools/validators/tests/integration/README.md`. The test covers counts, registry inventory, current animalia baseline, atomic-source schema conformance, pre-apply Rule 4 rejection, engine-facing verdict return, incremental filtering, Phase 14a Rule 3 split, and perf logging.

## Files to Touch

- `tools/validators/src/structural/utils.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/structural/id-uniqueness.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (new)
- `tools/validators/tests/integration/README.md` (new)
- `specs/SPEC-04-validator-framework.md` (modify)
- `archive/tickets/SPEC04VALFRA-008.md` (completed follow-up)
- `archive/tickets/SPEC04VALFRA-007.md` (modify closeout)

## Out of Scope

- Editing `worlds/animalia/` source canon, hybrid files, or adjudications.
- Inventing a grandfather allowlist/override mechanism.
- Declaring the broader Phase 2 Tier 1 animalia clean gate complete.
- SPEC-05 Hook 5 integration and SPEC-06 skill rewrites.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/integration/spec04-verification.test.js`
3. `cd tools/validators && npm run test`
4. `node tools/validators/dist/src/cli/world-validate.js animalia --json` exits 1 and reports the current structured bootstrap baseline.

### Invariants

1. Structural validators validate authority records, not derived lexical index nodes.
2. Empty full-world file scope does not disable raw-file validators.
3. The capstone copies animalia to a temp root and does not write real world source files.
4. Bootstrap findings remain visible as `fail` verdicts until a separate cleanup/grandfather ticket resolves them.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec04-verification.test.ts` - SPEC-04 capstone matrix.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` - regression for ignoring derived index nodes with authority-like node types.
3. `tools/validators/tests/structural/id-uniqueness.test.ts` - fixture path corrected to stay canonical after authority filtering.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/integration/spec04-verification.test.js`
3. `cd tools/validators && npm run test`
4. `node tools/validators/dist/src/cli/world-validate.js animalia --json >/tmp/worldloom-animalia-validate-final.json; node -e "const r=require('/tmp/worldloom-animalia-validate-final.json'); console.log(JSON.stringify(r.summary));"`

## Outcome

Implemented the SPEC-04 capstone and corrected two validator-framework issues it exposed:

1. Structural validators now ignore derived world-index nodes that are not canonical authority records.
2. Full-world validation now discovers raw world files when the caller passes an empty explicit file list.

The capstone recorded the intake animalia baseline as 224 fail verdicts, 0 warn, 0 info. Atomic `_source/` schema conformance was clean; the remaining findings were hybrid/adjudication schema/discovery drift, `touched_by_cf` completeness drift, modification-history drift, and rule-derived bootstrap findings. Those were dispositioned by `archive/tickets/SPEC04VALFRA-008.md`.

## Verification Result

Passed:

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/integration/spec04-verification.test.js` - 1 compiled test file passed.
3. `cd tools/validators && npm run test` - 46 tests passed.
4. `node tools/validators/dist/src/cli/world-validate.js animalia --json ...` - exited 1 as expected; summary was `fail_count: 224`, `warn_count: 0`, `info_count: 0`, Rule 5 skipped as pre-apply-only.

Ignored/generated state: `tools/validators/dist/` is an expected ignored build artifact; `tools/validators/node_modules/` is pre-existing ignored dependency state. The CLI proof refreshed `worlds/animalia/_index/world.db` validation rows only; no tracked world source files changed.

## Deviations

- The drafted "grandfather rows make CLI exit 0" acceptance was false. Persisted `validation_results` rows do not override validator verdicts.
- The ticket was widened from test-only to include two required-consequence validator fixes inside the same package seam.
- The remaining animalia grandfather-or-fix disposition was completed by `archive/tickets/SPEC04VALFRA-008.md`; this ticket does not claim that later work.
