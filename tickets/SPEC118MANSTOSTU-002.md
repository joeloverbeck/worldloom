# SPEC118MANSTOSTU-002: Beat-count default `2-5` -> `3-5`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` section-5 prompt emitter; no impact on other emitters.
**Deps**: None

## Problem

`section-5-required-beat-cluster.ts:5` sets `DEFAULT_BEAT_COUNT = "2-5"`, but the clarified product target is 3–5 meaningful beats. Change the default while preserving the author override path.

## Assumption Reassessment (2026-06-03)

1. `DEFAULT_BEAT_COUNT = "2-5"` is at `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts:5`. The override path reads `input.metadata.prompt_policy.default_beat_count` (`:8`) and uses it when non-empty, falling back to `DEFAULT_BEAT_COUNT` (`:9`) — so changing the constant preserves author override exactly.
2. Spec SPEC-118 §2 item 4 + §4; §1(B) confirms "author override preserved."
3. Cross-artifact boundary: the section-5 emitter's `SectionEmitResult` body is consumed by the composer's `assembleSections` (`compose.ts`); this change touches only the default string, not the emitter's output contract.

## Architecture Check

1. One-line constant change; the override branch already exists, so no new logic is introduced. Cleaner than threading a new config default through `prompt_policy`.
2. No backwards-compatibility aliasing or shims.

## Verification Layers

1. Default beat language reads `3-5` when no override is set -> new section-5 unit test asserting the composed body.
2. Author override still wins -> same test with `prompt_policy.default_beat_count` set in metadata.
3. Single-artifact ticket: one emitter + its test; the two invariants (default + override) are distinct assertions on the one proof surface, so no further cross-layer mapping applies.

## What to Change

### 1. Update the default

`src/prompt/sections/section-5-required-beat-cluster.ts:5` — `DEFAULT_BEAT_COUNT = "2-5"` -> `"3-5"`.

### 2. Test

New `test/prompt/section-5-required-beat-cluster.test.ts` (none exists today): assert the default renders `3-5`; assert a metadata override (e.g. `default_beat_count: "4-6"`) renders the override value.

## Files to Touch

- `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts` (modify)
- `tools/manual-story-studio/test/prompt/section-5-required-beat-cluster.test.ts` (new)

## Out of Scope

- The stop-rule wording, `never_prompt`, translator wiring (sibling tickets 001 / 003 / 004).
- Any change to the override mechanism or the `prompt_policy` schema.

## Acceptance Criteria

### Tests That Must Pass

1. The composed section-5 body reads "next 3-5 beats" by default (`test/prompt/section-5-required-beat-cluster.test.ts`).
2. A `default_beat_count` metadata override still overrides the default.
3. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. The author override path (`prompt_policy.default_beat_count`) remains the sole authority when set; the constant is only the fallback.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/section-5-required-beat-cluster.test.ts` (new) — default + override assertions.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `<single-package backend test is the correct boundary — this ticket touches one backend emitter and adds one backend test; no web surface is affected.>`
