# SPEC96STOEXPSCE-007: Remove page-first reader surfaces + migrate backend tests

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: delete page-first routes + read layer + view-models + page-prose summary fields; unregister in `http.ts`; migrate backend tests. Read-only package; removal of read surfaces only.
**Deps**: archive/tickets/SPEC96STOEXPSCE-001.md

## Problem

At intake, SPEC-96 §2.7 (D7 removal) required the backend to stop exposing PGs as reader pages and page-prose as reader artifacts. This ticket removed the page-first reader routes (`/pages`, `/pages/:pageId`, `/prose/:pageId`, `/page-plans/:pageId`, `/prose-receipts/:pageId`), the `getPageDetail` / `readProse` / page-prose read layer, the `PageDetail` view model and its now-orphaned page-first choice view-models (`ChoiceNavigation`, `ChildOutcomeVariant`), and page-prose-derived summary fields. The new scene-first surfaces (001–006) replace the reader model; the response envelope + read-only guard are preserved.

## Assumption Reassessment (2026-05-29)

1. Removal targets verified present at HEAD (SPEC-96 reassessment, 2026-05-29): routes `tools/story-explorer/src/server/routes/pages.ts` (`/pages`, `/pages/:pageId`) + `routes/prose.ts` (`/prose/:pageId`, `/page-plans/:pageId`, `/prose-receipts/:pageId`); read layer `read/page-detail.ts` (`getPageDetail`, `PageDetailNotFoundError`) + `read/prose-direct.ts` (`readProse`); view-models `view-models/page-detail.ts` (`PageDetail`), `view-models/choice-navigation.ts` (`ChoiceNavigation`, consumed only by PageDetail assembly), `view-models/child-outcome-variant.ts` (`ChildOutcomeVariant`, consumed only via ChoiceNavigation/PageDetail); page-prose fields at `view-models/page-summary.ts:10` (`hasRenderedProse`), `view-models/child-outcome-variant.ts:9` (`hasRenderedProse`), `view-models/story-summary.ts:12` (`renderedProseCount`); `renderedProseCount` is page-prose-derived at `read/story-list.ts` (`fileEntries(... "pages-prose" ...)`). The retained `EventDeltaSummary` was relocated out of `page-detail.ts` by SPEC96STOEXPSCE-001 (Deps) — deleting `page-detail.ts` no longer drops a retained type.
2. SPEC-96 §4 test inventory (rewritten at reassessment as Issue I1) prescribes three distinct test actions: **delete** `test/page-detail.test.ts` + `test/missing-prose.test.ts`; **rewrite** `test/routes.test.ts` (drop `/pages` + `/prose` route assertions and the `pageDetailNotFoundMessage` import; keep records/provenance/params coverage); **update** `test/enumeration.test.ts` (drop the `renderedProseCount` (L172) + `hasRenderedProse` (L214) assertions and keep story/page enumeration coverage). The capstone-smoke.test.ts rewrite is owned by SPEC96STOEXPSCE-008 (it exercises the new scene routes).
3. Cross-artifact boundary under audit: the SPEC-97-owned frontend (`web/`) still consumes these routes/fields (page-read route loader, `ProsePanel`, `PlanProseTab`, `stories.tsx` rendering `renderedProseCount`). This ticket does NOT touch `web/` — frontend migration is SPEC-97's scope. Per spec §8 Risks, after this ticket lands the live frontend points at removed routes until SPEC-97 ships; this ticket's accepted backend proof is build + focused backend tests because the broad backend capstone rewrite belongs to direct-dependent SPEC96STOEXPSCE-008.
4. FOUNDATIONS Rule 6 (No Silent Retcons): removing live read surfaces is a behavior change that must be attributed — this ticket records what is removed and why (the scene-first model of SPEC-92/93/95 supersedes page-first reading), rather than silently dropping routes. The removal narrative lives in this ticket + the spec's §1/§2.7.
5. (was template item 7 — rename/remove blast radius) grep-confirmed consumer surfaces: backend tests `enumeration.test.ts` (asserts both removed fields), `routes.test.ts` (pages/prose route assertions + `pageDetailNotFoundMessage` import), `capstone-smoke.test.ts` (hits all four page/prose routes — owned by 008), `page-detail.test.ts` + `missing-prose.test.ts` (page-detail tests — deleted here); frontend `web/` consumers (SPEC-97 scope, not touched). `http.ts` register lines for `registerPageRoutes` + `registerProseRoutes` removed here.
6. Reassessment during implementation found the drafted `npm run test:backend` gate is not truthful for this ticket alone once page/prose routes are deleted: the broad suite also runs `test/capstone-smoke.test.ts`, whose rewrite is explicitly owned by direct-dependent ticket `tickets/SPEC96STOEXPSCE-008.md`. This ticket's accepted proof boundary is therefore `npm run build:backend`, focused compiled `routes.test.js` + `enumeration.test.js`, and grep/manual-review removal proof. `npm run test:backend` becomes the 008 capstone gate after the capstone test is rewritten.

## Architecture Check

1. Deleting the page-first read layer + view-models wholesale (rather than leaving dead routes returning 404) keeps the backend's surface honestly scene-first and prevents the page-equals-prose mental model from persisting in dead code. Dropping the page-prose-derived summary fields removes the last page-prose read (`read/story-list.ts` `pages-prose` scan), so the backend no longer reads the legacy page-prose dirs at all.
2. No backwards-compatibility shims: removed routes are deleted, not aliased or stubbed; no compatibility layer is left behind.

## Verification Layers

1. Page-first routes gone → codebase grep-proof: `grep -rn "registerPageRoutes\|registerProseRoutes\|getPageDetail\|readProse\|PageDetail\b" tools/story-explorer/src` returns zero matches (the relocated `EventDeltaSummary` lives in its own file, not matched by `PageDetail\b`).
2. Page-prose fields gone → grep-proof: `grep -rn "hasRenderedProse\|renderedProseCount" tools/story-explorer/src` returns zero matches.
3. Backend tests migrated at the 007 boundary → test run: `page-detail.test.ts` + `missing-prose.test.ts` deleted; `routes.test.ts` + `enumeration.test.ts` compile and pass without page/prose assertions. The broad `npm run test:backend` lane is intentionally deferred to 008 because `capstone-smoke.test.ts` still exercises the removed routes until that ticket rewrites it.
4. Retained surfaces intact (cross-cutting) → grep-proof: `records/:recordId`, `records/:recordId/raw`, `provenance/:recordId` routes + the response envelope + read-only guard remain registered in `http.ts`.

## Landed Changes

### 1. Delete page-first routes + read layer + view-models

Deleted `routes/pages.ts`, `routes/prose.ts`, `read/page-detail.ts`, `read/prose-direct.ts`, `view-models/page-detail.ts`, `view-models/choice-navigation.ts`, and `view-models/child-outcome-variant.ts`. Removed the `registerPageRoutes` + `registerProseRoutes` imports and registration calls from `http.ts`; all other registrations, the read-only guard, and the envelope remain intact.

### 2. Drop page-prose-derived summary fields

Removed `hasRenderedProse`, `hasPlan`, and `hasReceipt` from `view-models/page-summary.ts`; removed `renderedProseCount` from `view-models/story-summary.ts`; removed the legacy `pages-prose`, `pages-prose-plans`, and `pages-prose-receipts` file-scans in `read/story-list.ts`.

### 3. Migrate backend tests

Deleted `test/page-detail.test.ts` and `test/missing-prose.test.ts`. Rewrote `test/routes.test.ts` to remove the `/pages` + `/prose` route assertions and the `pageDetailNotFoundMessage` import while keeping records/provenance/params coverage. Updated `test/enumeration.test.ts` to drop removed-field assertions and keep story/page enumeration coverage.

## Files to Touch

- `tools/story-explorer/src/server/routes/pages.ts` (delete)
- `tools/story-explorer/src/server/routes/prose.ts` (delete)
- `tools/story-explorer/src/read/page-detail.ts` (delete)
- `tools/story-explorer/src/read/prose-direct.ts` (delete)
- `tools/story-explorer/src/view-models/page-detail.ts` (delete)
- `tools/story-explorer/src/view-models/choice-navigation.ts` (delete)
- `tools/story-explorer/src/view-models/child-outcome-variant.ts` (delete)
- `tools/story-explorer/src/server/http.ts` (modify — unregister page/prose routes)
- `tools/story-explorer/src/view-models/page-summary.ts` (modify — drop legacy page prose/plan/receipt booleans)
- `tools/story-explorer/src/view-models/story-summary.ts` (modify — drop `renderedProseCount`)
- `tools/story-explorer/src/read/story-list.ts` (modify — drop page-prose-derived field computation)
- `tools/story-explorer/test/page-detail.test.ts` (delete)
- `tools/story-explorer/test/missing-prose.test.ts` (delete)
- `tools/story-explorer/test/routes.test.ts` (modify — drop page/prose route assertions + `pageDetailNotFoundMessage` import)
- `tools/story-explorer/test/enumeration.test.ts` (modify — drop removed-field assertions)

## Out of Scope

- The new scene-first surfaces (001–006) — this ticket only removes.
- `test/capstone-smoke.test.ts` rewrite (owned by 008).
- Any `web/` frontend change (SPEC-97 scope; staging documented in spec §8).
- Retained `records/:recordId`, `records/:recordId/raw`, `provenance/:recordId` routes, the envelope, and the read-only guard (must remain).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "registerPageRoutes\|registerProseRoutes\|getPageDetail\|readProse\|hasRenderedProse\|renderedProseCount" tools/story-explorer/src` returns zero matches.
2. `test/page-detail.test.ts` + `test/missing-prose.test.ts` no longer exist; `routes.test.ts` + `enumeration.test.ts` carry no page/prose assertions.
3. `cd tools/story-explorer && npm run build:backend` passes, and `node --test dist/test/routes.test.js dist/test/enumeration.test.js` passes after the build. The broad `npm run test:backend` gate is owned by direct-dependent capstone ticket `tickets/SPEC96STOEXPSCE-008.md`.

### Invariants

1. The retained technical lookup surfaces (`records/:recordId`, `/raw`, `provenance/:recordId`), the response envelope, and the read-only guard remain registered and functional after removal.
2. The backend no longer reads the legacy `pages-prose` directories anywhere.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/routes.test.ts` — modified; page/prose assertions removed, records/provenance/params retained.
2. `tools/story-explorer/test/enumeration.test.ts` — modified; removed-field assertions dropped while story/page enumeration coverage remains.
3. `tools/story-explorer/test/page-detail.test.ts`, `tools/story-explorer/test/missing-prose.test.ts` — deleted.

### Commands

1. `cd tools/story-explorer && npm run build:backend`
2. `cd tools/story-explorer && node --test dist/test/routes.test.js dist/test/enumeration.test.js`
3. `grep -rn "registerPageRoutes\|registerProseRoutes\|getPageDetail\|readProse\|hasRenderedProse\|renderedProseCount" tools/story-explorer/src`

## Outcome

Completed: 2026-05-29

Removed the page-first backend reader surface and its direct tests. `http.ts` no longer registers page/prose routes; the page-detail/prose read layer and page-first view-model files are gone; story/page summaries no longer read legacy page-prose directories. `routes.test.ts` now covers retained record/provenance surfaces, and `enumeration.test.ts` covers story/page enumeration without page-prose fields.

## Verification Result

1. Pre-edit baseline: `cd tools/story-explorer && npm run test:backend` — PASS, 21/21 backend test files.
2. Final build: `cd tools/story-explorer && npm run build:backend` — PASS.
3. Focused final tests: `cd tools/story-explorer && node --test dist/test/routes.test.js dist/test/enumeration.test.js` — PASS, 6/6 subtests.
4. Removed-symbol grep: `rg -n "registerPageRoutes|registerProseRoutes|getPageDetail|readProse|PageDetail\b|hasRenderedProse|renderedProseCount" tools/story-explorer/src` — PASS, no matches.
5. Legacy page-prose source-path grep: `rg -n "pages-prose|page-plans|/prose-receipts|\"prose-receipts\"" tools/story-explorer/src` — PASS, no matches.
6. Retained-surface review: `rg -n "records/:recordId|registerRecordRoutes|registerProvenanceRoutes|wrapRouterReadOnly|installEnvelopeHook" tools/story-explorer/src/server/http.ts tools/story-explorer/src/server/routes/records.ts tools/story-explorer/src/server/routes/provenance.ts tools/story-explorer/src/server/readonly-guard.ts` — PASS; records/provenance, envelope hook, and read-only guard remain registered/present.

## Deviations

- The drafted `npm run test:backend` final gate was narrowed for this ticket after reassessment: the broad backend suite also runs `test/capstone-smoke.test.ts`, whose page/prose route rewrite is explicitly owned by direct-dependent `tickets/SPEC96STOEXPSCE-008.md`. This ticket therefore proves its owned boundary with build + focused tests + grep/manual review, and leaves broad suite green to the queued capstone ticket.
- `PageSummary.hasPlan` and `PageSummary.hasReceipt` were removed with `hasRenderedProse` because keeping them would preserve legacy page-prose directory reads, violating this ticket's invariant that the backend no longer reads `pages-prose*` directories.
