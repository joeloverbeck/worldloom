# SPEC108MANSTOSTU-006: Dashboard add "Repair this manuscript" link in §Latest segment

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/web/src/pages/Dashboard.tsx` to add a small "Repair this manuscript" `<Link>` inside the existing `§Latest segment` section, routing to the repair page.
**Deps**: None

## Problem

SPEC-108 §2 item 6 provides a small entry point to the repair-mode page from the Dashboard. Per the reassessment-applied wording, the link lands inside the Dashboard's existing `§Latest segment` section (lines 345-366), alongside the existing manuscript link, NOT in the primary nav. The placement is deliberately subordinate per SPEC-108 §3 Key decisions: "the small entry point keeps it out of the primary flow."

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/web/src/pages/Dashboard.tsx` exists at HEAD; the `§Latest segment` section is at lines 345-366. The section currently renders either a `<Link>` to the manuscript page (when a `latestSegment` exists) or a `<p>No segments yet.</p>` (when empty). `Link` is already imported from `react-router-dom` at line 2.
2. SPEC-108 §2 item 6 names the Dashboard entry point. The reassessment-applied wording explicitly cites the `§Latest segment` section as the target location.
3. Cross-skill boundary: this ticket adds a single `<Link>` element; the link's destination URL `/worlds/${worldSlug}/manual-stories/${msSlug}/repair` is a route bound in App.tsx by ticket 007. Until ticket 007 lands, the link would 404 at runtime, but at type-check time it is a plain string and compiles. The link works at run-time once ticket 007 ships; the dependency is runtime-coordinated, not compile-time.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the link is a visible UI surface change — greppable via `grep -n "Repair this manuscript" tools/manual-story-studio/web/src/pages/Dashboard.tsx`. The placement (small, inside `§Latest segment`, NOT in the top nav) preserves the report §15 framing that repair mode is "rare explicit repair mode, never silent" — visible but subordinate.

## Architecture Check

1. The link uses the same `<Link>` component already imported in this file (line 2), the same URL-construction style as the existing `§Latest segment` link (line 357), and visually-subordinate styling (smaller font, muted color). This keeps the change localized and stylistically consistent.
2. The link's URL does NOT take a `?segment_id=` query parameter — Dashboard's repair link routes to the un-prefiltered repair page so the user can choose which segment to repair from the full list there. (Manuscript's per-segment "Repair this segment" link from ticket 005 takes a `?segment_id=` parameter for that page's pre-selection.)
3. No backwards-compatibility shims — pure additive change.

## Verification Layers

1. Link added to `§Latest segment` -> codebase grep-proof (`grep -n "Repair this manuscript\|/repair" tools/manual-story-studio/web/src/pages/Dashboard.tsx` returns ≥1 match inside the latest-segment section's JSX).
2. Frontend bundle typechecks -> `npm --prefix tools/manual-story-studio/web test` passes.

## What to Change

### 1. Add "Repair this manuscript" Link to §Latest segment section

In `tools/manual-story-studio/web/src/pages/Dashboard.tsx`, inside the `<section aria-label="latest-segment">` block (currently lines 345-366), under the `latestSegment ? (...)` branch (lines 354-362), append a small disclosure link:

```tsx
<p style={{ marginTop: 4, fontSize: "0.85em" }}>
  <Link
    to={`/worlds/${worldSlug}/manual-stories/${msSlug}/repair`}
    style={{ color: "#888" }}
  >
    Repair this manuscript
  </Link>
</p>
```

When `latestSegment` is null (no segments yet), do NOT render the repair link — there is nothing to repair.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)

## Out of Scope

- Adding the link to the top nav or any other Dashboard section — SPEC-108 §2 item 6 + §3 Key decisions explicitly keep the link "out of the primary flow."
- Adding a per-segment "Repair" link in the Dashboard's other sections — Manuscript's per-segment "Repair this segment" link (ticket 005) is the per-segment surface; Dashboard's link is per-manuscript.
- The repair page itself (ticket 007).
- The App.tsx route binding for `/repair` (ticket 007).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (which is `tsc --noEmit`) succeeds.
2. `grep -n "Repair this manuscript" tools/manual-story-studio/web/src/pages/Dashboard.tsx` returns 1 match.
3. `grep -n "/repair" tools/manual-story-studio/web/src/pages/Dashboard.tsx` returns ≥1 match.

### Invariants

1. The link renders ONLY when a `latestSegment` exists (the `latestSegment ? (...)` branch). When there are no segments, no repair link is shown.
2. The link's URL is `/worlds/<worldSlug>/manual-stories/<msSlug>/repair` (no query parameter) — the un-prefiltered repair page.
3. The link is visually subordinate (smaller font, muted color) per the spec's "small entry point" requirement.

## Test Plan

### New/Modified Tests

1. `None — frontend single-link addition; verification is the typecheck pass plus the grep-proofs above.`

### Commands

1. `cd tools/manual-story-studio/web && npm test` — TypeScript typecheck.

## Outcome

Completed: 2026-06-01

Added the subordinate Dashboard repair entry point:

1. Added `Repair this manuscript` inside the `latest-segment` branch.
2. Routed the link to `/worlds/:worldSlug/manual-stories/:msSlug/repair`.
3. Kept the no-segments branch unchanged, so no repair link renders without a latest segment.

## Verification Result

1. `npm --prefix tools/manual-story-studio/web test` — passed (`tsc -p tsconfig.json --noEmit`).
2. `grep -n "Repair this manuscript" tools/manual-story-studio/web/src/pages/Dashboard.tsx` — one match.
3. `grep -n "/repair" tools/manual-story-studio/web/src/pages/Dashboard.tsx` — route link match present.
4. `git diff --check -- tools/manual-story-studio/web/src/pages/Dashboard.tsx` — passed.

## Deviations

None.
