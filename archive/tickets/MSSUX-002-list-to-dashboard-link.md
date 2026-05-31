# MSSUX-002: Wire manual-stories listing rows to per-story Dashboard

**Status**: ✅ COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

After creating a manual story, the user lands on the per-world listing at `/worlds/<worldSlug>/manual-stories` and cannot reach the per-story Dashboard. `web/src/pages/ManualStories.tsx:70-73` renders each story as `<li><strong>{story.manualStorySlug}</strong>{title ? ` — ${title}` : null}</li>` — plain text, no `<Link>`. The full per-story route tree exists and works (`web/src/App.tsx:48-83` declares `/dashboard`, `/records`, `/cast`, `/moment-composer`, `/prompts/preview`, `/paste-prose`, `/manuscript`, `/prompt-history`, `/beat-templates`), and `web/src/pages/Dashboard.tsx` is fully implemented with the story-contract panel, directive draft, active cast, high-importance records, open-tracking counts, latest segment, manuscript word count, and the "Open Moment Composer" CTA. It is simply unreachable from the listing.

Compounding the issue, `web/src/pages/CreateManualStory.tsx:31` navigates back to the same listing on `201 Created` (`navigate(\`/worlds/${worldSlug}/manual-stories\`)`), so the user's authoring flow ends at the dead-end view. Visually reproduced at `http://localhost:5176/worlds/erotica-world/manual-stories` against the live `red-bunny` story — the listing renders `red-bunny — Red Bunny` as inert text.

This ticket wraps each listing row's identifying text in a `<Link>` whose target is the per-story Dashboard, so clicking the slug navigates to `/worlds/<worldSlug>/manual-stories/<msSlug>/dashboard`. The change is local to one file and does not introduce a new layout shell or persistent tab strip (deferred to Approach C in the brainstorm).

## Assumption Reassessment (2026-05-31)

1. `web/src/pages/ManualStories.tsx` already imports `Link` from `react-router-dom` at line 2 (it's used on line 61 for the "Create manual story" link). No new import is required. The listing row at lines 69-74 is the exact site to modify.
2. The target route `/worlds/:worldSlug/manual-stories/:msSlug/dashboard` is declared at `web/src/App.tsx:48-51` and renders `<Dashboard />` from `web/src/pages/Dashboard.tsx`. `Dashboard.tsx:25-29` reads both `worldSlug` and `msSlug` from `useParams`, matching the route signature.
3. The `ManualStoryEntry` type at `web/src/pages/ManualStories.tsx:4-9` exposes `worldSlug` and `manualStorySlug` per row, so the link target can be constructed without prop drilling or a separate fetch. The `worldSlug` field on the entry matches the `worldSlug` from `useParams` (both stem from the route parameter for the listing page), but using the entry's own field makes the link tolerant of any future cross-world listing variant.
4. No FOUNDATIONS principle is engaged by the change. The Manual Story Studio web surface is outside the canon pipeline per SPEC-100 §3 Key decisions and `tools/manual-story-studio/README.md` §Verified posture; adding a frontend route link does not interact with any FOUNDATIONS-enforced contract.
5. No HARD-GATE, canon-write ordering, or Canon Safety Check surface is touched.
6. No output schema is extended or modified. The `ManualStoryEntry` shape on the response body is unchanged; this ticket consumes its existing fields.
7. No skill, tool, hook, validator, or schema field is renamed or removed.
8. No adjacent contradictions exposed during reassessment. Note: the broken Moment Composer link at `web/src/pages/Dashboard.tsx:281` (links to `/compose` but the route is `/moment-composer`) is a separate bug uncovered during reassessment and is scoped to MSSUX-003, not this ticket.

## Architecture Check

1. The link wraps the existing identifying text (`<strong>{slug}</strong>` plus the optional title suffix) rather than adding a separate "Open" button or column. This preserves the current visual structure (one row per story, slug as the primary identifier) and keeps the diff to a one-line JSX restructure. An "Open" button would introduce a button-vs-link semantic ambiguity that React Router's `<Link>` already resolves: navigation between SPA routes should be a link, not a button.
2. No backwards-compatibility aliasing/shims introduced. The change replaces inert text with a `<Link>`; there is no fallback path or feature flag.

## Verification Layers

1. The listing row renders a clickable link to the per-story Dashboard -> manual review (visit `http://localhost:5176/worlds/erotica-world/manual-stories`, click `red-bunny`, confirm navigation to `/worlds/erotica-world/manual-stories/red-bunny/dashboard` and that the Dashboard page renders).
2. The link target is constructed from the response entry's own fields, not from `useParams` -> codebase grep-proof (`grep -n 'to={\`/worlds/\${story\.worldSlug}/manual-stories/\${story\.manualStorySlug}/dashboard\`}' tools/manual-story-studio/web/src/pages/ManualStories.tsx` returns one hit).
3. Frontend typecheck still passes -> `cd tools/manual-story-studio/web && npm test`.

## What to Change

### 1. Modify `tools/manual-story-studio/web/src/pages/ManualStories.tsx`

In the listing `<ul>` (current lines 68-76), wrap each story row's identifying content in a `<Link>` whose `to` prop points at the per-story Dashboard route.

Replace:

```tsx
<li key={story.manualStorySlug}>
  <strong>{story.manualStorySlug}</strong>
  {story.title !== null ? ` — ${story.title}` : null}
</li>
```

With:

```tsx
<li key={story.manualStorySlug}>
  <Link
    to={`/worlds/${story.worldSlug}/manual-stories/${story.manualStorySlug}/dashboard`}
  >
    <strong>{story.manualStorySlug}</strong>
    {story.title !== null ? ` — ${story.title}` : null}
  </Link>
</li>
```

No other change to the file. `Link` is already imported.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/ManualStories.tsx` (modify)

## Out of Scope

- Introducing a persistent in-story tab strip / breadcrumb / layout shell (Approach C from the brainstorm; deserves its own spec).
- Changing `CreateManualStory.tsx`'s post-201 navigation target. Today it routes back to the listing; with this ticket landed, the listing then offers a clickable path to the freshly created story. Direct post-creation navigation to the new Dashboard is an alternative shape but expands scope — current behavior remains correct given the listing fix.
- Encoding the slug values in the link `to` prop with `encodeURIComponent`. React Router accepts plain strings here and the backend's slug regex (lowercase letters, digits, hyphens — enforced by `CreateManualStory.tsx:60` and the server-side validator at create time) guarantees URL-safe values. Adding encoding would be defensive against a class of input that the system already rejects at the create endpoint.
- Styling the link affordance beyond browser defaults — that comes from MSSUX-001.
- Adding a hover preview, an "Open" CTA, archived-status badging, last-modified timestamp, or any other listing-row enrichment.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` — passes (frontend typecheck).
2. `cd tools/manual-story-studio/web && npm run build` — passes (Vite production build).
3. `cd tools/manual-story-studio && npm test` — passes (full studio chain).

### Invariants

1. The listing page renders each story row as a clickable `<Link>` whose `to` prop targets the per-story `/dashboard` route.
2. `CreateManualStory.tsx`'s post-creation navigation behavior is unchanged.
3. The `ManualStoryEntry` type and the `GET /api/worlds/:worldSlug/manual-stories` backend response shape are unchanged.

## Test Plan

### New/Modified Tests

1. `None — single-line JSX change; verification is the existing typecheck/build chain plus a manual click-through against the running dev server (no React Testing Library or Playwright infrastructure exists for this package today).`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio/web && npm run build`
3. `cd tools/manual-story-studio && npm test`
4. Manual review: `cd tools/manual-story-studio/web && npm run dev`, open `http://127.0.0.1:5176/worlds/erotica-world/manual-stories`, click the `red-bunny` row, confirm the URL changes to `/worlds/erotica-world/manual-stories/red-bunny/dashboard` and the Dashboard renders.

## Outcome

**Completion date**: 2026-05-31

**What changed**:
- `tools/manual-story-studio/web/src/pages/ManualStories.tsx`: wrapped the `<strong>{slug}</strong>{title}` row content in a `<Link to={`/worlds/${story.worldSlug}/manual-stories/${story.manualStorySlug}/dashboard`}>`. `Link` was already imported (line 2); no other change.

**Deviations from plan**: None.

**Verification results**:
- `cd tools/manual-story-studio/web && npm test` (`tsc --noEmit`) passes.
