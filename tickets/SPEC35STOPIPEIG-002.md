# SPEC35STOPIPEIG-002: Fix branch_isolation genesis detection to root-page-aware logic

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`branch-isolation.ts` validator) + test fixture
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D2

## Problem

`tools/validators/src/structural/branch-isolation.ts:160` (`isBundleGenesisRecord`) returns true only when `created_at_page === "PG-0001"`. The current ID convention per FOUNDATIONS-002 (`docs/FOUNDATIONS.md:552–559`) is unpadded natural-integer suffixes: `PG-1`, not `PG-0001`. Genesis records can never match the padded literal, so global author-pool storylets referencing legal genesis records (e.g., `BEL-1.created_at_page === PG-1`) are falsely flagged as branch-local leaks — exactly inverting the validator's intent (Rule 4 No Globalization by Accident at story scope, per §Story Bundles §5 + §7 gate 4).

This is SPEC-34 D1 immediate post-merge drift. The padded literal was almost certainly copy-pasted from the SPEC-34 D1 test fixture (`branch-isolation.test.ts`), which itself uses padded IDs (per SPEC35STOPIPEIG-008's broader F8 sweep); the padded-fixture rot masked the padded-literal bug from CI detection.

## Assumption Reassessment (2026-05-16)

1. `tools/validators/src/structural/branch-isolation.ts:160` contains the literal `created_at_page === "PG-0001"` in `isBundleGenesisRecord`. Verified at audit-phase Read; line 160 cited via brainstorm's parallel-agent verification.
2. FOUNDATIONS-002 at `docs/FOUNDATIONS.md:552–559` mandates unpadded natural-integer suffixes (`PG-1`, not `PG-0001`); engine schemas use `^<CLASS>-[0-9]+$` patterns. Verified at audit-phase FOUNDATIONS Read.
3. Cross-skill boundary under audit: the `BR.root_page_id` field convention (story-state contract §4 Branch records) and the `PG.parent_page_id === null && turn_index === 0` invariant for root pages — load-bearing for genesis detection without relying on string literals.
4. Rule 4 (No Globalization by Accident) and §Story Bundles §5 motivate this ticket: branch_isolation is the standalone deterministic validator that prevents branch-local records from leaking into global author-pool storylets (per SPEC-34 D1's intake). Restated: bundle-genesis records remain globally visible until superseded; branch-local records do not. The validator must correctly identify which records are bundle-genesis under the unpadded-ID convention.
5. This ticket touches a structural validator (`branch_isolation`) that gates story-bundle record writes at engine pre-apply time — a Canon Safety Check surface for story records. The fix CORRECTS the firewall by recognizing legal bundle-genesis records (no false-positive flagging of legal global-storylet references); the validator does not interact with the Mystery Reserve firewall directly, so no MR weakening is possible from this change.

## Architecture Check

1. Root-page-aware genesis detection is structurally cleaner than a hardcoded literal: it derives the genesis set from canonical schema fields (`BR.root_page_id` when present; `PG.parent_page_id === null && turn_index === 0` as fallback for bundles authored before BR-recording landed), so a future ID-format change (e.g., a hypothetical move to `PG-G1` or per-story prefixed IDs) cannot silently break the detection. Alternative considered: regex-match `created_at_page` against `^PG-1$` exactly — rejected because future fixtures or bundles may use a different first-page numbering convention (e.g., pilot-tier bundles starting at `PG-100`), and the validator should derive the genesis set from the data, not from a name convention.
2. No backwards-compatibility aliasing introduced. The `rootPageIdsForStory` helper is computed once per validation run and threaded through call sites; the old `isBundleGenesisRecord(record)` signature is replaced wholesale with `isBundleGenesisRecord(record, rootPageIds)`.

## Verification Layers

1. Branch-isolation validator allows global author-pool storylets to reference bundle-genesis records → fixture-driven test where `BR-1.root_page_id: PG-1`, `BEL-1.created_at_page: PG-1`, global `SLT-1` references `BEL-1` → expect validator to pass (recognize `BEL-1` as bundle-genesis).
2. Hardcoded `PG-0001` literal removed → codebase grep-proof: `grep -nE 'PG-0001' tools/validators/src/structural/branch-isolation.ts` returns zero matches.
3. Existing branch-isolation tests still pass after fixture refresh (per SPEC35STOPIPEIG-008 sweep) → `npm test` in `tools/validators/`.

## What to Change

### 1. Replace `isBundleGenesisRecord` with root-page-aware logic

In `tools/validators/src/structural/branch-isolation.ts`, replace the line-160 implementation with:

```typescript
function rootPageIdsForStory(maps: RecordMaps): Set<string> {
  const roots = new Set<string>();
  for (const branch of maps.byType.get("branch_record") ?? []) {
    const parsed = asPlainRecord(branch.parsed);
    const parent = stringValue(parsed.parent_branch_id);
    const rootPage = stringValue(parsed.root_page_id);
    if (parent === undefined || parent === null || parent === "null") {
      if (rootPage !== undefined) roots.add(rootPage);
    }
  }
  for (const page of maps.byType.get("page_record") ?? []) {
    const parsed = asPlainRecord(page.parsed);
    if (parsed.parent_page_id === null && parsed.turn_index === 0) {
      const id = stringValue(parsed.id);
      if (id !== undefined) roots.add(id);
    }
  }
  return roots;
}

function isBundleGenesisRecord(record: IndexedRecord, rootPageIds: ReadonlySet<string>): boolean {
  const created = stringValue(asPlainRecord(record.parsed).created_at_page);
  return created !== undefined && rootPageIds.has(created);
}
```

Thread `rootPageIds` through the call sites: pre-compute once at validator-init time (or per validation run), pass into the per-record `isBundleGenesisRecord` check.

### 2. Add fixture-driven test for unpadded-ID genesis detection

In `tools/validators/tests/structural/branch-isolation.test.ts`, add a new test (e.g., `branch_isolation allows global author-pool reference to unpadded bundle-genesis record`):

- `BR-1` with `root_page_id: PG-1`, `parent_branch_id: null`.
- `BEL-1` with `created_at_page: PG-1` (legal bundle-genesis record).
- Global author-pool `SLT-1` referencing `BEL-1` in some `preconditions` or `effects` predicate.
- Pre-fix behavior: validator flags `SLT-1` as branch-local leak (genesis check fails on `"PG-1" !== "PG-0001"`). Post-fix behavior: validator recognizes `BEL-1` as bundle-genesis via `rootPageIds` set and passes.

Fixture must use unpadded IDs throughout (per SPEC35STOPIPEIG-008's sweep of `branch-isolation.test.ts`).

## Files to Touch

- `tools/validators/src/structural/branch-isolation.ts` (modify)
- `tools/validators/tests/structural/branch-isolation.test.ts` (modify — new test + coordination with SPEC35STOPIPEIG-008's fixture refresh)

## Out of Scope

- Sibling-branch sibling-fact-leak detection beyond bundle-genesis allowance — separate validator surface; not changed by this ticket.
- ID-format changes (e.g., per-story-slug prefixing) — out of scope; the root-page-aware logic is forward-compatible but does not introduce new ID conventions.
- Fixture refresh for the rest of `branch-isolation.test.ts` — owned by SPEC35STOPIPEIG-008's sweep.

## Acceptance Criteria

### Tests That Must Pass

1. New test (per change-step 2) FAILS on the pre-fix validator (`SLT-1` is flagged as branch-local leak) and PASSES on the post-fix validator (`SLT-1` is allowed because `BEL-1.created_at_page === PG-1` is recognized as bundle-genesis).
2. All existing `tools/validators/tests/structural/branch-isolation.test.ts` tests continue to pass after the fix and fixture refresh.
3. `grep -nE 'PG-0001' tools/validators/src/structural/branch-isolation.ts` returns zero matches.
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
3. `grep -nE 'PG-0001' tools/validators/src/structural/branch-isolation.ts` — verification grep; expected zero matches.
