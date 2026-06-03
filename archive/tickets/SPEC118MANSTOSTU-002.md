# SPEC118MANSTOSTU-002: Beat-count default `2-5` -> `3-5`

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` section-5 prompt emitter; no impact on other emitters.
**Deps**: None

## Problem

At intake, `section-5-required-beat-cluster.ts` set `DEFAULT_BEAT_COUNT = "2-5"`, and newly-created story metadata seeded `prompt_policy.default_beat_count: "2-5"` in `src/write/manual-story-metadata.ts`. The clarified product target is 3–5 meaningful beats. This ticket changed both default producers while preserving the author override path.

## Assumption Reassessment (2026-06-03)

1. At intake, `DEFAULT_BEAT_COUNT = "2-5"` was at `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts`. The override path reads `input.metadata.prompt_policy.default_beat_count` and uses it when non-empty, falling back to `DEFAULT_BEAT_COUNT`; after this ticket, that fallback is `3-5`.
2. Spec SPEC-118 §2 item 4 + §4; §1(B) confirms "author override preserved."
3. Cross-artifact boundary: the section-5 emitter's `SectionEmitResult` body is consumed by the composer's `assembleSections` (`compose.ts`); this change touches only the default string, not the emitter's output contract.
4. Reassessment correction: the drafted ticket said no section-5 test exists and asked for a new `test/prompt/section-5-required-beat-cluster.test.ts`, but the live package already has `tools/manual-story-studio/test/prompt-sections.test.ts` with a `§5 parameterizes by default_beat_count` test. The cleaner proof is to extend that existing section-emitter test instead of creating a duplicate file.
5. Verification fallout correction: changing only the section fallback left the composed default at `2-5`, because `makeDefaultManualStoryMetadata()` seeds `prompt_policy.default_beat_count: "2-5"` for new stories and section 5 correctly treats metadata as the author/default producer. The owned seam therefore includes `tools/manual-story-studio/src/write/manual-story-metadata.ts` and its default-metadata test.

## Architecture Check

1. Two literal default updates; the override branch already exists, so no new logic is introduced. Cleaner than threading a new config default through another layer.
2. No backwards-compatibility aliasing or shims.

## Verification Layers

1. Default beat language reads `3-5` when no override is set -> existing section-5 unit test asserting the composed body with blank metadata fallback.
2. Newly-created story metadata seeds `default_beat_count: "3-5"` -> `test/write/manual-story-metadata.test.ts`.
3. Author override still wins -> existing section-5 test with `prompt_policy.default_beat_count` set in metadata.

## Landed Changes

### 1. Update the default

`src/prompt/sections/section-5-required-beat-cluster.ts` — `DEFAULT_BEAT_COUNT = "2-5"` -> `"3-5"`.

`src/write/manual-story-metadata.ts` — `prompt_policy.default_beat_count = "2-5"` -> `"3-5"` for newly-created manual stories.

### 2. Test

Updated the existing `test/prompt-sections.test.ts` §5 test to assert blank metadata fallback renders `3-5` and metadata override still renders the override value. Updated `test/write/manual-story-metadata.test.ts` to assert newly-created metadata seeds `3-5`.

## Files to Touch

- `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts` (modify)
- `tools/manual-story-studio/src/write/manual-story-metadata.ts` (modify)
- `tools/manual-story-studio/test/prompt-sections.test.ts` (modify)
- `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` (modify)

## Out of Scope

- The stop-rule wording, `never_prompt`, translator wiring (sibling tickets 001 / 003 / 004).
- Any change to the override mechanism or the `prompt_policy` schema.

## Acceptance Criteria

### Tests That Must Pass

1. The composed section-5 body reads "next 3-5 beats" when metadata has no beat-count override (`test/prompt-sections.test.ts`).
2. Newly-created story metadata defaults to `default_beat_count: "3-5"` (`test/write/manual-story-metadata.test.ts`).
3. A `default_beat_count` metadata override still overrides the fallback.
4. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. The author override path (`prompt_policy.default_beat_count`) remains the sole authority when set; the section constant is only the blank-metadata fallback.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-sections.test.ts` (modify) — fallback + override assertions.
2. `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` (modify) — new-story default assertion.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `<single-package backend test is the correct boundary — this ticket touches one backend emitter and adds one backend test; no web surface is affected.>`

## Outcome

Completed on 2026-06-03.

Section 5 now falls back to `3-5` beats when metadata has no beat-count override, and newly-created Manual Story Studio metadata now seeds `prompt_policy.default_beat_count: "3-5"`. Existing explicit metadata values remain authoritative, proven with a `4-6` override assertion.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` before source edits passed: 85 compiled test files, all green.
2. First post-edit `cd tools/manual-story-studio && npm run test:backend` failed in `dist/test/prompt-sections.test.js`, proving the initial one-file fallback change was insufficient because new-story metadata still seeded `2-5`.
3. `node dist/test/prompt-sections.test.js` isolated the failing assertion to the owned §5 default check.
4. After widening to `src/write/manual-story-metadata.ts`, `cd tools/manual-story-studio && npm run test:backend` passed: 85 compiled test files, all green.
5. Grep/manual review classified remaining `2-5` literals as historical ticket/spec intake prose or explicit test fixture/override values; current default producers are `section-5-required-beat-cluster.ts` and `manual-story-metadata.ts`, both now `3-5`.

## Deviations

- The drafted test path was corrected to the existing `tools/manual-story-studio/test/prompt-sections.test.ts`.
- The owned implementation widened from the section-5 fallback constant to include `makeDefaultManualStoryMetadata()` because the backend proof showed it is the real new-story default producer.
