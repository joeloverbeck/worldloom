# SPEC97STOEXPSCE-009: Capstone — full-tool gate + §7 acceptance-criteria matrix

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — verification-only capstone; exercises the scene-first frontend composed by 001–008 and the full-tool web+backend build/test gate. No new production code.
**Deps**: 008

## Problem

SPEC-97 §6 names a full-tool gate distinct from the web-only suite: `npm test` at the `@worldloom/story-explorer` root, which builds web + backend and runs both suites. SPEC-97 §7 enumerates six acceptance criteria spanning the prior tickets (route tree, view-model swap, scene workbench, unscened+coverage, PG drawer, suite-green). This capstone is the single trailing gate that confirms the whole scene-first frontend composes coherently against the landed SPEC-96 backend and that the §7 AC matrix holds end-to-end. It introduces no new production code; it exercises the pipeline the earlier tickets built.

## Assumption Reassessment (2026-05-29)

1. Package shape (reassessment grep): web package `@worldloom/story-explorer-web` scripts `dev`/`build`(tsc+vite build)/`test`(vitest run); root package `@worldloom/story-explorer` `test` = `npm run build && node --test "dist/test/**/*.test.js" && npm --prefix web test` (builds backend + web and runs both suites). The §7 AC are realized across SPEC97STOEXPSCE-001..008: AC1 (route tree + page-route removal)→008; AC2 (view-model swap)→001+008; AC3 (scene workbench)→006; AC4 (unscened+coverage)→003+007; AC5 (PG drawer)→002+004; AC6 (suite green)→this ticket.
2. SPEC-97 §6 (full-tool root gate: builds web + backend + runs both suites) + §7 (six acceptance criteria). The capstone's test matrix IS the §7 AC list; each AC maps to a grep-proof or a suite assertion against the post-implementation tree.
3. Cross-artifact boundary under audit: the full-tool web+backend gate (root `@worldloom/story-explorer` `npm test`). The web frontend mirrors the SPEC-96 backend's response shapes in `web/src/api/client.ts`; the root gate is the only surface that builds and tests web AND backend together, confirming the scene-first frontend composes against the actual landed backend rather than only against mocked types.
4. FOUNDATIONS §Story Bundles §4a (PG = causal tick) + §4 (SCN render unit): the §7 AC the capstone verifies — no `/pages/:pageId` reader route, PG inspection only via x-ray drawer, scene detail as author workbench with co-equal x-ray — are the operational expression of these principles. The capstone is the final proof that the alignment landed, not a restatement that introduces new behavior.

## Architecture Check

1. A single trailing verification gate keeps the §7 AC matrix in one auditable place and confirms web+backend compose, rather than scattering the cross-cutting suite-green assertion across the implementation tickets (each of which only runs its own web-local tests). The capstone adds no production code, so it cannot itself introduce drift — it only asserts.
2. No backwards-compatibility shims — verification-only; nothing to alias.

## Verification Layers

1. AC1 — route tree exposes dashboard/timeline/scenes(list+detail)/unscened; page-reader routes absent → route grep-proof + 008's negative test re-run.
2. AC2 — page-scoped view models/fns removed, new ones consume SPEC-96 endpoints → grep-proof against `api/client.ts`.
3. AC3 — scene detail is an author workbench (prose-first + co-equal x-ray + PG rail) → 006's component tests in the green suite.
4. AC4/AC5 — unscened normal authoring view + coverage panel (no recommender); PG-tick opens x-ray drawer → 003/007/002/004 tests in the green suite.
5. AC6 — full-tool gate: `cd tools/story-explorer && npm test` builds web + backend and both suites pass; a11y coverage present for new surfaces.

## What to Change

### 1. §7 AC matrix verification

No production code. Confirm each §7 AC1–6 via grep-proof or suite assertion against the post-008 tree (route absence, client-surface swap, workbench tests, coverage/unscened tests, drawer test). Where a thin capstone test adds value (e.g., an integration smoke that mounts the app and asserts the scene-first route set resolves while the page-reader paths 404), add it under `web/src` as an app-level test.

### 2. Full-tool gate

Run `cd tools/story-explorer && npm test` (root: builds backend + web, runs both suites). This is the AC6 gate and the cross-cutting web+backend composition check.

## Files to Touch

- `tools/story-explorer/web/src/app.test.tsx` (modify — optional app-level integration smoke asserting scene-first route set resolves and page-reader paths 404; if 008's route test already covers AC1 fully, this ticket is verification-command-only)

## Out of Scope

- Any new production code, route, component, or client surface — owned by 001–008.
- Per-component a11y tests — owned by their implementing tickets (002–007); the capstone confirms coverage, it does not author the per-component tests.
- Branch-map / search verification — deferred to SPEC-98.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — full web suite green (all scene-first + a11y + route-absence tests from 001–008).
2. `cd tools/story-explorer && npm test` — full-tool gate: backend build + backend suite + web suite all green (AC6).
3. `grep -nE "story-dashboard|timeline|scenes|scene-detail|unscened" tools/story-explorer/web/src/app.tsx` returns the scene-first route set; `grep -nE "page-entry|page-read|/pages/:pageId" tools/story-explorer/web/src/app.tsx` returns zero (AC1).

### Invariants

1. The scene-first frontend composes against the landed SPEC-96 backend (web+backend both build and test green via the root gate).
2. The §7 AC matrix holds end-to-end: no page-reader route resolves, PG inspection is x-ray-drawer-only, scene detail is an author workbench — §Story Bundles §4a/§4.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/app.test.tsx` — optional app-level integration smoke (scene-first routes resolve; page-reader paths 404). If 008's route test fully covers AC1, this ticket is verification-command-only and no test file changes — record that in the implementation note.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer && npm test`
3. `grep -nE "page-entry|page-read|/pages/:pageId" tools/story-explorer/web/src/app.tsx` (expect zero matches)
