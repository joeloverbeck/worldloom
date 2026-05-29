# SPEC97STOEXPSCE-008: Page-reader teardown + client-surface removal

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer/web` page-reader surface removed (routes, components, page-scoped client types/functions) and shared shell components reworked; `app.tsx` route tree finalized to scene-first only.
**Deps**: 003, 005, 006, 007

## Problem

SPEC-97 §2.1 deletes the page-reader route concepts and §2.3 removes the page-scoped client surface. With the scene-first routes landed (dashboard 003, scenes 005, scene-detail 006, unscened 007) and the x-ray drawer rebound (002, reached transitively via 006), the page-reader surface can be removed atomically: the page routes (`/entry`, `/pages/:pageId`), their components, and the now-orphaned page-scoped client types/functions. SPEC-96 already removed the backend page-prose routes + `StorySummary.renderedProseCount`/`hasRenderedProse` fields, so the frontend client + `stories.tsx`'s prose-page display currently reference deleted backend fields and must be cleaned up here. This ticket is the teardown that restores a coherent scene-first running app.

## Assumption Reassessment (2026-05-29)

1. The page-reader surface and the page-scoped client surface, per reassessment-session grep, are: routes `routes/page-entry.tsx` (`PageEntryRoute`), `routes/page-read.tsx` (`PageReadRoute`/`pageReadLoader`); page components `components/PageHeader.tsx`, `components/ProsePanel.tsx`, `components/ChildOutcomeVariant.tsx`, `components/ChoiceCard.tsx` (consumes `ChoiceNavigation`/`ChildOutcomeVariant`), `components/ProseMissingPlaceholder.tsx` (consumes `ProseStatus`); shared components needing rework `components/Breadcrumb.tsx` (page-first `pageHref`→`/pages/:pageId`), `components/NotFoundPage.tsx` (`resourceLabel='page'` default), `routes/stories.tsx` (`renderedProseCount` "prose page" display at line ~77); client surface in `api/client.ts`: types `PageDetail`/`PageSummary`/`PagePlanSummary`/`ReceiptSummary`/`ProseStatus`/`ChoiceNavigation`/`ChildOutcomeVariant` + fields `StorySummary.renderedProseCount`/`PageSummary.hasRenderedProse`/`ChildOutcomeVariant.hasRenderedProse`, functions `getPageDetail`/`getProseBody`/`getPagePlan`/`getProseReceipt`/`searchPages`; `lib/format.ts` has a `ProseStatus` formatter. `app.tsx` route tree (reassessment grep) has the page routes at `/worlds/:slug/stories/:storySlug/entry` and `/worlds/:slug/stories/:storySlug/pages/:pageId` — the FULL nested paths, not bare `/entry` / `/pages/:pageId`.
2. SPEC-97 §2.1 (delete page-reader route concepts), §2.3 (remove page-scoped view models + client fns), §4 (Files to touch incl. retain-but-strip `stories.tsx`, rework `Breadcrumb`/`NotFoundPage`), §6/§7 AC1 (negative test asserts the FULL nested page-reader paths are absent — not the bare shorthand). SPEC-96 §2.7 removed `StorySummary.renderedProseCount` + `*.hasRenderedProse` backend-side. `routes/worlds.tsx` + `routes/stories.tsx` are RETAINED navigation-shell routes (only `stories.tsx`'s prose-count display is stripped).
3. Cross-artifact boundary under audit: the removed page-scoped client surface and its consumers. Removal is safe now because every consumer is either deleted here (page-entry, page-read, PageHeader, ProsePanel, ChildOutcomeVariant, ChoiceCard, ProseMissingPlaceholder) or already removed (`PlanProseTab` in 002, which consumed `getPagePlan`/`getProseReceipt`); `lib/format.ts`'s `ProseStatus` formatter and `stories.tsx`'s `renderedProseCount` display are the remaining same-seam consumers, both fixed here. Blast radius confirmed frontend-local (no backend / other-package / skill consumer — SPEC-96 already removed the backend copies).
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): PG is a causal tick, not a reader page. Removing the `/pages/:pageId` reader route + page-prose components enacts the principle — PG inspection survives only as the state-tick x-ray drawer (002), reached via timeline focus.
5. (was template item 7 — rename/remove blast radius) This ticket removes routes, components, client types, client functions, and a schema field display. Pipeline-wide blast radius (grep `tools/`, `.claude/skills/`, `docs/`, `specs/`): all consumers are within `tools/story-explorer/web/src` (enumerated in item 1); no backend, sibling-package, skill, or doc consumes the removed frontend symbols (the lone non-web match was this batch's own ticket prose). Per Rule 6 (No Silent Retcons), each removal is attributed: the page-reader model is superseded by the scene-first surfaces (003–007) and the SPEC-96 backend removal; `renderedProseCount` references a backend field SPEC-96 deleted. No production consumer is left dangling.

## Architecture Check

1. Atomic teardown — types and their consumers are removed in one diff, so the package never has a broken intermediate (types gone, consumers remaining). Reworking `Breadcrumb`/`NotFoundPage` rather than deleting them preserves the navigation shell; retaining `worlds.tsx`/`stories.tsx` keeps world/story navigation intact while only the page-prose-count display is stripped.
2. No backwards-compatibility shims — page routes and page-scoped client surface are removed outright; no redirect alias from `/pages/:pageId` to a scene route, no deprecated-export shim for the removed client functions.

## Verification Layers

1. Page routes removed; the FULL nested page-reader paths do not resolve → route test asserting `/worlds/:slug/stories/:storySlug/entry` and `/worlds/:slug/stories/:storySlug/pages/:pageId` are absent (AC1/AC6 negative test).
2. Page-scoped client surface removed → grep-proof: zero matches for `getPageDetail|getProseBody|getPagePlan|getProseReceipt|searchPages|interface PageDetail|renderedProseCount|hasRenderedProse|ChoiceNavigation` in `tools/story-explorer/web/src`.
3. Page components deleted; shared components reworked → grep-proof the deleted files are gone; `Breadcrumb`/`NotFoundPage`/`stories.tsx` typecheck without the removed types/fields.
4. Build green after removal → `tsc` confirms no dangling references to the removed surface.

## What to Change

### 1. Finalize the route tree

Remove the page-route entries (`/worlds/:slug/stories/:storySlug/entry`, `/worlds/:slug/stories/:storySlug/pages/:pageId`) from `app.tsx`, leaving the scene-first routes (dashboard/timeline/scenes/scene-detail/unscened) wired by 003–007. Delete `routes/page-entry.tsx` + `routes/page-read.tsx` (+ their tests).

### 2. Delete page components, rework shared shell

Delete `components/PageHeader.tsx`, `components/ProsePanel.tsx`, `components/ChildOutcomeVariant.tsx`, `components/ChoiceCard.tsx`, `components/ProseMissingPlaceholder.tsx` (+ their tests). Rework `components/Breadcrumb.tsx` (page-first `pageHref`/parent-page breadcrumb → scene/timeline breadcrumbs) and `components/NotFoundPage.tsx` (drop the `resourceLabel='page'` page-reader default). Strip the `renderedProseCount` "prose page" display from `routes/stories.tsx`.

### 3. Remove the page-scoped client surface

From `api/client.ts`: remove types `PageDetail`/`PageSummary`/`PagePlanSummary`/`ReceiptSummary`/`ProseStatus`/`ChoiceNavigation`/`ChildOutcomeVariant` and fields `StorySummary.renderedProseCount`/`PageSummary.hasRenderedProse`/`ChildOutcomeVariant.hasRenderedProse`; remove functions `getPageDetail`/`getProseBody`/`getPagePlan`/`getProseReceipt`/`searchPages`. Remove the `ProseStatus` formatter from `lib/format.ts`. Update `api/client.test.ts` to drop the removed-fn tests.

### 4. Route-absence negative tests (AC1/AC6)

Add/extend a route test asserting the full nested page-reader paths do not resolve.

## Files to Touch

- `tools/story-explorer/web/src/app.tsx` (modify — remove page-route entries; pre-existing shared file, coordinate with 003/004/005/006/007)
- `tools/story-explorer/web/src/routes/page-entry.tsx` (delete) + `routes/page-entry.test.tsx` + `routes/page-entry.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/routes/page-read.tsx` (delete) + `routes/page-read.test.tsx` + `routes/page-read.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/components/PageHeader.tsx` (delete) + its `.test.tsx` + `.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/components/ProsePanel.tsx` (delete) + its `.test.tsx` + `.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/components/ChildOutcomeVariant.tsx` (delete) + its `.test.tsx` + `.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/components/ChoiceCard.tsx` (delete) + its `.test.tsx` + `.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/components/ProseMissingPlaceholder.tsx` (delete) + its `.test.tsx` + `.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/components/Breadcrumb.tsx` (modify) + `Breadcrumb.test.tsx` + `Breadcrumb.a11y.test.tsx` (modify)
- `tools/story-explorer/web/src/components/NotFoundPage.tsx` (modify) + `NotFoundPage.test.tsx` + `NotFoundPage.a11y.test.tsx` (modify)
- `tools/story-explorer/web/src/routes/stories.tsx` (modify — strip `renderedProseCount` display) + `routes/stories.test.tsx` + `routes/stories.a11y.test.tsx` (modify)
- `tools/story-explorer/web/src/api/client.ts` (modify — remove page-scoped types/fields/functions)
- `tools/story-explorer/web/src/api/client.test.ts` (modify — drop removed-fn tests)
- `tools/story-explorer/web/src/lib/format.ts` (modify — remove `ProseStatus` formatter) + `lib/format`'s test if present (modify)

## Out of Scope

- Adding the new client surface — owned by SPEC97STOEXPSCE-001 (this ticket only removes the page-scoped half).
- Removing `PlanProseTab` — already done in SPEC97STOEXPSCE-002.
- Deleting `routes/worlds.tsx` / `routes/stories.tsx` — RETAINED as navigation-shell routes; only `stories.tsx`'s prose-count display is stripped.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — full web suite green after teardown; route-absence negative test passes.
2. `cd tools/story-explorer/web && npm run build` — `tsc` confirms no dangling references to the removed page-scoped surface.
3. `grep -rnE "getPageDetail|getProseBody|getPagePlan|getProseReceipt|searchPages|\\bPageDetail\\b|renderedProseCount|hasRenderedProse|ChoiceNavigation" tools/story-explorer/web/src` — zero matches (clean removal).

### Invariants

1. No route resolves the page-reader paths `/worlds/:slug/stories/:storySlug/entry` or `/worlds/:slug/stories/:storySlug/pages/:pageId`; PG inspection exists only as the state-tick x-ray drawer — §Story Bundles §4a.
2. Every removal is attributed (superseded-by scene-first surfaces + SPEC-96 backend removal); no production consumer is left dangling — Rule 6 No Silent Retcons.
3. `worlds.tsx` / `stories.tsx` remain functional navigation-shell routes; only the page-prose-count display is removed.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/app.test.tsx` (or route test) — assert the full nested page-reader paths do not resolve (AC1/AC6).
2. `tools/story-explorer/web/src/components/{Breadcrumb,NotFoundPage}.test.tsx` + `routes/stories.test.tsx` — updated for the reworked/stripped surfaces.
3. `tools/story-explorer/web/src/api/client.test.ts` — drop tests for removed functions.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
3. `grep -rnE "getPageDetail|\\bPageDetail\\b|renderedProseCount|ChoiceNavigation" tools/story-explorer/web/src` (expect zero matches)
