# MSSUX-013: Compose seeds `current_location` and `active_pressure_clocks` from the prompt working set

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio prompt-composition layer only (`tools/manual-story-studio/src/prompt/compose.ts`, `src/prompt/types.ts`) plus tests. No HTTP-route signature change.
**Deps**: None. Complemented by `archive/tickets/MSSUX-014-moment-composer-reflects-active-working-set.md` (the completed UI-visibility half of the same reported defect); the two were independent diffs.

## Problem

At intake, the author set a **Current location** in the prompt working set (`prompt-working-set/edit`), saved it, and expected it to be honored as an active record by the Moment Composer and the generated prompt. Observed on `worlds/erotica-world/manual-stories/red-bunny`: `current_location: mloc-1` ("park near the Leka-Enea school") was saved, the involved cast (`mchar-1`, `mchar-2`) appeared correctly, but the location was absent from the generated prompt ("Generate prompt" confirmed it).

Root cause was in compose's working-set seeding stage. `composePrompt` independently read the working set (`compose.ts` Stage 2.5) and merged several of its fields into the relevant-record set, but the merge list was incomplete before this ticket:

```ts
// src/prompt/compose.ts:127-134
const unfilteredSeededRecordIds = mergeIds(
  input.included_records,
  [
    ...(promptWorkingSet?.pinned_records ?? []),
    ...(promptWorkingSet?.active_secrets_questions ?? []),
    ...(promptWorkingSet?.must_not_reveal ?? []),
  ],
);
```

Before this ticket, `current_location` (an `mloc-<n>`) and `active_pressure_clocks` (`mclock-<n>[]`) were **not** in that list. A pipeline grep confirmed the working-set `current_location` was consumed only by schema (`src/schema/prompt-working-set.ts`), validation (`src/validate/prompt-working-set.ts`), and the read-side ref graph (`src/read/records.ts`) — **never by `compose.ts`**. `active_pressure_clocks` was likewise consumed only by schema/validation/ref-graph. So a saved location was never added to `records`, never reached Section 11 ("Physical Continuity", `src/prompt/sections/section-11-physical-continuity.ts`, which renders `locations` from `input.records` only), and never appeared in the prompt. Active pressure clocks were dropped the same way (clocks render via `src/prompt/translators/clocks.ts`).

Cast already worked because `current_cast` is seeded at Stage 2.5; `pinned_records` / `active_secrets_questions` already worked because they were in the merge list above — which is exactly why the author saw cast but not location at intake.

This ticket makes compose honor the working set's active spatial state and active pressure clocks, matching the existing treatment of every other active working-set field.

## Assumption Reassessment (2026-06-04)

1. `src/prompt/compose.ts` Stage 2.5 (lines 116-160) builds `unfilteredSeededRecordIds` via `mergeIds(input.included_records, [...pinned_records, ...active_secrets_questions, ...must_not_reveal])`. `promptWorkingSet.current_location` (line 5 of `src/schema/prompt-working-set.ts`, type `string | null`) and `promptWorkingSet.active_pressure_clocks` (`string[]`) are absent from that secondary array. Verified: grep for `current_location` / `active_pressure_clocks` across `src/` shows zero references inside `src/prompt/`.
2. `src/prompt/sections/section-11-physical-continuity.ts:38-51` only renders records present in `input.records` (it filters by `classifyManualRecord` → `locations`/`objects`/`facts`); `input.records` is built from `seededRecordIds` (`compose.ts:194-258`). A location absent from `seededRecordIds` therefore cannot render. Confirmed against live data: `worlds/erotica-world/manual-stories/red-bunny/prompt-working-set.yaml` has `current_location: mloc-1`, `pinned_records: []`.
3. Cross-artifact boundary: `mloc` (locations) and `mclock` (clocks) are both registered classes in `MANUAL_RECORD_CLASS_PREFIXES` (`web/src/types/manual-story.ts`) and classifiable by `classifyManualRecordId` (`src/prompt/record-class.ts`), and both have translators (`src/prompt/translators/locations.ts`, `src/prompt/translators/clocks.ts`). So seeding these ids is safe — Stage 4 will resolve and render them, not emit a `selected_records_exist` hard finding.
4. The existing `excluded_records` and `active === false` / `never_prompt` filtering (`compose.ts:145-158`, `:217-237`) runs over `unfilteredSeededRecordIds` and per-record. Adding `current_location`/`active_pressure_clocks` to the merge means an author who explicitly excludes the location, or whose location record is inactive/`never_prompt`, still has that respected — no special-casing needed.
5. Schema/enum extension: `PromptIncludedReason` (`src/prompt/types.ts:88-92`) currently = `"explicitly_selected" | "pinned" | "active_secret_question" | "current_cast"`. To give the newly-seeded ids correct provenance in the inclusion ledger, this ticket adds `"current_location"` and `"active_pressure_clock"`. Consumers of `PromptIncludedReason`: `resolution.included[].reason` in `compose.ts`, the inclusion-ledger / inspector payload (`test/prompt/inclusion-ledger.test.ts`, `test/prompt/inspector-payload.test.ts`, and the `PromptPreview` UI surface). The extension is **additive-only** (no existing reason renamed or removed).
6. Adjacent contradiction classification: the Moment Composer UI not *displaying* these records as pre-selected (`MomentComposer.tsx:102-107` seeded the picker only from `pinned_records` at intake) was the **separate, complementary defect** completed in `archive/tickets/MSSUX-014-moment-composer-reflects-active-working-set.md`. Fixing compose (this ticket) made the location appear in the *prompt* regardless of the UI; fixing the UI (MSSUX-014) made it appear as *selected* in the picker. Neither subsumed the other.

## Architecture Check

1. **Chosen design — extend the existing Stage 2.5 merge list.** The working set already has one authoritative seeding site in compose; the fix adds `current_location` (wrapped to an array, null-filtered) and `active_pressure_clocks` to the same `mergeIds` secondary array, and adds matching entries to `seedReasonMap`. This keeps a single source of truth for "what the active working set contributes" and reuses all downstream filtering (exclusion, inactive, never_prompt, must_not_reveal) unchanged.
2. **Rejected alternative — render the location in a dedicated, separate stage outside the record pipeline.** That would bypass `excluded_records`, `active`, and `never_prompt` handling and duplicate Section 11's location rendering, creating two divergent paths for the same record class.
3. **Rejected alternative — fix only in the frontend (seed the picker, let the backend use `included_records`).** Compose is invoked by the save route too and is the authoritative seeder; leaving the backend incomplete would make prompt content depend on whether the UI happened to pre-select the location. The backend must be correct independent of the UI.
4. No backwards-compatibility shim: the merge list gains two members and the enum gains two additive values; no alias or opt-out.

## Verification Layers

1. Saved `current_location` reaches the prompt -> unit test: a working set with `current_location: mloc-1` (record active) yields `mloc-1` in `resolution.included` with `reason: "current_location"` and the location rendered in the §11 "Physical Continuity" block.
2. Saved `active_pressure_clocks` reach the prompt -> unit test: a working set with `active_pressure_clocks: ["mclock-1"]` yields `mclock-1` in `resolution.included` with `reason: "active_pressure_clock"`.
3. Author exclusion still wins -> unit test: with `current_location: mloc-1` and `excluded_records: ["mloc-1"]`, `mloc-1` appears in `resolution.excluded` (`working_set_excluded`), not `included`.
4. `null` location is a no-op -> unit test: `current_location: null` adds nothing to the seeded set (regression guard for the existing `inclusion-ledger.test.ts` fixture).
5. No regression -> existing `test/prompt/inclusion-ledger.test.ts`, `test/prompt-compose.test.ts`, `test/capstone-spec102.test.ts`, and `npm run test:backend` pass.

## Landed Changes

### 1. Add `current_location` + `active_pressure_clocks` to the Stage 2.5 merge

`src/prompt/compose.ts` extends the secondary array passed to `mergeIds` so it includes the working set's current location (wrapped + null-filtered) and active pressure clocks:

```ts
const unfilteredSeededRecordIds = mergeIds(
  input.included_records,
  [
    ...(promptWorkingSet?.current_location ? [promptWorkingSet.current_location] : []),
    ...(promptWorkingSet?.active_pressure_clocks ?? []),
    ...(promptWorkingSet?.pinned_records ?? []),
    ...(promptWorkingSet?.active_secrets_questions ?? []),
    ...(promptWorkingSet?.must_not_reveal ?? []),
  ],
);
```

(Ordering within the secondary array is a provenance/reason-precedence choice only; `mergeIds` dedupes and `input.included_records` retains priority for the `explicitly_selected` reason.)

### 2. Give the new seeds correct provenance

`src/prompt/compose.ts` `seedReasonMap` sets `reason: "current_location"` for the current-location id and `reason: "active_pressure_clock"` for each `active_pressure_clocks` id (only when not already assigned a higher-precedence reason such as `explicitly_selected` or `pinned`).

### 3. Extend the reason enum (additive)

`src/prompt/types.ts` adds `"current_location"` and `"active_pressure_clock"` to `PromptIncludedReason`.

## Files to Touch

- `tools/manual-story-studio/src/prompt/compose.ts` (modify — merge list + `seedReasonMap`)
- `tools/manual-story-studio/src/prompt/types.ts` (modify — additive `PromptIncludedReason` values)
- `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` (modify — add current_location + active_pressure_clocks + exclusion cases)

## Out of Scope

- Moment Composer UI pre-selection / display of active working-set records (`archive/tickets/MSSUX-014-moment-composer-reflects-active-working-set.md`).
- Any change to how `pov_holder`, `active_secrets_questions`, `must_not_reveal`, or `pinned_records` are seeded (already correct).
- New prompt sections or changes to Section 11 / clock rendering.
- Changing the prompt-working-set schema (the fields already exist; only compose's consumption changes).

## Acceptance Criteria

### Tests That Must Pass

1. Compose over a working set with active `current_location: mloc-1` includes `mloc-1` in `resolution.included` with `reason: "current_location"` and renders it in the §11 Physical Continuity block.
2. Compose over a working set with `active_pressure_clocks: ["mclock-1"]` includes `mclock-1` in `resolution.included` with `reason: "active_pressure_clock"`.
3. With `current_location: mloc-1` and `excluded_records: ["mloc-1"]`, `mloc-1` is in `resolution.excluded` (reason `working_set_excluded`), not `included`.
4. `current_location: null` contributes nothing to the seeded set (no new included entry vs. baseline fixture).
5. `npm run test:backend` from `tools/manual-story-studio/` passes.

### Invariants

1. Every active, non-excluded, prompt-visible record named by the working set's `current_location` / `active_pressure_clocks` / `pinned_records` / `active_secrets_questions` appears in the composed prompt — there is no active working-set record class (other than `pov_holder`, handled via Section 7) that compose silently drops.
2. `PromptIncludedReason` is extended additively: no pre-existing reason value is renamed or removed.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` — extended the working-set fixture (baseline `current_location: null`, `active_pressure_clocks: []`) with active `current_location` + `active_pressure_clocks` cases and an `excluded_records` case; asserts `resolution.included`/`excluded` reasons and §11 rendering.

### Commands

1. `npm run test:backend` (from `tools/manual-story-studio/`) — builds the backend and runs `node --test dist/test/**/*.test.js`, the correct boundary for a compose-layer change.
2. `npm test` (from `tools/manual-story-studio/`) — full package (backend tests + web `tsc --noEmit`) as the final pipeline check.

## Outcome

Completed 2026-06-04.

`composePrompt` now seeds `promptWorkingSet.current_location` and `promptWorkingSet.active_pressure_clocks` through the same Stage 2.5 record pipeline used by pinned records and active secret/question records. The inclusion ledger now reports the additive reasons `"current_location"` and `"active_pressure_clock"` without renaming or removing existing reason values. `test/prompt/inclusion-ledger.test.ts` now covers active current-location rendering, active pressure-clock inclusion, working-set exclusion precedence, and `current_location: null` as a no-op.

## Verification Result

1. `npm run build:backend` (from `tools/manual-story-studio/`) — passed.
2. `node --test dist/test/prompt/inclusion-ledger.test.js` (from `tools/manual-story-studio/`) — passed: 6 tests, including the new current-location / active-clock / exclusion / null-location cases.
3. `npm run test:backend` (from `tools/manual-story-studio/`) — passed: 89 backend compiled test files.
4. `npm test` (from `tools/manual-story-studio/`) — passed: 505 backend tests plus `npm --prefix web test` (`tsc -p tsconfig.json --noEmit`).

## Deviations

None. `MSSUX-014` remains the separate UI-visibility follow-up and was not absorbed into this backend compose ticket.
