# SPEC93DECSTATUR-012: Story Explorer — verify graceful planless-PG handling; adjust page-plan-authoring tests

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer` (read paths preserved; tests adjusted)
**Deps**: archive/tickets/SPEC93DECSTATUR-001.md

## Problem

SPEC-93 §2 (Out of scope) required that the teardown NOT break Story Explorer's existing page-plan/page-prose **read** paths: legacy bundles continue to be served, and new (planless) `PG`s render a graceful "no page plan" state rather than crashing. The scene-first Story Explorer rewrite is explicitly deferred. This ticket added focused regression coverage for the already-live graceful-missing behavior without changing the read-path source.

## Assumption Reassessment (2026-05-28)

1. `tools/story-explorer/src/server/routes/prose.ts` serves `/page-plans/:pageId` (reads `pages-prose-plans/PG-<integer>.md`, returns 404 via `readOptionalBody()` on ENOENT); `src/read/page-detail.ts` is the page read path; `web/src/components/xray/tabs/PlanProseTab.tsx` catches the 404 and sets a `missing` state — all confirmed during SPEC-93 reassessment (this session): the read paths already handle absence gracefully.
2. SPEC-93 §2 Out-of-scope constraint + §6 Story Explorer bullet (preserve read paths; verify graceful planless handling; adjust only tests that assert page-plan authoring still happens) + §8 AC8 (Story Explorer still builds + serves legacy plans/prose and handles planless new `PG`s gracefully).
3. Cross-artifact boundary: Story Explorer reads the `PG` schema (consumes the relaxed `story-page.schema.json` from archive/tickets/SPEC93DECSTATUR-001.md) and the legacy `pages-prose-plans/` directory (kept enumerated by world-index per SPEC-93 §3); this is a read-side consumer, not a mutation surface. The SPEC-87/88 read-backend fence is preserved (no new mediation surface).
4. Live package check: `tools/story-explorer/package.json` defines `npm test` as `npm run build && node --test "dist/test/**/*.test.js" && npm --prefix web test`; `web/package.json` defines Vitest. This run kept the proof package-local and did not use a root workspace command.
5. No source behavior gap was found. The landed delta is test coverage only: backend page-detail summary, backend HTTP 404 route behavior, and frontend empty-state rendering.

## Architecture Check

1. Preserving the read paths (vs. removing them) is the spec's deliberate choice — legacy bundles must remain viewable; the planless state is handled by the existing 404 → `missing` path, so no new code is needed beyond test adjustment + confirmation.
2. No backwards-compatibility shim: the read paths are unchanged (they already degrade gracefully); only tests asserting that page-plan authoring still happens are adjusted to the planless reality.

## Verification Layers

1. Read paths preserved -> codebase grep-proof (`prose.ts` `/page-plans/:pageId` route + `read/page-detail.ts` intact).
2. Graceful planless handling -> test (`missing-prose.test.ts` / `PlanProseTab.test.tsx` confirm a planless `PG` yields the `missing` / "no page plan" state, no crash).
3. No test asserts page-plan authoring still happens -> codebase grep-proof + manual review (any such assertion adjusted).
4. Build + serve legacy -> build/test green (backend + web).

## Landed Changes

### 1. Extended graceful-handling tests

`tools/story-explorer/test/missing-prose.test.ts` now covers a planless `PG` with rendered prose and no page-plan artifact. `getPageDetail()` returns `pagePlanSummary: null` while preserving the page read and prose state.

`tools/story-explorer/test/routes.test.ts` now covers the legacy plan route and the planless `PG-2` 404 response in the same route fixture.

`tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` now covers the frontend 404-to-empty-state path and asserts that the page-plan section is not rendered for a planless `PG`.

### 2. Preserved read-path source

No changes were needed in `prose.ts`, `page-detail.ts`, or `PlanProseTab.tsx`; their existing behavior already matched SPEC-93's graceful legacy-read requirement.

## Files to Touch

- `tools/story-explorer/test/missing-prose.test.ts` (modify)
- `tools/story-explorer/test/routes.test.ts` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` (modify)

## Out of Scope

- The scene-first Story Explorer rewrite (explicitly deferred per SPEC-93 §2 + IMPLEMENTATION-ORDER).
- Removing the legacy page-plan/page-prose read routes (preserved for legacy bundles).
- world-index legacy-directory enumeration (kept per SPEC-93 §3; not a Story Explorer change).

## Acceptance Criteria

### Tests That Must Pass

1. A planless `PG` renders the "no page plan" / `missing` state with no crash (backend 404 + frontend `missing`) — covered by backend route/page-detail tests and frontend tab test.
2. Legacy bundles (with page plans/prose) still build + serve unchanged — covered by existing route and capstone tests in the same package run.
3. `(cd tools/story-explorer && npm test)` passed.

### Invariants

1. The page-plan/page-prose read paths are preserved for legacy bundles (no route deletion).
2. The SPEC-87/88 read-backend fence is intact (no new canon-mediation surface introduced).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/missing-prose.test.ts` — added planless-`PG` page-detail graceful-handling case.
2. `tools/story-explorer/test/routes.test.ts` — added missing page-plan 404 route assertion while retaining the legacy plan route assertion.
3. `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` — added `missing`-state assertion for a planless `PG`.

### Commands

1. `(cd tools/story-explorer && npm test)` — passed; includes backend build/tests and `npm --prefix web test`.

## Outcome

Completed 2026-05-28.

The Story Explorer read paths were verified as already graceful for planless `PG`s, so this ticket landed regression coverage rather than production source changes. Backend tests now prove `getPageDetail()` returns `pagePlanSummary: null` for a planless page and that `/page-plans/PG-2` returns the typed missing-plan 404 while legacy `PG-1` still serves its page plan. The frontend tab test now proves the 404 response renders `No page plan for this page.` without rendering the page-plan section.

## Verification Result

- `(cd tools/story-explorer && npm test)` — PASS. Backend compiled tests: 93/93 passed. Web Vitest: 76 files passed, 186 tests passed.
- `rg -n "pagePlanSummary\\?\\.body|prose_plan_path|pages-prose-plans|Page Plan \\(rendering instructions" tools/story-explorer/test tools/story-explorer/web/src/components/xray/tabs/__tests__` — PASS by manual classification. Remaining positive hits are legacy-read fixtures/assertions plus the new planless negative assertion; no current test requires every `PG` to have a page plan.
- The web run emitted existing React Router future-flag warnings and the expected `ErrorBoundary` test stderr stack from its intentional thrown-child fixture; no failures.

## Deviations

- No Story Explorer source files changed because live reassessment showed the source behavior already matched SPEC-93. The ticket closed by adding regression tests at the backend reader, backend route, and frontend empty-state surfaces.
- `(cd tools/story-explorer/web && npm test)` was not run as a separate command because package-root `npm test` runs `npm --prefix web test` after the backend build/tests; the web suite passed in that lane.
