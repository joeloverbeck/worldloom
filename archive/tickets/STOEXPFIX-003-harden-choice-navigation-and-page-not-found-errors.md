# STOEXPFIX-003: Harden choice-navigation missing-record handling and page-detail not-found errors

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/read/page-detail.ts` (choice-navigation missing-record degradation); `tools/story-explorer/src/server/routes/pages.ts` (typed not-found handling)
**Deps**: `archive/tickets/STOEXPFIX-002-route-stchar-raw-reads-to-story-characters.md`

## Problem

`archive/tickets/STOEXPFIX-002-route-stchar-raw-reads-to-story-characters.md` fixed the user-visible STCHAR raw-source 500 by routing STCHAR reads to `story-characters/*.md` and making `rawSources()` ENOENT-tolerant. Post-ticket review found two adjacent page-detail error seams that were real at intake but intentionally out of scope for STOEXPFIX-002:

1. Before this ticket, `choiceNavigation()` called `readRecord(worldSlug, storySlug, choiceId, repoRoot)` inside a `Promise.all` without ENOENT handling. A page whose `emitted_choices[]` referenced a missing `CHC-*` record could reject the whole page-detail request.
2. Before this ticket, `tools/story-explorer/src/server/routes/pages.ts` mapped page-detail misses to HTTP 404 by checking `message.includes("not found")`. This was brittle because the route had no typed distinction between "target page missing" and other not-found-shaped internal failures.

The completed STOEXPFIX-002 invariant was deliberately narrow: a missing raw-source active record must not 500 the page response. This follow-up owns the neighboring choice-navigation and route error-classification hardening without reopening STCHAR path resolution.

## Assumption Reassessment (2026-05-26)

1. At intake, `tools/story-explorer/src/read/page-detail.ts` defined `choiceNavigation()` with a `Promise.all(choiceIds.map(...))` flow. Each mapped entry read its CHC via `readRecord(...)` and did not catch ENOENT before returning a `ChoiceNavigation` object. The landed implementation catches only ENOENT for the CHC read and returns a stable fallback choice-navigation entry.
2. At intake, `tools/story-explorer/src/server/routes/pages.ts` caught errors from `getPageDetail()` and returned 404 only when `message.includes("not found")`; all other errors were re-thrown to Fastify. The landed implementation replaces that substring check with `PageDetailNotFoundError` / `pageDetailNotFoundMessage()`.
3. Shared boundary under audit: the page-detail API contract across `getPageDetail()`, `choiceNavigation()`, and the page route handler. Page-detail now degrades or classifies expected missing story-bundle references deliberately, while true internal failures remain visible.
4. FOUNDATIONS principle under audit: §Story Bundles §3 Read Discipline requires read paths to reflect the actual story-bundle storage form and use targeted retrieval/raw reads deliberately. This ticket does not mutate canon or story content; it only hardens read-surface behavior for missing records.
5. Adjacent contradiction classification: route-level typed not-found handling and CHC missing-record tolerance are same package but outside STOEXPFIX-002's owned STCHAR/raw-source fix. They were concrete follow-up work because intake code still contained the unhandled paths and the archived ticket named them as out of scope.
6. Response-shape choice: the existing `ChoiceNavigation` schema stayed stable. A missing emitted CHC now returns a fallback choice-navigation entry keyed by the emitted `choiceId`, using the id as the visible label, empty optional metadata, existing child variants when present, and `isNavigable` derived from child variants. This preserves page structure without adding a new frontend/API field.
7. Route proof shape: `routes.test.ts` already exercised the Fastify page route. The landed test adds a route-level target-page 404 assertion plus a route helper assertion proving a generic internal `Error("Record not found ...")` is not classified as the target-page 404.

## Architecture Check

1. The implementation uses a typed internal not-found error class instead of broad string matching. That keeps the page route's 404 mapping intentional and avoids swallowing unrelated errors whose message happens to contain "not found".
2. The implementation uses a structured fallback choice-navigation entry over rejecting the whole page. Missing CHC files no longer make the entire page unreadable when the rest of the page state is available.
3. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Missing emitted `CHC-*` does not reject `getPageDetail()` -> targeted backend unit test in `tools/story-explorer/test/page-detail.test.ts`
2. Target page absence still returns HTTP 404 through the page route -> route test in `tools/story-explorer/test/routes.test.ts`
3. Non-not-found internal failures are not converted to 404 by broad string matching -> focused route or handler test
4. Existing STCHAR raw-read behavior from STOEXPFIX-002 remains green -> existing `record-io` / `page-detail` tests

## Landed Changes

### 1. Choice-navigation missing CHC handling

`tools/story-explorer/src/read/page-detail.ts` now catches ENOENT while reading each emitted CHC in `choiceNavigation()`. Missing CHC records no longer reject `getPageDetail()`; they produce a fallback `ChoiceNavigation` entry with stable existing fields: `choiceId`, `surfaceLabel: choiceId`, empty metadata, any existing child variants, and `isNavigable` based on those variants.

### 2. Typed page-detail not-found behavior

`tools/story-explorer/src/read/page-detail.ts` now throws `PageDetailNotFoundError` for the target page missing path. `tools/story-explorer/src/server/routes/pages.ts` maps only that typed error to HTTP 404 through `pageDetailNotFoundMessage()` and no longer uses `message.includes("not found")` as the route contract.

### 3. Test coverage

Package backend tests now cover:

- a page-detail fixture whose `emitted_choices[]` names a missing `CHC-*`
- a route fixture proving target-page misses return 404
- a route helper assertion proving unrelated internal errors are not converted to 404 merely because their message contains `not found`

## Files to Touch

- `tools/story-explorer/src/read/page-detail.ts` (modify)
- `tools/story-explorer/src/server/routes/pages.ts` (modify)
- `tools/story-explorer/test/page-detail.test.ts` (modify)
- `tools/story-explorer/test/routes.test.ts` (modify)

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

1. `tools/story-explorer/test/page-detail.test.ts` — added a missing emitted-choice fixture and asserted `getPageDetail()` returns a populated payload.
2. `tools/story-explorer/test/routes.test.ts` — added route tests for typed target-page 404 and non-404 internal failures.

### Commands

1. `cd tools/story-explorer && npm run build:backend`
2. `cd tools/story-explorer && node --test dist/test/page-detail.test.js`
3. `cd tools/story-explorer && node --test dist/test/routes.test.js`
4. `cd tools/story-explorer && npm test`

## Outcome

Completion date: 2026-05-26.

Missing emitted CHC records no longer take down page detail assembly. `choiceNavigation()` now preserves the emitted choice id in a fallback entry, keeps any existing child page variants, and leaves non-ENOENT read failures visible.

Page-detail target-page misses are now typed through `PageDetailNotFoundError`, and the page route maps only that typed condition to HTTP 404. Generic internal errors whose messages contain `not found` are no longer treated as page-missing route errors.

## Verification Result

1. `cd tools/story-explorer && npm run build:backend` — passed before source edits and after implementation.
2. `cd tools/story-explorer && node --test dist/test/page-detail.test.js` — passed after backend build.
3. `cd tools/story-explorer && node --test dist/test/routes.test.js` — passed after backend build.
4. `cd tools/story-explorer && npm test` — passed. Backend `node:test` reported 87 passing tests. Web Vitest reported 76 files / 184 tests passing. The run emitted existing React Router future-flag warnings and expected jsdom error-boundary stderr; the command exited 0.
5. Manual review confirmed `tools/story-explorer/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md` do not document the internal page-detail 404 classification or choice-navigation fallback shape, so no package/user-facing docs update was required.

## Deviations

1. The missing CHC behavior uses the existing `ChoiceNavigation` response shape rather than adding a new degraded-state field. This keeps the API/frontend contract stable while still preventing a page-level rejection.
2. The non-target-page not-found proof is a focused route helper assertion (`pageDetailNotFoundMessage(new Error("Record not found ...")) === null`) rather than a full Fastify fixture for an arbitrary internal not-found-shaped failure. The route itself is exercised for the typed target-page 404 path.
3. Verification refreshed ignored package artifacts under `tools/story-explorer/dist/` and `tools/story-explorer/web/dist/`; these are generated proof artifacts, not tracked source changes.
