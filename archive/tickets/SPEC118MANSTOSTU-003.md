# SPEC118MANSTOSTU-003: Replace "machine-state conclusions" author-facing jargon

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` section-14 prompt emitter.
**Deps**: None

## Problem

At intake, `section-14-stop-rule.ts` read "Do not declare durable **machine-state conclusions** unless the directive explicitly asks for that wording." "Machine-state conclusions" was internal-engine jargon leaking into author-facing prompt text. This ticket replaced it with plain durable-continuity handoff wording.

## Assumption Reassessment (2026-06-03)

1. The phrase is at `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts:7` (single occurrence in `src`, confirmed by SPEC-118 AC #5's grep); `emitSection14()` returns a static body string with no inputs, so the change is a pure string replacement.
2. Spec SPEC-118 §2 item 5 + §1(C) give the exact replacement text: "Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment."
3. Cross-artifact boundary: the section-14 emitter's `SectionEmitResult` body is consumed by the composer's `assembleSections`; the existing `test/prompt/section-14-stop-rule.test.ts` asserts the body content and must be updated to the new wording.
4. Same-seam proof correction: `tools/manual-story-studio/test/prompt-sections.test.ts` also asserts the old section-14 wording through assembled-section output, so it is part of this ticket's proof surface.

## Architecture Check

1. Static-string replacement in one emitter; cleaner than adding any conditional wording logic.
2. No backwards-compatibility aliasing or shims.

## Verification Layers

1. The phrase "machine-state conclusions" no longer appears in any author-facing section -> codebase grep-proof (`grep -rn "machine-state conclusions" tools/manual-story-studio/src` returns nothing).
2. The plain replacement sentence is present in the direct and assembled section-14 body -> updated `test/prompt/section-14-stop-rule.test.ts` and `test/prompt-sections.test.ts`.
3. Single-artifact ticket: one emitter + its existing test; the two distinct proof surfaces (grep absence + test presence) are mapped above and not collapsed.

## Landed Changes

### 1. Replace the sentence

`src/prompt/sections/section-14-stop-rule.ts` — replaced "Do not declare durable machine-state conclusions unless the directive explicitly asks for that wording." with "Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment."

### 2. Update the test

`test/prompt/section-14-stop-rule.test.ts` and `test/prompt-sections.test.ts` — updated body assertions to the new wording and added/kept negative assertions that "machine-state conclusions" is absent.

## Files to Touch

- `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` (modify)
- `tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts` (modify)
- `tools/manual-story-studio/test/prompt-sections.test.ts` (modify)

## Out of Scope

- Beat-count default, `never_prompt`, translator wiring (sibling tickets 001 / 002 / 004).
- Any other section-14 stop-rule semantics beyond the one jargon sentence.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "machine-state conclusions" tools/manual-story-studio/src` returns nothing.
2. The composed section-14 body contains the plain replacement sentence (`test/prompt/section-14-stop-rule.test.ts`, `test/prompt-sections.test.ts`).
3. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. No author-facing prompt section emits internal-engine vocabulary ("machine-state conclusions").

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts` (modify) — assert the new wording is present and the jargon is absent.
2. `tools/manual-story-studio/test/prompt-sections.test.ts` (modify) — assembled section-14 assertion uses the new wording.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `<single-package backend test is the correct boundary — this ticket touches one backend emitter and its existing backend test; no web surface is affected.>`

## Outcome

Completed on 2026-06-03.

Section 14 now tells the prose engine not to declare durable continuity changes outside the prose and states that the author will update story records manually after accepting or rejecting the segment. The old "machine-state conclusions" wording is absent from Manual Studio source.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` before source edits passed: 85 compiled test files, all green.
2. `grep -rn "machine-state conclusions" tools/manual-story-studio/src` after source edits returned no matches, which is the expected success signal for the negative grep.
3. `cd tools/manual-story-studio && npm run test:backend` after source edits passed: 85 compiled test files, all green.

## Deviations

- `tools/manual-story-studio/test/prompt-sections.test.ts` was added to the file set because it also asserted the old assembled section-14 wording.
