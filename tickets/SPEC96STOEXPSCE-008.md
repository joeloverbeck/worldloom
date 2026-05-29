# SPEC96STOEXPSCE-008: Capstone — scene-first acceptance + retained-surface verification

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: capstone integration tests exercising the scene-first routes end-to-end + rewrite of `test/capstone-smoke.test.ts`. No new production code.
**Deps**: archive/tickets/SPEC96STOEXPSCE-002.md, archive/tickets/SPEC96STOEXPSCE-003.md, archive/tickets/SPEC96STOEXPSCE-004.md, 005, 006, 007

## Problem

SPEC-96 §7 acceptance criteria must be proven end-to-end once the scene-first routes (002–006) exist and the page-first surfaces are removed (007): the backend exposes `/overview`, `/timeline`, `/scenes`, `/scenes/:id` (+ `/plan|/prose|/receipt`), `/unscened-ranges`, `/state-ticks/:pgId/xray`, all carrying the index-status envelope (AC1); no live route exposes `/pages/:pageId`, `/prose/:pageId`, `/page-plans/:pageId`, `/prose-receipts/:pageId`, and a test asserts they 404/are absent (AC2); scene publication state is the SPEC-95 presence-based indicator with no 8-state machine / hash freshness (AC3); the x-ray is a technical surface, not a reader route (AC4); responses degrade gracefully on stale/missing index without fabricating coverage (AC5); `npm run test:backend` passes (AC6, backend scope per spec §8 staging). This capstone also verifies the retained technical lookup surfaces (D6) still work and rewrites the legacy `capstone-smoke.test.ts` (which currently hits the removed page/prose routes) for the scene-first surface.

## Assumption Reassessment (2026-05-29)

1. The routes this capstone exercises are produced by 002–006 (`registerOverviewRoutes` / `registerTimelineRoutes` / `registerScenesRoutes` / `registerUnscenedRoutes` / `registerStateTickXrayRoutes`), and the page-first removal + retained-surface preservation by 007. The retained surfaces (`records/:recordId`, `records/:recordId/raw`, `provenance/:recordId`) and the response envelope + read-only guard exist at HEAD today (verified during SPEC-96 reassessment) and are preserved by 007 — D6 is a no-change verify here. `test/capstone-smoke.test.ts` currently injects `/pages`, `/pages/:id`, `/prose/:id`, `/page-plans/:id`, `/prose-receipts/:id` (L247–284) and must be rewritten for scene routes.
2. SPEC-96 §7 enumerates AC1–6; this capstone's acceptance matrix is those six bullets. SPEC-96 §6 + §8: full `npm test` builds/tests `web/` (still page-first until SPEC-97), so this capstone's CI bar is `npm run test:backend`; full `npm test` green is not achievable until SPEC-97 lands (documented staging, not a regression).
3. Cross-artifact boundary under audit: this capstone exercises the composed backend produced by tickets 002–007 (the leaf set whose transitive `Deps` cover 001) — it introduces no production code, only tests. It uses a fixture index (not the real `worlds/<slug>/` tree); re-enumerate expected counts from the fixture at test start rather than hardcoding, so the assertions stay valid as fixtures evolve.
4. FOUNDATIONS Rule 7 + §Tooling Recommendation (machine-facing honesty): AC5's degraded-index assertion is the Rule-7-adjacent honesty gate — a stale/missing index must surface the degraded-read flag and must never fabricate scene coverage or surface a forbidden-status `M` as resolved. The capstone proves the backend degrades orientation without inventing coverage.

## Architecture Check

1. A single capstone integration ticket whose scope IS the spec's §Verification section — exercising every scene-first route + the removal's negative assertions + the degraded-index honesty path against a fixture index — keeps the end-to-end proof in one reviewable diff that depends on the full implementation, rather than scattering acceptance assertions across the per-route tickets. Re-enumerated (not hardcoded) expected counts keep it valid over time.
2. No backwards-compatibility shims: the capstone is tests-only; rewriting `capstone-smoke.test.ts` for scene routes replaces the page-first smoke test rather than aliasing it.

## Verification Layers

1. All scene-first routes present + enveloped (AC1) → route dry-run: inject each of `/overview`, `/timeline`, `/scenes`, `/scenes/:id` (+ `/plan|/prose|/receipt`), `/unscened-ranges`, `/state-ticks/:pgId/xray` against the fixture; assert 200 + index-status envelope on each.
2. Page-first routes absent (AC2) → route dry-run (negative): inject `/pages/:id`, `/prose/:id`, `/page-plans/:id`, `/prose-receipts/:id`; assert 404/absent.
3. Publication state is the presence-based indicator (AC3) → schema/value check: scene publication values are drawn from {`planned`,`prose-present`,`attached:PASS|WARN|FAIL`,`superseded`}; no 8-state machine, no hash-derived field appears.
4. X-ray is technical, not a reader route (AC4) → grep-proof + route dry-run: `/state-ticks/:pgId/xray` resolves; no `/pages/:pageId` reader route resolves.
5. Degraded-index honesty (AC5) → route dry-run: with a stale/missing index, every route surfaces the degraded-read flag and fabricates no coverage.
6. Retained surfaces (D6) → route dry-run: `records/:recordId`, `/raw`, `provenance/:recordId` still resolve with the envelope.

## What to Change

### 1. Rewrite the capstone smoke test for scene-first

Rewrite `tools/story-explorer/test/capstone-smoke.test.ts`: replace the `/pages`, `/pages/:id`, `/prose/:id`, `/page-plans/:id`, `/prose-receipts/:id` injections with the scene-first route injections (overview, timeline, scenes + artifacts, unscened-ranges, state-tick-xray) + the retained records/provenance injections, all against a fixture-index temp copy (`fs.cpSync`, never the real `worlds/` tree). Re-enumerate expected scene/coverage counts from the fixture at test start.

### 2. Acceptance matrix test

Add `tools/story-explorer/test/scene-first-acceptance.test.ts` (or fold into the rewritten capstone): one assertion per AC1–6 sub-case — route-presence + envelope (AC1), page-route-absence negative test (AC2), publication-state value-set check (AC3), x-ray-technical-surface check (AC4), degraded-index honesty (AC5). AC6 is the suite passing under `npm run test:backend`.

## Files to Touch

- `tools/story-explorer/test/capstone-smoke.test.ts` (modify — rewrite for scene-first routes)
- `tools/story-explorer/test/scene-first-acceptance.test.ts` (new — AC1–6 matrix)

## Out of Scope

- Any production code (this is a tests-only capstone; routes/read/view-models live in 001–006, removal in 007).
- `web/` frontend tests (SPEC-97 scope); full `npm test` green (requires SPEC-97 — documented staging).
- Search / branch-map acceptance (SPEC-98); MCP scene surface (SPEC-99).

## Acceptance Criteria

### Tests That Must Pass

1. The rewritten `capstone-smoke.test.ts` + `scene-first-acceptance.test.ts` assert AC1 (all scene-first routes + envelope), AC2 (page/prose routes 404/absent), AC3 (presence-based publication state), AC4 (x-ray technical surface), AC5 (degraded-index never fabricates coverage), against a fixture-index temp copy.
2. The retained `records/:recordId`, `/raw`, `provenance/:recordId` routes resolve with the envelope (D6 no-change verify).
3. `cd tools/story-explorer && npm run test:backend` passes (AC6, backend scope).

### Invariants

1. Tests run against a fixture-index temp copy; the real `worlds/<slug>/` tree is never mutated.
2. Expected counts are re-enumerated from the fixture at test start, not hardcoded.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/capstone-smoke.test.ts` — modified; page/prose injections replaced with scene-first + retained-surface injections.
2. `tools/story-explorer/test/scene-first-acceptance.test.ts` — new; AC1–6 matrix.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `cd tools/story-explorer && npm test` — full pass (backend + web); expected to require SPEC-97 before web is green, per spec §8 staging — `test:backend` is this ticket's CI bar.
