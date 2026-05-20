# PEENH-015: centralize patch-engine story-bundle id classifiers

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/ops/story-record-specs.ts`, `tools/patch-engine/src/ops/create-story-record.ts`, `tools/patch-engine/src/ops/shared.ts`, `tools/patch-engine/src/ops/update-record-field.ts`, `tools/patch-engine/src/commit/temp-file.ts`, and focused patch-engine tests.
**Deps**: `archive/tickets/PEENH-014.md`

## Problem

At intake, PEENH-014 had fixed the immediate class-set drift by widening two patch-engine regexes, but the underlying drift risk remained: the same story-bundle class set was still hand-enumerated in three places:

1. `tools/patch-engine/src/ops/shared.ts` — `BARE_STORY_BUNDLE_ID_PATTERN` gates bare-id existing-record fallback.
2. `tools/patch-engine/src/ops/update-record-field.ts` — `isStoryBundleRecordId` decides whether structural retcons require `originating_se`.
3. `tools/patch-engine/src/commit/temp-file.ts` — `STORY_BUNDLE_ID_PATTERN` classifies target-record metadata.

`tools/patch-engine/src/ops/create-story-record.ts` had the structured `STORY_RECORD_SPECS` registry with each story-record `prefix`, `nodeType`, and `sourceDir`. This ticket moved that registry to an acyclic helper module and made the three classifiers derive prefix recognition from it, so future story-bundle classes cannot silently update one classifier while missing another.

## Assumption Reassessment (2026-05-20)

1. Live code after PEENH-014 showed the three classifiers enumerated the same class set, but they remained independent string literals in `shared.ts`, `update-record-field.ts`, and `temp-file.ts`.
2. The live `STORY_RECORD_SPECS` registry carried the per-operation `prefix` values for the patch-engine story-bundle write path, including create and supersede operation variants. The landed implementation moved that registry to `ops/story-record-specs.ts` so `shared.ts`, `update-record-field.ts`, `temp-file.ts`, and `create-story-record.ts` can share it without an import cycle.
3. Shared boundary under audit: patch-engine story-bundle record classification across existing-record lookup, retcon-attestation classification, and target-record metadata classification. The landed invariant is one canonical story-bundle prefix authority feeding all three call sites.
4. FOUNDATIONS / HARD-GATE alignment: these classifiers support engine-routed story-bundle `_source/` writes and retcon discipline. The refactor preserves approval-token behavior and write ordering. It also preserves story-event attestation requirements for bare ids and makes already loadable namespaced story-bundle ids follow the same story-event attestation branch.
5. This was a follow-up cleanup, not a PEENH-014 blocker. PEENH-014 already restored behavior and regression coverage; this ticket removes the duplication pattern that caused that defect class.
6. Package proof baseline before source edits: `cd tools/patch-engine && npm test` passed (86 tests).

## Architecture Check

1. A shared helper derived from `STORY_RECORD_SPECS` is cleaner than keeping three regex literals aligned manually because new story-bundle classes already enter the engine through that registry.
2. No backwards-compatibility aliasing or alternate spellings were introduced. The accepted id shapes remain the same bare `PREFIX-<n>` and namespaced `<story-slug>:PREFIX-<n>` forms currently accepted by the three classifiers.

## Verification Layers

1. Classifier single-source invariant -> codebase grep-proof: no independent hard-coded story-bundle class alternation remains in `shared.ts`, `update-record-field.ts`, or `temp-file.ts`.
2. Existing-record lookup behavior -> focused `update-record-field` unit tests still prove bare `PG` and `STPLAN` ids resolve scoped indexed rows.
3. Retcon attestation behavior -> focused `update-record-field` unit tests still prove story-bundle structural retcons require `originating_se`, while world-canon retcons reject `originating_se`.
4. Target metadata behavior -> patch-engine package suite covers create/update/submit metadata paths after the helper refactor.

## Landed Changes

### 1. Shared prefix authority

Introduced `tools/patch-engine/src/ops/story-record-specs.ts` as the story-bundle prefix and operation-registry authority. It keeps `STORY_RECORD_SPECS` as the source of truth, supports both bare-id and optional story-slug-prefixed forms, and avoids an import cycle between `ops/shared.ts` and `ops/create-story-record.ts`.

### 2. Replace duplicate classifiers

Updated `shared.ts`, `update-record-field.ts`, and `temp-file.ts` to use shared prefix helpers instead of maintaining separate class alternation regexes. The existing-record fallback keeps bare-id matching, while retcon attestation and staged-record metadata use the bare-or-namespaced parser.

### 3. Preserve coverage

Kept the PEENH-014 regression coverage and added focused namespaced story-bundle tests for retcon classification and staged metadata chaining.

## Files to Touch

- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/ops/story-record-specs.ts` (new)
- `tools/patch-engine/src/ops/shared.ts` (modify)
- `tools/patch-engine/src/ops/update-record-field.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (modify)

## Out of Scope

- Adding new story-bundle record classes.
- Changing operation semantics, approval-token discipline, write ordering, or retcon-attestation requirements.
- Changing world-mcp or validator package behavior.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build && node --test dist/tests/ops/update-record-field.test.js`
2. `cd tools/patch-engine && npm test`

### Invariants

1. Story-bundle prefix membership is defined once from `STORY_RECORD_SPECS` or an equivalent single patch-engine registry.
2. Bare-id and namespaced story-bundle id acceptance is unchanged from PEENH-014.
3. `update_record_field` still uses `originating_se` for story-bundle structural retcons and `originating_ch` for world-canon retcons.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/update-record-field.test.ts` — preserve or extend the PEENH-014 bare STPLAN regression across the new helper.
2. `tools/patch-engine/tests/ops/update-record-field.test.ts` — add namespaced story-bundle retcon and `stageAllOps` metadata chaining coverage.

### Commands

1. `cd tools/patch-engine && npm run build && node --test dist/tests/ops/update-record-field.test.js`
2. `cd tools/patch-engine && npm test`

## Outcome

Completed. Story-bundle prefix membership now lives in `tools/patch-engine/src/ops/story-record-specs.ts` alongside `STORY_RECORD_SPECS`. `ops/shared.ts`, `ops/update-record-field.ts`, and `commit/temp-file.ts` consume that shared authority instead of carrying separate class alternation regexes. Bare-id existing-record fallback remains bare-only, while retcon classification and staged-record metadata support the already accepted namespaced story-bundle id shape.

## Verification Result

1. Pre-edit baseline: `cd tools/patch-engine && npm test` passed (86 tests).
2. Targeted proof: `cd tools/patch-engine && npm run build && node --test dist/tests/ops/update-record-field.test.js` passed (12 tests).
3. Final package proof: `cd tools/patch-engine && npm test` passed (88 tests).
4. Stale classifier sweep: `rg -n "BARE_STORY_BUNDLE_ID_PATTERN|STORY_BUNDLE_ID_PATTERN|PG\\|SE\\|SF\\|OBL\\|CNSQ|STPLAN\\|STEMO" tools/patch-engine/src/ops/shared.ts tools/patch-engine/src/ops/update-record-field.ts tools/patch-engine/src/commit/temp-file.ts tools/patch-engine/src/ops/create-story-record.ts tools/patch-engine/src/ops/story-record-specs.ts` returned no matches.
5. Package README/manual surface review: `tools/patch-engine/README.md` describes operation vocabulary and write path but does not enumerate this internal prefix classifier set, so no README edit was needed.

## Deviations

The drafted file list allowed a new or adjacent commit/temp-file test. The landed coverage stays in `tools/patch-engine/tests/ops/update-record-field.test.ts` because that file already exercises `stageAllOps`; the new `stageAllOps preserves staged metadata for namespaced story-bundle updates` test proves the `commit/temp-file.ts` metadata helper path without creating a separate test file.
