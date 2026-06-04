# MSSUX-008: RecordPicker popup must dismiss on outside interaction

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — Manual Story Studio web UI only (`tools/manual-story-studio/web`); no canon, MCP, patch-engine, or validator surfaces touched.
**Deps**: None

## Problem

At intake, every "Search records..." field in the Manual Story Studio used the shared `RecordPicker` component (`tools/manual-story-studio/web/src/components/RecordPicker.tsx`). It opened its results popup on input focus but had no outside-click or blur dismissal: `setOpen(false)` fired only on the `Escape` key or a single-select commit. Once any picker input was focused, its popup stayed open indefinitely.

The popup is `position: absolute; z-index: 20`, so a permanently-open popup floated over the form fields beneath it. The empty-state `<p>No matching records.</p>` was the most visible symptom: with no records yet, clicking a picker showed the box and it never went away, overlapping the fields below. Focusing a second picker opened its popup too without closing the first, so multiple popups could stack.

This affected every page using `RecordPicker`: `RecordForm` (cast/all record forms), `MomentComposer`, and `EditPromptWorkingSet`. Because the cause was in the shared component, a single fix resolved it everywhere with no per-page duplication.

## Assumption Reassessment (2026-06-03)

1. `RecordPicker` is the single shared picker: `rg -n "RecordPicker" tools/manual-story-studio/web/src tools/manual-story-studio/test/web` shows production consumers `web/src/components/RecordForm.tsx`, `web/src/pages/MomentComposer.tsx`, and `web/src/pages/EditPromptWorkingSet.tsx`. Fixing the component fixes all three.
2. Before this ticket, the only `setOpen(false)` call sites in `RecordPicker.tsx` were single-select commit and `Escape`; `onFocus` and `onChange` set it `true`. There was no document listener and no container `ref`.
3. The overlap was a symptom, not a CSS bug: `.record-picker__popup` is correctly absolutely positioned and z-indexed; it overlays sibling fields only when it stays open. No CSS change was required.
4. Existing coverage `tools/manual-story-studio/test/web/record-picker.test.ts` was structural-existence only (SPEC-112: component exists, refs use it, `IdTextArea` absent). This ticket added MSSUX-008 static regression assertions because the package has no DOM/JSDOM test harness; web verification remains TypeScript build/typecheck plus source-contract tests under the package's compiled Node test lane.

## Architecture Check

1. Dismissal belongs in the shared `RecordPicker`, not in each consumer — the bug is one missing behavior in one component, so one fix is both minimal and non-duplicative. A container `ref` + a document `mousedown` listener that closes when the event target is outside the container is the idiomatic React popover-dismissal pattern and also closes the popup when focus moves to a *different* picker (clicking another picker's input is "outside" this one's container).
2. No backwards-compatibility shim: this is a pure behavior addition to an internal component with no public-interface or schema change.

## Verification Layers

1. Outside-click dismissal -> source-contract regression in `record-picker.test.ts` confirms `RecordPicker` owns a container ref, registers/removes a `document` `mousedown` listener only while open, and calls `setOpen(false)` when the target is outside the container.
2. Option clicks still register -> source-contract regression confirms the dismissal handler returns for `container.contains(event.target)` and popup options still render `RecordCard` with `interactionRole="option"` and `onSelect={commitSelection}`.
3. `Escape` and single-select commit still close -> existing code paths remain unchanged, with package build/typecheck coverage from `npm test` and `npm run build`.

## Landed Changes

### 1. Added outside-interaction dismissal to `RecordPicker`

In `tools/manual-story-studio/web/src/components/RecordPicker.tsx`:

- Added a `containerRef` on the outer `<div className="record-picker">`.
- Added a `useEffect` that, while `open`, registers a `document` `mousedown` listener and closes the popup (`setOpen(false)`) only when `event.target` is outside `containerRef.current`; the listener is removed on cleanup.
- Preserved option selection by returning early for targets contained inside the picker container.
- Kept the existing `Escape` and single-select-commit close paths unchanged.

## Files to Touch

- `tools/manual-story-studio/web/src/components/RecordPicker.tsx` (modify)
- `tools/manual-story-studio/test/web/record-picker.test.ts` (modify — add dismissal source-contract tests)

## Out of Scope

- Any change to `.record-picker__popup` CSS (positioning is correct).
- Changing the focus-to-open behavior (opening on focus is desired).
- Multi-select auto-close on selection (multi-select should stay open across selections, matching current behavior).
- The `source_world_character` field cleanup (separate ticket MSSUX-009).

## Acceptance Criteria

### Tests That Must Pass

1. New MSSUX-008 static regression: the picker has a container ref, document `mousedown` listener, cleanup, containment guard, and outside-target `setOpen(false)` path.
2. New MSSUX-008 static regression: popup options still delegate selection through `RecordCard` / `onSelect={commitSelection}` and the dismissal handler ignores contained targets.
3. `npm test` from `tools/manual-story-studio/` passes (runs backend `node --test` + `npm --prefix web test`).

### Invariants

1. The `RecordPicker` popup is never visible while focus/interaction is outside its container.
2. No `RecordPicker` consumer (`RecordForm`, `MomentComposer`, `EditPromptWorkingSet`) carries its own dismissal logic — dismissal lives solely in the shared component.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/record-picker.test.ts` — added outside-click dismissal and option-commit-survives-dismissal source-contract cases alongside the existing SPEC-112 structural tests.

### Commands

1. From `tools/manual-story-studio/`: `npm run build:backend`
2. From `tools/manual-story-studio/`: `node --test dist/test/web/record-picker.test.js`
3. From `tools/manual-story-studio/`: `npm test`
4. From `tools/manual-story-studio/`: `npm run build`

## Outcome

Completed 2026-06-03.

The shared `RecordPicker` now closes an open popup when a `mousedown` happens outside the picker container. The dismissal listener is active only while the popup is open, removes itself on cleanup, and preserves existing inside-popup option selection by checking `container.contains(event.target)`.

No consumer-specific dismissal logic or CSS change was added. `RecordForm`, `MomentComposer`, and `EditPromptWorkingSet` continue to receive the behavior through the shared component.

## Verification Result

Passed:

1. `npm run build:backend` from `tools/manual-story-studio/`
2. `node --test dist/test/web/record-picker.test.js` from `tools/manual-story-studio/` — 5 tests passed, including the 2 new MSSUX-008 regression tests.
3. `npm test` from `tools/manual-story-studio/` — 500 backend/static tests passed, followed by the web TypeScript test gate.
4. `npm run build` from `tools/manual-story-studio/` — web install check, Vite build, and backend TypeScript build passed.

## Deviations

The drafted ticket asked for DOM behavior tests that focus the picker and dispatch browser events. The live package has no DOM/JSDOM browser test harness; existing web tests are static source-contract assertions plus TypeScript build/typecheck. This ticket therefore added source-contract regression tests for the listener, containment guard, cleanup, and option-selection wiring, and used the package build/typecheck as the executable React proof.
