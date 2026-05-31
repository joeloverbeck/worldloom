# MSSUX-006: Add top-level cross-nav from Dashboard to sibling pages

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: None (composable with MSSUX-004 once that spec lands an
"Edit contract" link)

## Problem

The Manual Story Studio Dashboard is the per-story landing page, but
it offers no top-level navigation to the sibling concerns it
summarizes. The author lands on the Dashboard and must know each
URL by hand to reach any other view.

Current cross-links on `web/src/pages/Dashboard.tsx`:

- Banner-level: `nav` element above `<main>` (in
  `web/src/App.tsx:34-36`) only links to `/` (Worlds list).
- Section-level: `Clocks` / `Secrets` / `Questions` are deep-linked
  via `?class=` query params (Dashboard.tsx lines 222-247).
- Section-level: each high-importance record (when present) deep-links
  into Records (Dashboard.tsx lines 207-217).
- Section-level: "Open Moment Composer (SPEC-102)" link
  (Dashboard.tsx lines 280-284).

Missing cross-links from the Dashboard:

- Records (all classes, generic landing)
- Cast & profiles (`/cast`)
- Manuscript (`/manuscript`)
- Beat templates (`/beat-templates`)
- Prompt history (`/prompt-history`)
- Paste prose (`/paste-prose`)
- Prompt preview (`/prompts/preview`) — debatable; this is a
  workflow page, not a per-story landing surface. Out of scope below.

## Assumption Reassessment (2026-05-31)

1. `web/src/App.tsx:38-84` defines the full route set:
   Worlds (`/`), ManualStories (`/worlds/:slug/manual-stories`),
   CreateManualStory (`/.../new`), Dashboard (`/.../dashboard`),
   Records (`/.../records`), CastAndProfiles (`/.../cast`),
   MomentComposer (`/.../moment-composer`),
   PromptPreview (`/.../prompts/preview`),
   PasteProse (`/.../paste-prose`),
   Manuscript (`/.../manuscript`),
   PromptHistory (`/.../prompt-history`),
   BeatTemplates (`/.../beat-templates`). Verified.
2. Dashboard's only links besides Moment Composer are the
   `?class=clocks|secrets|questions` deep links and high-importance
   record deep links into Records. Verified.
3. No existing per-story nav menu component — there is no
   `StoryNav.tsx` or equivalent. This ticket may either:
   (a) add a new `<nav>` section to the Dashboard, OR
   (b) extract a shared `StoryNav` component that the Dashboard plus
   any other per-story page can render. (b) is cleaner long-term but
   has scope creep risk — only do (b) if a second per-story page
   needs the same nav in this implementation pass.
4. SPEC-104 owns the `/beat-templates` URL space; the cross-link
   target is `/worlds/:slug/manual-stories/:ms/beat-templates`
   (no `?class=` query param). Verified.
5. The recommended placement for the cross-nav is at the top of the
   Dashboard, immediately under the existing app-level `nav` (which
   only contains "Worlds"), as a horizontal list of links. Avoid
   adding to the App.tsx nav directly because that nav is rendered
   on routes that have no `:worldSlug`/`:msSlug` params (e.g. `/`),
   and the per-story links require both params.

## Architecture Check

1. Add a per-story nav inside the Dashboard component (Option (a))
   keeps the change scoped to a single file and avoids introducing
   a shared component before there is a second consumer.
2. If a second per-story page in the same implementation pass needs
   the same nav (e.g., Records, Cast), extract `StoryNav.tsx` into
   `web/src/components/` and have both pages use it. Decide at
   implementation time based on the shape of the change set.
3. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Dashboard renders cross-links for Records (all), Cast, Manuscript,
   Beat templates, Prompt history, Paste prose → manual review.
2. Each link navigates to the correct route under
   `:worldSlug`/`:msSlug` → manual review (click each in the running
   dev server).
3. tsc passes after the change → schema validation surface.
4. The existing deep links (`?class=clocks`, high-importance records,
   Moment Composer) continue to render and route as before →
   codebase grep-proof + manual review.

## What to Change

### 1. `Dashboard.tsx` — add per-story navigation section

Place a new `<nav aria-label="story-pages">` section at the top of the
returned `<div className="manual-dashboard">`, immediately above the
existing `<section aria-label="story-contract">`. Contents (in
reading order):

- `Records` → `/worlds/${worldSlug}/manual-stories/${msSlug}/records`
- `Cast & profiles` → `.../cast`
- `Manuscript` → `.../manuscript`
- `Beat templates` → `.../beat-templates`
- `Prompt history` → `.../prompt-history`
- `Paste prose` → `.../paste-prose`

Use the existing `Link` import from `react-router-dom`.

Style guidance: a single horizontal `<ul>` (or `<nav>` with inline
`<Link>` separated by `· ` or rendered as a flex row) sized to fit
the dashboard width without wrapping at common breakpoints. No new
CSS file; reuse `manual-dashboard` styles or add minimal inline
styles consistent with the rest of `Dashboard.tsx`.

### 2. (optional) Extract `web/src/components/StoryNav.tsx`

If the implementer chooses Architecture Check option (b) — extracting
a shared component — define:

```tsx
interface StoryNavProps {
  worldSlug: string;
  msSlug: string;
}

export function StoryNav({ worldSlug, msSlug }: StoryNavProps) {
  /* renders the 6 cross-links above */
}
```

and render `<StoryNav worldSlug={worldSlug} msSlug={msSlug} />` from
the Dashboard. Apply the same component to any other per-story page
that needs the nav within this implementation pass.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)
- (optional) `tools/manual-story-studio/web/src/components/StoryNav.tsx` (new)

## Out of Scope

- App-level nav (`App.tsx:34-36`) — the per-story links require route
  params that the app-level nav cannot guarantee. Leave it as the
  "Worlds" home link only.
- Adding `Prompt preview` to the cross-nav — it is a workflow-step
  page reached from Moment Composer, not a per-story landing page.
- Visual design / iconography. This ticket is structural only;
  cosmetic refinement is a follow-up if needed.
- Mobile / responsive layout — current studio shows no responsive
  treatment, and this ticket adds nothing that breaks the existing
  desktop-first posture.

## Acceptance Criteria

### Tests That Must Pass

1. Dashboard renders the six cross-links named above; each link's
   `href` matches the route defined in `App.tsx`.
2. Each link navigates to the correct page in the running dev server
   (manual click-through).
3. The existing Dashboard sections (story contract, directive draft,
   active cast, high-importance records, open tracking, latest
   segment, manuscript word count, generate prompt) render unchanged.
4. `npm --prefix tools/manual-story-studio/web test` passes
   (tsc --noEmit).

### Invariants

1. The app-level nav (`App.tsx:34-36`) remains a Worlds-only home
   link.
2. Existing deep links (`?class=clocks/secrets/questions`,
   high-importance records, Moment Composer) continue to resolve as
   before.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `npm --prefix tools/manual-story-studio/web test` — typecheck only.
2. Manual: run dev server, navigate to
   `/worlds/erotica-world/manual-stories/red-bunny/dashboard`, click
   each of the six cross-links, and confirm the routing.
