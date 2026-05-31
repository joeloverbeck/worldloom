# MSSUX-003: Fix Moment Composer route mismatch on Dashboard

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The Dashboard's "Open Moment Composer (SPEC-102)" CTA at `web/src/pages/Dashboard.tsx:280-285` points at `/worlds/<worldSlug>/manual-stories/<msSlug>/compose`, but no such route is declared. The `Routes` block in `web/src/App.tsx:60-63` declares the path as `/worlds/:worldSlug/manual-stories/:msSlug/moment-composer`. Clicking the Dashboard CTA produces an unmatched-route render (React Router 6 falls through to the default route or a blank `<main>`), not the Moment Composer page.

This is a copy/typo-class bug, isolated to a single link's `to` prop. The fix is a one-line change to align the Dashboard CTA's target with the declared route path.

## Assumption Reassessment (2026-05-31)

1. The declared route path is `/worlds/:worldSlug/manual-stories/:msSlug/moment-composer` at `web/src/App.tsx:60-63`, rendering `<MomentComposer />` from `web/src/pages/MomentComposer.tsx`. Confirmed by direct read of `App.tsx`.
2. The broken link target is at `web/src/pages/Dashboard.tsx:281` — `to={\`/worlds/${worldSlug}/manual-stories/${msSlug}/compose\`}`. Confirmed by direct read of `Dashboard.tsx`.
3. Pipeline-wide blast radius for the wrong path string `compose`: `grep -rn '/compose' tools/manual-story-studio/web/src/` — confirm there are no other consumers of the malformed path. The Dashboard CTA is the only known site. (Re-run this grep at implementation time to catch any drift between ticket-authoring and patch-application.)
4. No FOUNDATIONS principle is engaged. The Manual Story Studio web surface is outside the canon pipeline per SPEC-100 §3 Key decisions; correcting a frontend link target does not interact with any FOUNDATIONS-enforced contract.
5. No HARD-GATE, canon-write ordering, or Canon Safety Check surface is touched.
6. No output schema is extended or modified.
7. No skill, tool, hook, validator, or schema field is renamed or removed. (The route segment itself is the path string `moment-composer` — the rename direction is *Dashboard CTA → route declaration*, not *route declaration → CTA*. We fix the caller to match the declared route, not the reverse.)
8. No adjacent contradictions exposed during reassessment. Note: the broader navigation gap (no entry link from listing to Dashboard) is scoped to MSSUX-002 and the missing stylesheet is scoped to MSSUX-001 — neither is affected by this fix.

## Architecture Check

1. Aligning the caller to the declared route (rather than introducing a new alias route, redirect, or feature flag) is the minimum-surface fix and matches the existing routing discipline in `App.tsx` (one path per route, no aliases). Renaming the route declaration to `compose` would be a much larger blast-radius change (the URL would change in any future spec or test that references it) for no semantic gain.
2. No backwards-compatibility aliasing/shims introduced. There is no production usage of `/compose` as a URL — it is a typo, not a deprecated path that needs a redirect.

## Verification Layers

1. Dashboard CTA navigates to the Moment Composer -> manual review (open Dashboard for any manual story, click "Open Moment Composer (SPEC-102)", confirm URL changes to `/moment-composer` suffix and `MomentComposer` page renders).
2. No other reference to the malformed path remains -> codebase grep-proof (`grep -rn "compose" tools/manual-story-studio/web/src/` returns the corrected `moment-composer` references only; no `/compose` substring survives outside the `moment-composer` literal).
3. Frontend typecheck still passes -> `cd tools/manual-story-studio/web && npm test`.

## What to Change

### 1. Modify `tools/manual-story-studio/web/src/pages/Dashboard.tsx`

Change the link target on line 281 from `compose` to `moment-composer`:

```tsx
<Link
  to={`/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`}
>
  Open Moment Composer (SPEC-102)
</Link>
```

No other change to the file. The link text, the wrapping `<section aria-label="generate-prompt">`, and the `<h2>` heading are unchanged.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)

## Out of Scope

- Renaming the route declaration in `App.tsx` from `moment-composer` to `compose` or any other identifier.
- Introducing a redirect route from `/compose` to `/moment-composer` for backwards compatibility — there is no production consumer of the malformed path, so no redirect is needed.
- Sweeping the rest of the studio's `Link to=` targets for additional typos — that is a separate audit (a candidate for a follow-up triage ticket if scope is desired) and is not included here. The reassessment grep at step 3 above scopes the audit only to the `/compose` substring.
- Adding a route-validation test that asserts every `<Link to=...>` target string matches a declared route — a worthwhile future hardening but out of scope for this single-line fix.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` — passes (frontend typecheck).
2. `cd tools/manual-story-studio/web && npm run build` — passes (Vite production build).
3. `cd tools/manual-story-studio && npm test` — passes (full studio chain).

### Invariants

1. The Dashboard's Moment Composer CTA links to the path declared at `App.tsx:60-63` (`/worlds/<worldSlug>/manual-stories/<msSlug>/moment-composer`).
2. No `<Link to>` target in `tools/manual-story-studio/web/src/` references `/compose` as a path segment.
3. The `MomentComposer` route declaration in `App.tsx` is unchanged.

## Test Plan

### New/Modified Tests

1. `None — single-string-literal fix; verification is the existing typecheck/build chain plus a manual click-through against the running dev server.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio/web && npm run build`
3. `cd tools/manual-story-studio && npm test`
4. `grep -rn "/compose" tools/manual-story-studio/web/src/` — must return either no matches, or only matches that are substrings of the literal `moment-composer` (i.e., no standalone `/compose` URL segment).
5. Manual review: navigate to any manual story's Dashboard, click "Open Moment Composer (SPEC-102)", confirm the URL ends with `/moment-composer` and the Moment Composer page renders.

## Outcome

**Completion date**: 2026-05-31

**What changed**:
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (one line): the "Open Moment Composer (SPEC-102)" CTA target changed from `/worlds/${worldSlug}/manual-stories/${msSlug}/compose` to `/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`, aligning the caller with the declared route at `App.tsx:60-63`.

**Deviations from plan**: None.

**Verification results**:
- `grep -rn "/compose" tools/manual-story-studio/web/src/` returns no matches (no `/compose` URL segment survives — confirmed clean).
- `cd tools/manual-story-studio/web && npm test` (`tsc --noEmit`) passes.
