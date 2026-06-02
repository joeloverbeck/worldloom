# SPEC114MANSTOSTU-003: Records-page delete UX — block dialog with referrer cards

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web client (`web/src/api/records.ts`, `web/src/pages/Records.tsx`); no impact on world canon or story-bundle pipeline (canon-fenced package).
**Deps**: archive/tickets/SPEC114MANSTOSTU-002.md

## Problem

The Records page (`web/src/pages/Records.tsx`) currently surfaces the `inactive_default` outcome as an alert ("Record was archived (active:false) …") with a "Force delete anyway" button as the default next click (lines 396-408). SPEC-114 §2 item 4 requires: normal Delete either hard-deletes (no referrers) or shows a **block dialog** listing referrer cards (via the extended `RecordCard` surface) with edit links and "Resolve these references first"; "Force delete anyway" moves out of the default flow into a warning-gated repair affordance.

## Assumption Reassessment (2026-06-02)

1. `Records.tsx` `handleDelete` (line 220) calls `apiDelete`; the result branches on `outcome === "inactive_default"` (line 398, the alert + force button) and `"force_deleted"` (line 411). The web `DeleteResult` union (`web/src/api/records.ts:23`) carries `inactive_default` (line 26). `RecordCard` (`web/src/components/RecordCard.tsx`) accepts `{summary: ManualRecordSummary, onOpen, recordClass?}` and renders title/class/summary with an `onOpen(id)` activation — the edit-link affordance for referrer cards. The backend now returns a `blocked` outcome with `referrers: Array<{recordClass, summary}>` (archive/tickets/SPEC114MANSTOSTU-002.md).
2. SPEC-114 §2 item 4 + §7 AC 6 define the target UX. No FOUNDATIONS principle gates this frontend surface (canon-fenced package; the spec's §5 marks the canon principles N/A).
3. **Cross-artifact shared boundary under audit**: `web/src/api/records.ts`'s `DeleteResult` union ↔ `Records.tsx`'s `deleteOutcome` branching ↔ the reused `RecordCard` component contract. The union change (drop `inactive_default`, add `blocked` with referrer summaries) and the page's consumption of it must stay in lockstep; `RecordCard` is reused as-is (its `onOpen` provides the edit link).

## Architecture Check

1. Reusing the existing `RecordCard` for referrer cards (rather than a bespoke referrer-list widget) keeps one card presentation across the picker (SPEC-112), the grid, and the block dialog, and gives the author a one-click edit path to clear each blocking reference — cleaner than an id-only error string that forces manual hunting.
2. No backwards-compatibility shim: the `inactive_default` branch is removed outright; the block dialog replaces it rather than coexisting behind a flag.

## Verification Layers

1. Normal Delete with no referrers hard-deletes and clears the selection → web `tsc --noEmit` + manual/RTL check that the `blocked` branch is not entered.
2. Normal Delete with referrers shows referrer cards with edit links + "Resolve these references first" → component render assertion (cards mount from `blocked.referrers`).
3. "Force delete anyway" is not the default next click → grep-proof that the force affordance is rendered only inside the warning-gated repair disclosure, not in the primary block dialog.

## Landed Changes

### 1. Updated the web `DeleteResult` union (`web/src/api/records.ts`)

Removed the `inactive_default` member and added the `blocked` member carrying `referrers: Array<{recordClass: ManualRecordClass; summary: ManualRecordSummary}>` mirroring the backend (archive/tickets/SPEC114MANSTOSTU-002.md). The client force path now sends `?force=true&mode=repair`, keeping force-delete behind the explicit repair flag established by the backend route.

### 2. Reworked the delete UX (`web/src/pages/Records.tsx`)

Replaced the `inactive_default` alert + inline force button with a block panel headed "Resolve these references first." Each `blocked.referrers` entry renders through the existing `RecordCard` with class/title/summary and opens the referrer for editing. "Force delete anyway" now lives inside a collapsed repair disclosure; the `force_deleted` confirmation surface remains.

### 3. Added a source-level UX regression (`test/web/records-delete-ux.test.ts`)

Added a focused static regression matching this package's existing web test style. It asserts the records client/page no longer reference `inactive_default`, the block branch renders `RecordCard` referrers, and the force-delete button is inside the blocked repair disclosure.

## Files to Touch

- `tools/manual-story-studio/web/src/api/records.ts` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify)

## Out of Scope

- Backend delete behavior and `repair-log.yaml` (archive/tickets/SPEC114MANSTOSTU-002.md).
- Beat-template delete UX (SPEC114MANSTOSTU-004).
- Any new "mark inactive" control — `active` remains editable via the existing `RecordForm` (SPEC-114 §1.1); no new toggle widget is required here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` — web `tsc --noEmit` passes with the updated `DeleteResult` union and no remaining `inactive_default` references in `Records.tsx`.
2. The block dialog renders one `RecordCard` per referrer with an edit link; "Force delete anyway" appears only inside the warning-gated repair disclosure.

### Invariants

1. No code path in `Records.tsx` reads or renders an `inactive_default` outcome.
2. The default post-block click is "edit a referrer", never "force delete".

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web` `tsc --noEmit` (via `npm test`) — type-level proof the union change is consumed coherently. (No new RTL test file required; if the package gains component tests later, the block-dialog render is the assertion target.)

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `grep -n "inactive_default" tools/manual-story-studio/web/src/pages/Records.tsx tools/manual-story-studio/web/src/api/records.ts` → expect zero matches.
3. Full `npm test` (not `test:backend`) is the correct boundary — this ticket's surface is the web `tsc --noEmit` pass, which `test:backend` does not run.

## Outcome

Completed on 2026-06-02.

The Records page now consumes the SPEC-114 backend delete contract: unreferenced deletes clear the selection after `hard_deleted`, referenced deletes show a referrer-card blocker instead of auto-archive messaging, and force-delete is only reachable from a collapsed repair disclosure that sends the repair mode required by the records route.

## Verification Result

- `cd tools/manual-story-studio && npm run test` — PASS: 470 backend/static tests passed, followed by web `tsc -p tsconfig.json --noEmit`.
- `rg -n "inactive_default" tools/manual-story-studio/web/src/pages/Records.tsx tools/manual-story-studio/web/src/api/records.ts` — PASS: no matches.
- `rg -n 'Force delete anyway|<details|deleteOutcome\.outcome === "blocked"|<RecordCard' tools/manual-story-studio/web/src/pages/Records.tsx tools/manual-story-studio/test/web/records-delete-ux.test.ts` — PASS: block branch, referrer-card render, collapsed repair disclosure, and force action are present.
- `git diff --check` — PASS.

## Deviations

- The requested block-dialog proof landed as a source-level regression test rather than a runtime RTL/browser test because this package's current web test boundary is TypeScript plus source assertions; no component test harness is present.
