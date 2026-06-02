# SPEC112MANSTOSTU-008: Source-structure picker test + AC#1 zero-raw-ID sweep (capstone)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new `tools/manual-story-studio/test/web/record-picker.test.ts` (a `node --test` source-structure test); no production code.
**Deps**: archive/tickets/SPEC112MANSTOSTU-004.md, archive/tickets/SPEC112MANSTOSTU-005.md, 006, 007

## Problem

SPEC-112 AC#1 requires a grep of `web/src/` to find **zero** remaining raw-ID entry surfaces in the normal flow — `IdTextArea` gone from `EditCurrentContext.tsx` and `ChipInput` no longer accepting raw record IDs in `RecordForm.tsx` ref fields — verified by a picker test and a sweep. This capstone ticket adds the source-structure test that asserts the post-mount state and serves as the spec's §7 acceptance sweep. The web package has no DOM/runtime harness, so the test follows the existing `test/web/useUnsavedChanges.test.ts` mold (read source, regex-assert).

## Assumption Reassessment (2026-06-02)

1. The existing `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` is a `node --test` file that `readFileSync`s web source files and regex-asserts their structure (it does NOT render React). It is compiled to `dist/test/web/` by `build:backend` and run by `npm run test:backend`. The web package `test` script is `tsc -p tsconfig.json --noEmit` only — no vitest/jsdom/testing-library (verified: web `devDependencies` carry none).
2. SPEC-112 §4 (test create) and §7 AC#1, plus §8 (test harness is source-structure + type-check only), define this ticket; the reassessment (Q2=a) chose the source-structure approach over adding a DOM harness.
3. Cross-artifact boundary under audit: this test asserts the post-implementation state of four surfaces modified by `archive/tickets/SPEC112MANSTOSTU-004.md` (EditCurrentContext), `archive/tickets/SPEC112MANSTOSTU-005.md` (RecordForm), -006 (CurrentStatePanel), and -007 (MomentComposer), plus the presence of the `archive/tickets/SPEC112MANSTOSTU-003.md` `RecordPicker`. Its Deps are those four mount tickets (the leaf set — each transitively reaches `archive/tickets/SPEC112MANSTOSTU-003.md` → `archive/tickets/SPEC112MANSTOSTU-001.md` / `archive/tickets/SPEC112MANSTOSTU-002.md`).
4. FOUNDATIONS §Tooling Recommendation (ID-free entry, SPEC-112 §5): this test is the structural proof that the ID-elimination is complete — the "zero raw-ID entry surfaces" sweep AC#1 names.

## Architecture Check

1. A source-structure `node --test` (vs. a new DOM harness) matches the package's existing test idiom and the no-overbuild discipline (SPEC-112 §8); behavioral runtime coverage is out of scope because no harness exists and adding one is a separate spec.
2. No backwards-compatibility shim: the test is new and additive; it introduces no production code and no parallel test infrastructure.

## Verification Layers

1. `IdTextArea` absent from `EditCurrentContext.tsx` → `readFileSync` + `assert.doesNotMatch(/IdTextArea/)`.
2. `ChipInput` no longer wraps the three `refs` fields in `RecordForm.tsx` → assert the ref mounts use `RecordPicker` (and `ChipInput` survives for tags/cast-nested — a positive assertion it is retained).
3. `<RecordPicker>` mounted in all four surfaces → assert each of `EditCurrentContext.tsx` / `RecordForm.tsx` / `CurrentStatePanel.tsx` (title resolution) / `MomentComposer.tsx` imports/uses the expected symbol.
4. Single-harness note: runtime behavior (search/keyboard/select) is intentionally NOT asserted — no DOM harness exists (SPEC-112 §8); web `tsc --noEmit` covers component types.

## What to Change

### 1. Add the source-structure test

Create `tools/manual-story-studio/test/web/record-picker.test.ts` in the `useUnsavedChanges.test.ts` mold: resolve the repo root, `readFileSync` the four target sources, and assert with `node:assert/strict` — `IdTextArea` absent from `EditCurrentContext.tsx`; the three `refs` fields in `RecordForm.tsx` use `RecordPicker` not `ChipInput`; `RecordPicker` is referenced in all four mount surfaces; `RecordPicker.tsx` exists. Optionally assert the AC#1 sweep negative (no `IdTextArea` anywhere under `web/src/`).

## Files to Touch

- `tools/manual-story-studio/test/web/record-picker.test.ts` (new)

## Out of Scope

- Any production code change (this is a test-only capstone).
- Behavioral/runtime assertions requiring a DOM harness (SPEC-112 §8 — not added).
- Adding vitest/jsdom/testing-library (a separate spec if ever wanted).

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/manual-story-studio && npm run test:backend)` — the new `record-picker.test.ts` passes (compiled to `dist/test/web/`).
2. `(cd tools/manual-story-studio && npm test)` — full suite (backend node --test + web `tsc --noEmit`) green.
3. `grep -rn "IdTextArea" tools/manual-story-studio/web/src/` → zero matches (SPEC-112 AC#1 sweep).

### Invariants

1. The test asserts source structure only; it adds no production code and no DOM harness.
2. The four mount surfaces + the `RecordPicker` component must all exist for the test to pass — it is the spec's §7 acceptance sweep.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/web/record-picker.test.ts` — source-structure assertions for AC#1 + the four picker mounts (mold: `test/web/useUnsavedChanges.test.ts`).

### Commands

1. `(cd tools/manual-story-studio && npm run test:backend)`
2. `(cd tools/manual-story-studio && npm test)`
3. `node --test` source-structure assertion is the correct boundary given no DOM harness; `npm test` runs it alongside the web `tsc --noEmit` type pass.
