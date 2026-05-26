# STOEXPFIX-003: Harden choice-navigation missing-record handling and page-detail not-found errors

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/read/page-detail.ts` (choice-navigation missing-record degradation); `tools/story-explorer/src/server/routes/pages.ts` (typed not-found handling)
**Deps**: `archive/tickets/STOEXPFIX-002-route-stchar-raw-reads-to-story-characters.md`

## Problem

`archive/tickets/STOEXPFIX-002-route-stchar-raw-reads-to-story-characters.md` fixed the user-visible STCHAR raw-source 500 by routing STCHAR reads to `story-characters/*.md` and making `rawSources()` ENOENT-tolerant. Post-ticket review found two adjacent page-detail error seams that remain real but were intentionally out of scope for STOEXPFIX-002:

1. `choiceNavigation()` still calls `readRecord(worldSlug, storySlug, choiceId, repoRoot)` inside a `Promise.all` without ENOENT handling. A page whose `emitted_choices[]` references a missing `CHC-*` record can still reject the whole page-detail request.
2. `tools/story-explorer/src/server/routes/pages.ts` maps page-detail misses to HTTP 404 by checking `message.includes("not found")`. This is brittle because the route has no typed distinction between "target page missing" and other not-found-shaped internal failures.

The completed STOEXPFIX-002 invariant was deliberately narrow: a missing raw-source active record must not 500 the page response. This follow-up owns the neighboring choice-navigation and route error-classification hardening without reopening STCHAR path resolution.

## Assumption Reassessment (2026-05-26)

1. `tools/story-explorer/src/read/page-detail.ts` still defines `choiceNavigation()` with a `Promise.all(choiceIds.map(...))` flow. Each mapped entry reads its CHC via `readRecord(...)` and does not catch ENOENT before returning a `ChoiceNavigation` object.
2. `tools/story-explorer/src/server/routes/pages.ts` still catches errors from `getPageDetail()` and returns 404 only when `message.includes("not found")`; all other errors are re-thrown to Fastify.
3. Shared boundary under audit: the page-detail API contract across `getPageDetail()`, `choiceNavigation()`, and the page route handler. Page-detail should degrade or classify expected missing story-bundle references deliberately, while true internal failures should remain visible.
4. FOUNDATIONS principle under audit: §Story Bundles §3 Read Discipline requires read paths to reflect the actual story-bundle storage form and use targeted retrieval/raw reads deliberately. This ticket does not mutate canon or story content; it only hardens read-surface behavior for missing records.
5. Adjacent contradiction classification: route-level typed not-found handling and CHC missing-record tolerance are same package but outside STOEXPFIX-002's owned STCHAR/raw-source fix. They are concrete follow-up work because live code still contains the unhandled paths and the archived ticket names them as out of scope.

## Architecture Check

1. Prefer a typed internal not-found signal or explicit error class over broad string matching. That keeps the page route's 404 mapping intentional and avoids swallowing unrelated errors whose message happens to contain "not found".
2. Prefer a structured degraded choice-navigation entry, or a documented omission plus validation-integrity skip/broken-reference signal, over rejecting the whole page. Missing CHC files should not make the entire page unreadable when the rest of the page state is available.
3. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Missing emitted `CHC-*` does not reject `getPageDetail()` -> targeted backend unit test in `tools/story-explorer/test/page-detail.test.ts`
2. Target page absence still returns HTTP 404 through the page route -> route test in `tools/story-explorer/test/routes.test.ts` or existing equivalent route coverage
3. Non-not-found internal failures are not converted to 404 by broad string matching -> focused route or handler test
4. Existing STCHAR raw-read behavior from STOEXPFIX-002 remains green -> existing `record-io` / `page-detail` tests

## What to Change

### 1. Choice-navigation missing CHC handling

Update `tools/story-explorer/src/read/page-detail.ts` so a missing emitted CHC record does not reject the whole `getPageDetail()` call.

Choose the narrowest truthful response shape during reassessment:

- omit the missing choice from `choiceNavigation[]` and report it through an existing integrity field if the missing CHC is already visible as a broken reference, or
- emit a degraded `ChoiceNavigation` entry with fallback labels and an explicit non-navigable/degraded state if the UI needs to preserve the emitted choice id.

### 2. Typed page-detail not-found behavior

Update `tools/story-explorer/src/server/routes/pages.ts` and the read layer as needed so the route maps only the intended target-page-missing condition to HTTP 404.

Avoid `message.includes("not found")` as the route contract.

### 3. Test coverage

Extend package backend tests with:

- a page-detail fixture whose `emitted_choices[]` names a missing `CHC-*`
- a route fixture proving target-page misses return 404
- a route or handler assertion proving unrelated internal errors are not converted to 404 merely because their message contains `not found`

## Files to Touch

- `tools/story-explorer/src/read/page-detail.ts` (modify)
- `tools/story-explorer/src/server/routes/pages.ts` (modify)
- `tools/story-explorer/test/page-detail.test.ts` (modify)
- `tools/story-explorer/test/routes.test.ts` (modify, or equivalent route test)

## Out of Scope

- STCHAR raw-read path resolution; completed in `archive/tickets/STOEXPFIX-002-route-stchar-raw-reads-to-story-characters.md`.
- `rawSources()` ENOENT tolerance; completed in `archive/tickets/STOEXPFIX-002-route-stchar-raw-reads-to-story-characters.md`.
- Changes to `world-index`, validators, patch-engine, or story-bundle content.

## Acceptance Criteria

### Tests That Must Pass

1. A missing emitted `CHC-*` no longer makes `getPageDetail()` reject.
2. The target page missing path returns HTTP 404 through `/api/worlds/:slug/stories/:storySlug/pages/:pageId`.
3. A non-target-page internal error whose message contains `not found` is not misclassified as the target-page 404.
4. `cd tools/story-explorer && npm test` passes.

### Invariants

1. Expected missing story-bundle references in optional page-detail sub-surfaces must degrade deliberately; they must not accidentally 500 the whole page response.
2. Route-level 404 handling must be typed or otherwise explicit to the target-page-missing condition, not based on broad substring matching.
3. Unexpected internal failures must remain visible as server errors.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/page-detail.test.ts` — add a missing emitted-choice fixture and assert `getPageDetail()` returns a populated payload.
2. `tools/story-explorer/test/routes.test.ts` — add/adjust route tests for typed target-page 404 and non-404 internal failures.

### Commands

1. `cd tools/story-explorer && npm run build:backend`
2. `cd tools/story-explorer && node --test dist/test/page-detail.test.js`
3. `cd tools/story-explorer && node --test dist/test/routes.test.js`
4. `cd tools/story-explorer && npm test`
