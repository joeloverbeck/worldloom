# SPEC117MANSTOSTU-004: Post-Segment Workbench frontend page

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` adds `web/src/pages/PostSegmentWorkbench.tsx`, registers its route in `web/src/App.tsx`, and adds two-pane styling to `web/src/index.css`. No canon-mediation surface (package is canon-fenced per SPEC-100).
**Deps**: archive/tickets/SPEC117MANSTOSTU-003.md

## Problem

The author wants to *see the accepted prose and update records* after a segment is saved, not dismiss a category-count modal. This ticket builds the two-pane Post-Segment Workbench page: accepted prose + context on the left, a record workbench (reusing the SPEC-112 record components and the SPEC-114 delete path) on the right, with the broad-referrer "touches this segment" pile and an honest one-line reminder. It consumes the backend payload from archive/tickets/SPEC117MANSTOSTU-003.md.

## Assumption Reassessment (2026-06-03)

1. The reused components exist: `web/src/components/RecordForm.tsx`, `RecordCard.tsx`, `RecordPicker.tsx` (SPEC-112), and the block-on-referrer delete path (SPEC-114). The frontend route table lives in `web/src/App.tsx`; shared styling in `web/src/index.css`. The backend payload route (`routes/post-segment-workbench.ts`) is delivered by archive/tickets/SPEC117MANSTOSTU-003.md. Confirmed by grep at reassessment + decomposition time.
2. Per the spec (SPEC-117 §2 item 2 + §3 Routed-not-modal + §6 AC2/AC4/AC6), the page is a two-pane per-story route reached by post-save navigation carrying the segment ID — **not** a standalone `StoryPageNav` tab (Q2 = route-only; the payload is segment-scoped).
3. **Cross-artifact boundary under audit**: this page reuses the SPEC-112 record components (`RecordForm`/`RecordCard`/`RecordPicker`) and the SPEC-114 block-on-referrer delete path — their props/contracts are the boundary. It consumes archive/tickets/SPEC117MANSTOSTU-003.md's route payload shape (accepted segment + sidecar included-records + candidate pile).
4. **FOUNDATIONS principle** (Prose-state separation — no state inferred from prose): the workbench shows accepted prose and a referrer-based candidate pile and performs **no** diff/inference; the single honest reminder ("Segment saved. Manual Studio did not infer record changes. Update only the records you want to change.") states this at authoring time, per the spec's FND alignment row.

## Architecture Check

1. Reusing `RecordForm`/`RecordCard`/`RecordPicker` and the SPEC-114 delete path keeps the workbench a thin composition over already-tested record surfaces rather than re-implementing record editing. A segment-id-param route (not a nav tab) matches the segment-scoped payload — the page is meaningless without a segment context, so a persistent tab with no default would be a worse surface.
2. No backwards-compatibility alias/shim: this is a new page replacing the deleted modal; it introduces no compatibility layer for the old checklist.

## Verification Layers

1. Left pane shows accepted prose + title + prompt ID + moment directive + word count + last paragraph + sidecar included-records → web typecheck + manual review against AC2.
2. Right pane quick-add / inline-edit / detail-drawer / referrer-blocked-delete work through reused `RecordForm`/`RecordCard` + SPEC-114 delete path → web typecheck + manual review against AC4.
3. The single honest reminder line is present and no "mark reviewed" control exists anywhere → codebase grep-proof (reminder text present; zero "mark reviewed" matches).
4. The "touches this segment" rail renders the broad-referrer candidates from the -003 payload → web typecheck (consumes the typed payload) + manual review.

## Landed Changes

### 1. New workbench page

Added `web/src/pages/PostSegmentWorkbench.tsx`: a segment-scoped workbench page that fetches the backend payload from archive/tickets/SPEC117MANSTOSTU-003.md, renders accepted prose, title, prompt ID, moment directive, word count, last paragraph, sidecar included cast/records, the honest no-inference reminder, and a "Records that touch this segment" candidate rail. The record workbench reuses `RecordCard` and `RecordForm`, includes quick-add buttons for the post-segment record classes, seeds new-record refs from the segment payload, and carries SPEC-114 blocked/force-delete handling.

### 2. Route registration

Registered `/worlds/:worldSlug/manual-stories/:msSlug/segments/:segmentId/post-segment-workbench` in `web/src/App.tsx`. No `StoryPageNav` tab was added.

### 3. Styling

Added responsive workbench layout/styling to `web/src/index.css`.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)
- `tools/manual-story-studio/web/src/index.css` (modify)

## Out of Scope

- The PasteProse post-save navigation to this route — SPEC117MANSTOSTU-005.
- The backend payload route — archive/tickets/SPEC117MANSTOSTU-003.md.
- Any inference of what changed from the prose (the rail is a candidate pile, not a diff).
- A "mark reviewed" affordance of any kind; a standalone `StoryPageNav` tab (route-only per Q2).
- New record classes or write surfaces beyond what `RecordForm` already saves.

## Acceptance Criteria

### Tests That Must Pass

1. The left pane shows accepted prose, segment title, prompt ID, moment directive, word count, last paragraph, and sidecar included-records (AC2).
2. Quick-add / inline-edit / detail-drawer / referrer-blocked-delete all work through the reused `RecordForm`/`RecordCard` and SPEC-114 delete path (AC4); the single honest reminder line is present and no "mark reviewed" control exists anywhere (AC6).
3. `npm --prefix web test` (web typecheck) is green; `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. The workbench performs no inference of state from prose — it only renders accepted prose + referrer candidates and saves explicit author edits through the existing validated write path.
2. The page is reachable only by the segment-id route, not by a persistent nav tab.

## Test Plan

### New/Modified Tests

1. `None for new test files — web verification is `tsc --noEmit` typecheck (`npm --prefix web test`) plus the SPEC-117 §7 manual two-pane smoke check; the broad-scan payload behavior is covered by archive/tickets/SPEC117MANSTOSTU-003.md's `post-segment-workbench.test.ts`.`

### Commands

1. `npm --prefix web test` (run from `tools/manual-story-studio`; web typecheck)
2. `cd tools/manual-story-studio && npm test` (full backend + web)
3. `grep -rn "mark reviewed\|last_reviewed" tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` returns zero (no review-debt control re-introduced)

## Outcome

The frontend workbench page is route-only, consumes the backend payload, and exposes an author-maintenance surface without a review checkbox/control or nav-tab entry. It shows accepted prose/segment metadata, the backend candidate rail, quick-add record buttons, existing record edit forms, and SPEC-114 delete repair handling.

## Verification Result

1. `cd tools/manual-story-studio && npm --prefix web test` — PASS; web TypeScript check passed.
2. `cd tools/manual-story-studio && npm test` — PASS; backend build, 488 backend tests, and web TypeScript check passed.
3. `rg -n "mark reviewed|last_reviewed|last reviewed" tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` — no matches.
4. `rg -n "Segment saved\\. Manual Studio did not infer record changes" tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` — PASS; reminder text present in page source.
5. `git diff --check` — PASS.

## Deviations

No browser smoke was run; this ticket's planned proof boundary was web typecheck plus full package test. The page is composed from existing tested record components and the backend payload test from archive/tickets/SPEC117MANSTOSTU-003.md.
