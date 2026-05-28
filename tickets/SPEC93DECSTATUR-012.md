# SPEC93DECSTATUR-012: Story Explorer — verify graceful planless-PG handling; adjust page-plan-authoring tests

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer` (read paths preserved; tests adjusted)
**Deps**: SPEC93DECSTATUR-001

## Problem

SPEC-93 §2 (Out of scope) requires that the teardown NOT break Story Explorer's existing page-plan/page-prose **read** paths: legacy bundles continue to be served, and new (planless) `PG`s render a graceful "no page plan" state rather than crashing. The scene-first Story Explorer rewrite is explicitly deferred. This ticket verifies the read paths handle planless `PG`s gracefully (the reassessment confirmed they already return 404 → a `missing` state) and adjusts only the tests that assert page-plan authoring still happens.

## Assumption Reassessment (2026-05-28)

1. `tools/story-explorer/src/server/routes/prose.ts` serves `/page-plans/:pageId` (reads `pages-prose-plans/PG-<integer>.md`, returns 404 via `readOptionalBody()` on ENOENT); `src/read/page-detail.ts` is the page read path; `web/src/components/xray/tabs/PlanProseTab.tsx` catches the 404 and sets a `missing` state — all confirmed during SPEC-93 reassessment (this session): the read paths already handle absence gracefully.
2. SPEC-93 §2 Out-of-scope constraint + §6 Story Explorer bullet (preserve read paths; verify graceful planless handling; adjust only tests that assert page-plan authoring still happens) + §8 AC8 (Story Explorer still builds + serves legacy plans/prose and handles planless new `PG`s gracefully).
3. Cross-artifact boundary: Story Explorer reads the `PG` schema (consumes the relaxed `story-page.schema.json` from SPEC93DECSTATUR-001) and the legacy `pages-prose-plans/` directory (kept enumerated by world-index per SPEC-93 §3); this is a read-side consumer, not a mutation surface. The SPEC-87/88 read-backend fence is preserved (no new mediation surface).

## Architecture Check

1. Preserving the read paths (vs. removing them) is the spec's deliberate choice — legacy bundles must remain viewable; the planless state is handled by the existing 404 → `missing` path, so no new code is needed beyond test adjustment + confirmation.
2. No backwards-compatibility shim: the read paths are unchanged (they already degrade gracefully); only tests asserting that page-plan authoring still happens are adjusted to the planless reality.

## Verification Layers

1. Read paths preserved -> codebase grep-proof (`prose.ts` `/page-plans/:pageId` route + `read/page-detail.ts` intact).
2. Graceful planless handling -> test (`missing-prose.test.ts` / `PlanProseTab.test.tsx` confirm a planless `PG` yields the `missing` / "no page plan" state, no crash).
3. No test asserts page-plan authoring still happens -> codebase grep-proof + manual review (any such assertion adjusted).
4. Build + serve legacy -> build/test green (backend + web).

## What to Change

### 1. Verify + (if needed) extend graceful-handling tests

Confirm `tools/story-explorer/test/missing-prose.test.ts` and `web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` (and `ProseMissingPlaceholder.test.tsx`) cover a planless `PG` rendering the "no page plan" / `missing` state; extend only if a planless-PG case is not already covered.

### 2. Adjust page-plan-authoring-asserting tests

Adjust any Story Explorer test that asserts page-plan authoring still happens (i.e., that a `PG` always has a page plan) to accept the planless state. Do NOT alter the read-path source.

## Files to Touch

- `tools/story-explorer/src/server/routes/prose.ts` (modify — only if a graceful-handling gap is found; otherwise verification-only)
- `tools/story-explorer/src/read/page-detail.ts` (modify — only if a graceful-handling gap is found; otherwise verification-only)
- `tools/story-explorer/web/src/components/xray/tabs/PlanProseTab.tsx` (modify — only if a graceful-handling gap is found; otherwise verification-only)
- `tools/story-explorer/test/missing-prose.test.ts` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` (modify)

## Out of Scope

- The scene-first Story Explorer rewrite (explicitly deferred per SPEC-93 §2 + IMPLEMENTATION-ORDER).
- Removing the legacy page-plan/page-prose read routes (preserved for legacy bundles).
- world-index legacy-directory enumeration (kept per SPEC-93 §3; not a Story Explorer change).

## Acceptance Criteria

### Tests That Must Pass

1. A planless `PG` renders the "no page plan" / `missing` state with no crash (backend 404 + frontend `missing`).
2. Legacy bundles (with page plans/prose) still build + serve unchanged.
3. `(cd tools/story-explorer && npm test)` and `(cd tools/story-explorer/web && npm test)` green.

### Invariants

1. The page-plan/page-prose read paths are preserved for legacy bundles (no route deletion).
2. The SPEC-87/88 read-backend fence is intact (no new canon-mediation surface introduced).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/missing-prose.test.ts` — planless-`PG` graceful-handling case (extend if not covered).
2. `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` — `missing`-state assertion for a planless `PG`.

### Commands

1. `(cd tools/story-explorer && npm test)`
2. `(cd tools/story-explorer/web && npm test)`
