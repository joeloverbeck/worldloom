# SPEC111MANSTOSTU-004: Unsaved-change hook + apply to editor forms

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web (new `useUnsavedChanges` hook + test; applied to 5 form components). No backend, no canon-pipeline impact.
**Deps**: None

## Problem

Per SPEC-111 §2 item 5: editing the directive/contract/record/template/context forms does not guard against navigating away with unsaved changes — the author loses work to a misclick or back-button reflex. Add a dirty-flag hook with `window.beforeunload` (native dialog on tab close) + React Router `useBlocker` (confirmation modal on in-app nav), resetting on successful save, and apply it to the 5 editor forms. The Dashboard directive draft is excluded (reassessment M4 — it is unsaved-by-design scratch state with no save handler).

## Assumption Reassessment (2026-06-02)

1. Codebase: `react-router-dom` is `^6.27.0` (installed 6.30.4) — `useBlocker` is available (verified present in the built package); target forms exist — `MomentComposer.tsx` (directive + selected cast/records), `EditContract.tsx` (contract fields), `RecordForm.tsx` (record editor), `BeatTemplateForm.tsx` (template editor), `EditCurrentContext.tsx` (context form); `MomentComposer.tsx` was also modified by archive/tickets/SPEC111MANSTOSTU-003.md (distinct edits). `Dashboard.tsx:38` `directiveDraft` has no save handler → excluded.
2. Specs/docs: SPEC-111 §2 item 5 + §3 third/fourth key decisions + §8 assumption 1 (resolved — `useBlocker` available; no upgrade/fallback needed) + M4 (Dashboard directive excluded).
3. Cross-artifact boundary under audit: the React Router `useBlocker` contract (in-app nav blocking) + `window.beforeunload` (tab close); `MomentComposer.tsx` shared with 003 (mechanical overlap, distinct regions).
4. FOUNDATIONS Rule 6 No Silent Retcons (per SPEC-111 §5): the hook makes in-progress authoring change visible at the moment of potential loss, preventing silent loss of work — the UI-layer analogue of the canon-layer no-silent-retcon discipline.

## Architecture Check

1. One small pure-logic hook (a `useState` dirty flag + a `useEffect` wiring `beforeunload` and `useBlocker` + a `reset()` on save) applied uniformly across the 5 forms, rather than bespoke per-form logic. The hook touches the DOM only via event listeners, so it is testable/inspectable without a browser harness (SPEC-111 §3).
2. No backwards-compatibility shims.

## Verification Layers

1. Hook sets dirty on change, resets on save → static-analysis application check (or unit test) per SPEC-111 §2 item 7.
2. In-app nav with dirty state → confirmation modal (`useBlocker`) → manual scenario 4.
3. Tab close with dirty state → native `beforeunload` dialog → manual review.
4. Hook applied to the 5 named forms (and NOT the Dashboard directive) → grep-proof (SPEC-111 AC#4).

## What to Change

### 1. Create the hook

Create `tools/manual-story-studio/web/src/hooks/useUnsavedChanges.ts`: a dirty flag derived from comparing current form state to the last-saved snapshot; a `beforeunload` listener that prompts the native dialog when dirty; `useBlocker` for in-app navigation (confirmation modal); a `reset()` to clear the dirty flag on successful save.

### 2. Apply to the editor forms

Wire the hook into `MomentComposer.tsx` (directive + selections), `EditContract.tsx` (contract fields), `RecordForm.tsx` (record editor), `BeatTemplateForm.tsx` (template editor), `EditCurrentContext.tsx` (context form). Reset on each form's successful save.

### 3. Test (per SPEC-111 §2 item 7)

Create `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts`. Prefer the **static-analysis check** form: read the 5 component source files as text and assert each imports/uses `useUnsavedChanges` (and that `Dashboard.tsx` does not). This is the robust choice because the backend test runner (`node --test "dist/test/**/*.test.js"`, compiled by the backend `tsc -p tsconfig.json`) cannot import a React hook from the separate `web/` tsconfig project — a direct hook unit-test would not resolve under the backend build. If a minimal React testing scaffold is added to the web build later, the hook's pure logic can be unit-tested then.

## Files to Touch

- `tools/manual-story-studio/web/src/hooks/useUnsavedChanges.ts` (new)
- `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` (new)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditContract.tsx` (modify)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modify)
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (modify)

## Out of Scope

- The Dashboard directive draft (excluded — no save handler, M4).
- ID hiding (→ archive/tickets/SPEC111MANSTOSTU-003.md).
- Modal visual styling beyond a minimal confirm dialog.
- Backend.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` (runs the new static-analysis test via `node --test` plus the web `tsc --noEmit`).
2. Grep (SPEC-111 AC#4): `useUnsavedChanges` imported by `MomentComposer`, `EditContract`, `RecordForm`, `BeatTemplateForm`, `EditCurrentContext`; and NOT by `Dashboard.tsx`.
3. Manual scenario 4 (edit directive on Moment Composer → confirmation modal on nav; cancel → stay; confirm → navigate; save first → no modal).

### Invariants

1. `dirty` resets to `false` on a successful save.
2. The Dashboard directive draft is NOT wrapped in `useUnsavedChanges`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` — static-analysis check asserting the hook is applied to the 5 named components and absent from `Dashboard.tsx` (per SPEC-111 §2 item 7; backend test runner cannot import the React hook directly).

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `grep -rln "useUnsavedChanges" tools/manual-story-studio/web/src` — expect the hook + 5 application sites; `Dashboard.tsx` absent.
