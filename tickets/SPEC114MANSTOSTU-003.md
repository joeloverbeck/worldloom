# SPEC114MANSTOSTU-003: Records-page delete UX — block dialog with referrer cards

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web client (`web/src/api/records.ts`, `web/src/pages/Records.tsx`); no impact on world canon or story-bundle pipeline (canon-fenced package).
**Deps**: SPEC114MANSTOSTU-002

## Problem

The Records page (`web/src/pages/Records.tsx`) currently surfaces the `inactive_default` outcome as an alert ("Record was archived (active:false) …") with a "Force delete anyway" button as the default next click (lines 396-408). SPEC-114 §2 item 4 requires: normal Delete either hard-deletes (no referrers) or shows a **block dialog** listing referrer cards (via the extended `RecordCard` surface) with edit links and "Resolve these references first"; "Force delete anyway" moves out of the default flow into a warning-gated repair affordance.

## Assumption Reassessment (2026-06-02)

1. `Records.tsx` `handleDelete` (line 220) calls `apiDelete`; the result branches on `outcome === "inactive_default"` (line 398, the alert + force button) and `"force_deleted"` (line 411). The web `DeleteResult` union (`web/src/api/records.ts:23`) carries `inactive_default` (line 26). `RecordCard` (`web/src/components/RecordCard.tsx`) accepts `{summary: ManualRecordSummary, onOpen, recordClass?}` and renders title/class/summary with an `onOpen(id)` activation — the edit-link affordance for referrer cards. The backend now returns a `blocked` outcome with `referrers: Array<{recordClass, summary}>` (SPEC114MANSTOSTU-002).
2. SPEC-114 §2 item 4 + §7 AC 6 define the target UX. No FOUNDATIONS principle gates this frontend surface (canon-fenced package; the spec's §5 marks the canon principles N/A).
3. **Cross-artifact shared boundary under audit**: `web/src/api/records.ts`'s `DeleteResult` union ↔ `Records.tsx`'s `deleteOutcome` branching ↔ the reused `RecordCard` component contract. The union change (drop `inactive_default`, add `blocked` with referrer summaries) and the page's consumption of it must stay in lockstep; `RecordCard` is reused as-is (its `onOpen` provides the edit link).

## Architecture Check

1. Reusing the existing `RecordCard` for referrer cards (rather than a bespoke referrer-list widget) keeps one card presentation across the picker (SPEC-112), the grid, and the block dialog, and gives the author a one-click edit path to clear each blocking reference — cleaner than an id-only error string that forces manual hunting.
2. No backwards-compatibility shim: the `inactive_default` branch is removed outright; the block dialog replaces it rather than coexisting behind a flag.

## Verification Layers

1. Normal Delete with no referrers hard-deletes and clears the selection → web `tsc --noEmit` + manual/RTL check that the `blocked` branch is not entered.
2. Normal Delete with referrers shows referrer cards with edit links + "Resolve these references first" → component render assertion (cards mount from `blocked.referrers`).
3. "Force delete anyway" is not the default next click → grep-proof that the force affordance is rendered only inside the warning-gated repair disclosure, not in the primary block dialog.

## What to Change

### 1. Update the web `DeleteResult` union (`web/src/api/records.ts`)

Remove the `inactive_default` member; add the `blocked` member carrying `referrers: Array<{recordClass: ManualRecordClass; summary: ManualRecordSummary}>` mirroring the backend (SPEC114MANSTOSTU-002). Keep the `force` call separated behind the repair flag (the existing `opts.force` path).

### 2. Rework the delete UX (`web/src/pages/Records.tsx`)

- Replace the `inactive_default` alert + inline force button with a **block dialog**: render each `blocked.referrers` entry as a `RecordCard` (title, class, summary) whose `onOpen` navigates to that referrer for editing; header message "Resolve these references first."
- Move "Force delete anyway" out of the default flow into a clearly-marked, warning-gated repair disclosure (e.g., a collapsed "Repair: force delete…" affordance), never the default next click after a block.
- Keep the `force_deleted` confirmation surface.

## Files to Touch

- `tools/manual-story-studio/web/src/api/records.ts` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify)

## Out of Scope

- Backend delete behavior and `repair-log.yaml` (SPEC114MANSTOSTU-002).
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
