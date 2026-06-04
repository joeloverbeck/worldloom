# SPEC101MANSTOMET-009: Records + Cast & Profiles pages with App.tsx routes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `web/src/pages/Records.tsx` + `CastAndProfiles.tsx`; modifies `web/src/App.tsx` to register `/records` and `/cast` routes.
**Deps**: SPEC101MANSTOMET-008

## Problem

The Records screen is the primary authoring surface in Manual Studio: a three-pane layout where the author navigates record classes on the left, browses record cards in the center (with filters), and edits the selected record's form on the right. The Cast & Profiles editor is a specialization of the Records screen for the `cast/` class, surfacing the Manual Character Profile §3 nested sections in a dedicated layout. SPEC-101 §2.7 + §7 AC #6 + #8 name the contracts; without this ticket, the components from SPEC101MANSTOMET-008 have no host page and the API endpoints from SPEC101MANSTOMET-007 are not reachable from the UI.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/web/src/pages/` exists with Worlds.tsx, ManualStories.tsx, CreateManualStory.tsx (verified earlier via `ls tools/manual-story-studio/web/src/pages/`). This ticket adds `Records.tsx` and `CastAndProfiles.tsx` as sibling pages. `web/src/App.tsx` currently registers 3 routes (`/`, `/worlds/:worldSlug/manual-stories`, `/worlds/:worldSlug/manual-stories/new`); this ticket modifies App.tsx to add the records + cast routes under a `:worldSlug` + `:msSlug` scope.
2. SPEC-101 §2.7 names the three-pane Records screen contract: *"Three-pane layout: left rail (class navigation; per-class counts; active vs archived toggle), center (record card grid; filters by tag / importance / role; 'New Record' button), right (per-record YAML-backed form with class-specific field sections). Cast & Profile editor is a specialization of the Records screen for the `cast/` class."* SPEC-101 §7 AC #6 + #8 name the test contracts (Cast & Profile editor renders + section fields editable + `source_world_character` read-only; Records screen three-pane layout + filtering + active/archived toggle).
3. Cross-artifact boundary under audit: pages compose API client functions (SPEC101MANSTOMET-008) + RecordCard/RecordForm/RefList components (SPEC101MANSTOMET-008). The App.tsx modification is ADDITIVE — existing SPEC-100 routes remain unchanged; new routes added under a disjoint URL space (`/worlds/:worldSlug/manual-stories/:msSlug/records` and `/cast`). T010 (Dashboard) ALSO modifies App.tsx (shared file overlap: each ticket adds its own route; mechanical merge conflict, no semantic overlap).

## Architecture Check

1. The Records page hosts the three-pane layout; the Cast & Profiles page is a thin specialization that constrains `recordClass` to `"cast"` and configures RecordForm to render the Manual Character Profile §3 nested sections. The specialization-via-prop pattern is cleaner than a full page duplication — RecordForm's class-aware rendering (SPEC101MANSTOMET-008) is the load-bearing abstraction; the two pages differ only in the navigation chrome and which class(es) are selectable.
2. No backwards-compatibility shims. SPEC-100's three pages (Worlds, ManualStories, CreateManualStory) remain unchanged; the new pages occupy new URL slots.

## Verification Layers

1. `/worlds/:worldSlug/manual-stories/:msSlug/records` route renders the three-pane layout → web component test.
2. Left rail shows 18 class entries with per-class counts (from `listRecords` calls) and the active/archived toggle → component test asserting all 18 class navigation items are present.
3. Tag filter + importance filter narrow the center pane's card list → component test asserting filter application.
4. `/worlds/:worldSlug/manual-stories/:msSlug/cast` route renders the Cast & Profile editor with all Manual Character Profile §3 sections editable and `source_world_character` read-only → component test (SPEC-101 §7 AC #6).

## What to Change

### 1. Create `tools/manual-story-studio/web/src/pages/Records.tsx`

Page structure:

- **Left rail**: 18 class entries derived from `MANUAL_RECORD_CLASS_PREFIXES` (SPEC101MANSTOMET-001); each shows `<className> (count)`; active/archived toggle at the top.
- **Center pane**: when a class is selected, fetch `listRecords(worldSlug, msSlug, className)` and render the result as a grid of `RecordCard` components (SPEC101MANSTOMET-008); above the grid render filter controls (tag chip filter, importance multi-select, optional role filter for cast); above filters render a "New Record" button.
- **Right pane**: when a record is selected (via click on a card), fetch `readRecord(worldSlug, msSlug, className, id)` and render the result in `RecordForm` (SPEC101MANSTOMET-008); on save call `updateRecord`; on save with broken refs surface the "Save anyway?" prompt; on "New Record" click open RecordForm with an empty initial.
- Hook URL routing for sub-state: `?class=<className>&id=<id>` reflected in browser history so deep linking works.

### 2. Create `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx`

Page structure:

- **Left rail**: filtered to cast records only; each shows display_name + role badges (from ManualCharacterProfile.roles).
- **Center pane** (or merged with left for a 2-pane layout): grid of RecordCard rendering cast records.
- **Right pane**: `RecordForm` configured with `recordClass="cast"` so the SPEC101MANSTOMET-008 RecordForm's Cast specialization (§3 nested sections + read-only `source_world_character`) renders. Per SPEC-101 §7 AC #6: *"all section fields editable; the `source_world_character: CHAR-*` field is read-only."*

### 3. Modify `tools/manual-story-studio/web/src/App.tsx`

Add two new `<Route>` entries inside the existing `<Routes>` block (after existing routes):

```typescript
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/records"
  element={<Records />}
/>
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/cast"
  element={<CastAndProfiles />}
/>
```

Add corresponding imports at the top of App.tsx. **Coordination note**: T010 (Dashboard) also adds a route entry to this `<Routes>` block; both tickets modify App.tsx independently — implementer merges the two route additions mechanically. No semantic overlap (different URL paths).

### 4. Navigation chrome

Update the existing `<nav>` block in App.tsx to add links to the new pages when a manual-story context is active. (Implementer judgment on chrome shape; the spec says "Records screen three-pane layout works", not "Records reachable from a specific link".)

### 5. Tests

Create `tools/manual-story-studio/web/src/pages/Records.test.tsx` covering:

- Renders three-pane layout (left rail visible, center pane visible, right pane visible or empty-state).
- Left rail shows 18 class entries.
- Class selection fetches `listRecords` and renders cards.
- Tag filter narrows the rendered card set.
- Importance filter narrows the rendered card set.
- Active/archived toggle switches between `includeArchived: false` and `true`.
- "New Record" button opens an empty RecordForm.
- Card click opens RecordForm with the selected record.

Create `tools/manual-story-studio/web/src/pages/CastAndProfiles.test.tsx` covering:

- Renders Cast & Profile layout (constrained to `cast/` class).
- RecordForm renders Manual Character Profile §3 nested sections.
- `source_world_character: CHAR-*` field renders READ-ONLY (not editable) — SPEC-101 §7 AC #6.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Records.tsx` (new)
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` (new)
- `tools/manual-story-studio/web/src/pages/Records.test.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)

## Out of Scope

- Dashboard page — SPEC101MANSTOMET-010 (separate page, separate route).
- World-canon `CHAR-*` display (showing source-world character details inline in the Cast editor) — M6 deferral per SPEC-101 §8 Risks.
- Full-text search across records — M6 deferral per SPEC-101 §2 Out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including new `Records.test.tsx` + `CastAndProfiles.test.tsx`; SPEC-100 capstone test still passes.
2. `cd tools/manual-story-studio && npm run build` succeeds (backend + web build).
3. `grep -c "<Route" tools/manual-story-studio/web/src/App.tsx` returns ≥ 5 (3 existing SPEC-100 routes + 2 new); the existing routes are unchanged (the modification is additive only).

### Invariants

1. The Cast & Profile editor's `source_world_character` field is READ-ONLY — invariant for SPEC-101 §7 AC #6.
2. Records page renders all 18 class entries in the left rail — invariant against silently dropping a class.
3. Active/archived toggle correctly passes `includeArchived` to `listRecords` — invariant for archived-record visibility.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/pages/Records.test.tsx` — three-pane layout + filter + class-navigation + active/archived toggle tests.
2. `tools/manual-story-studio/web/src/pages/CastAndProfiles.test.tsx` — Cast specialization tests including read-only `source_world_character`.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio/web && npm test` — web-only test suite for page dev-loop.
