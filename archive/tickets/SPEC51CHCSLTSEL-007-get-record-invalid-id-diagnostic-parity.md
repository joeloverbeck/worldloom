# SPEC51CHCSLTSEL-007: truth get_record STPLAN/STEMO id support and diagnostic

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — add the missing `STPLAN` / `STEMO` story-bundle id prefixes to `tools/world-mcp/src/tools/_shared.ts`, truth the invalid-id diagnostic in `tools/world-mcp/src/tools/get-record.ts`, and add focused `get_record` proof.
**Deps**: `archive/tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md`

## Problem

`archive/tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md` truthed the repo-level and package-level machine-facing prose for STPLAN/STEMO retrieval. Reassessment found the adjacent live `get_record` contract was still incomplete: `tools/world-mcp/src/tools/_shared.ts` includes `story_plan_record` and `story_emotion_record` node types, docs and fixtures advertise `STPLAN` / `STEMO` story-bundle ids, but `STORY_BUNDLE_ID_PREFIXES` still omits both id prefixes.

That means `get_record` rejects `STPLAN-<integer>` and `STEMO-<integer>` at id-shape validation before it can perform the documented story-scoped lookup. Its `invalid_input.details.expected` help text also preserves the same stale prefix list.

## Assumption Reassessment (2026-05-20)

1. Live code check: `tools/world-mcp/src/tools/get-record.ts` `validateRecordId()` delegates story-bundle id acceptance to `isStoryBundleRecordId(recordId)`, so missing prefixes in `STORY_BUNDLE_ID_PREFIXES` are behavior-affecting, not diagnostic-only.
2. Live code check: `tools/world-mcp/src/tools/_shared.ts` includes `story_plan_record` and `story_emotion_record` in `STORY_BUNDLE_NODE_TYPES`, but does not include `STPLAN` or `STEMO` in `STORY_BUNDLE_ID_PREFIXES`; a pre-edit built-artifact probe returned `false` for both `isStoryBundleRecordId("STPLAN-1")` and `isStoryBundleRecordId("STEMO-1")`.
3. Shared boundary under audit: `get_record` operator-facing diagnostics should describe the same bundle-scoped id classes advertised by `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` after ticket 006.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation / Index + Targeted Retrieval. Error recovery text should route operators to lawful targeted retrieval rather than presenting a stale id-class list.
5. Adjacent contradiction classification: same-seam live parser/diagnostic drift exposed during post-ticket review, not unfinished ticket-006 work. Ticket 006 owned docs and capability-description prose; this ticket owns the remaining `get_record` id-prefix acceptance, invalid-id diagnostic string, and focused handler proof.
6. Baseline: from `tools/world-mcp`, `npm run build` passed before source edits; the failing seam is the direct prefix probe, not package compile state.

## Architecture Check

1. Adding the two missing prefixes to the shared story-bundle id vocabulary aligns `get_record` with the already-indexed STPLAN/STEMO node types, docs, fixtures, and allocation support without adding aliases or changing record storage.
2. Truthing the diagnostic string keeps operator recovery text aligned with the live parser.
3. No backwards-compatibility aliasing/shims introduced; this completes the documented canonical id classes.

## Verification Layers

1. `isStoryBundleRecordId()` accepts `STPLAN` and `STEMO` as story-bundle id prefixes -> focused handler test in `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts`.
2. `validateRecordId()` invalid-id diagnostic names `STPLAN` and `STEMO` in the story-bundle id example list -> grep/manual review against `tools/world-mcp/src/tools/get-record.ts`.
3. Type/build output stays coherent -> `npm run build` from `tools/world-mcp`.
4. Built artifact freshness for deployed local CLI/server code -> grep/manual review against `tools/world-mcp/dist/src/tools/_shared.js` and `tools/world-mcp/dist/src/tools/get-record.js` after build.

## Landed Changes

### 1. Add missing STPLAN/STEMO prefixes

Patched `tools/world-mcp/src/tools/_shared.ts` so `STORY_BUNDLE_ID_PREFIXES` includes `STPLAN` and `STEMO` alongside the already-supported story plan/emotion node types.

### 2. Update invalid-id diagnostic

Patched `tools/world-mcp/src/tools/get-record.ts` so the `validateRecordId()` `details.expected` story-bundle id list includes `STPLAN` and `STEMO` alongside the other supported story-bundle id classes.

### 3. Add focused handler proof

Extended `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` to prove `getRecord()` resolves STPLAN/STEMO fixture records through `story_slug`.

## Files to Touch

- `tools/world-mcp/src/tools/_shared.ts` (modify)
- `tools/world-mcp/src/tools/get-record.ts` (modify)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify)

## Out of Scope

- Any change to schemas, validators, docs, or non-`get_record` retrieval behavior.
- Reopening ticket 006; it remains complete and archived.

## Acceptance Criteria

### Tests That Must Pass

1. Focused `get_record` story-bundle test proves `STPLAN` and `STEMO` resolve through `story_slug`.
2. Grep/manual-review proof that `tools/world-mcp/src/tools/_shared.ts` and `tools/world-mcp/src/tools/get-record.ts` include `STPLAN` and `STEMO`.
3. From `tools/world-mcp`: `npm run build`.
4. Grep/manual-review proof that `tools/world-mcp/dist/src/tools/_shared.js` and `tools/world-mcp/dist/src/tools/get-record.js` contain the refreshed prefixes/diagnostic string after build.
5. `git diff --check -- tools/world-mcp/src/tools/_shared.ts tools/world-mcp/src/tools/get-record.ts tools/world-mcp/tests/tools/get-record.story-bundle.test.ts archive/tickets/SPEC51CHCSLTSEL-007-get-record-invalid-id-diagnostic-parity.md`

### Invariants

1. `get_record` accepts the STPLAN/STEMO story-bundle id classes already advertised by the machine-facing docs and represented in indexed fixtures.
2. The invalid-id diagnostic matches the live story-bundle id-class examples now advertised by the machine-facing docs and capability descriptions.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` — extends story-bundle retrieval coverage to STPLAN/STEMO ids.

### Commands

1. From `tools/world-mcp`: `npm run build`
2. From `tools/world-mcp`: `node --test dist/tests/tools/get-record.story-bundle.test.js`
3. `rg -n "STPLAN|STEMO" tools/world-mcp/src/tools/_shared.ts tools/world-mcp/src/tools/get-record.ts tools/world-mcp/dist/src/tools/_shared.js tools/world-mcp/dist/src/tools/get-record.js`
4. `git diff --check -- tools/world-mcp/src/tools/_shared.ts tools/world-mcp/src/tools/get-record.ts tools/world-mcp/tests/tools/get-record.story-bundle.test.ts archive/tickets/SPEC51CHCSLTSEL-007-get-record-invalid-id-diagnostic-parity.md`

## Outcome

Completed 2026-05-20.

`tools/world-mcp/src/tools/_shared.ts` now recognizes `STPLAN-<integer>` and `STEMO-<integer>` as story-bundle record ids. `get_record` now routes those ids through the same story-scoped lookup path as other bundle-scoped records, so documented STPLAN/STEMO retrieval reaches indexed `story_plan_record` and `story_emotion_record` rows instead of failing id-shape validation.

`tools/world-mcp/src/tools/get-record.ts` now names `STPLAN` and `STEMO` in the invalid-id recovery text, and `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` now covers direct STPLAN/STEMO retrieval through `story_slug`.

## Verification Result

1. Pre-edit baseline from `tools/world-mcp`: `npm run build` — PASS; package compiled before source edits.
2. Pre-edit probe from `tools/world-mcp`: `node -e 'import("./dist/src/tools/_shared.js").then((m) => { console.log(m.isStoryBundleRecordId("STPLAN-1")); console.log(m.isStoryBundleRecordId("STEMO-1")); })'` — confirmed the live built artifact returned `false` for both prefixes before the fix.
3. From `tools/world-mcp`: `npm run build` — PASS; TypeScript compiled and refreshed ignored `tools/world-mcp/dist/`.
4. From `tools/world-mcp`: `node --test dist/tests/tools/get-record.story-bundle.test.js` — PASS; 7 tests passed, including the new STPLAN/STEMO retrieval test.
5. `rg -n "STPLAN|STEMO" tools/world-mcp/src/tools/_shared.ts tools/world-mcp/src/tools/get-record.ts tools/world-mcp/dist/src/tools/_shared.js tools/world-mcp/dist/src/tools/get-record.js` — PASS; source and built artifacts contain the refreshed prefixes and diagnostic text.
6. From `tools/world-mcp`: `npm test` — PASS; package build plus full compiled test suite passed (`414` tests, `0` failures).
7. `git diff --check -- tools/world-mcp/src/tools/_shared.ts tools/world-mcp/src/tools/get-record.ts tools/world-mcp/tests/tools/get-record.story-bundle.test.ts archive/tickets/SPEC51CHCSLTSEL-007-get-record-invalid-id-diagnostic-parity.md` — PASS.

## Deviations

- Reassessment widened this ticket from diagnostic-only to same-seam parser-prefix plus diagnostic parity. The draft assumed `isStoryBundleRecordId()` already accepted STPLAN/STEMO; live code proved `STORY_BUNDLE_ID_PREFIXES` omitted both prefixes.
- Package public docs and capability prose were inspected through ticket 006 and the current source grep; no docs update was needed because they already advertise STPLAN/STEMO. This ticket corrected the package code to match those public surfaces.
- `tools/world-mcp/dist/` was refreshed by `npm run build` / `npm test` as an expected ignored generated artifact; it is not a tracked source edit.
