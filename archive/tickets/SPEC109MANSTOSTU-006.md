# SPEC109MANSTOSTU-006: Health integration

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `src/health/compute.ts` to extend Pass 2 (schema integrity) and Pass 3 (reference integrity) with current-context coverage.
**Deps**: archive/tickets/SPEC109MANSTOSTU-003.md

## Problem

SPEC-105's `/health` endpoint emits structured findings for every fail-fast surface the cockpit consumes. When a story's `current-context.yaml` is corrupt or references stale IDs, the health pass should surface the failure at the same place all other integrity issues land, so the Dashboard health banner blocks downstream actions consistently. SPEC-109 AC #11 names this integration explicitly: the corrupted-file case becomes a `blocking` finding under `current-context-yaml-parse-failed`; the broken-reference case becomes an `error` finding under `current-context-reference-broken`.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/src/health/compute.ts:32` exports `computeHealth(manualStoryRoot)` which runs three passes: `runFilePass` (file existence + read), `runSchemaPass` (schema-level integrity), `runReferencePass` (cross-record reference integrity). Each pass returns a `HealthFinding[]`. The `deriveHealthStatus` helper maps severity to the final status (`ok` / `blocked` / `error`). The same file imports `validateRefs` from `src/validate/refs.ts` — the established pattern for plugging a new validator into the reference pass.
2. **Spec**: SPEC-109 §4 modify list names `src/health/compute.ts` (Pass 2 schema integrity also validates current-context if present; Pass 3 reference integrity also resolves current-context IDs). SPEC-109 AC #11 specifies the two finding codes and their severity assignments.
3. **Cross-skill boundary**: The health pass consumes `validateCurrentContext` (from 003) and `readCurrentContext` (from 002) as black-box functions; the shared contract is the `ValidationError` shape (already standard inside the health pass via `validateRefs`). No new finding-code vocabulary is introduced — the codes are SPEC-109's existing `current-context-yaml-parse-failed` (Pass 2) and `current-context-reference-broken` (Pass 3).

## Architecture Check

1. Extending the existing two passes with current-context coverage keeps the health pass as the single fail-fast surface; introducing a separate `runCurrentContextPass` would fragment a contract that consumers (Dashboard banner, route 409s) already understand.
2. The pass extensions reuse the absent-vs-corrupt distinction from 002's read function — absent = no finding (the file is genuinely optional); corrupt = blocking; broken-references = error.
3. No backwards-compatibility shims: the new code is added inline within the existing pass functions.

## Verification Layers

1. Corrupt-file case routes through Pass 2 as `current-context-yaml-parse-failed` blocking finding → acceptance test extending the existing health-pass test (or a new test file in the same shape).
2. Broken-reference case routes through Pass 3 as `current-context-reference-broken` error finding → acceptance test.
3. Absent-file case produces no current-context finding (the layer is purely additive) → acceptance test.
4. Existing health-pass behavior is unchanged for stories without current-context.yaml → acceptance test (regression).

## Landed Changes

### 1. Extend `runSchemaPass` in `src/health/compute.ts`

After existing schema checks, calls `readCurrentContext(root)`. If `!result.ok`, appends a `blocking` finding with code `current-context-yaml-parse-failed` and the standard `path` / `message` / `repair_hint` fields. If `result.ok && result.value === null`, appends no finding (absent is not an error).

### 2. Extend `runReferencePass` in `src/health/compute.ts`

For stories with a valid current-context payload, re-reads the context in the reference pass, constructs `KnownIds` via `listAllKnownIds(root)` plus `metadata.segment_order`, and calls `validateCurrentContext(ctx, knownIds, segmentOrder)` (from 003). For each validation error, appends an `error` HealthFinding using the validator's current-context code, populated with `path`, `message`, and `repair_hint`.

### 3. New acceptance test (extend or add) at `test/current-context/health-integration.test.ts`

Added a focused health integration test inferred from §4 Files-to-touch's `health/compute.ts` modification + AC #11. Covers absent, valid, corrupt, and broken-reference current-context variants using a temp fixture story with schema-valid record fixtures.

## Files to Touch

- `tools/manual-story-studio/src/health/compute.ts` (modify)
- `tools/manual-story-studio/test/current-context/health-integration.test.ts` (new — inferred from §4 modify list + AC #11)

## Out of Scope

- Read / write / validate function implementations — owned by 002 / 004 / 003.
- HTTP route 409 mapping for corrupt files — owned by 005 (the route already routes corruption to 409 independently; the health pass is the second surface where corruption surfaces, not a duplicate).
- UI banner rendering of new findings — the existing SPEC-105 HealthBanner consumes the finding-code vocabulary generically; no UI change is needed here.
- Composer behavior — owned by 007.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` passes.
2. AC #11 — `/health` endpoint emits `current-context-yaml-parse-failed` as `blocking` for corrupt files; `current-context-reference-broken` as `error` for broken references.
3. Absent-file regression: existing health-pass behavior unchanged when current-context.yaml is absent.

### Invariants

1. The health pass remains the single fail-fast surface for story integrity; current-context is not a sibling pass.
2. Finding-code vocabulary is bounded to SPEC-109's named codes; no extra codes introduced.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/health-integration.test.ts` — covers Pass 2 corrupt-file + Pass 3 broken-references + absent + valid cases.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`

## Outcome

Ticket complete. Manual Story Studio health now treats `current-context.yaml` as part of the existing integrity surface: absent files remain clean, corrupt files block downstream actions, and broken current-context references degrade health.

## Verification Result

1. Baseline before implementation: `cd tools/manual-story-studio && npm run test:backend` passed with 68 compiled backend test files.
2. Focused proof after implementation: `cd tools/manual-story-studio && npm run build:backend && node --test dist/test/current-context/health-integration.test.js` passed.
3. Backend proof after implementation: `cd tools/manual-story-studio && npm run test:backend` passed with 69 compiled backend test files.
4. Full package proof after implementation: `cd tools/manual-story-studio && npm test` passed with 424 backend tests and web TypeScript.

## Deviations

1. The implementation re-reads `current-context.yaml` in `runReferencePass` instead of sharing parsed state from `runSchemaPass`, preserving the existing pass signatures and keeping the change localized.
