# MSSUX-014: Moment Composer "Relevant records" reflects the full active working set

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio web layer only (`tools/manual-story-studio/web/src/pages/MomentComposer.tsx`). No backend or HTTP-route change.
**Deps**: `archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md` is the completed backend half of the same reported defect (makes the active location actually enter the prompt). MSSUX-014 is the UI-visibility half; the two are independent diffs and can land in either order.

## Problem

In `moment-composer`, the **Involved cast** picker correctly pre-selects the working set's `current_cast`, but the **Relevant records** picker does not reflect the working set's other active records. An author who set `current_location` in `prompt-working-set/edit` sees the location absent from "Relevant records" — it "isn't considered active there." Observed on `worlds/erotica-world/manual-stories/red-bunny` (`current_location: mloc-1`).

Cause: `MomentComposer.tsx` pre-fills the records picker **only** from `pinned_records`:

```tsx
// web/src/pages/MomentComposer.tsx:102-107
if (!navState.included_records) {
  const contextPins = promptWorkingSet?.pinned_records ?? [];
  if (contextPins.length > 0) {
    setPinnedRecordIds(contextPins);
  }
}
```

It ignores `current_location`, `active_pressure_clocks`, and `active_secrets_questions`. (Cast is handled separately at lines 96-101 from `current_cast`, which is why cast appears and the rest does not.) The result is a transparency gap: the author cannot see, in the composer, which non-cast records the saved working set treats as active.

This ticket makes the "Relevant records" initial selection reflect the full active working set, so what the author marked active is visible (and adjustable) before generating. It is the UI complement to MSSUX-013, which makes those same records actually reach the prompt.

## Assumption Reassessment (2026-06-04)

1. `web/src/pages/MomentComposer.tsx:96-107` seeds two pieces of state from the working set: `includedCast` from `current_cast` (falling back to `m.cast_order`), and `pinnedRecordIds` from `pinned_records` only. The `navState.included_records` / `navState.included_cast` overrides (in-session navigation from another page) are preserved and must remain authoritative when present.
2. The "Relevant records" `RecordPicker` uses `COMPOSER_RECORD_CLASSES` (`MomentComposer.tsx:20-22` = `PICKABLE_RECORD_CLASSES` minus `cast`), which includes `locations` (`mloc`), `clocks` (`mclock`), and `secrets`/`questions` (`msecret`/`mq`) — verified in `web/src/types/manual-story.ts`. So those ids are valid selections for that picker; pre-selecting them will not produce an out-of-class value.
3. Cross-layer boundary: this is a *display/initial-selection* change. The backend (`src/prompt/compose.ts`, completed in `archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md`) is the authoritative seeder of what enters the prompt and already dedupes via `mergeIds`. Passing these ids through `included_records` is therefore harmless (deduped) and does not double-count. The UI seed must not become a second, divergent definition of "active" — it should mirror the same working-set fields the backend honors.
4. `PromptWorkingSet` fields available on the client come from `fetchPromptWorkingSet` (`web/src/api/prompt-working-set.js`); `current_location` is `string | null`, `active_pressure_clocks` / `active_secrets_questions` / `pinned_records` are `string[]`. The seed must null-filter `current_location` and dedupe across all four with a stable, deterministic order.
5. Adjacent contradiction classification: the backend dropping these records from the prompt was the **separate** defect completed in `archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md`. This ticket is UI-only; before MSSUX-013, the picker could show the records as selected but they still would not render in the prompt — so the two should ship together for a coherent fix, but they are independent reviewable diffs.

## Architecture Check

1. **Chosen design — seed `pinnedRecordIds` from the deduped union of the active working-set record fields.** Build the initial selection from `[current_location? , ...active_pressure_clocks, ...active_secrets_questions, ...pinned_records]`, null-filtered and order-deduped, when `navState.included_records` is absent. This mirrors exactly the fields the backend treats as active (post-MSSUX-013), keeping UI and backend definitions of "active" aligned.
2. **Rejected alternative — a separate read-only "Active from working set" panel.** More UI surface for no extra control; the author already edits the selection via the existing picker, and pre-selection makes the active set both visible and adjustable in one place.
3. **Rejected alternative — seed only `current_location`.** Would re-introduce the same class of gap for clocks and secrets/questions and contradict the author's expectation that *all* active non-cast records appear.
4. No backwards-compatibility shim: the seed expression gains terms; `navState` override precedence is unchanged.

## Verification Layers

1. Active location pre-selected -> manual/Puppeteer: with `current_location: mloc-1` saved and `pinned_records: []`, the "Relevant records" picker shows `mloc-1` selected on Moment Composer load.
2. All active non-cast classes pre-selected -> manual/Puppeteer: with `current_location`, `active_pressure_clocks`, `active_secrets_questions`, and `pinned_records` all populated, each appears selected (deduped, no duplicates).
3. Navigation override respected -> manual/Puppeteer: arriving with `navState.included_records` set (e.g. from a prior page) uses that list, not the working-set union.
4. Type/compile integrity -> `npm test` in `web/` (`tsc -p tsconfig.json --noEmit`) passes.

## What to Change

### 1. Seed the records picker from the full active working set

`web/src/pages/MomentComposer.tsx` — replace the `pinned_records`-only seed (lines 102-107) with a deduped, null-filtered union of the active working-set record fields, retaining the `navState.included_records` override:

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

## Out of Scope

- Backend compose seeding of `current_location` / `active_pressure_clocks` (`archive/tickets/MSSUX-013-compose-seeds-current-location-and-pressure-clocks.md`).
- Pre-selecting `must_not_reveal` records in the visible picker (a suppression directive, deliberately not surfaced as a "relevant record").
- Adding a web component-test harness: the `web/` package has no runtime test runner today (`web` `test` script is `tsc --noEmit`); introducing Vitest/Testing-Library is a separate infrastructure ticket. Verification here is typecheck + manual/Puppeteer.
- Changing the `RecordPicker` component or its class list.

## Acceptance Criteria

### Tests That Must Pass

1. Manual/Puppeteer: on `worlds/erotica-world/manual-stories/red-bunny/moment-composer`, with `current_location: mloc-1` and empty `pinned_records`, `mloc-1` shows as selected in "Relevant records" on load.
2. Manual/Puppeteer: a working set with populated `current_location`, `active_pressure_clocks`, `active_secrets_questions`, and `pinned_records` shows each id selected exactly once (no duplicates).
3. Manual/Puppeteer: navigating in with `navState.included_records` set uses that list, not the working-set union.
4. `npm test` from `tools/manual-story-studio/web/` (`tsc -p tsconfig.json --noEmit`) passes.

### Invariants

1. The "Relevant records" initial selection mirrors the same active working-set fields the backend honors (post-MSSUX-013), so UI and backend agree on what is "active" for a moment.
2. The `navState.included_records` override remains authoritative when present.

## Test Plan

### New/Modified Tests

1. `None — the web package has no runtime component-test harness (web test = tsc --noEmit); verification is typecheck + manual/Puppeteer steps enumerated in Acceptance Criteria.`

### Commands

1. `npm test` (from `tools/manual-story-studio/web/`) — typechecks the changed page.
2. `npm test` (from `tools/manual-story-studio/`) — full package (backend tests + web typecheck) as the final pipeline check.
3. Manual/Puppeteer walkthrough of the Acceptance Criteria against the running studio (no automated UI runner exists, so manual verification is the correct boundary here).
