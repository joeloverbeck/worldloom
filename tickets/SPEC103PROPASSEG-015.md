# SPEC103PROPASSEG-015: App.tsx route additions + Dashboard.tsx wiring (Latest segment + Manuscript word count)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/web/src/App.tsx` to register three new page routes (`/paste-prose`, `/manuscript`, `/prompt-history` under the existing `/worlds/:worldSlug/manual-stories/:msSlug/` prefix); modifies `tools/manual-story-studio/web/src/pages/Dashboard.tsx` to replace two SPEC-103 placeholders (Latest segment + Manuscript word count) with real wiring to the segments + manuscript API clients.
**Deps**: archive/tickets/SPEC103PROPASSEG-011.md, archive/tickets/SPEC103PROPASSEG-013.md, archive/tickets/SPEC103PROPASSEG-014.md

## Problem

SPEC-103 §4 Modify enumerates `web/src/App.tsx` (add three new routes — refined per the reassessment M2 finding to use full `/worlds/:worldSlug/manual-stories/:msSlug/` prefix consistent with the existing route shape at App.tsx:34-61) and `web/src/pages/Dashboard.tsx` (wire the manuscript word count widget — extended at reassessment time to also wire the Latest segment widget, since Dashboard.tsx already carries two SPEC-103 placeholders at L218 and L223 per existing code: `<div>Wired in SPEC-103</div>` for Latest segment and the same for Manuscript word count). This ticket is the final UI integration — the routes light up the three new pages from `archive/tickets/SPEC103PROPASSEG-011.md`, `archive/tickets/SPEC103PROPASSEG-013.md`, and `archive/tickets/SPEC103PROPASSEG-014.md`, and Dashboard becomes a real dashboard with live segment + manuscript metrics rather than placeholders.

## Assumption Reassessment (2026-05-31)

1. Existing `tools/manual-story-studio/web/src/App.tsx:34-61` registers all routes under the `/worlds/:worldSlug/manual-stories/:msSlug/` prefix (e.g., `.../dashboard`, `.../records`, `.../cast`, `.../moment-composer`, `.../prompts/preview`). The three new routes follow the same prefix per reassessment M2 finding. Existing `tools/manual-story-studio/web/src/pages/Dashboard.tsx:217-224` has two `<div>Wired in SPEC-103</div>` placeholders inside `<section aria-label="latest-segment">` (L217) and `<section aria-label="manuscript-word-count">` (L221) — these are the exact replace targets.
2. SPEC-103 §4 Modify (App.tsx route additions + Dashboard.tsx wiring), §3 Key decisions item 7 (Manuscript view's segment list comes from `segment_order`), §7 AC#9 (Manuscript view shows word count summary).
3. Cross-skill boundary: App.tsx modification imports `archive/tickets/SPEC103PROPASSEG-011.md`'s PasteProse, `archive/tickets/SPEC103PROPASSEG-013.md`'s Manuscript, and `archive/tickets/SPEC103PROPASSEG-014.md`'s PromptHistory pages — all three pages must exist before this ticket compiles. Dashboard.tsx modification imports `archive/tickets/SPEC103PROPASSEG-011.md`'s `web/src/api/segments.ts` (`listSegments` or equivalent to get the latest segment) and `archive/tickets/SPEC103PROPASSEG-013.md`'s `web/src/api/manuscript.ts` (`readManuscript` to get the word count) — both API clients must exist.

## Architecture Check

1. Single ticket for App.tsx routes + Dashboard wiring keeps the final UI integration atomic — the dashboard's "Generate Prompt" link to Moment Composer (existing SPEC-102 wiring at Dashboard L229-233) and the new "Latest segment" / "Manuscript word count" widgets all live in one cohesive page, so wiring them together as one diff matches the user-perception scope.
2. No backwards-compatibility aliasing — purely additive: 3 new routes registered (no existing route renamed or removed), 2 placeholder divs replaced (no other Dashboard section modified).

## Verification Layers

1. App.tsx route `/worlds/:worldSlug/manual-stories/:msSlug/paste-prose` registered and renders `<PasteProse />` → codebase grep-proof + manual smoke check
2. App.tsx route `/worlds/:worldSlug/manual-stories/:msSlug/manuscript` registered and renders `<Manuscript />` → codebase grep-proof + manual smoke check
3. App.tsx route `/worlds/:worldSlug/manual-stories/:msSlug/prompt-history` registered and renders `<PromptHistory />` → codebase grep-proof + manual smoke check
4. Dashboard.tsx Latest segment widget shows the most-recent segment by `created_at` (or by SEG-N numeric suffix as a proxy) with title + timestamp; renders "No segments yet" placeholder when segments list is empty → manual smoke check
5. Dashboard.tsx Manuscript word count widget shows the word count from `readManuscript`; renders "No manuscript yet" placeholder when manuscript not yet compiled (404 from backend) → manual smoke check

## What to Change

### 1. Modify web/src/App.tsx

At the top of `tools/manual-story-studio/web/src/App.tsx`, add the three new page imports alongside the existing imports (lines 1-9):

```typescript
import { Manuscript } from "./pages/Manuscript.js";
import { PasteProse } from "./pages/PasteProse.js";
import { PromptHistory } from "./pages/PromptHistory.js";
```

Inside the `<Routes>` block (lines 33-61), after the existing `/prompts/preview` route entry, add three new `<Route>` entries:

```tsx
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/paste-prose"
  element={<PasteProse />}
/>
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/manuscript"
  element={<Manuscript />}
/>
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/prompt-history"
  element={<PromptHistory />}
/>
```

### 2. Modify web/src/pages/Dashboard.tsx

In `tools/manual-story-studio/web/src/pages/Dashboard.tsx`:

- Add imports for `archive/tickets/SPEC103PROPASSEG-011.md`'s `web/src/api/segments.ts` (`listSegments`) and `archive/tickets/SPEC103PROPASSEG-013.md`'s `web/src/api/manuscript.ts` (the `readManuscript` function).
- Replace the placeholder at L217-219 (`<section aria-label="latest-segment">`) with:
  - A `useEffect` fetching segments list via the segments API client
  - Sort by numeric SEG-N suffix descending; pick the first (most-recent) entry
  - Render the entry's title + `created_at` + a `<Link>` to the Manuscript view; if list is empty, render "No segments yet"
- Replace the placeholder at L221-223 (`<section aria-label="manuscript-word-count">`) with:
  - A `useEffect` fetching manuscript via `readManuscript`
  - Render the response's `word_count`; if response is null (404), render "No manuscript yet"

The existing Dashboard sections (story-contract, directive-draft, active-cast, high-importance, open-tracking, generate-prompt) and the existing Generate-Prompt link to Moment Composer stay unchanged. The two placeholder-replacements are the only Dashboard.tsx changes this ticket makes.

## Files to Touch

- `tools/manual-story-studio/web/src/App.tsx` (modify — add 3 routes + 3 page imports)
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify — replace 2 SPEC-103 placeholders with real wiring)

## Out of Scope

- The three new pages themselves (covered by `archive/tickets/SPEC103PROPASSEG-011.md`, `archive/tickets/SPEC103PROPASSEG-013.md`, `archive/tickets/SPEC103PROPASSEG-014.md`)
- The segments + manuscript API clients (covered by `archive/tickets/SPEC103PROPASSEG-011.md`, `archive/tickets/SPEC103PROPASSEG-013.md`)
- Any other Dashboard section (story-contract, directive-draft, active-cast, high-importance, open-tracking, generate-prompt all unchanged)
- The Moment Composer link from Dashboard (existing SPEC-102 wiring at L229-233; preserved as-is)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web install --no-audit --no-fund && npm --prefix web run build` — web bundle builds with the new routes + Dashboard wiring
2. `cd tools/manual-story-studio && npm test` — full suite green
3. `grep -nE '/paste-prose|/manuscript|/prompt-history' tools/manual-story-studio/web/src/App.tsx` — three new route patterns appear in App.tsx
4. `grep -n 'Wired in SPEC-103' tools/manual-story-studio/web/src/pages/Dashboard.tsx` — zero matches (both placeholders replaced)
5. Manual smoke check (end-to-end): start the manual-story-studio server, navigate to the dashboard for an existing manual story → Latest segment and Manuscript word count widgets show real data (or appropriate empty placeholders); navigate via the new routes to PasteProse / Manuscript / PromptHistory and confirm each page mounts without error

### Invariants

1. App.tsx route additions are purely additive (no existing route renamed or removed); the order of routes within the `<Routes>` block is preserved for the existing routes.
2. Dashboard.tsx modifications are scoped to the two SPEC-103 placeholder sections; no other Dashboard section is modified (story-contract, directive-draft, active-cast, high-importance, open-tracking, generate-prompt all unchanged).
3. The new routes use the full `/worlds/:worldSlug/manual-stories/:msSlug/` prefix consistent with existing routes (per reassessment M2 finding).

## Test Plan

### New/Modified Tests

1. None — App.tsx route registration and Dashboard placeholder replacement are structural changes covered by ticket 016 capstone (end-to-end navigation assertion) + the manual smoke check above. Adding route-tests in isolation would duplicate the capstone's coverage.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle build (TypeScript type-check + route registration verification)
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes web build + backend tests + any frontend tests)
3. `grep -nE '/paste-prose|/manuscript|/prompt-history' tools/manual-story-studio/web/src/App.tsx && ! grep -n 'Wired in SPEC-103' tools/manual-story-studio/web/src/pages/Dashboard.tsx` — chained verification: new routes present AND placeholders gone
