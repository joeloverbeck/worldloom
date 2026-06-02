# SPEC109MANSTOSTU-009: MomentComposer seeding

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `web/src/pages/MomentComposer.tsx` to seed picker defaults from current-context when present.
**Deps**: archive/tickets/SPEC109MANSTOSTU-005.md

## Problem

Before this ticket, the Moment Composer defaulted its "involved cast" picker to `metadata.cast_order` and its "relevant records" picker to records matching `SUGGEST_IMPORTANCE` (high / central importance). With current-context.yaml present, the cockpit's intent is that the author's explicit `current_cast` seeds the involved-cast picker and `pinned_records` seeds the relevant-records picker — without removing the importance-based fallback for stories without current-context. This ticket landed the composer-page seeding change so the prompt-generation loop honors the author's current point of view by default.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (line 14 — `SUGGEST_IMPORTANCE = new Set(["high", "central"])`; line 73-75 — default `includedCast` is seeded from `m.cast_order`; line 116 — `suggested` records filter by `SUGGEST_IMPORTANCE.has(entry.summary.importance)`). The component already accepts a `ComposerNavState` via React Router's `useLocation` state — current-context seeding is the natural extension when no nav-state override is provided.
2. **Spec**: SPEC-109 §4 modify list specifies: "seed the 'involved cast' picker default from `current_cast`; seed the 'relevant records' picker default from `pinned_records`." SPEC-109 §3 Key decisions (Per-section fallback when context absent, last paragraph) clarifies that the importance-suggested picker is preserved as the picker default — current-context just adds higher-priority seeding when present.
3. **Cross-skill boundary**: The page consumes `fetchCurrentContext` from `web/src/api/current-context.ts` (005); data-loading happens alongside the existing metadata / cast / records loaders. The seeding logic intersects three sources in priority order: (1) explicit nav-state from a prior page navigation (highest), (2) current-context when present, (3) metadata defaults (lowest fallback).

## Architecture Check

1. The three-tier priority (nav-state → current-context → metadata defaults) keeps the user's most-recent explicit choice authoritative when it exists; falling back to current-context is the new default; falling back to metadata is the unchanged absent-context path.
2. The importance-bucketed `suggested` list remains visible to the user as a record-picker affordance — current-context seeding pre-fills `pinnedRecordIds` so the relevant-records section reflects the author's pins first, but the importance-suggested list stays available for ad-hoc picking.
3. No backwards-compatibility shims: the seeding logic is a single React effect addition; the existing data flow is preserved.

## Verification Layers

1. With current-context present and no nav-state: `includedCast` is seeded from `current_cast` (in order) → manual verification.
2. With current-context present and no nav-state: `pinnedRecordIds` is seeded from `pinned_records` → manual verification.
3. With current-context absent: existing seeding behavior unchanged (`cast_order` for cast, empty `pinnedRecordIds`) → manual verification (regression).
4. With nav-state present (e.g., from a previous "Compose a fresh prompt" navigation): nav-state wins over current-context → manual verification.
5. Web tsc-only test passes → AC #12.

## Landed Changes

### 1. Moment Composer seeding at `web/src/pages/MomentComposer.tsx`

- Imported `fetchCurrentContext` from `web/src/api/current-context.ts` (005).
- Updated the dashboard-style loading effect in `MomentComposer` to fetch current-context together with metadata before applying initial picker defaults.
- Seeded `includedCast` with priority `navState.included_cast` → non-empty `currentContext.current_cast` → `metadata.cast_order`.
- Seeded `pinnedRecordIds` with priority `navState.included_records` → non-empty `currentContext.pinned_records` → existing empty default.
- Added a current-context load error alert with the existing retry pattern.
- Left the `SUGGEST_IMPORTANCE` filter unchanged for the suggested records list, preserving the high/central ad-hoc picker affordance.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)

## Out of Scope

- Backend route / API wrapper — owned by 005.
- Dashboard CurrentStatePanel — owned by 008.
- Edit Current Context page — owned by 010.
- Mark-state-reviewed button — owned by 011.
- Composer pipeline (backend prompt assembly) — owned by 007.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) — confirms type-correctness of the seeding change.
2. Manual verification per the four verification layers above.

### Invariants

1. The three-tier priority (nav-state → current-context → metadata defaults) is honored; no tier silently overrides a higher-priority source.
2. The importance-suggested picker remains available; current-context affects defaults only, not picker visibility.

## Test Plan

### New/Modified Tests

1. `None — UI-only ticket; verification is the web tsc command (AC #12) and manual verification of the seeding priority order. Pipeline-level test coverage of compose behavior lives in 007's compose test.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm test` (full pipeline).

## Outcome

Moment Composer now seeds its initial cast and relevant-record selections from `current-context.yaml` when the page has no explicit router navigation state. Explicit nav-state selections still win, and stories without current-context continue to fall back to metadata cast order and the existing empty pinned-record default while retaining the high/central suggested-record list.

## Verification Result

1. `cd tools/manual-story-studio/web && npm test` — PASS (`tsc -p tsconfig.json --noEmit`).
2. `cd tools/manual-story-studio && npm test` — PASS (427 backend tests plus web `tsc --noEmit`).
3. Manual code review of `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` — PASS: nav-state remains the highest-priority source, non-empty `current_cast` and `pinned_records` seed defaults only when nav-state is absent, metadata cast order remains the absent-context fallback, and `SUGGEST_IMPORTANCE` is unchanged.

## Deviations

No new component-level UI test was added. This ticket kept the drafted proof boundary: web TypeScript, full package proof, and manual review of the seeding priority order.
