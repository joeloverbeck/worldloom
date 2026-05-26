# SPEC88STOEXPFRO-013: Capstone — integrated build + red-bunny smoke + manual dry-run runbook

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds capstone integration test under `tools/story-explorer/test/`; exercises the SPEC-88 built frontend/static-serve seam and documents the manual reading-surface dry-run.
**Deps**: archive/tickets/SPEC88STOEXPFRO-003.md, archive/tickets/SPEC88STOEXPFRO-012.md

## Problem

SPEC-88 §10 commits to a manual smoke test in `dev` mode against the `worlds/erotica-world/stories/red-bunny/` bundle plus full-package build verification. At intake for this run, the checkout-local `worlds/erotica-world/stories/red-bunny/` path is absent, so the portable capstone cannot require that private fixture to exist. Without this capstone ticket, the spec lands as a collection of unit tests but never validates that the integrated package (backend + web sub-tree + landed prerequisites SPEC-87 + landed validators) produces a built reader bundle that the backend serves while preserving API routes. T012 verifies a11y in isolation against mocked data; T013 verifies the integrated build/static-serve seam and records the manual reading-surface runbook for checkouts that have the red-bunny bundle.

## Assumption Reassessment (2026-05-26)

1. T003 chained the backend's `npm test` to include `npm --prefix web test` and registered `@fastify/static`; T012 added axe-core verification across web/. The capstone depends on both: T003 for the integrated build chain (capstone runs inside `npm test` from the package root and expects both halves to execute); T012 as the web leaf transitively reaching T001-T011 (all foundational + route + component tickets). Per the §Spec-Integration Ticket Shape parallel-branch DAG: T03 is parallel to the web chain; T12 is the transitive head of the web chain. The capstone's Deps enumerates both leaves (T003 + T012) per the rule that parallel-branch DAGs require leaf-set enumeration. The drafted claim that the red-bunny fixture exists at `worlds/erotica-world/stories/red-bunny/` is historical pre-spec audit evidence; this checkout has no `worlds/erotica-world/stories/red-bunny/` path.
2. SPEC-88 §10 (post-reassessment) names the capstone deliverables: "Manual smoke test in `dev` mode against the `worlds/erotica-world/stories/red-bunny/` bundle (one prose page, one plan, one receipt confirmed present per pre-spec audit)." The manual smoke is a runbook-style test: the implementer follows manual steps (start dev server, open browser, click through routes) and verifies expected UI behaviors when the private red-bunny bundle exists. Per the §Manual-dry-run capstone variant rule: structure the capstone test file's header comment as the **runbook** and put the portable test-suite-runnable portion in the automated body. For this checkout, the test-runnable portion is integrated-build artifact verification, source-map proof that the built bundle contains the SPEC-88 reading-surface components/routes, static-serve injection, API envelope coexistence, and absent-`web/dist` guard behavior.
3. Cross-skill boundary: this capstone validates the integration of EVERY prior ticket in the spec at the package boundary without invoking skills it does not depend on (no `/branching-story-bootstrap` or `/branching-story-turn-cycle` invocation). Per SPEC-87 §6 read-only fence, automated proof uses built artifacts, Fastify injection, and disposable temp repos; it never mutates `worlds/` or invokes `world-index build` / `world-index sync`.

## Architecture Check

1. **Capstone as a hybrid runbook + automated test** — the test file's header comment is the runbook; the automated body covers portable test-runnable portions (integrated-build artifact verification, source-map proof on bundled output, static serving, API coexistence, and missing-bundle guard). The red-bunny browser steps are conditional on the checkout-local private bundle existing.
2. **Disposable fixture strategy** — automated tests use built package artifacts and disposable temp repos for static-serve checks. They do not read or mutate checkout-local `worlds/erotica-world/stories/red-bunny/`, which is absent in this worktree.
3. **No skill invocation in the capstone** — the explorer is a read-only viewer; the capstone reads existing story-bundle artifacts but never invokes `/branching-story-bootstrap` or any other write-path skill. This honors SPEC-87 §6 fence and the §Manual-dry-run capstone variant rule's scope limit (the variant applies when ≥1 §Verification bullet requires skill invocation; SPEC-88's §10 verifications do not).
4. **Performance assertion** — informal: bundle build completes in <30s on a typical dev machine; not a CI gate. The capstone's automated body asserts the build succeeded; wall-clock perf is a dev-loop expectation.
5. **No backwards-compatibility aliasing/shims introduced** — greenfield capstone test.

## Verification Layers

1. **Integrated build succeeds** → `cd tools/story-explorer && npm run build` — emits both `web/dist/` (web bundle) and `dist/` (backend compiled). Verified before the capstone body by the package `npm test` script and by capstone artifact assertions.
2. **Backend serves bundle in production mode** → capstone Fastify injection against the built checkout verifies `/` returns the Story Explorer HTML shell and `/api/health` still returns the enveloped API response. The header runbook records the equivalent manual `curl` flow.
3. **Browser manual smoke covers every route when red-bunny exists** → manual runbook step: open `http://127.0.0.1:5174/`, click through World Picker → Story Picker → Page Entry → Reading Page (red-bunny PG-1); verify chrome, prose, choices, or terminal state. This checkout cannot execute that private-bundle portion because the red-bunny path is absent.
4. **Degraded-state surfaces verified** → T011/T012 route/component tests cover the frontend degraded-state rendering; this capstone records the manual disposable-copy missing-index check in its header runbook without mutating `worlds/`.
5. **a11y holds at the integrated layer** → `cd tools/story-explorer/web && npm test -- a11y.test` passes (T012 leaf verification re-run as part of capstone closeout). Confirms a11y compliance holds against the composed tree.

## What to Change

### 1. Created `tools/story-explorer/test/capstone-spec88-smoke.test.ts`

Header comment: the manual dry-run runbook (12-15 steps). Body: the test-suite-runnable automated portion.

Manual runbook (header comment) covers:
1. Build verification: `cd tools/story-explorer && npm install && npm run build` succeeds.
2. Backend startup: `cd tools/story-explorer && node dist/src/cli.js --repo-root ../.. --port 5174` starts on port 5174.
3. Static-serve check: `curl http://127.0.0.1:5174/` returns the Story Explorer HTML shell.
4. Health check: `curl http://127.0.0.1:5174/api/health` returns `{ok: true}` inside the envelope.
5. If the checkout-local `worlds/erotica-world/stories/red-bunny/` path exists, open browser at `http://127.0.0.1:5174/` — World Picker renders.
6. Click `erotica-world` → Story Picker shows red-bunny.
7. Click `red-bunny` → Page Entry screen.
8. Click "Start at root (PG-1)" → Reading Page shows PG-1.
9. Verify chrome: PageHeader with story title, PG-1, branch chip, turn index, integrity chip; Breadcrumb shows full path.
10. Verify prose panel renders red-bunny PG-1 prose (literary typography, generous reading column).
11. Verify choice cards (if PG-1 has navigable choices) render below prose; OR verify TerminalCard renders if PG-1 is a leaf.
12. Degraded-state check: in a disposable copy only, rename `worlds/erotica-world/_index/world.db` → `_index/world.db.bak`; reload — missing-index banner appears; restore.
13. a11y verification: open browser devtools, check no console errors; manually tab through the page — focus order follows visual flow.
14. Reduced-motion: enable OS-level reduce-motion; reload; verify no motion animations play.

Automated body (test-suite-runnable):
- `test('SPEC-88 capstone built web bundle exposes the reader surface')` — asserts `web/dist/index.html`, JS, CSS, and source-map entries for `ProsePanel`, `ChoiceCard`, `IndexStatusBanner`, `TerminalCard`, and `page-read.tsx`.
- `test('SPEC-88 capstone static serving coexists with API routes')` — uses Fastify injection against the built checkout to verify `/` returns HTML and `/api/health` remains enveloped.
- `test('SPEC-88 capstone backend remains usable when web/dist is absent')` — uses a disposable repo root without `web/dist/` and verifies `/` 404s while `/api/health` works.
- `test('SPEC-88 capstone synthetic static bundle can be served from a disposable repo')` — uses a disposable repo root with synthetic `web/dist/index.html` to verify static serving remains path-rooted and read-only.

### 2. Kept `tools/story-explorer/package.json` unchanged

The capstone test runs as part of the existing `npm test` script (which T003 chained to include web tests). No new script needed.

## Files to Touch

- `tools/story-explorer/test/capstone-spec88-smoke.test.ts` (new) — hybrid runbook + automated capstone
- `archive/specs/SPEC-88-story-explorer-frontend-foundation.md` (modify) — dated implementation note for the final capstone proof and checkout-local red-bunny boundary

## Out of Scope

- SPEC-89's X-Ray (capstone validates SPEC-88 only; SPEC-89's capstone is a separate spec).
- SPEC-90's branch-map drawer + search (separate spec).
- Multi-bundle smoke (capstone documents the red-bunny manual path when present; other story bundles' validation is implementation-time responsibility).
- Production deploy verification (capstone validates dev-mode integrated build; production deploy is out of v1 scope).
- Cross-browser testing (capstone validates one browser per runbook; cross-browser is manual QA outside the spec).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test` — runs backend tests + web tests + capstone automated body; all green.
2. `cd tools/story-explorer && npm run build:backend && node --test dist/test/capstone-spec88-smoke.test.js` — targeted capstone run.
3. Manual runbook (header comment of capstone test file) exists and is accurate; checkout-local red-bunny browser steps are conditional on that private bundle being present.

### Invariants

1. The capstone NEVER mutates the live `worlds/erotica-world/stories/red-bunny/` bundle — automated tests do not read or write that absent checkout-local path.
2. The runbook covers every §10 verification bullet; the automated body covers the test-runnable subset.
3. SPEC-87 §6 four-layer read-only fence holds throughout capstone execution — verified by absence of `fs.write*` calls in the capstone's automated body.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/capstone-spec88-smoke.test.ts` (new) — hybrid runbook + automated capstone.

### Commands

1. `cd tools/story-explorer && npm test` — full integrated test run.
2. `cd tools/story-explorer && npm run build` — integrated build verification.
3. `cd tools/story-explorer && npm run build:backend && node --test dist/test/capstone-spec88-smoke.test.js` — targeted capstone proof.
4. `cd tools/story-explorer && node dist/src/cli.js --repo-root ../.. --port 5174` — manual backend startup (for runbook).
5. `curl http://127.0.0.1:5174/` and `curl http://127.0.0.1:5174/api/health` — manual smoke (for runbook).

## Outcome

Completed 2026-05-26.

Added `tools/story-explorer/test/capstone-spec88-smoke.test.ts`, a hybrid capstone with a manual dry-run runbook in the file header and four portable `node:test` checks. The automated checks assert that the integrated build emits the web shell, JS, CSS, and source map; that the built bundle includes the SPEC-88 reading-surface components/routes (`ChoiceCard`, `IndexStatusBanner`, `ProsePanel`, `TerminalCard`, and `page-read.tsx`); that Fastify serves the built web shell while preserving `/api/health` envelope behavior; that the backend remains usable when `web/dist/` is absent; and that a disposable repo root with a synthetic static bundle is served correctly.

Updated the active SPEC-88 document with a final implementation note. No package script change was needed because the existing `npm test` script already builds the web bundle, compiles backend/test TypeScript, runs compiled backend tests, and runs the web vitest suite.

## Verification Result

1. `cd tools/story-explorer && npm test` — PASS. Backend compiled tests passed 74/74, including the four new SPEC-88 capstone subtests; web vitest passed 44 files / 103 tests. React Router emitted existing v7 future-flag warnings, and the ErrorBoundary a11y test intentionally threw a child error while passing.
2. `cd tools/story-explorer && npm run build:backend && node --test dist/test/capstone-spec88-smoke.test.js` — PASS. The targeted compiled capstone passed 4/4 subtests.
3. `cd tools/story-explorer/web && npm test -- a11y.test` — PASS. 19 a11y test files / 22 tests passed with zero axe violations. React Router emitted existing v7 future-flag warnings, and the ErrorBoundary a11y test intentionally threw a child error while passing.

## Deviations

1. The drafted checkout-local red-bunny browser smoke could not be executed in this worktree because `worlds/erotica-world/stories/red-bunny/` is absent. The capstone records those steps as conditional manual runbook steps and uses portable automated proof over built artifacts, static serving, API envelope coexistence, and the existing route/component/a11y suites instead.
2. The drafted `npm test -- capstone-spec88-smoke` targeted command was replaced with `npm run build:backend && node --test dist/test/capstone-spec88-smoke.test.js` because the package `npm test` wrapper runs the compiled glob and then the web suite; the direct compiled command is the truthful targeted capstone proof.
3. The drafted plan to grep minified JS for component class names was replaced with source-map membership assertions. Vite minification can mangle runtime names, while source maps directly prove the built bundle includes the intended SPEC-88 source modules.
