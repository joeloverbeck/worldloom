# SPEC41FUP-001: Add `fixture_unpadded_id_lint_current_only` CI lint

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — introduced a baseline-aware lint script under `tools/validators/scripts/`, its reviewed legacy baseline, and a `.github/workflows/ci-validators.yml` CI gate. No validator source modification.
**Deps**: None

## Problem

D1 of SPEC-41 (originating from SPEC-40 §Risks & Open Questions F2.a). The unpadded-natural-integer ID convention (FOUNDATIONS-002) requires fixture files to use `PG-1` / `CF-1` / `BEL-1` rather than padded forms like `PG-0001`. SPEC-35 D8 swept fixture rot across 4 test files (`story-bundle-fixture.ts`, `observer-firewall.test.ts`, `snapshot-replay-equality.test.ts`, `recursive-reference-closure.test.ts`); SPEC-36 D3 tightened schema regexes from `^<PREFIX>-[0-9]+$` to `^<PREFIX>-(0|[1-9][0-9]*)$` to fail padded IDs structurally. Both were reactive fixes after the drift had already accumulated. No CI lint enforces the convention proactively, so a new fixture introduced by future work can ship with padded IDs and silently pass CI until a validator test happens to consume it.

## Assumption Reassessment (2026-05-17)

1. Codebase: `.github/workflows/` had no fixture-ID-padding lint before this ticket (`rg` for `fixture_unpadded_id_lint`, `unpadded.id.lint`, and `check-fixture-id-padding` found only this ticket/spec family before implementation). The live repo did not match the draft assumption that all current fixtures already conformed: `rg -n -o '(PG|SE|BEL|SF|CHC|OBL|CNSQ|THR|SREL|STSTAT|STENT|STINT|STLOC|STOBJ|SLT|DA|BR|CF|CH|INV|M|OQ|ENT|SEC|PA|CHAR|AU|RP|SAU|SP|RSP)-(0[0-9]+)' tools --glob '**/tests/**/*.{ts,json,yaml,yml}' --glob '**/src/**/*-fixture.ts' --glob '!**/node_modules/**' --glob '!**/dist/**'` found 1,192 existing padded-ID occurrences aggregated into 307 file/ID count entries. The ticket was narrowed from "all current fixtures already conform" to "preserve a reviewed current baseline and fail on new padded-ID occurrences."
2. Spec: SPEC-41 §D1 names the script + CI integration as the minimal remediation, but its "current fixtures are clean" premise is historical draft evidence rather than live truth. The landed implementation keeps the SPEC-41 prevention goal by adding `tools/validators/scripts/fixture-id-padding-baseline.tsv`; a future cleanup can reduce or remove that baseline without changing the CI gate shape.
3. Cross-skill boundary: the lint script lives at the validators package surface (because fixture conformance is a validator-test concern), but it scans across all `tools/**/tests/**` paths and `tools/**/src/**/*-fixture.ts`. The shared contract under audit is the unpadded-integer ID convention itself. The CI workflow that hosts the lint (`ci-validators.yml`) becomes the enforcement surface for new drift while the baseline preserves existing legacy test data until a separate cleanup owns it.

## Architecture Check

1. A baseline-aware bash script wired into CI is structurally cleaner than an in-validator runtime check — the convention is about file content authoring, not runtime behavior, so a static CI gate catches new drift at PR time before package tests run.
2. No backwards-compatibility aliasing or runtime shims introduced — the lint is net-new, scans for the bad pattern only, excludes archive/generated dependency paths, and records existing legacy occurrences in a reviewed TSV baseline rather than silently accepting all padded IDs forever.

## Verification Layers

1. Lint script correctness -> temp-root proof: `FIXTURE_ID_LINT_ROOTS=<tmpdir> bash tools/validators/scripts/check-fixture-id-padding.sh` fails on `tests/padded.ts` containing `PG-0001` and reports the corrected unpadded form `PG-1`; the same command exits zero for `PG-1`, `CF-1`, and `BEL-42`.
2. CI integration -> workflow file check: `grep -n 'check-fixture-id-padding' .github/workflows/ci-validators.yml` returns the new step.
3. False-positive avoidance -> baseline proof: `bash tools/validators/scripts/check-fixture-id-padding.sh` exits zero against the current repo because every pre-existing padded occurrence is represented in `tools/validators/scripts/fixture-id-padding-baseline.tsv`.

## What to Change

### 1. New lint script

Created `tools/validators/scripts/check-fixture-id-padding.sh`:

- Scan `tools/**/tests/**/*.ts`, `tools/**/tests/**/*.json`, `tools/**/tests/**/*.yaml`, `tools/**/tests/**/*.yml`, plus `tools/**/src/**/*-fixture.ts` for padded ID literals.
- Pattern: any string matching `<PREFIX>-0+[0-9]+` where `<PREFIX>` is one of the 25 known ID prefixes (see Assumption Reassessment item 1 for the list).
- Exclude paths under `archive/`, `node_modules/`, and generated `dist/`.
- Compare current file/ID counts to `tools/validators/scripts/fixture-id-padding-baseline.tsv`; fail only when a padded ID appears more times than the reviewed baseline allows.
- Support `--update-baseline` for intentional baseline refreshes and `FIXTURE_ID_LINT_ROOTS=<colon-separated paths>` for temp-root positive/negative proof that does not use the repo baseline.
- On new drift, write `<file>: padded ID <match> appears <count> time(s), baseline allows <count>; use <corrected> or update the reviewed baseline` to stderr and exit non-zero.

### 2. CI workflow integration

Extended `.github/workflows/ci-validators.yml`:

- Added a new step that invokes the new lint script.
- Step name: `Lint fixture ID padding`.
- Failure messaging: when the lint fails, the CI step output names the offending files + lines + the corrected unpadded form for each.

## Files to Touch

- `tools/validators/scripts/check-fixture-id-padding.sh` (new)
- `tools/validators/scripts/fixture-id-padding-baseline.tsv` (new)
- `.github/workflows/ci-validators.yml` (modify) — add a new step invoking the new lint script.

## Out of Scope

- No validator-source modification (`tools/validators/src/` unchanged).
- No fixture-file edits — live reassessment found existing legacy padded IDs, so this ticket adds forward enforcement with a reviewed baseline instead of performing a broad fixture migration.
- No new schema fields, no new records, no new validators.
- No retroactive sweep of `archive/`-resident fixtures (those are historical record).
- No companion `current_docs_do_not_cite_archive_as_authority` lint — that's SPEC41FUP-002; separate concern, separate ticket.

## Acceptance Criteria

### Tests That Must Pass

1. Running the new lint script against a temp file containing `PG-0001` (or any padded ID for any of the 25 known prefixes) exits non-zero with a file:line message.
2. Running the new lint script against a temp file containing only unpadded IDs (`PG-1`, `CF-1`, `BEL-42`) exits zero.
3. Running the new lint script against the current repo's `tools/**/tests/**` and `tools/**/src/**/*-fixture.ts` surface exits zero because the reviewed baseline captures pre-existing legacy occurrences.
4. CI workflow `ci-validators.yml` runs the new step on PRs and fails CI when a new fixture introduces a padded ID.

### Invariants

1. New padded-ID drift beyond the reviewed baseline is enforced at PR time across all `tools/**/tests/**` paths and `tools/**/src/**/*-fixture.ts`.
2. `archive/`-resident fixtures are not scanned — historical record is preserved unchanged.
3. The lint script has zero false-positives on the current repo's reviewed legacy baseline.

## Test Plan

### New/Modified Tests

1. `None — script/CI ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` — the lint script's correctness is verified via direct invocation against synthesized fixtures and the checked baseline, not via a sibling test file. The CI workflow's correctness is verified by the workflow step wiring and by the PR's CI run.

### Commands

1. `bash tools/validators/scripts/check-fixture-id-padding.sh` — direct script invocation; expected exit code 0 on current repo state.
2. `tmp=$(mktemp -d) && mkdir -p "$tmp/tests" && printf 'PG-0001\n' > "$tmp/tests/padded.ts" && FIXTURE_ID_LINT_ROOTS="$tmp" bash tools/validators/scripts/check-fixture-id-padding.sh; status=$?; rm -rf "$tmp"; exit $status` — manual negative test confirming non-zero exit on padded ID.
3. `grep -n 'check-fixture-id-padding' .github/workflows/ci-validators.yml` — confirms the workflow step is wired.

## Outcome

Completed 2026-05-17. Added `tools/validators/scripts/check-fixture-id-padding.sh`, generated the reviewed current baseline at `tools/validators/scripts/fixture-id-padding-baseline.tsv`, and wired `.github/workflows/ci-validators.yml` to run the lint before the validators package test step. Reassessment corrected the draft's false "current fixtures are clean" premise: the live repo had 1,192 padded-ID occurrences across 307 file/ID count entries, so the landed gate prevents new drift while leaving broad fixture cleanup to a future owner.

## Verification Result

- `bash tools/validators/scripts/check-fixture-id-padding.sh` — passed against the current repo baseline.
- `tmp=$(mktemp -d) && mkdir -p "$tmp/tests" && printf 'PG-0001\n' > "$tmp/tests/padded.ts" && FIXTURE_ID_LINT_ROOTS="$tmp" bash tools/validators/scripts/check-fixture-id-padding.sh; status=$?; rm -rf "$tmp"; exit $status` — failed as expected with `padded ID PG-0001 ... use PG-1`.
- `tmp=$(mktemp -d) && mkdir -p "$tmp/tests" && printf 'PG-1\nCF-1\nBEL-42\n' > "$tmp/tests/clean.ts" && FIXTURE_ID_LINT_ROOTS="$tmp" bash tools/validators/scripts/check-fixture-id-padding.sh; status=$?; rm -rf "$tmp"; exit $status` — passed.
- `grep -n 'check-fixture-id-padding' .github/workflows/ci-validators.yml` — passed, showing the CI step at line 42.
- `npm test` from `tools/validators` — passed: 367 tests, 367 pass.

## Deviations

- Draft acceptance said the current repo had no fixture rot. Live reassessment disproved that, so the implemented CI gate uses a reviewed baseline instead of requiring a broad same-ticket migration of legacy test IDs.
