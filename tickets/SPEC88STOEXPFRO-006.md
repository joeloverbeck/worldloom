# SPEC88STOEXPFRO-006: Story Picker route

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — wires `web/src/routes/stories.tsx` as the `/worlds/:slug/stories` route, replacing T001's placeholder.
**Deps**: archive/tickets/SPEC88STOEXPFRO-001.md, SPEC88STOEXPFRO-002, SPEC88STOEXPFRO-004

## Problem

After choosing a world from T005's picker, users land on the Story Picker — a list of story bundles under `worlds/<slug>/stories/`. Each story card shows the bundle's metadata (title, page count, leaf count, rendered-prose count, latest turn/page, index-freshness state, `PG-1` presence). Without this route, users can navigate INTO a world but have no way to pick a story within it. SPEC-88 §4.2 defines the exact card content; this ticket implements it.

## Assumption Reassessment (2026-05-26)

1. T001 created the placeholder `/worlds/:slug/stories` route in `app.tsx`; this ticket replaces it. T002's `listStories(slug)` fetcher returns `StorySummary[]` per SPEC-87's type at `tools/story-explorer/src/view-models/story-summary.ts` — fields: `worldSlug`, `storySlug`, `storyId`, `title`, `kernelPath`, `pageCount`, `choiceCount`, `branchCount`, `renderedProseCount`, `leafPageIds`, `rootPageId`, `latestPageId`, `indexStatus`. T004's `IndexStatusBanner` is consumed at route level (full-row banner) when the world-level `indexStatus` is non-fresh — distinct from T005's per-card badge pattern.
2. SPEC-88 §4.2 (post-reassessment) names the card content: "story slug + title from `STORY_KERNEL.md` frontmatter (when readable); PG count, leaf-page count, rendered-prose count, latest indexed turn/page; index freshness state; whether `PG-1` exists (warn if not); click → `/worlds/:slug/stories/:storySlug/entry`". The "warn if not" for missing PG-1 is a small inline warning chip per story card, not a blocking error — users should be able to inspect malformed bundles.
3. Cross-skill boundary: this route consumes `listStories()` from T002 and (route-level) `IndexStatusBanner` from T004. The route also relies on `StorySummary.rootPageId` being `null` when PG-1 is missing — that semantics is documented in SPEC-87 §4 (the PG with `parentPageId === null` is the root; absence means no PG-1 exists).

## Architecture Check

1. **Route wrapped in `<ErrorBoundary>` + `<Suspense fallback={<RouteLoading label="Loading stories..." />}>`** — same pattern as T005's World Picker. Centralized in app.tsx; this ticket adds the route definition.
2. **Full-row `<IndexStatusBanner>` for the world's `indexStatus`** at the top of the route when not `fresh` — distinct from T005's per-card badges. The world's index is the source of truth for story-bundle reads at this route; stale/missing index changes what data is visible.
3. **`<StoryCard>` as a sub-component within `routes/stories.tsx`** (not promoted to `components/`) because it's route-specific and unlikely to be reused. Per worldloom convention, components shared across routes live in `components/`; route-internal sub-components stay co-located.
4. **No backwards-compatibility aliasing/shims introduced** — greenfield route.
5. **PG-1-missing warning chip** is a small inline indicator on the card, not a blocking modal. The card remains clickable; users can navigate into the story-entry route to see what state the bundle is in.

## Verification Layers

1. **Route renders story list from `listStories()`** → unit test with mocked client; assert each `StorySummary` produces a card with title, page count, leaf count, prose count, latest page.
2. **PG-1-missing warning renders when `rootPageId === null`** → unit test: mock a story with `rootPageId: null`; assert the warning chip is present.
3. **Card click navigates to `/worlds/:slug/stories/:storySlug/entry`** → unit test: click a card; assert react-router navigation fires.
4. **Empty story-list state per §9** → unit test: client returns `[]`; assert the "No story bundles under this world." message renders with hint about `branching-story-bootstrap` skill.
5. **World-level IndexStatusBanner renders for non-fresh states** → unit test: mock world `indexStatus.kind === 'stale'`; assert banner appears above the story list.

## What to Change

### 1. Create `tools/story-explorer/web/src/routes/stories.tsx`

Functional component implementing §4.2's contract. Reads `worldSlug` from URL params. Fetches both `getWorld(worldSlug)` (for world-level indexStatus) and `listStories(worldSlug)` (for the story list) — composed into a single loader or two parallel awaits.

Structure:
- `<h1>{worldDisplayName} — Stories</h1>`
- Conditional `<IndexStatusBanner status={world.indexStatus} />` when `world.indexStatus.kind !== 'fresh'`
- Story-card grid/list
- Empty state: "No story bundles under this world." + "Use `/branching-story-bootstrap` to create one." link/hint
- Each card: title (or "Untitled" fallback when STORY_KERNEL.md unreadable), PG count, leaf count, rendered-prose count, latest page (e.g., "Latest: PG-12 (Turn 7)"), inline PG-1-missing warning chip (when `rootPageId === null`), click → `/worlds/${worldSlug}/stories/${storySlug}/entry`.

### 2. Update `tools/story-explorer/web/src/app.tsx`

Replace `/worlds/:slug/stories` placeholder with the imported route.

### 3. Create `tools/story-explorer/web/src/routes/stories.test.tsx`

Tests covering:
- Mocked `listStories()` returns 2 stories → 2 cards render with correct content.
- Mocked `listStories()` returns empty array → empty-state message renders with skill hint.
- Story with `rootPageId: null` → PG-1-missing warning chip renders.
- World with non-fresh indexStatus → full-row IndexStatusBanner renders above the list.
- Card click navigates to story-entry route.

## Files to Touch

- `tools/story-explorer/web/src/routes/stories.tsx` (new)
- `tools/story-explorer/web/src/routes/stories.test.tsx` (new)
- `tools/story-explorer/web/src/app.tsx` (modify — replace placeholder with imported route)

## Out of Scope

- Story creation / editing / deletion UI — explorer is read-only per SPEC-87 §6 fence.
- Filtering / sorting stories within a world — out of v1 scope per IMPLEMENTATION-ORDER Named Assumption E.
- Story-bundle health audit indicators beyond PG-1 presence — those belong in SPEC-89's x-ray validation surface.
- Cross-world story enumeration (a global "all stories" view) — out of scope; per-world pickers only.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- stories.test` — all 5 test cases pass.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compiles.

### Invariants

1. Empty story list is a designed UI state, not an error.
2. PG-1-missing warning never prevents card click — bundle inspection must remain possible even when malformed.
3. World-level IndexStatusBanner renders BEFORE the story list (visual priority for the staleness signal).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/stories.test.tsx` (new) — verifies §4.2 contract.

### Commands

1. `cd tools/story-explorer/web && npm test -- stories.test` — targeted route test.
2. `cd tools/story-explorer/web && npm test` — full vitest suite.
3. `cd tools/story-explorer/web && npm run build` — TypeScript verification.
