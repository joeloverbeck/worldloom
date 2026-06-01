# SPEC108MANSTOSTU-005: Manuscript + SegmentListItem remove Edit/Delete buttons

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/web/src/pages/Manuscript.tsx` (removes `handleEdit` / `handleDelete` handlers, the `deleteSegment` import, and the per-segment Edit/Delete dispatch; adds a "Repair this segment" disclosure link) and `tools/manual-story-studio/web/src/components/SegmentListItem.tsx` (drops `onEdit` / `onDelete` props from the component's API and removes the toolbar buttons block).
**Deps**: None

## Problem

SPEC-108 makes accepted manuscript text immutable from the primary UX: the Manuscript page renders segments as read-only manuscript text with no per-segment Edit or Delete affordances. The current implementation exposes both via `<SegmentListItem onEdit={handleEdit} onDelete={(id) => void handleDelete(id)} />` (`Manuscript.tsx:216-217`); `SegmentListItem` itself unconditionally renders Edit + Delete buttons in a toolbar. This ticket strips both layers: Manuscript stops passing the handlers (and removes the handler bodies + the `deleteSegment` import); SegmentListItem drops the props entirely so the buttons are gone from the component's surface. A small "Repair this segment" disclosure link is added to Manuscript, routing to the repair page (ticket 007) with the segment pre-selected.

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/web/src/pages/Manuscript.tsx` exists at HEAD with `deleteSegment` imported at line 10 (alongside other names), `handleEdit` defined at lines 101-108, `handleDelete` defined at lines 110-147, and `<SegmentListItem onEdit={handleEdit} onDelete={...} />` dispatch at lines 209-217. `tools/manual-story-studio/web/src/components/SegmentListItem.tsx` exists at HEAD with `onEdit` and `onDelete` declared as required props at lines 7-8 and unconditionally rendered as buttons at lines 56-61 (inside the `<div role="toolbar">` block at lines 51-62).
2. SPEC-108 §2 item 10 and §4 Manuscript.tsx / SegmentListItem.tsx bullets describe these specific removals. SPEC-108 §3 Key decisions affirms "PasteProse and Manuscript lose write affordances; gain no replacement". The "Repair this segment" link in §2 item 10 routes to the repair page with the segment pre-selected.
3. Cross-skill boundary: `SegmentListItem` is consumed only by `Manuscript.tsx` (verified at HEAD — `grep -rln "SegmentListItem" tools/manual-story-studio/web/src/` returns the component file + Manuscript.tsx only). Dropping `onEdit` / `onDelete` from the props is safe — no other consumer needs updating. The shared boundary is the component's `SegmentListItemProps` interface; the strip is structural (props removed, not weakened).
4. FOUNDATIONS Rule 6 (No Silent Retcons): the removal of Edit/Delete affordances is a visible UX change — the buttons disappear from the rendered DOM, and the React props that drive them are removed from the component's TypeScript interface. The change is greppable (`grep -n "onEdit\|onDelete" tools/manual-story-studio/web/src/components/SegmentListItem.tsx` returns 0 after the strip) and visually obvious (the toolbar is empty). The "Repair this segment" link is the user-facing replacement entry point for the legitimate corrupted-segment case.
5. (was template item 7 — Manuscript Edit/Delete affordances + SegmentListItem `onEdit`/`onDelete` props removed): pipeline-wide grep for `SegmentListItem` confirms only Manuscript.tsx consumes the component. Pipeline-wide grep for `handleEdit\|handleDelete` in `tools/manual-story-studio/web/src/pages/` confirms these handlers are local to Manuscript.tsx only. No other consumer needs updating. The `formatDeleteWarning` / `isDeleteSegmentResponse` helpers at Manuscript.tsx:19-30 become dead code after the strip and are removed alongside `handleDelete`.

## Architecture Check

1. The strip is structural — props removed from the component's TypeScript interface, not just hidden behind a conditional. This forces a compile error at any caller still trying to pass the old props (TypeScript catches the regression at type-check time), which is the cleanest enforcement of the "no Edit/Delete from Manuscript" contract. Alternative considered: leave the props optional with no-op defaults (rejected — encourages future re-introduction of the affordance, contradicting SPEC-108 §3 Key decisions' "fewer affordances, not relocated affordances" stance).
2. The "Repair this segment" link is a `<Link>` to the repair page, with the segment id passed as a `?segment_id=SEG-N` query parameter so RepairSegments (ticket 007) can pre-select that segment on load. The link styling is intentionally small and disclosure-like per SPEC-108 §2 item 10 — it must not invite primary-flow use.
3. No backwards-compatibility shims — the `handleEdit` / `handleDelete` handlers and the `formatDeleteWarning` / `isDeleteSegmentResponse` helpers are removed outright. The `deleteSegment` import is removed; `listSegments` + `DeleteSegmentResponse` type stays (DeleteSegmentResponse is not removed from `web/src/api/segments.ts` per ticket 003 — only its frontend usage in Manuscript.tsx is removed).

## Verification Layers

1. Manuscript imports stripped -> codebase grep-proof (`grep -n "deleteSegment\|handleEdit\|handleDelete\|formatDeleteWarning\|isDeleteSegmentResponse" tools/manual-story-studio/web/src/pages/Manuscript.tsx` returns 0 matches).
2. SegmentListItem props stripped -> codebase grep-proof (`grep -n "onEdit\|onDelete" tools/manual-story-studio/web/src/components/SegmentListItem.tsx` returns 0 matches).
3. SegmentListItem buttons removed -> codebase grep-proof (`grep -n "<button.*Edit\|<button.*Delete\|role=\"toolbar\"" tools/manual-story-studio/web/src/components/SegmentListItem.tsx` returns 0 matches).
4. "Repair this segment" link present -> codebase grep-proof (`grep -n "Repair this segment\|/repair" tools/manual-story-studio/web/src/pages/Manuscript.tsx` returns ≥1 match).
5. Frontend bundle typechecks -> `npm --prefix tools/manual-story-studio/web test` passes (the strip causes type errors if Manuscript still tries to pass `onEdit` / `onDelete`; the test surfaces any miss).

## What to Change

### 1. Strip Manuscript handlers and imports

In `tools/manual-story-studio/web/src/pages/Manuscript.tsx`:

- From the `../api/segments.js` import (line 10), remove `deleteSegment` and `type DeleteSegmentResponse`; keep `listSegments` and `type SegmentListEntry`.
- Remove the `isDeleteSegmentResponse` function (lines 19-23) and the `formatDeleteWarning` function (lines 25-30) — both are dead code after `handleDelete` is removed.
- Remove the `handleEdit` function (lines 101-108) and the `handleDelete` function (lines 110-147).
- Update the `<SegmentListItem ... />` dispatch (currently lines 209-217) to remove `onEdit={handleEdit}` and `onDelete={(id) => void handleDelete(id)}` props.

### 2. Add "Repair this segment" disclosure link to Manuscript

Inside the `<aside aria-label="segments">` block (currently lines 202-222), beneath the `<SegmentListItem>` for each segment OR as a per-row disclosure, render a small `<Link>` per segment:

```tsx
<Link
  to={`/worlds/${worldSlug}/manual-stories/${msSlug}/repair?segment_id=${encodeURIComponent(segment.id)}`}
  style={{ fontSize: "0.8em", color: "#888", marginTop: 4, display: "block" }}
>
  Repair this segment
</Link>
```

The exact placement (inside `<SegmentListItem>` vs alongside it) is an implementation detail; the constraint is that the link is small, per-segment, and visually subordinate to the segment title.

Import `Link` from `react-router-dom` if not already imported (the current import at line 2 brings in `useNavigate, useParams` — extend to `Link, useNavigate, useParams`).

### 3. Strip SegmentListItem props and buttons

In `tools/manual-story-studio/web/src/components/SegmentListItem.tsx`:

- Remove `onEdit` and `onDelete` from the `SegmentListItemProps` interface (lines 7-8).
- Remove the same props from the destructured arguments at lines 17-18.
- Remove the entire `<div role="toolbar">` block (lines 51-62) including the Edit and Delete buttons.

After the strip, `SegmentListItem`'s rendered output is the title + segment id + word count inside a clickable `<button>` (the existing select-button at lines 32-50, kept unchanged).

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Manuscript.tsx` (modify)
- `tools/manual-story-studio/web/src/components/SegmentListItem.tsx` (modify)

## Out of Scope

- Backend route changes (ticket 002).
- PasteProse strip (ticket 004).
- Dashboard link (ticket 006).
- RepairSegments page (ticket 007).
- Removing the existing "Rebuild Manuscript" button at Manuscript.tsx:172-178 — that affordance is unrelated to segment lifecycle and is preserved.
- Removing the "Reorder" disabled button at Manuscript.tsx:179-183 — that affordance is gated on `metadata?.manuscript.allow_reorder === true` (the metadata default is `false` per the report §3 verification, so the button doesn't render in practice); leave the conditional in place.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (which is `tsc --noEmit`) succeeds.
2. `grep -n "deleteSegment\|handleEdit\|handleDelete" tools/manual-story-studio/web/src/pages/Manuscript.tsx` returns 0 matches.
3. `grep -n "onEdit\|onDelete" tools/manual-story-studio/web/src/components/SegmentListItem.tsx` returns 0 matches.
4. `grep -n "Repair this segment" tools/manual-story-studio/web/src/pages/Manuscript.tsx` returns 1 match.

### Invariants

1. The Manuscript page renders segments as immutable manuscript text — no Edit/Delete affordances reach the DOM.
2. `SegmentListItem`'s API consists of: `segmentId`, `title`, `wordCount`, optional `selected`, optional `onSelect`. No write-action props remain.
3. The "Repair this segment" link, when rendered, constructs a URL of shape `/worlds/<worldSlug>/manual-stories/<msSlug>/repair?segment_id=<SEG-N>` — the repair page (ticket 007) reads this query parameter to pre-select the named segment on mount.

## Test Plan

### New/Modified Tests

1. `None — frontend page + component strip; verification is the typecheck pass plus the grep-proofs above. End-to-end coverage of the repair-mode UX (link → page → repair action) is covered manually per SPEC-108 §6 Build & test.`

### Commands

1. `cd tools/manual-story-studio/web && npm test` — TypeScript typecheck.
2. `cd tools/manual-story-studio && npm test` — full backend + frontend test suite.
