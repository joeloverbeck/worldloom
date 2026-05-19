# SPEC49STPSTEINT-008: Strengthen stemo-orientation-records-exist validator with active+accessibility checks + BEL imagined-object carve-out

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stemo-orientation-records-exist.ts` (modify), `tools/validators/src/structural/stemo-utils.ts` (modify — add helper), `tools/validators/tests/structural/stemo-orientation-records-exist.test.ts` (modify), `tools/validators/tests/structural/stemo-helpers.ts` (modify)
**Deps**: None

## Problem

`tools/validators/src/structural/stemo-orientation-records-exist.ts` (the filename itself reveals existence-only scope) verifies that each ID in `STEMO.orientation.toward_records[]` resolves to a record but does not check whether that record is active at the emotion's `created_at_page` or accessible to the holder. SPEC-49 §B.6 (audit-identified surgical-hole gap) closes this by extending the validator with two new checks paralleling `stplan-belief-basis-grounded.ts`'s `isActiveAtPlanPage` + `isRecordAccessibleToHolder` discipline. The audit-identified carve-out: orientations toward a BEL record with `truth_relation: false` (the believed-but-false case — orientation toward an object the holder believes exists but does not exist on the branch) waive the active-at-page check because imagined objects need not exist on the branch as active STENT/STOBJ/etc.; the accessibility check still applies because the holder must have access to the BEL itself.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/structural/stemo-orientation-records-exist.ts` confirmed via codebase grep during reassess-spec session — the filename signals existence-only scope. The helper `orientationRecordIds()` at `tools/validators/src/structural/stemo-utils.ts:161-162` extracts IDs but no active-status or accessibility check is paired. The pattern `isActiveAtPlanPage` + `isRecordAccessibleToHolder` at `stplan-utils.ts` (used by `stplan-belief-basis-grounded.ts`) is the template for the new STEMO orientation checks.
2. SPEC-49 §Approach §B.6 (added by reassessment per the reassess-spec session's M2 finding) cites the audit report's deterministic-validator strengthening list item 11: *"STEMO.orientation.toward_records[] should require active/access-valid targets where appropriate; allow inaccessible only when orientation is toward a known false/imagined object through BEL."* The carve-out rule is named in the audit's wording — orientation toward a BEL with `truth_relation: false` is the imagined-object case.
3. Cross-skill boundary under audit: `stemo-orientation-records-exist` is a structural validator that runs at engine pre-apply time when `create_stemo_record` is submitted. The validator gates story-bundle record writes. Extending its coverage to active-status + accessibility preserves the same enforcement strength as the existing STPLAN belief-basis checks. The BEL `truth_relation` enum is shared with `branching-story-bootstrap` (BEL emission) and `branching-story-turn-cycle` (BEL supersession); the carve-out doesn't modify the enum, only consults it.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: a STEMO oriented toward a target that's inactive at the emotion's page (or inaccessible to the holder, modulo the imagined-object carve-out) is a floating fact — the affective claim is unmoored from the holder's actual epistemic + branch state. Extending the validator closes the Rule 1 enforcement gap. SPEC-49 §FOUNDATIONS Alignment confirms this Rule 1 alignment.
5. Canon Safety surface touched: both `stemo-orientation-records-exist.ts` (the modified validator) and `stemo-utils.ts` (the added helper) are under `tools/validators/src/structural/`. The validator gates story-bundle record writes; the strengthening does not weaken the Mystery Reserve firewall (orientation toward Mystery Reserve entries is allowed through the imagined-object carve-out when the holder believes the MR entry is true).

## Architecture Check

1. Extending the existing validator with active+accessibility checks (paralleling `stplan-belief-basis-grounded.ts`'s discipline) is the minimal-blast-radius approach. Alternative (introducing a separate `stemo-orientation-target-active.ts` validator) would multiply the validator-registry surface without semantic gain. The single-validator-per-target shape is the canonical pattern.
2. No backwards-compatibility aliasing introduced. Reassessment closeout correction (2026-05-19): the live repo has no deterministic SPEC-49 revision marker for classifying legacy STEMO orientation entries at this validator boundary, so this ticket lands the active/accessibility checks fail-closed in the structural validator path rather than adding a speculative WARN-mode branch. Legacy bundle triage remains a health-audit/migration concern.
3. The new helper `isOrientationTargetAccessibleToHolder()` at `stemo-utils.ts` parallels `isRecordAccessibleToHolder` at `stplan-utils.ts` for the holder-accessibility half of the check. The BEL imagined-object carve-out lives at the validator call site: when target is a BEL with `truth_relation: false`, active-at-page checking is waived while accessibility to the BEL itself still applies.
4. Shared file `tools/validators/src/structural/stemo-utils.ts` is also modified by ticket 004 (B.1 STEMO agency_effect bug fix); the two tickets touch different functions (004 fixes `holderHasCompatibleAgency` at line 303; this ticket adds `isOrientationTargetAccessibleToHolder` as a new function). Mechanical merge expected; no semantic overlap.

## Verification Layers

1. Active-at-page check: each target ID resolves to a record active at the STEMO's `created_at_page`. Validator surface: unit tests against fixtures with active + inactive targets.
2. Accessibility check: each target is accessible to the holder per the accessibility predicate. Validator surface: unit tests against fixtures with accessible + inaccessible targets.
3. Imagined-object carve-out: orientation toward a BEL with `truth_relation: false` PASSES the active-at-page check (the BEL is the target, not the imagined object behind it; the carve-out waives the active-status check on the imagined object), provided the BEL itself is accessible to the holder. Validator surface: integration test fixture for the carve-out.

## What to Change

### 1. Extend `tools/validators/src/structural/stemo-orientation-records-exist.ts` with two new checks

Restructure the validator's main loop to (in addition to the existing existence check):

- **Active-at-page check**: each target ID must resolve to a record active at the STEMO's `created_at_page`. Use the existing `isActiveAtPlanPage` pattern from `stplan-utils.ts` adapted for STEMO. Emit `stemo_orientation_records_active.inactive_target` for inactive references.
- **Accessibility-to-holder check**: each target must be accessible to the holder via the same accessibility predicate `stplan-belief-basis-grounded.ts` uses. Emit `stemo_orientation_records_active.inaccessible_target` for inaccessible references.

The existing existence-check finding code (e.g., `stemo_orientation_records_exist.missing_target`) is preserved for backward compatibility; the new finding codes use the `_active` suffix to distinguish active-status / accessibility violations from existence violations.

### 2. Add `isOrientationTargetAccessibleToHolder()` helper to `tools/validators/src/structural/stemo-utils.ts`

Parallel to `stplan-utils.ts`'s `isRecordAccessibleToHolder`; the validator call site applies the BEL imagined-object carve-out after resolving active status:

```typescript
export function isOrientationTargetAccessibleToHolder(
  target: IndexedRecord,
  holder: string | undefined
): boolean {
  return holder !== undefined && isRecordAccessibleToHolder(target, holder);
}
```

The helper composes existing primitives where possible. The active-at-page check and BEL false carve-out stay in `stemo-orientation-records-exist.ts` so the validator can emit distinct `inactive_target` and `inaccessible_target` findings.

### 3. Fail-closed structural enforcement

The live validator path now emits fail verdicts for inactive and inaccessible `orientation.toward_records[]` targets. No WARN-mode legacy branch was added because the current validator context does not expose a deterministic SPEC-49 revision marker for this boundary.

## Files to Touch

- `tools/validators/src/structural/stemo-orientation-records-exist.ts` (modify)
- `tools/validators/src/structural/stemo-utils.ts` (modify — add helper; shared with ticket 004, different function)
- `tools/validators/tests/structural/stemo-orientation-records-exist.test.ts` (modify)
- `tools/validators/tests/structural/stemo-helpers.ts` (modify — default orientation target remains valid under the stronger accessibility check)

## Out of Scope

- Modifying the existing existence check at the top of the validator — preserved unchanged.
- Modifying STEMO's `appraisal_basis` validator (`stemo-appraisal-basis-accessible-to-holder.ts`) — that's a separate concern.
- Extending the BEL imagined-object carve-out to any orientation target other than BEL — the carve-out applies only to BEL records with `truth_relation: false`.
- Adding orientation-target validation to any STEMO field other than `orientation.toward_records[]`.

## Acceptance Criteria

### Tests That Must Pass

1. A STEMO with `orientation.toward_records: [STENT-1]` where STENT-1 is active at the emotion's `created_at_page` AND accessible to the holder PASSES the validator.
2. A STEMO with `orientation.toward_records: [STENT-1]` where STENT-1 is inactive at the emotion's `created_at_page` FAILS with `stemo_orientation_records_active.inactive_target`.
3. A STEMO with `orientation.toward_records: [STENT-1]` where STENT-1 is active BUT inaccessible to the holder FAILS with `stemo_orientation_records_active.inaccessible_target`.
4. A STEMO with `orientation.toward_records: [BEL-5]` where BEL-5 has `truth_relation: false` (imagined-object case) AND is accessible to the holder PASSES, even when the imagined object's existence on the branch cannot be verified.
5. A STEMO with `orientation.toward_records: [BEL-5]` where BEL-5 has `truth_relation: false` but is INACCESSIBLE to the holder FAILS with `stemo_orientation_records_active.inaccessible_target` (the carve-out waives active-status check but not accessibility check on the BEL).
6. A STEMO with `orientation.toward_records: [INVALID-1]` continues to FAIL with the existing existence check (`stemo_orientation_records_exist.missing_orientation_record`); the existence check is preserved unchanged.
7. The focused structural validator path remains fail-closed for inactive and inaccessible targets; legacy WARN classification is intentionally not implemented in this ticket because the required SPEC-49 revision marker is absent.

### Invariants

1. Every active orientation target on a STEMO record is either (a) active at the emotion's `created_at_page` and accessible to the holder, OR (b) a BEL with `truth_relation: false` and the BEL is accessible to the holder (imagined-object carve-out).
2. The existing existence-check finding code (`stemo_orientation_records_exist.missing_orientation_record`) is preserved alongside the new `stemo_orientation_records_active.*` codes — the existence dimension and the active+accessibility dimension are independent checks.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stemo-orientation-records-exist.test.ts` — modified with inline fixture records for six cases: known target PASS, missing target FAIL, inactive target FAIL, inaccessible target FAIL, accessible BEL false imagined-object PASS, and inaccessible BEL false imagined-object FAIL. Existing existence-check coverage was preserved.
2. `tools/validators/tests/structural/stemo-helpers.ts` — modified the default orientation target to be holder-accessible so the representative STEMO fixture remains valid after the stronger validator lands.

### Commands

1. `npm test --prefix tools/validators` (full validator suite)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/structural/stemo-orientation-records-exist.test.js`
3. Helper-uniqueness grep: `grep -n "isOrientationTargetAccessibleToHolder" tools/validators/src/structural/stemo-utils.ts` should return at least 1 match (the new helper export); `grep -n "isOrientationTargetAccessibleToHolder" tools/validators/src/structural/stemo-orientation-records-exist.ts` should return at least 1 match (the validator's call site).

## Outcome

Completed: 2026-05-19.

What changed:
- `tools/validators/src/structural/stemo-orientation-records-exist.ts` now preserves the missing-record check and additionally emits `stemo_orientation_records_active.inactive_target` when an orientation target is absent from the STEMO page's active-record snapshot, unless the target is a false BEL imagined-object case.
- The same validator emits `stemo_orientation_records_active.inaccessible_target` when an orientation target is not accessible to the STEMO holder. The BEL false carve-out waives only active-status checking; accessibility to the BEL itself remains required.
- `tools/validators/src/structural/stemo-utils.ts` now exports `isOrientationTargetAccessibleToHolder()` and aligns STEMO accessibility with the STPLAN helper's public fact/location treatment.
- `tools/validators/tests/structural/stemo-orientation-records-exist.test.ts` covers known, missing, inactive, inaccessible, BEL false pass, and BEL false inaccessible-fail cases with inline records.

Deviations from original plan:
- The drafted YAML fixture files were not added. The existing structural test style for this seam uses inline `IndexedRecord` helpers, and that produced a smaller, direct proof surface.
- The drafted WARN-mode legacy-marker case was not implemented. The live repo does not expose a deterministic SPEC-49 revision marker to classify legacy STEMO orientation targets at this validator boundary, so the structural validator remains fail-closed. Migration triage remains outside this ticket.

Verification:
- `npm run build --prefix tools/validators` — passed.
- `node --test tools/validators/dist/tests/structural/stemo-orientation-records-exist.test.js` — passed, 6 tests.
- `npm test --prefix tools/validators` — passed, 659 tests.
