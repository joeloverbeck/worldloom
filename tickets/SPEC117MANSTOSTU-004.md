# SPEC117MANSTOSTU-004: Post-Segment Workbench frontend page

**Status**: PENDING
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

## What to Change

### 1. New workbench page

Add `web/src/pages/PostSegmentWorkbench.tsx`: a two-pane per-story page keyed by segment ID. Left pane (read-only): accepted segment text (rendered Markdown), title, prompt ID, moment directive, word count, last paragraph, sidecar included-records. Right pane: quick-add buttons for the post-segment classes (Fact, Belief, Emotion, Plan, Relationship, Clock, Secret, Question, Consequence, Status), inline-edit common fields via `RecordForm`, detail drawer for complex fields, delete with referrer cards (SPEC-114 block-on-referrer path). Side/bottom rail: "Records that touch this segment" — the broad-referrer candidate pile from the -003 payload, pre-filtered to involved cast but not limited to cast-linked records, presented as a working pile (not a required checklist). Top reminder (single line): the honest no-inference statement.

### 2. Route registration

Register the workbench route in `web/src/App.tsx` (segment-id param). Do **not** add a `StoryPageNav` tab (route-only).

### 3. Styling

Add two-pane layout styling to `web/src/index.css`.

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
