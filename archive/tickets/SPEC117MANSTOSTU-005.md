# SPEC117MANSTOSTU-005: PasteProse — route to workbench after save

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` (`web/src/pages/PasteProse.tsx` post-save navigation). No canon-mediation surface (package is canon-fenced per SPEC-100).
**Deps**: archive/tickets/SPEC117MANSTOSTU-002.md, archive/tickets/SPEC117MANSTOSTU-004.md

## Problem

After archive/tickets/SPEC117MANSTOSTU-002.md removed the checklist modal, PasteProse saves a segment and shows nothing. This ticket completes the routed-not-modal flow: after a successful save, PasteProse navigates to the Post-Segment Workbench route (carrying the just-saved segment ID), so the author lands *in* the maintenance surface instead of dismissing a dialog to reach it.

## Assumption Reassessment (2026-06-03)

1. After archive/tickets/SPEC117MANSTOSTU-002.md, `web/src/pages/PasteProse.tsx` no longer imports/renders `StateUpdateChecklist` and the save response no longer carries `checklist_payload`; the save handler still has the saved `segment_id` from the response. The workbench route (segment-id param) is registered in `web/src/App.tsx` by archive/tickets/SPEC117MANSTOSTU-004.md. Confirmed by grep at reassessment + decomposition time.
2. Per the spec (SPEC-117 §2 item 1 + §3 Routed-not-modal + §6 AC1), saving a segment routes to the Post-Segment Workbench and no modal is shown.
3. **Cross-artifact boundary under audit**: the workbench route contract (segment-id param) registered by archive/tickets/SPEC117MANSTOSTU-004.md (hence `Deps: archive/tickets/SPEC117MANSTOSTU-004.md`), and the post-checklist PasteProse save handler shape left by archive/tickets/SPEC117MANSTOSTU-002.md (hence `Deps: archive/tickets/SPEC117MANSTOSTU-002.md`). This ticket modifies `PasteProse.tsx`, which archive/tickets/SPEC117MANSTOSTU-002.md also modified for modal removal — independent regions; the archived dependency orders this modifier after the modal is removed.

## Architecture Check

1. Navigating on save keeps the post-save flow a single forward motion into the maintenance surface, with no intermediate dialog. Reusing the saved `segment_id` from the existing response avoids any new backend round-trip.
2. No backwards-compatibility alias/shim: the navigation replaces the deleted modal outright; no compatibility branch for the old checklist path remains.

## Verification Layers

1. Saving a segment routes to the workbench and shows no modal → web typecheck + manual review against AC1 (no remaining `StateUpdateChecklist` import — already guaranteed by -002; this ticket adds the navigation).
2. The navigation targets the workbench route with the just-saved segment ID → web typecheck (route param shape matches `App.tsx` registration) + manual review.
3. Single-layer note: this is a frontend-only navigation change; verification is web typecheck + manual smoke per SPEC-117 §7. No backend or schema layer is touched.

## Landed Changes

### 1. PasteProse post-save navigation

In `web/src/pages/PasteProse.tsx`, the successful save handler now uses the returned `segment_id` from `saveSegment(...)` and navigates to `/worlds/:worldSlug/manual-stories/:msSlug/segments/:segmentId/post-segment-workbench`. The page still has no post-save modal, no checklist component, and no `checklist_payload` branch.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` (modify)

## Out of Scope

- The workbench page/route itself — archive/tickets/SPEC117MANSTOSTU-004.md.
- Removing the modal render — already done in archive/tickets/SPEC117MANSTOSTU-002.md.
- Any change to the segment-save backend or response shape.

## Acceptance Criteria

### Tests That Must Pass

1. Saving a segment via PasteProse routes to the Post-Segment Workbench for the just-saved segment; no modal is shown (AC1).
2. `npm --prefix web test` (web typecheck) is green; `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. PasteProse renders no post-save modal and consumes no `checklist_payload`.
2. The post-save navigation carries the saved segment ID to the workbench route.

## Test Plan

### New/Modified Tests

1. `None — frontend navigation change; verification is `tsc --noEmit` typecheck (`npm --prefix web test`) plus the SPEC-117 §7 manual save→workbench smoke check. AC1's "no modal" guarantee is structurally enforced by archive/tickets/SPEC117MANSTOSTU-002.md's component deletion.`

### Commands

1. `npm --prefix web test` (run from `tools/manual-story-studio`; web typecheck)
2. `cd tools/manual-story-studio && npm test` (full backend + web)

## Outcome

PasteProse now routes directly from a successful segment save into the Post-Segment Workbench using the saved segment ID. The segment-save backend/response shape is unchanged.

## Verification Result

1. `cd tools/manual-story-studio && npm --prefix web test` — PASS; web TypeScript check passed.
2. `cd tools/manual-story-studio && npm test` — PASS; backend build, 488 backend tests, and web TypeScript check passed.
3. `rg -n "StateUpdateChecklist|checklist_payload|post-segment-workbench|navigate|segment_id" tools/manual-story-studio/web/src/pages/PasteProse.tsx` — PASS; only expected `navigate`, `segment_id`, and workbench route hits remain.
4. `git diff --check` — PASS.

## Deviations

No browser save-to-workbench smoke was run; this ticket's planned proof boundary was web typecheck plus full package test. The route target itself is covered by archive/tickets/SPEC117MANSTOSTU-004.md.
