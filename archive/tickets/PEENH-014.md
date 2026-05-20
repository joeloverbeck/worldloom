# PEENH-014: audit patch-engine BARE_STORY_BUNDLE_ID_PATTERN — STPLAN/STEMO (and BEL/STSTAT) absent from the bare→scoped existing-record fallback

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/ops/shared.ts`, `tools/patch-engine/src/ops/update-record-field.ts`, and `tools/patch-engine/tests/ops/update-record-field.test.ts`.
**Deps**: None.

## Problem

At intake, `BARE_STORY_BUNDLE_ID_PATTERN` in `tools/patch-engine/src/ops/shared.ts` enumerated `PG|SE|SF|OBL|CNSQ|THR|SREL|STINT|SLT|STLOC|STOBJ|BR|CHC|STENT|DA|CLK|STSEC|STQ` — it **omitted STPLAN/STEMO** (SPEC-47) **and** BEL/STSTAT. It gates the second branch of `findExistingRecordRow`: the function first attempts an exact `node_id` match, and only if that misses does it fall back to a `story_slug`-scoped `LIKE` lookup, which was skipped for any id not matching the pattern. So for a bare (un-scoped) `STPLAN-<n>` / `STEMO-<n>` / `BEL-<n>` / `STSTAT-<n>` id, the scoped fallback never ran and `findExistingRecordRow` returned `undefined`.

By contrast, `tools/patch-engine/src/commit/temp-file.ts` already enumerated the full story-bundle class set including STPLAN/STEMO/BEL/STSTAT, so the two patterns disagreed. The live trace confirmed existing-record resolution can receive bare ids through `update_record_field`, so this ticket aligns the existing-record fallback with the full story-bundle class set and preserves story-event retcon attestation for the newly resolved classes.

## Assumption Reassessment (2026-05-20)

1. Confirmed at HEAD before implementation: `findExistingRecordRow` (`ops/shared.ts`) is called by `loadExistingRecord`; `loadExistingRecord` is used by `update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`, and `remove_ch_affected_cf_ids`. Its exact-`node_id` query runs first, and `BARE_STORY_BUNDLE_ID_PATTERN` only gates the scoped `LIKE` fallback. `temp-file.ts` carries the full class set incl STPLAN/STEMO/BEL/STSTAT. **Change attribution (no-silent-retcons):** the fallback is reachable for bare ids through existing-record ops, especially `update_record_field`; pre-ticket behavior — bare-id existing-record lookups for STPLAN/STEMO/BEL/STSTAT returned `undefined`; completed behavior — the pattern is widened to the `temp-file.ts` story-bundle set so bare→scoped resolution succeeds.
2. No user-facing or contract doc governs this internal helper; no doc edit is expected.
3. Shared boundary under audit: the patch-engine's existing-record id resolution (`ops/shared.ts` `BARE_STORY_BUNDLE_ID_PATTERN`) versus the canonical story-bundle class set already enumerated in `commit/temp-file.ts`. The completed ticket reconciles them.
4. This touches a patch-engine canon-write path (`tools/patch-engine/src/ops/shared.ts`). The change is read-only id-recognition widening — it does not alter write ordering, approval-token discipline, or the Mystery Reserve firewall, and it cannot cause a write that the engine would otherwise reject (it only affects whether an *existing* record is found before a supersession/collision decision). Review confirmed that no supersession or collision check is weakened.
5. Same-seam consequence: `update-record-field.ts` uses a separate `isStoryBundleRecordId` prefix classifier to decide whether structural retcons require `originating_se` instead of `originating_ch`. It currently omits the same newer story-bundle classes (and several supersedable story classes), so widening bare-id resolution without widening this classifier would make newly resolved STPLAN/STEMO/STSTAT structural repairs use the wrong world-canon attestation branch.

## Architecture Check

1. Align `BARE_STORY_BUNDLE_ID_PATTERN` and `update-record-field.ts`'s story-bundle retcon classifier to the full story-bundle class set already present at `commit/temp-file.ts`, rather than adding STPLAN/STEMO alone — this also closes the latent BEL/STSTAT omission in one move. Cleaner than maintaining divergent class enumerations in the same package.
2. No backwards-compatibility shims: the existing patterns are widened in place.

## Verification Layers

1. Fallback reachability for STPLAN/STEMO/BEL/STSTAT → codebase trace of `findExistingRecordRow` callers (`ops/shared.ts:217`): existing-record ops can pass bare ids for these classes through `update_record_field`.
2. Bare-id resolution → unit test (`tools/patch-engine/tests/ops/update-record-field.test.ts`): an existing scoped STPLAN record updated by bare id resolves the row.
3. Story retcon classification → unit test (`tools/patch-engine/tests/ops/update-record-field.test.ts`): the same STPLAN structural repair accepts `originating_se`, preserving story-bundle attestation semantics after the resolution fix.

## Landed Changes

1. Traced `findExistingRecordRow` callers and confirmed existing-record ops can pass bare ids for STPLAN/STEMO/BEL/STSTAT.
2. `tools/patch-engine/src/ops/shared.ts` — widened `BARE_STORY_BUNDLE_ID_PATTERN` to the full story-bundle set already used by `commit/temp-file.ts`.
3. `tools/patch-engine/src/ops/update-record-field.ts` — widened the story-bundle retcon classifier to the same bare-id story-bundle set.
4. `tools/patch-engine/tests/ops/update-record-field.test.ts` — added a bare STPLAN update regression that proves both scoped-row resolution and `originating_se` attestation semantics.

## Files to Touch

- `tools/patch-engine/src/ops/shared.ts` (modify)
- `tools/patch-engine/src/ops/update-record-field.ts` (modify — same-seam retcon classifier)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (modify)

## Out of Scope

- Any change to `temp-file.ts` (already correct; it is the reference set).
- Supersession op semantics, approval-token discipline, or write ordering.

## Acceptance Criteria

- **Tests that must pass**: a new bare-id existing-record-resolution test for STPLAN passes, including `originating_se` story-bundle attestation semantics; the existing `tools/patch-engine` suite stays green.
- **Invariants**: no supersession or collision-detection behavior is weakened; `BARE_STORY_BUNDLE_ID_PATTERN` and `commit/temp-file.ts` enumerate a consistent class set.

## Test Plan

- **New/modified tests**: add a bare-id STPLAN existing-record-resolution case in `tools/patch-engine/tests/ops/update-record-field.test.ts`.
- **Commands**:
  - `cd tools/patch-engine && npm test`
  - Targeted: `cd tools/patch-engine && npm run build && node --test dist/tests/ops/update-record-field.test.js`

## Outcome

Completed. Bare story-bundle existing-record resolution now recognizes the full story-bundle class set already used by the patch-engine temp-file metadata path, including STSTAT, BEL, STPLAN, and STEMO. The matching `update_record_field` story-bundle retcon classifier now uses the same class set, so structural repairs to those story records require `originating_se` rather than world-canon `originating_ch`.

## Verification Result

1. Pre-edit baseline: `cd tools/patch-engine && npm test` passed (85 tests).
2. Targeted proof: `cd tools/patch-engine && npm run build && node --test dist/tests/ops/update-record-field.test.js` passed (10 tests), including `update_record_field resolves bare STPLAN ids and treats them as story-bundle retcons`.
3. Final package proof: `cd tools/patch-engine && npm test` passed (86 tests).
4. Package README/manual surface review: `tools/patch-engine/README.md` describes the operation vocabulary and write path but does not enumerate the internal bare-id fallback prefix set, so no README edit was needed.

## Deviations

The drafted test surface named `tools/patch-engine/tests/ops/create-story-record.test.ts`, but live reassessment showed the fallback is exercised by existing-record ops through `loadExistingRecord`, not by create-story staging. The landed regression belongs in `tools/patch-engine/tests/ops/update-record-field.test.ts`.
