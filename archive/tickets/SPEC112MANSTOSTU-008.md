# SPEC112MANSTOSTU-008: Source-structure picker test + AC#1 zero-raw-ID sweep (capstone)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new `tools/manual-story-studio/test/web/record-picker.test.ts` (a `node --test` source-structure test); no production code.
**Deps**: archive/tickets/SPEC112MANSTOSTU-004.md, archive/tickets/SPEC112MANSTOSTU-005.md, archive/tickets/SPEC112MANSTOSTU-006.md, archive/tickets/SPEC112MANSTOSTU-007.md

## Problem

SPEC-112 AC#1 requires a grep of `web/src/` to find **zero** remaining raw-ID entry surfaces in the normal flow — `IdTextArea` gone from `EditCurrentContext.tsx` and `ChipInput` no longer accepting raw record IDs in `RecordForm.tsx` ref fields — verified by a picker test and a sweep. This capstone ticket adds the source-structure test that asserts the post-mount state and serves as the spec's §7 acceptance sweep. The web package has no DOM/runtime harness, so the test follows the existing `test/web/useUnsavedChanges.test.ts` mold (read source, regex-assert).

## Assumption Reassessment (2026-06-02)

1. The existing `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` is a `node --test` file that `readFileSync`s web source files and regex-asserts their structure (it does NOT render React). It is compiled to `dist/test/web/` by `build:backend` and run by `npm run test:backend`. The web package `test` script is `tsc -p tsconfig.json --noEmit` only — no vitest/jsdom/testing-library (verified: web `devDependencies` carry none).
2. SPEC-112 §4 (test create) and §7 AC#1, plus §8 (test harness is source-structure + type-check only), define this ticket; the reassessment (Q2=a) chose the source-structure approach over adding a DOM harness.
3. Cross-artifact boundary under audit: this test asserts the post-implementation state of four surfaces modified by `archive/tickets/SPEC112MANSTOSTU-004.md` (EditCurrentContext), `archive/tickets/SPEC112MANSTOSTU-005.md` (RecordForm), `archive/tickets/SPEC112MANSTOSTU-006.md` (CurrentStatePanel), and `archive/tickets/SPEC112MANSTOSTU-007.md` (MomentComposer), plus the presence of the `archive/tickets/SPEC112MANSTOSTU-003.md` `RecordPicker`. Its Deps are those four mount tickets (the leaf set — each transitively reaches `archive/tickets/SPEC112MANSTOSTU-003.md` → `archive/tickets/SPEC112MANSTOSTU-001.md` / `archive/tickets/SPEC112MANSTOSTU-002.md`).
4. FOUNDATIONS §Tooling Recommendation (ID-free entry, SPEC-112 §5): this test is the structural proof that the ID-elimination is complete — the "zero raw-ID entry surfaces" sweep AC#1 names.

## Architecture Check

1. A source-structure `node --test` (vs. a new DOM harness) matches the package's existing test idiom and the no-overbuild discipline (SPEC-112 §8); behavioral runtime coverage is out of scope because no harness exists and adding one is a separate spec.
2. No backwards-compatibility shim: the test is new and additive; it introduces no production code and no parallel test infrastructure.

## Verification Layers

1. `IdTextArea` absent from `EditCurrentContext.tsx` → `readFileSync` + `assert.doesNotMatch(/IdTextArea/)`.
2. `ChipInput` no longer wraps the three `refs` fields in `RecordForm.tsx` → assert the ref mounts use `RecordPicker` (and `ChipInput` survives for tags/cast-nested — a positive assertion it is retained).
3. `<RecordPicker>` mounted in all four surfaces → assert each of `EditCurrentContext.tsx` / `RecordForm.tsx` / `CurrentStatePanel.tsx` (title resolution) / `MomentComposer.tsx` imports/uses the expected symbol.
4. Single-harness note: runtime behavior (search/keyboard/select) is intentionally NOT asserted — no DOM harness exists (SPEC-112 §8); web `tsc --noEmit` covers component types.

## Landed Changes

### 1. Add the source-structure test

Added `tools/manual-story-studio/test/web/record-picker.test.ts` in the existing source-structure `node:test` style. The test asserts:

- `RecordPicker.tsx` exists and exports `RecordPicker`.
- `EditCurrentContext.tsx` imports/mounts `RecordPicker` for the expected current-context fields and has no `IdTextArea`.
- `RecordForm.tsx` uses `RecordPicker` for the three `refs` fields while retaining `ChipInput` for tags and non-reference arrays.
- `CurrentStatePanel.tsx` uses the title-resolution helper path.
- `MomentComposer.tsx` uses the two `RecordPicker` mounts and preserves the `previewPrompt` id-array shape.
- `IdTextArea` is absent from every source file under `web/src/`.

## Outcome

SPEC-112 now has a package-level source-structure regression test proving the picker migration and AC#1 zero-raw-ID-entry sweep.

## Verification Result

1. `(cd tools/manual-story-studio && npm run test:backend)` passed; `dist/test/web/record-picker.test.js` ran successfully.
2. `(cd tools/manual-story-studio && npm test)` passed: 457 backend tests plus web `tsc --noEmit`.
3. `grep -rn IdTextArea tools/manual-story-studio/web/src/` returned no matches, which is the expected zero-match proof.
4. `git diff --check` passed.
5. Ignored verification artifacts remained under `tools/manual-story-studio/dist/`, `tools/manual-story-studio/node_modules/`, `tools/manual-story-studio/web/dist/`, and `tools/manual-story-studio/web/node_modules/`.

## Deviations

None. No DOM/runtime harness or production code was added.

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
