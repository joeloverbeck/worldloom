# PEENH-015: centralize patch-engine story-bundle id classifiers

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/ops/create-story-record.ts`, `tools/patch-engine/src/ops/shared.ts`, `tools/patch-engine/src/ops/update-record-field.ts`, `tools/patch-engine/src/commit/temp-file.ts`, and focused patch-engine tests.
**Deps**: `archive/tickets/PEENH-014.md`

## Problem

PEENH-014 fixed the immediate class-set drift by widening two patch-engine regexes, but the underlying drift risk remains: the same story-bundle class set is still hand-enumerated in three places:

1. `tools/patch-engine/src/ops/shared.ts` — `BARE_STORY_BUNDLE_ID_PATTERN` gates bare-id existing-record fallback.
2. `tools/patch-engine/src/ops/update-record-field.ts` — `isStoryBundleRecordId` decides whether structural retcons require `originating_se`.
3. `tools/patch-engine/src/commit/temp-file.ts` — `STORY_BUNDLE_ID_PATTERN` classifies target-record metadata.

`tools/patch-engine/src/ops/create-story-record.ts` already has the structured `STORY_RECORD_SPECS` registry with each story-record `prefix`, `nodeType`, and `sourceDir`. The three hand-rolled regexes should derive their prefix recognition from that registry or a shared helper built from it, so future story-bundle classes cannot silently update one classifier while missing another.

## Assumption Reassessment (2026-05-20)

1. Live code after PEENH-014 shows the three classifiers enumerate the same class set, but they remain independent string literals in `shared.ts`, `update-record-field.ts`, and `temp-file.ts`.
2. `create-story-record.ts` exports `STORY_RECORD_SPECS`, and the registry already carries the per-operation `prefix` values for the patch-engine story-bundle write path, including create and supersede operation variants.
3. Shared boundary under audit: patch-engine story-bundle record classification across existing-record lookup, retcon-attestation classification, and target-record metadata classification. The desired invariant is one canonical story-bundle prefix authority feeding all three call sites.
4. FOUNDATIONS / HARD-GATE alignment: these classifiers support engine-routed story-bundle `_source/` writes and retcon discipline. The refactor must preserve approval-token behavior, write ordering, and story-event attestation requirements; it must not broaden accepted non-story ids.
5. This is a follow-up cleanup, not a PEENH-014 blocker. PEENH-014 already restored behavior and regression coverage; this ticket removes the duplication pattern that caused that defect class.

## Architecture Check

1. A shared helper derived from `STORY_RECORD_SPECS` is cleaner than keeping three regex literals aligned manually because new story-bundle classes already enter the engine through that registry.
2. No backwards-compatibility aliasing or alternate spellings should be introduced. The accepted id shapes remain the same bare `PREFIX-<n>` and namespaced `<story-slug>:PREFIX-<n>` forms currently accepted by the three classifiers.

## Verification Layers

1. Classifier single-source invariant -> codebase grep-proof: no independent hard-coded story-bundle class alternation remains in `shared.ts`, `update-record-field.ts`, or `temp-file.ts`.
2. Existing-record lookup behavior -> focused `update-record-field` unit tests still prove bare `PG` and `STPLAN` ids resolve scoped indexed rows.
3. Retcon attestation behavior -> focused `update-record-field` unit tests still prove story-bundle structural retcons require `originating_se`, while world-canon retcons reject `originating_se`.
4. Target metadata behavior -> patch-engine package suite covers create/update/submit metadata paths after the helper refactor.

## What to Change

### 1. Shared prefix authority

Introduce a small patch-engine helper or export, derived from `STORY_RECORD_SPECS`, for story-bundle prefix matching. It should support both bare-id and optional story-slug-prefixed forms without widening accepted id syntax.

### 2. Replace duplicate classifiers

Update `shared.ts`, `update-record-field.ts`, and `temp-file.ts` to use the shared prefix helper instead of maintaining separate class alternation regexes.

### 3. Preserve coverage

Keep the PEENH-014 regression coverage and add or adjust focused tests only where needed to prove the helper covers the three call sites.

## Files to Touch

- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/ops/shared.ts` (modify)
- `tools/patch-engine/src/ops/update-record-field.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (modify if needed)
- `tools/patch-engine/tests/commit/temp-file.test.ts` or adjacent existing commit/integration tests (modify if needed)

## Out of Scope

- Adding new story-bundle record classes.
- Changing operation semantics, approval-token discipline, write ordering, or retcon-attestation requirements.
- Changing world-mcp or validator package behavior.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build && node --test dist/tests/ops/update-record-field.test.js`
2. A focused commit/temp-file or package-existing test proves namespaced story-bundle target metadata still resolves after the refactor.
3. `cd tools/patch-engine && npm test`

### Invariants

1. Story-bundle prefix membership is defined once from `STORY_RECORD_SPECS` or an equivalent single patch-engine registry.
2. Bare-id and namespaced story-bundle id acceptance is unchanged from PEENH-014.
3. `update_record_field` still uses `originating_se` for story-bundle structural retcons and `originating_ch` for world-canon retcons.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/update-record-field.test.ts` — preserve or extend the PEENH-014 bare STPLAN regression across the new helper.
2. `tools/patch-engine/tests/commit/temp-file.test.ts` or adjacent existing commit/integration test — add focused coverage only if existing metadata tests do not already exercise the shared helper.

### Commands

1. `cd tools/patch-engine && npm run build && node --test dist/tests/ops/update-record-field.test.js`
2. `cd tools/patch-engine && npm test`
