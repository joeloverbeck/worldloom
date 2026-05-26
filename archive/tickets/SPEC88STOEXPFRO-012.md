# SPEC88STOEXPFRO-012: Accessibility baseline verification + axe-core integration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds axe-core integration to vitest setup and per-component a11y assertions; modifies T001's test-setup.ts.
**Deps**: archive/tickets/SPEC88STOEXPFRO-001.md, archive/tickets/SPEC88STOEXPFRO-004.md, archive/tickets/SPEC88STOEXPFRO-005.md, archive/tickets/SPEC88STOEXPFRO-006.md, archive/tickets/SPEC88STOEXPFRO-007.md, archive/tickets/SPEC88STOEXPFRO-008.md, archive/tickets/SPEC88STOEXPFRO-009.md, archive/tickets/SPEC88STOEXPFRO-010.md, archive/tickets/SPEC88STOEXPFRO-011.md

## Problem

At intake, SPEC-88 §8 committed to WCAG AA across the entire explorer surface: keyboard Tab order following visual flow, focus states, ARIA disclosure pattern for collapsibles, semantic headings (`<h1>` page/story, `<h2>` prose / choices / x-ray, `<h3>` x-ray groups), reduced-motion respect, color contrast (4.5:1 body, 3:1 large). Per-component tickets (T004-T011) followed these rules but verified them ad-hoc. Without a cross-cutting verification ticket that runs axe-core against every component and every route as an integrated test suite, regressions could slip through. This ticket added that axe-core verification surface and the per-component / per-route a11y test files.

## Assumption Reassessment (2026-05-26)

1. T001 created `web/src/test-setup.ts` with `@testing-library/jest-dom` extensions; this ticket extends it with axe-core (`vitest-axe` or equivalent). T004-T011 created the components and routes that this ticket verifies. SPEC-88 §10 (post-reassessment) names: "Frontend tests via vitest + React Testing Library (declared in `web/package.json` devDependencies): render tests per route, accessibility tests via axe-core, missing-prose placeholder visual snapshot, choice-card multi-variant rendering, breadcrumb anchor correctness." Per the SPEC-88 reassessment session's M3 wording fix, the a11y tests run in the package test suite (per §10), not in a separate CI configuration.
2. SPEC-88 §8 (post-reassessment) names the WCAG AA discipline distributed across T004-T011: T004 (disclosure ARIA, ErrorBoundary keyboard reachability), T005 (semantic card grid, badge contrast), T006 (story-card semantic structure), T007 (page-entry form a11y, choose-page input label), T008 (Breadcrumb semantic `<nav>`, PageHeader Tab order, IntegrityChip popover ARIA), T009 (prose semantic headings, reduced-motion gating), T010 (ChoiceCard button-vs-link semantics, TerminalCard contrast), T011 (ErrorBoundary fallback keyboard reachability, retry-button focus management). This ticket VERIFIES the discipline holistically — runs axe-core against rendered route trees, asserts heading-level continuity, verifies Tab order, asserts contrast.
3. Cross-skill boundary: this is the consumer-side verification of every component/route ticket's a11y contract. Drift in any single component's ARIA / heading semantics surfaces here as a vitest failure. The axe-core integration is the gate that converts the spec's prose commitment into structural enforcement.
4. Live package reassessment corrected three implementation details before source edits: the package uses `vite.config.ts` with inline vitest config rather than `vitest.config.ts`; the shared helper landed as `.tsx` because it renders JSX; and `vitest-axe`'s `matchers` type surface is not directly value-importable in this package's TypeScript lane, so `test-setup.ts` imports `vitest-axe/extend-expect` and helper tests assert the concrete `axe(container).violations` array.
5. The first axe run exposed real same-seam ARIA role issues: `role="alert"` was incorrectly placed on `<main>` in route error surfaces, and `role="status"` was incorrectly placed on `<aside>` in `IndexStatusBanner`. This ticket absorbed those semantics fixes because the new a11y gate could not close truthfully without them.

## Architecture Check

1. **axe-core via `vitest-axe` integration** — extends vitest with the axe matcher and uses helper-driven `await axe(container)` assertions. Lightweight, plays well with React Testing Library, no separate Playwright/browser dependency.
2. **Per-component axe assertions** — every component gets a sibling `.a11y.test.tsx` file that renders it in isolation and asserts the helper-reported axe result has no violations. This catches per-component violations.
3. **Per-route axe assertions** — every route gets a sibling `.a11y.test.tsx` file that renders the route (with mocked data) and asserts no violations across the composed tree. This catches composition-level violations (e.g., a route's `<h1>` conflicting with a sub-component's `<h1>`).
4. **Heading-level continuity check** — a custom helper `assertHeadingHierarchy(container)` that walks the rendered tree, extracts heading levels, and asserts `<h1>` precedes `<h2>` precedes `<h3>` without level skips. Catches the common pitfall of jumping from `<h1>` to `<h3>` without an intervening `<h2>`.
5. **Reduced-motion test** — a small test sets `prefers-reduced-motion: reduce` via `matchMedia` mock and asserts that motion-gated CSS classes are not applied. Verifies the §8 commitment that "no motion-only state change signals" exist.
6. **No backwards-compatibility aliasing/shims introduced** — purely additive test infrastructure.

## Verification Layers

1. **axe-core integration works** → smoke test: render a known-clean component (e.g., a simple `<button>Click</button>`); assert `await axe(container)` returns no violations.
2. **Every component passes axe** → per-component a11y test files for T004-T011's components; all assert no violations.
3. **Every route passes axe** → per-route a11y test files for T005/T006/T007/T008's routes; all assert no violations against rendered (mocked-data) trees.
4. **Heading-level continuity** → `assertHeadingHierarchy` helper test: passes for known-good hierarchies, fails for known-bad (e.g., h1 → h3).
5. **Color contrast (4.5:1 body, 3:1 large)** → axe-core covers this automatically; the per-component / per-route tests catch contrast violations as part of `toHaveNoViolations()`.
6. **Reduced-motion gating** → unit test: set `prefers-reduced-motion: reduce`; render a component with motion CSS; assert the motion class isn't applied OR assert the transition is 0ms.

## Landed Changes

### 1. Added axe-core dependencies to `tools/story-explorer/web/package.json`

Added to `devDependencies` and lockfile:
```json
"vitest-axe": "^0.1.0",
"axe-core": "^4.11.4"
```

### 2. Modified `tools/story-explorer/web/src/test-setup.ts`

The setup now imports `vitest-axe/extend-expect` and stubs `HTMLCanvasElement.prototype.getContext` enough for axe-core's jsdom color-contrast path to run without the jsdom `getContext` not-implemented diagnostic.

### 3. Created `tools/story-explorer/web/src/lib/a11y-test-helpers.tsx`

Shared helpers:
- `renderForAxe(ui)` — wraps RTL's `render` with `<MemoryRouter>` and any required providers; returns the rendered container ready for axe.
- `assertHeadingHierarchy(container)` — walks DOM, extracts heading levels, asserts no level-skip violations.
- `withReducedMotion(test)` — wraps a test function with `matchMedia` mock setting `prefers-reduced-motion: reduce`.
- `expectNoAxeViolations(container)` — runs axe-core and fails the test on any returned violation.

### 4. Created per-component a11y test files (15 files)

One sibling `.a11y.test.tsx` per component:
- `web/src/components/ErrorBoundary.a11y.test.tsx`
- `web/src/components/RouteLoading.a11y.test.tsx`
- `web/src/components/IndexStatusBanner.a11y.test.tsx`
- `web/src/components/disclosure/Disclosure.a11y.test.tsx`
- `web/src/components/PageHeader.a11y.test.tsx`
- `web/src/components/Breadcrumb.a11y.test.tsx`
- `web/src/components/BranchChip.a11y.test.tsx`
- `web/src/components/IntegrityChip.a11y.test.tsx`
- `web/src/components/ProsePanel.a11y.test.tsx`
- `web/src/components/ProseMissingPlaceholder.a11y.test.tsx`
- `web/src/components/ChoiceCard.a11y.test.tsx`
- `web/src/components/ChildOutcomeVariant.a11y.test.tsx`
- `web/src/components/TerminalCard.a11y.test.tsx`
- `web/src/components/NotFoundPage.a11y.test.tsx`
- `web/src/components/BackendUnreachablePage.a11y.test.tsx`

Each file renders the component in isolation with representative props and asserts no axe violations. The disclosure, integrity, choice-card, route-loading, and error-state tests also assert the relevant ARIA or keyboard-reachable affordance before running axe.

### 5. Created per-route a11y test files (4 files)

- `web/src/routes/worlds.a11y.test.tsx`
- `web/src/routes/stories.a11y.test.tsx`
- `web/src/routes/page-entry.a11y.test.tsx`
- `web/src/routes/page-read.a11y.test.tsx`

Each file renders the route with mocked data and asserts the composed tree passes axe. Route tests assert `assertHeadingHierarchy(container)`; the world and page-read routes also run under the reduced-motion media-query mock.

### 6. Fixed a11y semantics exposed by axe

- Moved alert roles from `<main>` to nested alert regions in `RouteFallback`, `BackendUnreachablePage`, and `NotFoundPage`.
- Moved `IndexStatusBanner`'s status role from the `<aside>` landmark to a nested status region.

## Files to Touch

- `tools/story-explorer/web/package.json` (modify — adds vitest-axe + axe-core)
- `tools/story-explorer/web/package-lock.json` (modify — locks vitest-axe + axe-core)
- `tools/story-explorer/web/src/app.tsx` (modify — route error alert semantics)
- `tools/story-explorer/web/src/components/BackendUnreachablePage.tsx` (modify — alert semantics)
- `tools/story-explorer/web/src/components/IndexStatusBanner.tsx` (modify — status semantics)
- `tools/story-explorer/web/src/components/NotFoundPage.tsx` (modify — alert semantics)
- `tools/story-explorer/web/src/test-setup.ts` (modify — extends with axe matcher)
- `tools/story-explorer/web/src/lib/a11y-test-helpers.tsx` (new)
- `tools/story-explorer/web/src/lib/a11y-test-helpers.test.tsx` (new)
- Per-component a11y test files (15 new files — see §4)
- Per-route a11y test files (4 new files — see §5)

## Out of Scope

- Manual / keyboard-only QA verification (out of automated scope; covered in T013's manual dry-run runbook).
- Screen-reader testing (axe-core covers ARIA conformance; live screen-reader testing is manual QA, not automated).
- CI configuration changes — per §10 the tests run in `npm test`; no separate CI job needed.
- Performance / Core Web Vitals testing — out of v1 a11y scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- a11y.test` — all 19 a11y test files pass with zero axe violations.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compiles.

### Invariants

1. Every component and every route has a sibling a11y test file — no component lacks coverage.
2. axe-core violations are tested errors (CI-failing), not warnings — `expectNoAxeViolations()` fails on any violation.
3. Heading-level continuity is enforced — no h1→h3 skips anywhere in the composed UI.

## Test Plan

### New/Modified Tests

1. 15 per-component a11y test files (see §4).
2. 4 per-route a11y test files (see §5).
3. Shared helper `web/src/lib/a11y-test-helpers.tsx` covering renderForAxe, expectNoAxeViolations, assertHeadingHierarchy, and withReducedMotion.

### Commands

1. `cd tools/story-explorer/web && npm test -- a11y.test` — targeted a11y verification.
2. `cd tools/story-explorer/web && npm test` — full vitest suite (includes a11y tests).
3. `cd tools/story-explorer/web && npm run build` — TypeScript verification.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- a11y.test` — PASS. 19 a11y test files / 22 tests passed with zero axe violations. React Router emitted existing v7 future-flag warnings; the ErrorBoundary a11y test intentionally throws a child error to exercise the fallback and still passes.
2. `cd tools/story-explorer/web && npm test` — PASS. 44 files / 103 tests passed. React Router emitted existing v7 future-flag warnings; the intentional ErrorBoundary child throw appears in stderr while the test passes.
3. `cd tools/story-explorer/web && npm run build` — PASS. TypeScript and Vite production build succeeded; Vite built 60 modules.

## Deviations

1. `axe-core` resolved to `^4.11.4` rather than the drafted `^4.10.0`; `vitest-axe` remained `^0.1.0`.
2. The helper file landed as `a11y-test-helpers.tsx` because `renderForAxe` renders JSX.
3. `test-setup.ts` imports `vitest-axe/extend-expect` instead of value-importing `toHaveNoViolations` from `vitest-axe/matchers`; the latter is not compatible with this package's TypeScript build surface. The tests still fail on any axe-core violation through `expectNoAxeViolations`.
4. The package-manager install reported 5 moderate `npm audit` findings. Dependency vulnerability remediation is outside this a11y-verification ticket.

## Outcome

Completed on 2026-05-26. The web package now has axe-core/vitest-axe installed, shared a11y helpers, 15 component a11y test files, 4 route a11y test files, and helper coverage for axe smoke, heading hierarchy, and reduced-motion media-query mocking. The first axe run exposed and this ticket fixed same-seam ARIA role placement issues in route error surfaces and index-status banners. The targeted a11y lane, full vitest lane, and production build all pass.
