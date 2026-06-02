# SPEC112MANSTOSTU-003: RecordPicker combobox component + client-side multi-class fetch helper

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new `tools/manual-story-studio` web component `RecordPicker.tsx` + a client-side multi-class fetch helper in `web/src/api/records.ts` + picker/popup styling in `web/src/index.css`. New shared component; no impact on existing components until the mount tickets (004-007) consume it.
**Deps**: archive/tickets/SPEC112MANSTOSTU-001.md, archive/tickets/SPEC112MANSTOSTU-002.md

## Problem

SPEC-112 replaces every author-facing ID-typing surface with a searchable, card-based selector. The reusable engine for that is a single `<RecordPicker>` built on the W3C editable-combobox pattern, rendering the extended `RecordCard` as selectable options, with search / class-filter / active-filter / recently-used / pinned / single-and-multi-select / keyboard navigation (§2 items 1-2). It filters client-side over per-class summaries fetched from the existing `?class=` route (§2 item 7) — no new backend route. This ticket builds the component and the fetch helper the four mount sites consume.

## Assumption Reassessment (2026-06-02)

1. No combobox/picker exists today (`RecordPicker.tsx` absent, verified). The web client `listRecords` (`web/src/api/records.ts:66`) fetches one class per call via `?class=`+`?includeArchived`; `MomentComposer.tsx:120-146` already fetches all classes client-side and filters in memory — the pattern this picker generalizes. `MANUAL_RECORD_CLASSES` is exported from `web/src/types/manual-story.js`.
2. SPEC-112 §2 items 1-2-7 and §4 (`RecordPicker.tsx` new, `api/records.ts` modify, `index.css` modify) define this ticket; §2.7 decided client-side filter for v1 (no `?classes=`/`?q=` route). Involved-cast on cards depends on `archive/tickets/SPEC112MANSTOSTU-001.md`; the extended card on `archive/tickets/SPEC112MANSTOSTU-002.md`.
3. Cross-artifact boundary under audit: `RecordPicker`'s prop contract (`classes`, `mode: single|multi`, `seed`/pre-surfaced ids, `value`/`onChange`) is the shared surface that SPEC112MANSTOSTU-004/005/006/007 consume; the multi-class fetch helper in `api/records.ts` is shared with the CurrentStatePanel title-resolution (006). Lock the prop names here so the mount tickets bind against a stable contract.
4. FOUNDATIONS §Tooling Recommendation (least-privilege / ID-free entry, SPEC-112 §5): the picker is the mechanism that removes the author's need to ever type or read an internal id in the normal flow. The card shows the ID only in a disclosure. This ticket must not introduce any path that requires typing a raw id.

## Architecture Check

1. One reusable picker with constrained mounts (vs. per-field bespoke selectors) keeps card presentation consistent and is the surface SPEC-113/-114 reuse (SPEC-112 §3). Client-side filtering over the existing route avoids a new search backend and preserves the no-index discipline.
2. No backwards-compatibility shim: the picker is new; the api helper is a new export. No legacy selector is aliased or kept in parallel — the mount tickets replace the old surfaces outright.

## Verification Layers

1. Picker types and props compile → web `tsc --noEmit` (`npm --prefix web test`).
2. Picker renders `RecordCard` options and filters/searches client-side → web build + the source-structure assertion in SPEC112MANSTOSTU-008.
3. The fetch helper returns class-scoped summaries from the existing route (no new route) → grep-proof that `api/records.ts` adds no new endpoint path and `server/routes/records.ts` is untouched.
4. Keyboard navigation (arrow/Enter/Escape) and single-vs-multi modes are present → type-level + structural assertion in 008 (no DOM harness exists; behavioral runtime testing is out of scope per SPEC-112 §8).

## Landed Changes

### 1. Multi-class fetch helper in `api/records.ts`

Added `ManualRecordSummaryWithClass` and `listRecordsForClasses`, which loops the existing per-class `listRecords` helper and returns merged `{ recordClass, summary }` entries. No server route changed; the helper still uses the existing `?class=` and optional `?includeArchived=true` route shape.

### 2. `RecordPicker.tsx` component

Added the reusable editable-combobox component with `classes`, `mode`, `value`/`onChange`, `seed`, `pinnedIds`, and `recentlyUsedIds` props. It fetches summaries through `listRecordsForClasses`, searches title/summary/tags client-side, supports class and active/inactive/all filters, sections seeded/pinned/recent/match results with duplicate suppression, handles ArrowUp/ArrowDown/Enter/Escape, and renders selectable `RecordCard` options. Selection remains an id-array contract for both single and multi modes, and the ID stays inside the card disclosure rather than becoming the primary label.

### 3. Picker/popup styling in `index.css`

Added the picker layout, selected-chip, popup, option, and section-label styles. The card styling remains owned by `RecordCard`.

## Outcome

`RecordPicker` is now available as the stable shared picker surface for SPEC112MANSTOSTU-004/005/006/007, and `listRecordsForClasses` provides the client-side multi-class summary fetch needed by those mounts without expanding backend search/filter routes.

## Verification Result

1. `(cd tools/manual-story-studio && npm --prefix web test)` passed.
2. `(cd tools/manual-story-studio && npm run build)` passed.
3. `grep -n '?classes=\|?q=' tools/manual-story-studio/web/src/api/records.ts` returned no matches, which is the expected zero-match proof that no `?classes=` or `?q=` route-filter shape was introduced.
4. `(cd tools/manual-story-studio && npm test)` passed: 454 backend tests plus web `tsc --noEmit`.
5. Ignored verification artifacts remained under `tools/manual-story-studio/dist/`, `tools/manual-story-studio/node_modules/`, `tools/manual-story-studio/web/dist/`, and `tools/manual-story-studio/web/node_modules/`.

## Deviations

None. The ticket intentionally did not add a DOM harness or mount the picker; those remain downstream/spec-owned.

## Files to Touch

- `tools/manual-story-studio/web/src/components/RecordPicker.tsx` (new)
- `tools/manual-story-studio/web/src/api/records.ts` (modify)
- `tools/manual-story-studio/web/src/index.css` (modify)

## Out of Scope

- Mounting the picker in any page/component (SPEC112MANSTOSTU-004/005/006/007).
- Create-new-inline / duplicate-existing affordances (SPEC-112 §2 Out of scope — post-segment workbench).
- "Filter by prompt included/excluded" affordance (deferred to SPEC-113 per SPEC-112 §2 Out of scope).
- Any `?classes=`/`?q=` route change or `server/routes/records.ts` edit (SPEC-112 §2.7 — client-side filter).
- A DOM/runtime test harness (SPEC-112 §8 — none exists; not added here).

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/manual-story-studio && npm --prefix web test)` — web `tsc --noEmit` green with the new component + helper.
2. `(cd tools/manual-story-studio && npm run build)` — web build succeeds.
3. `grep -n "?classes=\|?q=" tools/manual-story-studio/web/src/api/records.ts` → zero matches (no route-filter shape introduced).

### Invariants

1. The picker stores/returns an id array identical in shape to what each mount site already persists — entry UX changes, persisted shape does not.
2. Client-side filtering only: no new server route; `server/routes/records.ts` is untouched.
3. The ID is never the primary label — disclosure only.

## Test Plan

### New/Modified Tests

1. `None here — the picker's structural presence and mount points are asserted by SPEC112MANSTOSTU-008 (source-structure node --test); type coverage is web tsc --noEmit. No DOM harness exists (SPEC-112 §8).`

### Commands

1. `(cd tools/manual-story-studio && npm --prefix web test)`
2. `(cd tools/manual-story-studio && npm run build)`
3. Web `tsc --noEmit` + build is the correct boundary for a new typed component with no runtime test harness; behavioral verification is the implementer's manual check plus the 008 structural sweep.
