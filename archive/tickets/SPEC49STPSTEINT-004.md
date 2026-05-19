# SPEC49STPSTEINT-004: Fix STEMO.agency_effect compatibility helper field-name bug (parsed.holder → parsed.entity)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/stemo-utils.ts` (modify), `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` (modify)
**Deps**: None

## Problem

`tools/validators/src/structural/stemo-utils.ts:303` read `stringValue(parsed.holder)` from STSTAT records inside the `holderHasCompatibleAgency()` helper. STSTAT records have no `holder` field — the entity reference is in `parsed.entity` (verified against `tools/validators/src/schemas/story-status.schema.json:11`, which declares the required field as `entity` not `holder`). The bug caused `holderHasCompatibleAgency()` to miss schema-valid compatible STSTAT records because `parsed.holder` is always undefined when reading STSTAT records. A STEMO declaring `agency_effect: constraining` for an entity whose STSTAT shows `agency: constrained` should pass via compatible active STSTAT evidence; the old test only passed because it used the non-schema `holder` field. SPEC-49 §B.1 fixes this with a one-field-name correction and a regression test that also rejects incompatible `agency: free`.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/structural/stemo-utils.ts:303` confirmed via codebase grep during reassess-spec session — reads `parsed.holder`. `tools/validators/src/schemas/story-status.schema.json:11` confirms STSTAT's entity-pointing field is named `entity`, not `holder`. There is no `holder` field on STSTAT records anywhere in the schema or the actual on-disk records.
2. SPEC-49 §Approach §B.1 (per the reassess-spec-updated spec) cites the audit report's Priority 0 must-do list item 3 *"Fix STEMO.agency_effect compatibility helper"*. The bug is named in the second-iteration deep-research audit at the report's Validator-Bug Audit section, claim 1 (BUG CONFIRMED at file:line).
3. Cross-skill boundary under audit: `stemo-agency-effect-compatibility` validator (which calls `holderHasCompatibleAgency()`) runs at engine pre-apply time when `create_stemo_record` is submitted. The validator's contract is "reject a STEMO whose `agency_effect` is incompatible with the holder's current `STSTAT.agency`". The contract has been silently violated since SPEC-47 landed; this ticket restores it.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: the validator's check is a Rule 1 enforcement — an emotion's `agency_effect` is a fact about the actor's current status, and the fact must be grounded in the actor's `STSTAT.agency`. A silent-pass bug means floating affect-status incompatibility goes uncaught; the fix closes the enforcement gap.
5. Canon Safety surface touched: `stemo-utils.ts` is a structural utility module under `tools/validators/src/structural/` that supports `stemo-agency-effect-compatibility` (and possibly other STEMO validators). The fix to the helper does not weaken the Mystery Reserve firewall — agency-status checking is orthogonal to mystery-resolution discipline. The fix RESTORES validator strength rather than weakening it.
6. Implementation proof corrected two stale ticket details: the live enum value is `agency_effect: constraining`, not `constrains`; and a whole-file `grep -n "parsed.holder" tools/validators/src/structural/stemo-utils.ts` is not a valid zero-hit proof because other STEMO helper branches legitimately read STEMO `holder` fields. The accepted grep proof is scoped to the `holderHasCompatibleAgency()` STSTAT scan and confirms that branch now reads `parsed.entity`.

## Architecture Check

1. One-character field-name correction is the minimal-blast-radius fix. Alternative approaches (introducing a STSTAT abstraction layer, refactoring the helper) would over-engineer a typo-shaped bug. The surrounding helper structure (querying STSTAT records by entity, checking against `COMPATIBLE_AGENCY` set) is correct; only the field name is wrong.
2. No backwards-compatibility aliasing introduced. No legacy STEMO records need migration — the validator was silently passing all of them; fixing the field name does not retroactively flag previously-valid records (those records may now legitimately fail if they violate the contract, which is the intended behavior).

## Verification Layers

1. Helper behavior: `holderHasCompatibleAgency(emotion, statsRecords)` returns true when the holder's STSTAT has a compatible agency status, false otherwise. Validator surface: unit test against the helper with controlled STSTAT + STEMO fixtures.
2. Validator dispatch: `stemo-agency-effect-compatibility` (the validator that consumes the helper) runs against `create_stemo_record` patch-plan ops. Validator surface: engine pre-apply gate, exercised via integration test fixture.
3. Codebase grep-proof: the `holderHasCompatibleAgency()` STSTAT branch reads `parsed.entity`; the remaining `parsed.holder` hits in `stemo-utils.ts` are legitimate STEMO holder reads outside this bug.

## What to Change

### 1. Fix the field name at `tools/validators/src/structural/stemo-utils.ts:303`

Change:
```typescript
if (stringValue(parsed.holder) === holder && COMPATIBLE_AGENCY.has(stringValue(parsed.agency) ?? "")) {
```
to:
```typescript
if (stringValue(parsed.entity) === holder && COMPATIBLE_AGENCY.has(stringValue(parsed.agency) ?? "")) {
```

The rest of the helper is unchanged.

## Files to Touch

- `tools/validators/src/structural/stemo-utils.ts` (modify — one line)
- `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` (modify — add a test fixture exercising the fix)

## Out of Scope

- Refactoring the `holderHasCompatibleAgency()` helper's broader structure — the surrounding logic is correct.
- Modifying the `COMPATIBLE_AGENCY` set's contents — the compatibility set is correct; only the field-name typo is fixed.
- Modifying other STEMO validators in `stemo-utils.ts` — only the one bug at line 303.
- Adding a STSTAT abstraction layer or a field-name guard helper — over-engineering for a one-character fix.

## Acceptance Criteria

### Tests That Must Pass

1. A STEMO with `agency_effect: constraining` for holder `STENT-1` where STENT-1 has an STSTAT with `agency: constrained` PASSES the `stemo_agency_effect_compatibility` validator.
2. The same STEMO where STENT-1's STSTAT has `agency: free` FAILS with the `stemo_agency_effect_compatibility.unexplained_constraining_effect` finding.
3. `grep -n "parsed.entity" tools/validators/src/structural/stemo-utils.ts` returns the corrected `holderHasCompatibleAgency()` branch.
4. Manual diff/grep review confirms no `parsed.holder` read remains in the STSTAT branch of `holderHasCompatibleAgency()`; whole-file `parsed.holder` hits are allowed for STEMO holder reads.
5. Existing STEMO validator test cases continue to pass without modification (no regression in other STEMO behavior).

### Invariants

1. STSTAT records are referenced by their `entity` field, never by a non-existent `holder` field, throughout `tools/validators/src/structural/`.
2. The `stemo_agency_effect_compatibility.unexplained_constraining_effect` finding fires deterministically when the holder's STSTAT agency status is incompatible with the STEMO's `agency_effect`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` — modified inline fixtures so the compatible STSTAT case uses schema-valid `entity`, and added an incompatible `agency: free` rejection case. No separate YAML fixtures were needed because the existing structural test harness already builds the controlled records inline.

### Commands

1. `npm test` from `tools/validators` (full validator suite)
2. Targeted: `npm run build` from `tools/validators` and `node --test dist/tests/structural/stemo-agency-effect-compatibility.test.js`
3. Grep-proof for the fix: `grep -n "parsed.entity" tools/validators/src/structural/stemo-utils.ts` returns the corrected branch; `grep -n "parsed.holder" tools/validators/src/structural/stemo-utils.ts` is reviewed as a broad discovery command, not a zero-hit acceptance gate, because legitimate STEMO holder reads remain.

## Outcome

Completed: 2026-05-19

What changed:
- `tools/validators/src/structural/stemo-utils.ts` now matches STSTAT records by `parsed.entity` inside `holderHasCompatibleAgency()`.
- `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` now uses schema-valid STSTAT `entity` fixtures and includes a new incompatible `agency: free` rejection case.

Deviations from original plan:
- No YAML fixture files were added; the existing inline structural test harness was the narrower proof surface.
- The original whole-file `parsed.holder` negative grep was too broad because the same utility file legitimately reads STEMO `holder` fields elsewhere. The accepted proof is scoped to the STSTAT compatibility branch plus the focused and full validator suites.

Verification results:
- `npm run build` from `tools/validators` — passed.
- `node --test dist/tests/structural/stemo-agency-effect-compatibility.test.js` from `tools/validators` — passed, 4 tests.
- `npm test` from `tools/validators` — passed, 632 tests.
- `grep -n "parsed.entity" tools/validators/src/structural/stemo-utils.ts` — confirmed the corrected compatibility branch.
