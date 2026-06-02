# SPEC111MANSTOSTU-004: Unsaved-change hook + apply to editor forms

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web (new `useUnsavedChanges` hook + test; applied to 5 form components; `App.tsx` data-router conversion required for `useBlocker`). No backend, no canon-pipeline impact.
**Deps**: None

## Problem

Per SPEC-111 §2 item 5: editing the directive/contract/record/template/context forms does not guard against navigating away with unsaved changes — the author loses work to a misclick or back-button reflex. Add a dirty-flag hook with `window.beforeunload` (native dialog on tab close) + React Router `useBlocker` (confirmation modal on in-app nav), resetting on successful save, and apply it to the 5 editor forms. The Dashboard directive draft is excluded (reassessment M4 — it is unsaved-by-design scratch state with no save handler).

## Assumption Reassessment (2026-06-02)

1. Codebase: `react-router-dom` is `^6.27.0` (installed 6.30.4) — `useBlocker` is exported at runtime, but live source inspection showed it calls `useDataRouterContext`, while `App.tsx` still used `BrowserRouter`; this ticket therefore owns the same-seam `App.tsx` conversion to `createBrowserRouter`/`RouterProvider` so the blocker can actually work. Target forms exist — `MomentComposer.tsx` (directive + selected cast/records), `EditContract.tsx` (contract fields), `RecordForm.tsx` (record editor), `BeatTemplateForm.tsx` (template editor), `EditCurrentContext.tsx` (context form); `MomentComposer.tsx` was also modified by archive/tickets/SPEC111MANSTOSTU-003.md (distinct edits). `Dashboard.tsx` `directiveDraft` has no save handler → excluded.
2. Specs/docs: SPEC-111 §2 item 5 + §3 third/fourth key decisions + §8 assumption 1 (resolved — `useBlocker` available; no upgrade/fallback needed) + M4 (Dashboard directive excluded).
3. Cross-artifact boundary under audit: the React Router `useBlocker` contract (in-app nav blocking) requires a data-router provider; `window.beforeunload` covers tab close. `MomentComposer.tsx` is shared with 003 (mechanical overlap, distinct regions).
4. FOUNDATIONS Rule 6 No Silent Retcons (per SPEC-111 §5): the hook makes in-progress authoring change visible at the moment of potential loss, preventing silent loss of work — the UI-layer analogue of the canon-layer no-silent-retcon discipline.

## Architecture Check

1. One small hook (a saved-snapshot comparison + `beforeunload` + `useBlocker` + a `reset()` on save) applied uniformly across the 5 forms, rather than bespoke per-form logic. The App moves to the React Router data-router shell required by `useBlocker`; that is same-seam prerequisite work, not a new feature family.
2. No backwards-compatibility shims.

## Verification Layers

1. Hook sets dirty on change, resets on save → static-analysis application check (or unit test) per SPEC-111 §2 item 7.
2. In-app nav with dirty state → confirmation modal (`useBlocker`) → manual scenario 4.
3. Tab close with dirty state → native `beforeunload` dialog → manual review.
4. Hook applied to the 5 named forms (and NOT the Dashboard directive) → grep-proof (SPEC-111 AC#4).
5. `useBlocker` has a data-router provider → grep-proof (`App.tsx` uses `createBrowserRouter`/`RouterProvider`, not `BrowserRouter`).

## What to Change

### 1. Create the hook

Create `tools/manual-story-studio/web/src/hooks/useUnsavedChanges.ts`: a dirty flag derived from comparing current form state to the last-saved snapshot; a `beforeunload` listener that prompts the native dialog when dirty; `useBlocker` for in-app navigation (confirmation modal); a `reset()` to clear the dirty flag on successful save.

### 2. Convert App to a data-router shell

`App.tsx`: replace `BrowserRouter` with `createBrowserRouter` + `RouterProvider`, preserving the same route table and the existing `Banner` / `HealthBanner` / `StoryPageNav` shell. This is required for `useBlocker` to be valid at runtime.

### 3. Apply to the editor forms

Wire the hook into `MomentComposer.tsx` (directive + selections), `EditContract.tsx` (contract fields), `RecordForm.tsx` (record editor), `BeatTemplateForm.tsx` (template editor), `EditCurrentContext.tsx` (context form). Reset on each form's successful save.

### 4. Test (per SPEC-111 §2 item 7)

Create `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts`. Prefer the **static-analysis check** form: read the 5 component source files as text and assert each imports/uses `useUnsavedChanges` (and that `Dashboard.tsx` does not). This is the robust choice because the backend test runner (`node --test "dist/test/**/*.test.js"`, compiled by the backend `tsc -p tsconfig.json`) cannot import a React hook from the separate `web/` tsconfig project — a direct hook unit-test would not resolve under the backend build. If a minimal React testing scaffold is added to the web build later, the hook's pure logic can be unit-tested then.

## Files to Touch

- `tools/manual-story-studio/web/src/hooks/useUnsavedChanges.ts` (new)
- `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditContract.tsx` (modify)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modify)
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)

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
4. Grep: `App.tsx` uses `createBrowserRouter`/`RouterProvider` and no longer uses `BrowserRouter`.

### Invariants

1. `dirty` resets to `false` on a successful save.
2. The Dashboard directive draft is NOT wrapped in `useUnsavedChanges`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` — static-analysis check asserting the hook is applied to the 5 named components and absent from `Dashboard.tsx` (per SPEC-111 §2 item 7; backend test runner cannot import the React hook directly).

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `grep -rln "useUnsavedChanges" tools/manual-story-studio/web/src` — expect the hook + 5 application sites; `Dashboard.tsx` absent.

## Landed Changes (2026-06-02)

1. Added `useUnsavedChanges`, which compares the current form snapshot against the last saved/reset snapshot, wires `beforeunload`, blocks SPA navigation through `useBlocker`, and exposes `reset()` for successful saves.
2. Converted `App.tsx` from `BrowserRouter` to a React Router data-router shell (`createBrowserRouter` + `RouterProvider`) so `useBlocker` has the runtime provider it requires.
3. Applied the hook to Moment Composer, Edit Contract, RecordForm, BeatTemplateForm, and Edit Current Context. Dashboard remains excluded.
4. Updated Records, CastAndProfiles, and BeatTemplates save handlers to return success/failure so child forms clear dirty state only after a real save.
5. Added `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` to lock the five application sites, Dashboard exclusion, and data-router provider.

## Verification Result (2026-06-02)

PASS — `cd tools/manual-story-studio && npm test` passed: backend build, 445 backend/static tests, and web `tsc --noEmit`.

PASS — grep/static proof shows `useUnsavedChanges` in the hook, test, and the five intended application sites (`MomentComposer`, `EditContract`, `RecordForm`, `BeatTemplateForm`, `EditCurrentContext`), with no Dashboard application.

PASS — Playwright browser smoke on `http://127.0.0.1:5174/worlds/demo/manual-stories/story-one/moment-composer`: data-router route rendered, dirty directive navigation showed `You have unsaved changes. Leave this page and discard them?`, dismiss stayed on Moment Composer, accept navigated to `/`. Console errors were backend proxy 500s because the smoke intentionally ran Vite without the backend.

PASS — App grep/static proof shows `createBrowserRouter` and `RouterProvider`, and the removed `BrowserRouter` import/tag is absent.

## Outcome

Completed on 2026-06-02. Manual Story Studio now protects the five save-backed editor forms from accidental dirty navigation with a shared `useUnsavedChanges` hook, `beforeunload`, and React Router `useBlocker`. The App shell was converted to a data-router provider because `useBlocker` requires that provider at runtime. Parent save handlers now report success/failure so form-level dirty state resets only after successful saves.

Deviation from the original plan: `App.tsx` was added to the owned scope after live source inspection showed `BrowserRouter` could not support `useBlocker`; this was same-seam prerequisite work. Dashboard remains intentionally excluded because its directive draft is scratch state with no save handler.

Verification: `cd tools/manual-story-studio && npm test` passed; grep/static tests prove the five hook applications, Dashboard exclusion, and data-router provider; Playwright smoke verified dirty navigation confirm dismiss/accept behavior on Moment Composer.
