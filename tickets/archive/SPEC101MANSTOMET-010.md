# SPEC101MANSTOMET-010: Dashboard cockpit page with App.tsx route

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `web/src/pages/Dashboard.tsx`; modifies `web/src/App.tsx` to register `/dashboard` route.
**Deps**: SPEC101MANSTOMET-008

## Problem

The Dashboard is the single-pane cockpit where the author opens Manual Studio after picking a manual story: it surfaces the story contract (premise, tone, POV, tense, content intensity, prose preferences), the current directive draft, the active cast, active high-importance records, open clocks/secrets/questions counts with drill-down, the latest segment preview, and a "Generate Prompt" primary action. SPEC-101 §2.8 enumerates the widgets; SPEC-101 §7 AC #7 names the test contract ("Dashboard renders all widgets with live data from the loaded manual story"). The Dashboard is the author's home screen — without it, the Manual Studio UX has no central authoring hub and the author would land on the Records page (a CRUD surface) for every session-start.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/web/src/pages/` exists with the SPEC-100 pages and (after SPEC101MANSTOMET-009) Records + CastAndProfiles; this ticket adds `Dashboard.tsx` as a sibling page. `web/src/App.tsx` is modified by both SPEC101MANSTOMET-009 and this ticket; each adds its own `<Route>` entry (mechanical merge conflict, no semantic overlap).
2. SPEC-101 §2.8 enumerates the widgets:
   - Story contract summary (premise, tone, POV, tense, content intensity, prose preferences)
   - Current directive draft (free-text input that becomes SPEC-102's moment directive)
   - Active cast list (with role badges)
   - Active high-importance records (top 20 by importance, filterable)
   - Open clocks / secrets / questions (counts + drill-down)
   - Latest segment (preview, last edited timestamp)
   - Manuscript word count (computed in SPEC-103)
   - "Generate Prompt" primary action (navigates to SPEC-102's Moment Composer)
3. Cross-artifact boundary under audit: Dashboard composes API client functions (`readMetadata`, `listRecords` per class, eventually `listSegments` from SPEC-103) and reusable components (RecordCard for the active-records widget; potentially a new compact role-badge component). The "Manuscript word count" widget shows a placeholder for SPEC-101 (SPEC-103 wires the actual computation); the "Generate Prompt" action shows a placeholder link for SPEC-101 (SPEC-102 wires the actual Moment Composer navigation). SPEC-101 ships the layout skeleton + the widgets whose data sources exist in SPEC-101 scope (story contract, cast, records, clocks/secrets/questions counts).

## Architecture Check

1. A single-page Dashboard composed of named widget components (vs. one giant render block) is cleaner — each widget can be tested in isolation, and SPEC-102/103 wiring (replacing the manuscript-word-count placeholder, wiring the Generate Prompt action) becomes a localized edit. The Dashboard page itself is the layout shell.
2. No backwards-compatibility shims. The Dashboard is a new page; the placeholder widgets for SPEC-102/103 functionality are explicit `<div>Placeholder — wired in SPEC-103</div>`-style markers, not silently-broken UI.

## Verification Layers

1. `/worlds/:worldSlug/manual-stories/:msSlug/dashboard` route renders the Dashboard layout → web component test.
2. Story contract widget renders all SPEC-101 §2.1 metadata fields → component test asserting each field's rendered value.
3. Active cast list renders cast records with role badges → component test.
4. Active high-importance records widget filters and sorts correctly → component test.
5. Open clocks / secrets / questions widget shows correct counts + drill-down link → component test.

## What to Change

### 1. Create `tools/manual-story-studio/web/src/pages/Dashboard.tsx`

Page structure:

- Fetch `readMetadata(worldSlug, msSlug)` for story contract + directive draft (directive lives in a SPEC-101-introduced section of the metadata if not already; OR is held in local component state for SPEC-101 with SPEC-102 wiring the actual save).
- Fetch `listRecords(worldSlug, msSlug, "cast")` for active cast.
- Fetch `listRecords` for `beliefs`, `intentions`, `plans`, etc., filter by `importance: high | central`, sort and slice to top 20 for the active high-importance records widget.
- Fetch `listRecords(worldSlug, msSlug, "clocks")`, `"secrets"`, `"questions"` for counts.
- Render the widgets in a single-pane layout:
  - **Story Contract**: rendered values for premise, tone, pov, tense, content_intensity, language_register, prose_preferences.*
  - **Directive Draft**: textarea (placeholder; SPEC-102 wires the save-and-compose)
  - **Active Cast**: list of cast records with role badges
  - **High-Importance Records**: top 20 by importance with class indicator, click → navigate to Records page filtered to that class + record
  - **Open Tracking**: 3 counts (clocks + secrets + questions) each with drill-down link
  - **Latest Segment**: placeholder for SPEC-103 (`<div>Wired in SPEC-103</div>`)
  - **Manuscript Word Count**: placeholder for SPEC-103
  - **Generate Prompt**: button with placeholder link `/worlds/:worldSlug/manual-stories/:msSlug/compose` (route doesn't exist yet; SPEC-102 wires the target page)

### 2. Modify `tools/manual-story-studio/web/src/App.tsx`

Add one new `<Route>` entry inside the existing `<Routes>` block:

```typescript
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/dashboard"
  element={<Dashboard />}
/>
```

Add the Dashboard import at the top of App.tsx.

**Coordination note**: SPEC101MANSTOMET-009 also adds route entries (`/records` and `/cast`) to this `<Routes>` block; both tickets modify App.tsx independently — implementer merges the route additions mechanically (no semantic overlap; the three new routes occupy disjoint URL paths).

### 3. Tests

Create `tools/manual-story-studio/web/src/pages/Dashboard.test.tsx` covering:

- Renders all 8 widgets from SPEC-101 §2.8 (presence test, even when underlying data is empty fixture).
- Story Contract widget renders metadata fields when metadata fixture is provided.
- Active Cast list renders cast records with role badges.
- High-Importance Records widget filters to `importance: high | central` and limits to 20.
- Open Tracking widget shows correct counts derived from `listRecords` results.
- Placeholder widgets (Latest Segment, Manuscript Word Count) render the explicit "Wired in SPEC-103" marker.
- "Generate Prompt" button is present and links to the SPEC-102 placeholder path.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (new)
- `tools/manual-story-studio/web/src/pages/Dashboard.test.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)

## Out of Scope

- Manuscript Word Count computation — SPEC-103.
- Latest Segment preview / last edited timestamp — SPEC-103.
- Generate Prompt action wiring (Moment Composer page + the actual prompt generation) — SPEC-102.
- Directive draft save flow — SPEC-102 (Manual Studio retains directive in component state for SPEC-101 if not persisted in metadata).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including new `Dashboard.test.tsx`.
2. `cd tools/manual-story-studio && npm run build` succeeds (backend + web build).
3. `grep -c "Wired in SPEC-10[23]" tools/manual-story-studio/web/src/pages/Dashboard.tsx` returns ≥ 2 (Latest Segment + Manuscript Word Count placeholders explicitly marked).

### Invariants

1. Dashboard renders all 8 widgets from SPEC-101 §2.8 — invariant against silent widget drop (SPEC-101 §7 AC #7).
2. Placeholder widgets are EXPLICITLY marked as deferred-to-SPEC-102/103, not silently empty — discoverability for the implementer of SPEC-102/103.
3. App.tsx modification is ADDITIVE; existing 3 SPEC-100 routes + 2 SPEC101MANSTOMET-009 routes + 1 this-ticket route = 6 total routes, all preserved.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/pages/Dashboard.test.tsx` — 8-widget render test + per-widget data-binding tests.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio/web && npm test` — web-only suite for component dev-loop.
