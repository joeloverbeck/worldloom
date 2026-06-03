# SPEC118MANSTOSTU-003: Replace "machine-state conclusions" author-facing jargon

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` section-14 prompt emitter.
**Deps**: None

## Problem

`section-14-stop-rule.ts:7` reads "Do not declare durable **machine-state conclusions** unless the directive explicitly asks for that wording." "Machine-state conclusions" is internal-engine jargon leaking into author-facing prompt text. Replace it with plain wording.

## Assumption Reassessment (2026-06-03)

1. The phrase is at `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts:7` (single occurrence in `src`, confirmed by SPEC-118 AC #5's grep); `emitSection14()` returns a static body string with no inputs, so the change is a pure string replacement.
2. Spec SPEC-118 §2 item 5 + §1(C) give the exact replacement text: "Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment."
3. Cross-artifact boundary: the section-14 emitter's `SectionEmitResult` body is consumed by the composer's `assembleSections`; the existing `test/prompt/section-14-stop-rule.test.ts` asserts the body content and must be updated to the new wording.

## Architecture Check

1. Static-string replacement in one emitter; cleaner than adding any conditional wording logic.
2. No backwards-compatibility aliasing or shims.

## Verification Layers

1. The phrase "machine-state conclusions" no longer appears in any author-facing section -> codebase grep-proof (`grep -rn "machine-state conclusions" tools/manual-story-studio/src` returns nothing).
2. The plain replacement sentence is present in the composed section-14 body -> updated `test/prompt/section-14-stop-rule.test.ts`.
3. Single-artifact ticket: one emitter + its existing test; the two distinct proof surfaces (grep absence + test presence) are mapped above and not collapsed.

## What to Change

### 1. Replace the sentence

`src/prompt/sections/section-14-stop-rule.ts:7` — replace "Do not declare durable machine-state conclusions unless the directive explicitly asks for that wording." with "Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment."

### 2. Update the test

`test/prompt/section-14-stop-rule.test.ts` — update the body assertion to the new wording and add a negative assertion that "machine-state conclusions" is absent.

## Files to Touch

- `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` (modify)
- `tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts` (modify)

## Out of Scope

- Beat-count default, `never_prompt`, translator wiring (sibling tickets 001 / 002 / 004).
- Any other section-14 stop-rule semantics beyond the one jargon sentence.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "machine-state conclusions" tools/manual-story-studio/src` returns nothing.
2. The composed section-14 body contains the plain replacement sentence (`test/prompt/section-14-stop-rule.test.ts`).
3. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. No author-facing prompt section emits internal-engine vocabulary ("machine-state conclusions").

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts` (modify) — assert the new wording is present and the jargon is absent.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `<single-package backend test is the correct boundary — this ticket touches one backend emitter and its existing backend test; no web surface is affected.>`
