# SPEC88STOEXPFRO-013: Capstone — integrated build + red-bunny smoke + manual dry-run runbook

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds capstone integration test under `tools/story-explorer/test/`; exercises the full SPEC-88 surface end-to-end against the red-bunny fixture bundle.
**Deps**: archive/tickets/SPEC88STOEXPFRO-003.md, archive/tickets/SPEC88STOEXPFRO-012.md

## Problem

SPEC-88 §10 commits to a manual smoke test in `dev` mode against the `worlds/erotica-world/stories/red-bunny/` bundle plus full-package build verification. Without this capstone ticket, the spec lands as a collection of unit tests but never validates that the integrated package (backend + web sub-tree + landed prerequisites SPEC-87 + landed validators) actually works against a real story bundle. T012 verifies a11y in isolation against mocked data; T013 verifies the integrated build + the live data flow + the user-facing behaviors that are best confirmed by manual interaction (route navigation, choice flow, prose rendering, branch traversal). The capstone is the spec's definition-of-done.

## Assumption Reassessment (2026-05-26)

1. T003 chained the backend's `npm test` to include `npm --prefix web test` and registered `@fastify/static`; T012 added axe-core verification across web/. The capstone depends on both: T003 for the integrated build chain (capstone runs `npm test` from the package root and expects both halves to execute); T012 as the web leaf transitively reaching T001-T011 (all foundational + route + component tickets). Per the §Spec-Integration Ticket Shape parallel-branch DAG: T03 is parallel to the web chain; T12 is the transitive head of the web chain. The capstone's Deps enumerates both leaves (T003 + T012) per the rule that parallel-branch DAGs require leaf-set enumeration. The red-bunny fixture exists at `worlds/erotica-world/stories/red-bunny/` (confirmed during SPEC-88 reassessment — STORY_KERNEL.md, `_source/`, pages-prose/PG-1.md, pages-prose-plans/PG-1.md, pages-prose-receipts/PG-1.yaml, story-characters/STCHAR-1.md, INDEX.md, `_index/world.db` all present per the website-proposal triage's verification audit).
2. SPEC-88 §10 (post-reassessment) names the capstone deliverables: "Manual smoke test in `dev` mode against the `worlds/erotica-world/stories/red-bunny/` bundle (one prose page, one plan, one receipt confirmed present per pre-spec audit)." The manual smoke is a runbook-style test: the implementer follows manual steps (start dev server, open browser, click through routes) and verifies expected UI behaviors. Per the §Manual-dry-run capstone variant rule: structure the capstone test file's header comment as the **runbook** (manual steps the implementer follows before declaring SPEC-88 landed) and put any test-suite-runnable portion in the file's automated body. For SPEC-88, the test-runnable portion is the integrated-build verification (`npm test` from the package root succeeds) and grep-proofs against the built `web/dist/` (e.g., the bundle contains expected component class names). The runbook covers the browser-driven manual flows.
3. Cross-skill boundary: this capstone validates the integration of EVERY prior ticket in the spec — drift in any ticket's deliverable surfaces here. The capstone never tests skills it doesn't depend on (no `/branching-story-bootstrap` or `/branching-story-turn-cycle` invocation — the red-bunny bundle already exists; the capstone reads it). Per SPEC-87 §6 read-only fence, the capstone runs against `worlds/erotica-world/stories/red-bunny/` via a temp copy strategy (using `fs.cpSync` to a temp root) so the test never mutates the live bundle even accidentally.

## Architecture Check

1. **Capstone as a hybrid runbook + automated test** — the test file's header comment is the runbook; the automated body covers test-runnable portions (integrated-build verification, grep-proofs on bundled output). The runbook portion is implementer-followed manually before merging the spec.
2. **Temp-copy fixture strategy** — when any automated test reads from `worlds/erotica-world/stories/red-bunny/`, it copies to a temp directory first via `fs.cpSync(src, tempDir, { recursive: true })`. Per SPEC-87 capstone's deviation #1, the live red-bunny path may be absent in some checkouts; the capstone handles this gracefully (skip with note if absent; otherwise temp-copy and proceed).
3. **No skill invocation in the capstone** — the explorer is a read-only viewer; the capstone reads existing story-bundle artifacts but never invokes `/branching-story-bootstrap` or any other write-path skill. This honors SPEC-87 §6 fence and the §Manual-dry-run capstone variant rule's scope limit (the variant applies when ≥1 §Verification bullet requires skill invocation; SPEC-88's §10 verifications do not).
4. **Performance assertion** — informal: bundle build completes in <30s on a typical dev machine; not a CI gate. The capstone's automated body asserts the build succeeded; wall-clock perf is a dev-loop expectation.
5. **No backwards-compatibility aliasing/shims introduced** — greenfield capstone test.

## Verification Layers

1. **Integrated build succeeds** → `cd tools/story-explorer && npm run build` — emits both `web/dist/` (web bundle) and `dist/` (backend compiled). Verified by capstone's automated body.
2. **Backend serves bundle in production mode** → manual runbook step: build, start backend without web dev server, `curl http://localhost:5174/` returns index.html; `curl http://localhost:5174/api/health` returns `{ok: true}`. Verifies T003's static-serve integration.
3. **Browser manual smoke covers every route** → manual runbook step: open `http://localhost:5174/`, click through World Picker → Story Picker → Page Entry → Reading Page (red-bunny PG-1); verify each route renders without console errors; verify chrome (header, breadcrumb, integrity chip) displays correctly; verify prose panel shows red-bunny prose; verify choices section displays choice cards.
4. **Degraded-state surfaces verified** → manual runbook step: temporarily rename `worlds/erotica-world/_index/world.db` to force missing-index state; reload World Picker; verify the missing-index banner appears with the documented remedy string; restore.
5. **a11y holds at the integrated layer** → `cd tools/story-explorer/web && npm test -- a11y.test` passes (T012 leaf verification re-run as part of capstone). Confirms a11y compliance holds against the composed tree.

## What to Change

### 1. Create `tools/story-explorer/test/capstone-spec88-smoke.test.ts`

Header comment: the manual dry-run runbook (12-15 steps). Body: the test-suite-runnable automated portion.

Manual runbook (header comment) covers:
1. Build verification: `cd tools/story-explorer && npm install && npm run build` succeeds.
2. Backend startup: `cd tools/story-explorer && node dist/src/cli.js` starts on port 5174.
3. Static-serve check: `curl http://localhost:5174/` returns HTML containing `<div id="root">`.
4. Health check: `curl http://localhost:5174/api/health` returns `{ok: true}`.
5. Open browser at `http://localhost:5174/` — World Picker renders.
6. Click `erotica-world` → Story Picker shows red-bunny.
7. Click `red-bunny` → Page Entry screen.
8. Click "Start at root (PG-1)" → Reading Page shows PG-1.
9. Verify chrome: PageHeader with story title, PG-1, branch chip, turn index, integrity chip; Breadcrumb shows full path.
10. Verify prose panel renders red-bunny PG-1 prose (literary typography, generous reading column).
11. Verify choice cards (if PG-1 has navigable choices) render below prose; OR verify TerminalCard renders if PG-1 is a leaf.
12. Degraded-state check: rename `worlds/erotica-world/_index/world.db` → `_index/world.db.bak`; reload — missing-index banner appears; restore.
13. a11y verification: open browser devtools, check no console errors; manually tab through the page — focus order follows visual flow.
14. Reduced-motion: enable OS-level reduce-motion; reload; verify no motion animations play.

Automated body (test-suite-runnable):
- `it('integrated build succeeds')` — spawns `npm run build` subprocess; asserts exit 0, asserts `web/dist/index.html` exists, asserts `dist/src/cli.js` exists.
- `it('built bundle contains expected component class names')` — greps `web/dist/assets/*.js` for `ProsePanel`, `ChoiceCard`, `IndexStatusBanner` (mangled or unmangled depending on Vite minification settings — implementer may need to disable minification for this assertion to work, or use a different verification approach).
- `it('backend health endpoint responds')` — spawns backend, fetches `/api/health`, asserts response shape.
- `it('static-serve responds for /')` — spawns backend, fetches `/`, asserts HTML.
- `it('web/dist absent guard works')` — moves `web/dist/` aside temporarily, spawns backend, fetches `/api/health` (still works), restores.

### 2. Update `tools/story-explorer/package.json` (no script change required)

The capstone test runs as part of the existing `npm test` script (which T003 chained to include web tests). No new script needed.

## Files to Touch

- `tools/story-explorer/test/capstone-spec88-smoke.test.ts` (new) — hybrid runbook + automated capstone

## Out of Scope

- SPEC-89's X-Ray (capstone validates SPEC-88 only; SPEC-89's capstone is a separate spec).
- SPEC-90's branch-map drawer + search (separate spec).
- Multi-bundle smoke (capstone validates red-bunny only; other story bundles' validation is implementation-time responsibility).
- Production deploy verification (capstone validates dev-mode integrated build; production deploy is out of v1 scope).
- Cross-browser testing (capstone validates one browser per runbook; cross-browser is manual QA outside the spec).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test` — runs backend tests + web tests + capstone automated body; all green.
2. `cd tools/story-explorer && npm test -- capstone-spec88-smoke` — targeted capstone run.
3. Manual runbook (header comment of capstone test file) completed and verified by implementer before merging the spec.

### Invariants

1. The capstone NEVER mutates the live `worlds/erotica-world/stories/red-bunny/` bundle — temp-copy strategy enforced.
2. The runbook covers every §10 verification bullet; the automated body covers the test-runnable subset.
3. SPEC-87 §6 four-layer read-only fence holds throughout capstone execution — verified by absence of `fs.write*` calls in the capstone's automated body.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/capstone-spec88-smoke.test.ts` (new) — hybrid runbook + automated capstone.

### Commands

1. `cd tools/story-explorer && npm test` — full integrated test run.
2. `cd tools/story-explorer && npm run build` — integrated build verification.
3. `cd tools/story-explorer && node dist/src/cli.js` — manual backend startup (for runbook).
4. `curl http://localhost:5174/` and `curl http://localhost:5174/api/health` — manual smoke (for runbook).
