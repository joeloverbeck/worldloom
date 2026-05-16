# SPEC35STOPIPEIG-002: Fix branch_isolation genesis detection to root-page-aware logic

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`branch-isolation.ts` validator) + test fixture; originating spec progress note
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D2

## Problem

At intake, `tools/validators/src/structural/branch-isolation.ts` (`isBundleGenesisRecord`) returned true only when `created_at_page === "PG-0001"`. The current ID convention per FOUNDATIONS-002 (`docs/FOUNDATIONS.md`) is unpadded natural-integer suffixes: `PG-1`, not `PG-0001`. Genesis records could not match the padded literal, so global author-pool storylets referencing legal genesis records (e.g., `BEL-1.created_at_page === PG-1`) were falsely flagged as branch-local leaks — exactly inverting the validator's intent (Rule 4 No Globalization by Accident at story scope, per §Story Bundles §5 + §7 gate 4).

This was SPEC-34 D1 immediate post-merge drift. The padded literal was almost certainly copy-pasted from the SPEC-34 D1 test fixture (`branch-isolation.test.ts`), which itself uses padded IDs (per SPEC35STOPIPEIG-008's broader F8 sweep); the padded-fixture rot masked the padded-literal bug from CI detection.

## Assumption Reassessment (2026-05-16)

1. At intake, `tools/validators/src/structural/branch-isolation.ts` contained the literal `created_at_page === "PG-0001"` in `isBundleGenesisRecord`. This ticket replaced that literal with root-page-aware lookup.
2. FOUNDATIONS-002 in `docs/FOUNDATIONS.md` mandates unpadded natural-integer suffixes (`PG-1`, not `PG-0001`); engine schemas use `^<CLASS>-[0-9]+$` patterns. Verified against the current FOUNDATIONS text before implementation.
3. Cross-skill boundary under audit: the `BR.root_page_id` field convention (story-state contract §4 Branch records) and the `PG.parent_page_id === null && turn_index === 0` invariant for root pages — load-bearing for genesis detection without relying on string literals.
4. Rule 4 (No Globalization by Accident) and §Story Bundles §5 motivate this ticket: branch_isolation is the standalone deterministic validator that prevents branch-local records from leaking into global author-pool storylets (per SPEC-34 D1's intake). Restated: bundle-genesis records remain globally visible until superseded; branch-local records do not. The validator must correctly identify which records are bundle-genesis under the unpadded-ID convention.
5. This ticket touches a structural validator (`branch_isolation`) that gates story-bundle record writes at engine pre-apply time — a Canon Safety Check surface for story records. The fix CORRECTS the firewall by recognizing legal bundle-genesis records (no false-positive flagging of legal global-storylet references); the validator does not interact with the Mystery Reserve firewall directly, so no MR weakening is possible from this change.
6. Pre-edit validator package baseline passed: `npm test` from `tools/validators/` reported 303 passing tests. Existing branch-isolation positive fixtures needed `BR.root_page_id` on root branches to remain truthful under the new derivation; this is local fixture truthing, not the broader padded-ID sweep owned by `archive/tickets/SPEC35STOPIPEIG-008.md`.
7. The originating spec progress note was stale after D2 landed, so `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` was updated with a dated D2 completion note.

## Architecture Check

1. Root-page-aware genesis detection is structurally cleaner than a hardcoded literal: it derives the genesis set from canonical schema fields (`BR.root_page_id` when present; `PG.parent_page_id === null && turn_index === 0` as fallback for bundles authored before BR-recording landed), so a future ID-format change (e.g., a hypothetical move to `PG-G1` or per-story prefixed IDs) cannot silently break the detection. Alternative considered: regex-match `created_at_page` against `^PG-1$` exactly — rejected because future fixtures or bundles may use a different first-page numbering convention (e.g., pilot-tier bundles starting at `PG-100`), and the validator should derive the genesis set from the data, not from a name convention.
2. No backwards-compatibility aliasing introduced. The `rootPageIdsForStory` helper is computed once per validation run and threaded through call sites; the old `isBundleGenesisRecord(record)` signature is replaced wholesale with `isBundleGenesisRecord(record, rootPageIds)`.

## Verification Layers

1. Branch-isolation validator allows global author-pool storylets to reference bundle-genesis records → fixture-driven test where `BR-1.root_page_id: PG-1`, `BEL-1.created_at_page: PG-1`, global `SLT-1` references `BEL-1` → expect validator to pass (recognize `BEL-1` as bundle-genesis).
2. Hardcoded `PG-0001` literal removed → codebase grep-proof: `! grep -nE 'PG-0001' tools/validators/src/structural/branch-isolation.ts` returns zero matches.
3. Existing branch-isolation tests still pass after local root-page fixture truthing; broader fixture refresh remains `archive/tickets/SPEC35STOPIPEIG-008.md` → `npm test` in `tools/validators/`.

## Landed Changes

### 1. Replace `isBundleGenesisRecord` with root-page-aware logic

`tools/validators/src/structural/branch-isolation.ts` now computes `rootPageIdsForStory(maps)` once per story from root branch `root_page_id` values and root page records (`parent_page_id: null`, `turn_index: 0`). Both the active-record and global-author-pool paths pass that set into `isBundleGenesisRecord`.

### 2. Add fixture-driven test for unpadded-ID genesis detection

`tools/validators/tests/structural/branch-isolation.test.ts` now includes `branch_isolation allows global author-pool reference to unpadded bundle-genesis record`, with `BR-1.root_page_id: PG-1`, `PG-1.parent_page_id: null`, `PG-1.turn_index: 0`, and `BEL-1.created_at_page: PG-1`. Existing branch-isolation positive fixtures were also given root-branch `root_page_id` values so they prove the same contract.

## Files to Touch

- `tools/validators/src/structural/branch-isolation.ts` (modify)
- `tools/validators/tests/structural/branch-isolation.test.ts` (modify — new test + coordination with SPEC35STOPIPEIG-008's fixture refresh)
- `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` (modify — D2 implementation progress note)

## Out of Scope

- Sibling-branch sibling-fact-leak detection beyond bundle-genesis allowance — separate validator surface; not changed by this ticket.
- ID-format changes (e.g., per-story-slug prefixing) — out of scope; the root-page-aware logic is forward-compatible but does not introduce new ID conventions.
- Fixture refresh for the rest of `branch-isolation.test.ts` — owned by SPEC35STOPIPEIG-008's sweep.

## Acceptance Criteria

### Tests That Must Pass

1. New unpadded fixture passes on the post-fix validator (`SLT-1` is allowed because `BEL-1.created_at_page === PG-1` is recognized as bundle-genesis).
2. All existing `tools/validators/tests/structural/branch-isolation.test.ts` tests pass after the local root-page fixture truthing.
3. `! grep -nE 'PG-0001' tools/validators/src/structural/branch-isolation.ts` returns zero matches.
4. `npm test` in `tools/validators/` returns green.

### Invariants

1. `isBundleGenesisRecord` resolves genesis pages via root-branch / root-page traversal, not a hardcoded literal.
2. The validator's genesis-detection behavior is forward-compatible with future ID-format changes that preserve `BR.root_page_id` and `PG.parent_page_id === null && turn_index === 0` invariants.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/branch-isolation.test.ts` — add `branch_isolation allows global author-pool reference to unpadded bundle-genesis record` test exercising the root-page-aware genesis detection on unpadded IDs.

### Commands

1. `cd tools/validators && npm test` — full validator suite.
2. `cd tools/validators && npm run build` — typechecks the validator change.
3. `! grep -nE 'PG-0001' tools/validators/src/structural/branch-isolation.ts` — verification grep; expected zero matches.

## Outcome

Completed 2026-05-16.

`branch_isolation` no longer treats `"PG-0001"` as the only possible bundle-genesis page. It derives root page IDs from branch/page records and uses that set when deciding whether page snapshots or global author-pool storylets may reference a story-local record. The structural test suite now includes an unpadded `PG-1` / `BEL-1` regression fixture.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/validators/` passed with 303 tests.
2. `npm run build` from `tools/validators/` passed after the implementation.
3. `node --test dist/tests/structural/branch-isolation.test.js` from `tools/validators/` passed with 7 tests, including the new unpadded bundle-genesis fixture.
4. `! grep -nE 'PG-0001' tools/validators/src/structural/branch-isolation.ts` passed from the repo root; the validator source has no hardcoded padded root-page literal.
5. Final post-closeout proof: `npm test` from `tools/validators/` passed with 304 tests.
6. Manual review confirmed `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` now records D2 completion in `## Implementation Progress`.

## Deviations

- The first focused branch-isolation run after implementation failed an existing positive fixture because that fixture did not declare `BR.root_page_id`. The fixture was corrected locally because root-page-aware genesis detection now requires the schema field the test claimed to model.
- Broader padded-ID fixture refresh remains out of scope and owned by `archive/tickets/SPEC35STOPIPEIG-008.md`.
