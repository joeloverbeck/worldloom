# MSSUX-014: Moment Composer "Relevant records" reflects the full active working set

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio web layer only (`tools/manual-story-studio/web/src/pages/MomentComposer.tsx`). No backend or HTTP-route change.
**Deps**: `archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md` is the completed backend half of the same reported defect (makes the active location actually enter the prompt). MSSUX-014 is the completed UI-visibility half; the two were independent diffs.

## Problem

At intake in `moment-composer`, the **Involved cast** picker correctly pre-selected the working set's `current_cast`, but the **Relevant records** picker did not reflect the working set's other active records. An author who set `current_location` in `prompt-working-set/edit` saw the location absent from "Relevant records" — it "isn't considered active there." Observed on `worlds/erotica-world/manual-stories/red-bunny` (`current_location: mloc-1`).

Cause: `MomentComposer.tsx` pre-filled the records picker **only** from `pinned_records` before this ticket:

```tsx
// web/src/pages/MomentComposer.tsx:102-107
if (!navState.included_records) {
  const contextPins = promptWorkingSet?.pinned_records ?? [];
  if (contextPins.length > 0) {
    setPinnedRecordIds(contextPins);
  }
}
```

Before this ticket, it ignored `current_location`, `active_pressure_clocks`, and `active_secrets_questions`. (Cast was handled separately from `current_cast`, which is why cast appeared and the rest did not.) The result was a transparency gap: the author could not see, in the composer, which non-cast records the saved working set treated as active.

This ticket makes the "Relevant records" initial selection reflect the full active working set, so what the author marked active is visible (and adjustable) before generating. It is the UI complement to MSSUX-013, which made those same records actually reach the prompt.

## Assumption Reassessment (2026-06-04)

1. `web/src/pages/MomentComposer.tsx:96-107` seeds two pieces of state from the working set: `includedCast` from `current_cast` (falling back to `m.cast_order`), and `pinnedRecordIds` from `pinned_records` only. The `navState.included_records` / `navState.included_cast` overrides (in-session navigation from another page) are preserved and must remain authoritative when present.
2. The "Relevant records" `RecordPicker` uses `COMPOSER_RECORD_CLASSES` (`MomentComposer.tsx:20-22` = `PICKABLE_RECORD_CLASSES` minus `cast`), which includes `locations` (`mloc`), `clocks` (`mclock`), and `secrets`/`questions` (`msecret`/`mq`) — verified in `web/src/types/manual-story.ts`. So those ids are valid selections for that picker; pre-selecting them will not produce an out-of-class value.
3. Cross-layer boundary: this is a *display/initial-selection* change. The backend (`src/prompt/compose.ts`, completed in `archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md`) is the authoritative seeder of what enters the prompt and already dedupes via `mergeIds`. Passing these ids through `included_records` is therefore harmless (deduped) and does not double-count. The UI seed must not become a second, divergent definition of "active" — it should mirror the same working-set fields the backend honors.
4. `PromptWorkingSet` fields available on the client come from `fetchPromptWorkingSet` (`web/src/api/prompt-working-set.js`); `current_location` is `string | null`, `active_pressure_clocks` / `active_secrets_questions` / `pinned_records` are `string[]`. The seed must null-filter `current_location` and dedupe across all four with a stable, deterministic order.
5. Adjacent contradiction classification: the backend dropping these records from the prompt was the **separate** defect completed in `archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md`. This ticket is UI-only; before MSSUX-013, the picker could show the records as selected but they still would not render in the prompt. With MSSUX-013 complete, this ticket completes the UI half of the coherent fix.

## Architecture Check

1. **Chosen design — seed `pinnedRecordIds` from the deduped union of the active working-set record fields.** Build the initial selection from `[current_location? , ...active_pressure_clocks, ...active_secrets_questions, ...pinned_records]`, null-filtered and order-deduped, when `navState.included_records` is absent. This mirrors exactly the fields the backend treats as active (post-MSSUX-013), keeping UI and backend definitions of "active" aligned.
2. **Rejected alternative — a separate read-only "Active from working set" panel.** More UI surface for no extra control; the author already edits the selection via the existing picker, and pre-selection makes the active set both visible and adjustable in one place.
3. **Rejected alternative — seed only `current_location`.** Would re-introduce the same class of gap for clocks and secrets/questions and contradict the author's expectation that *all* active non-cast records appear.
4. No backwards-compatibility shim: the seed expression gains terms; `navState` override precedence is unchanged.

## Verification Layers

1. Active location pre-selection path -> source-level regression test: `activeWorkingSetRecordIds` includes `current_location` before `pinned_records`.
2. All active non-cast classes pre-selection path -> source-level regression test: `activeWorkingSetRecordIds` includes `current_location`, `active_pressure_clocks`, `active_secrets_questions`, and `pinned_records`, deduped through `new Set(...)`, and intentionally excludes `must_not_reveal`.
3. Navigation override respected -> source-level regression test: `MomentComposer.tsx` keeps the active-working-set seed behind `if (!navState.included_records)`, so arriving with `navState.included_records` uses that list, not the working-set union.
4. Type/compile integrity -> `npm test` in `web/` (`tsc -p tsconfig.json --noEmit`) passes.

## Landed Changes

### 1. Seed the records picker from the full active working set

`web/src/pages/MomentComposer.tsx` replaces the `pinned_records`-only seed with a deduped, null-filtered union of the active working-set record fields, retaining the `navState.included_records` override:

```tsx
if (!navState.included_records) {
  const ws = promptWorkingSet;
  const seeded = [
    ...(ws?.current_location ? [ws.current_location] : []),
    ...(ws?.active_pressure_clocks ?? []),
    ...(ws?.active_secrets_questions ?? []),
    ...(ws?.pinned_records ?? []),
  ];
  const deduped = [...new Set(seeded)];
  if (deduped.length > 0) {
    setPinnedRecordIds(deduped);
  }
}
```

(Exact ordering is a display choice; keep it deterministic. `must_not_reveal` is intentionally excluded from the visible pre-selection — it is a suppression directive, not a "show this record" signal — and the backend handles it independently.)

## Files to Touch

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `tools/manual-story-studio/test/web/record-picker.test.ts` (modify — source-level regression for the active working-set union and nav override)

## Out of Scope

- Backend compose seeding of `current_location` / `active_pressure_clocks` (`archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md`).
- Pre-selecting `must_not_reveal` records in the visible picker (a suppression directive, deliberately not surfaced as a "relevant record").
- Adding a web component-test harness: the `web/` package has no runtime test runner today (`web` `test` script is `tsc --noEmit`); introducing Vitest/Testing-Library is a separate infrastructure ticket. Verification here is typecheck + the existing source-level web regression lane in the backend package.
- Changing the `RecordPicker` component or its class list.

## Acceptance Criteria

### Tests That Must Pass

1. Source-level regression test: `MomentComposer.tsx` builds the Relevant-record initial seed from `current_location`, `active_pressure_clocks`, `active_secrets_questions`, and `pinned_records`.
2. Source-level regression test: the seed is deduped with `new Set(...)`.
3. Source-level regression test: the seed is applied only inside the `!navState.included_records` branch, preserving navigation override precedence.
4. `npm test` from `tools/manual-story-studio/web/` (`tsc -p tsconfig.json --noEmit`) passes.

### Invariants

1. The "Relevant records" initial selection mirrors the same active working-set fields the backend honors (post-MSSUX-013), so UI and backend agree on what is "active" for a moment.
2. The `navState.included_records` override remains authoritative when present.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/record-picker.test.ts` — adds a source-level regression over `MomentComposer.tsx` because the web package has no runtime component-test harness (web test = `tsc --noEmit`).

### Commands

1. `npm test` (from `tools/manual-story-studio/web/`) — typechecks the changed page.
2. `npm test` (from `tools/manual-story-studio/`) — full package (backend tests + web typecheck) as the final pipeline check.
3. `node --test dist/test/web/record-picker.test.js` (from `tools/manual-story-studio/`, after `npm run build:backend`) — focused source-level web regression.

## Outcome

Completed 2026-06-04.

`MomentComposer` now derives the Relevant-record initial selection from the active working-set union: `current_location`, `active_pressure_clocks`, `active_secrets_questions`, and `pinned_records`, in deterministic deduped order. The seed remains inside the `!navState.included_records` branch, so navigation state remains authoritative. `must_not_reveal` remains intentionally excluded from the visible picker.

## Verification Result

1. `npm run build:backend` (from `tools/manual-story-studio/`) — passed.
2. `node --test dist/test/web/record-picker.test.js` (from `tools/manual-story-studio/`) — passed: 6 tests, including the new `MSSUX-014` source-level regression.
3. `npm test` (from `tools/manual-story-studio/web/`) — passed: `tsc -p tsconfig.json --noEmit`.
4. `npm test` (from `tools/manual-story-studio/`) — passed: 506 backend tests plus `npm --prefix web test` (`tsc -p tsconfig.json --noEmit`).

## Deviations

The drafted manual/Puppeteer proof was replaced with a source-level regression in the package's existing web-source test lane plus the web typecheck. The repo does not currently have a runtime web component harness, and adding one remains out of scope.
