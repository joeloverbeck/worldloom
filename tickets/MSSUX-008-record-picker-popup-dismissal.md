# MSSUX-008: RecordPicker popup must dismiss on outside interaction

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — Manual Story Studio web UI only (`tools/manual-story-studio/web`); no canon, MCP, patch-engine, or validator surfaces touched.
**Deps**: None

## Problem

Every "Search records..." field in the Manual Story Studio is the shared `RecordPicker` component (`tools/manual-story-studio/web/src/components/RecordPicker.tsx`). It opens its results popup on input focus (`onFocus={() => setOpen(true)}`, line 225) but has **no outside-click or blur dismissal**: `setOpen(false)` fires only on the `Escape` key (line 207) or a single-select commit (line 172). Once any picker input is focused, its popup stays open indefinitely.

The popup is `position: absolute; z-index: 20` (`index.css:536`), so a permanently-open popup floats over the form fields beneath it. The empty-state `<p>No matching records.</p>` (line 290) is the most visible symptom: with no records yet, clicking a picker shows the box and it never goes away, overlapping the fields below. Focusing a second picker opens its popup too without closing the first, so multiple popups can stack.

This affects every page using `RecordPicker`: `RecordForm` (cast/all record forms), `MomentComposer`, and `EditPromptWorkingSet`. Because the cause is in the shared component, a single fix resolves it everywhere — no per-page duplication.

## Assumption Reassessment (2026-06-03)

1. `RecordPicker` is the single shared picker: `grep -rn "RecordPicker"` shows production consumers `web/src/components/RecordForm.tsx`, `web/src/pages/MomentComposer.tsx`, `web/src/pages/EditPromptWorkingSet.tsx`. Fixing the component fixes all three.
2. The only `setOpen(false)` call sites in `RecordPicker.tsx` are line 172 (single-select commit) and line 207 (Escape); `onFocus` (line 225) and `onChange` (line 228) set it `true`. There is no `onBlur`, no document listener, and no container `ref` today (the existing `inputRef` is on the input only, never read for dismissal).
3. The overlap is a symptom, not a CSS bug: `.record-picker__popup` (`index.css:536`) is correctly absolutely positioned and z-indexed; it overlays sibling fields only because it stays open. No CSS change is required.
4. Existing coverage `tools/manual-story-studio/test/web/record-picker.test.ts` is structural-existence only (SPEC-112: component exists, refs use it, `IdTextArea` absent). It asserts nothing about open/close behavior, so a dismissal test is net-new and does not conflict with existing assertions.

## Architecture Check

1. Dismissal belongs in the shared `RecordPicker`, not in each consumer — the bug is one missing behavior in one component, so one fix is both minimal and non-duplicative. A container `ref` + a document `mousedown` listener that closes when the event target is outside the container is the idiomatic React popover-dismissal pattern and also closes the popup when focus moves to a *different* picker (clicking another picker's input is "outside" this one's container).
2. No backwards-compatibility shim: this is a pure behavior addition to an internal component with no public-interface or schema change.

## Verification Layers

1. Outside-click dismissal → component behavior test in `record-picker.test.ts` (open via focus, dispatch a `mousedown` outside the container, assert popup gone).
2. Option clicks still register → behavior test (selecting an option must not be eaten by the dismissal handler; for single-select mode the popup closes via the existing commit path, for multi-select it remains open).
3. `Escape` and single-select commit still close → existing line-172/207 paths remain; covered by the same test file.

## What to Change

### 1. Add outside-interaction dismissal to `RecordPicker`

In `tools/manual-story-studio/web/src/components/RecordPicker.tsx`:

- Add a `containerRef` on the outer `<div className="record-picker">` (line 212).
- Add a `useEffect` that, while `open`, registers a `document` `mousedown` (or `pointerdown`) listener closing the popup (`setOpen(false)`) when `event.target` is not contained by `containerRef.current`; clean up the listener on unmount / when `open` becomes false.
- Ensure option selection is not pre-empted by the dismissal handler. Because `commitSelection` runs from the option's `onSelect` and the dismissal listener is on `document` `mousedown`, verify ordering; if a click on an option closes before it commits, gate the dismissal on `containerRef` containment (option clicks are inside the container, so they are already excluded).
- Keep the existing `Escape` (line 207) and single-select-commit (line 172) close paths unchanged.

Optionally, also handle `onBlur` on the input with a `relatedTarget` containment guard as defense-in-depth; the document-listener approach alone is sufficient and is the primary requirement.

## Files to Touch

- `tools/manual-story-studio/web/src/components/RecordPicker.tsx` (modify)
- `tools/manual-story-studio/test/web/record-picker.test.ts` (modify — add dismissal behavior test)

## Out of Scope

- Any change to `.record-picker__popup` CSS (positioning is correct).
- Changing the focus-to-open behavior (opening on focus is desired).
- Multi-select auto-close on selection (multi-select should stay open across selections, matching current behavior).
- The `source_world_character` field cleanup (separate ticket MSSUX-009).

## Acceptance Criteria

### Tests That Must Pass

1. New behavior test: focusing the picker opens the popup; a `mousedown` on an element outside the picker container closes it (`No matching records.` / option list no longer rendered).
2. New behavior test: clicking an option inside the open popup still commits the selection (is not swallowed by the dismissal handler).
3. `npm --prefix tools/manual-story-studio test` passes (runs backend `node --test` + `npm --prefix web test`).

### Invariants

1. The `RecordPicker` popup is never visible while focus/interaction is outside its container.
2. No `RecordPicker` consumer (`RecordForm`, `MomentComposer`, `EditPromptWorkingSet`) carries its own dismissal logic — dismissal lives solely in the shared component.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/record-picker.test.ts` — add outside-click dismissal and option-commit-survives-dismissal behavior cases alongside the existing SPEC-112 structural tests.

### Commands

1. `npm --prefix tools/manual-story-studio test` — full package suite (backend `node --test` over `dist/test/**` + web tests); this is the package's canonical test entry and the correct boundary since the change is web-only but the suite is unified.
2. `npm --prefix tools/manual-story-studio run build` — confirms web build + `tsc` backend build still pass after the component edit.
