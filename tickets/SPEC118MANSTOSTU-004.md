# SPEC118MANSTOSTU-004: Wire `confidence` + `answer_known` into prompt translators

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` belief + question prompt translators.
**Deps**: None

## Problem

Two already-defined required fields are read by the schema but never emitted by their translators: `confidence` on belief (`beliefs.ts` emits `holder` / `truth_relation` only) and `answer_known` on question (`questions.ts` ignores it). Wire both so the prompt surfaces author-asserted local truth more faithfully, without inventing data or expanding the schema.

## Assumption Reassessment (2026-06-03)

1. `beliefsTranslator` (`tools/manual-story-studio/src/prompt/translators/beliefs.ts:20-27`) emits only `holderTitle` + `truthRelationClause`; `confidence: ManualBeliefConfidence` is a **required** field (`src/schema/manual-story.ts:350`, enum `low | medium | high | certain` at `:345`). `questionsTranslator` (`translators/questions.ts:4-22`) emits title / summary / details / `must_not_resolve_unless` but not `answer_known: boolean` (**required**, `src/schema/manual-story.ts:463`). Because both fields are required, there is no absent-field path — the translators must handle every enum/boolean value.
2. Spec SPEC-118 §2 item 6 + §1(D) + §6 AC #6: the confidence clause is scaled per value (tentative for `low` -> with-certainty for `certain`); `answer_known` flags author-known vs open.
3. Cross-artifact boundary: both translators register via `registerTranslator(...)` into the translator registry (`translators/index.ts`) consumed by `sections/section-10-beliefs-secrets-questions.ts`; this change is to emitted-string content only, not the translator signature or registration.
4. FOUNDATIONS principle (§Soft Canon / Local Truth, SPEC-118 §5 row 4): emitting `confidence` / `answer_known` surfaces author-asserted local truth more faithfully to the prose engine without inventing data — deterministic, reads existing required fields only. No canon or Mystery Reserve surface is touched (the package is canon-fenced).

## Architecture Check

1. Both changes are additive clauses inside existing translator functions reading already-present required fields; no new translator, no signature change, no new section. Cleaner than adding a dedicated confidence/answer section.
2. No backwards-compatibility aliasing or shims.

## Verification Layers

1. Belief translator emits a confidence clause for every value (`low | medium | high | certain`), scaled -> updated `test/prompt-translators-beliefs.test.ts`.
2. Question translator reflects `answer_known` (author-known vs open) for both booleans -> updated `test/prompt-translators-questions.test.ts`.
3. Cross-artifact: each translator's emitted-string change is proven by its own dedicated test file; the two invariants map to two distinct proof surfaces and are not collapsed.

## What to Change

### 1. Belief translator — confidence clause

`src/prompt/translators/beliefs.ts` — append a confidence clause to the emitted line, scaled per value (e.g. `low` -> tentative phrasing, `certain` -> with-certainty phrasing). Handle all four enum values; no absent branch.

### 2. Question translator — answer_known

`src/prompt/translators/questions.ts` — reflect `answer_known` in the emitted guidance (e.g. flag "the author knows the answer" vs "open question"). Handle both boolean values.

### 3. Tests

Update `test/prompt-translators-beliefs.test.ts` and `test/prompt-translators-questions.test.ts` for the new clauses.

## Files to Touch

- `tools/manual-story-studio/src/prompt/translators/beliefs.ts` (modify)
- `tools/manual-story-studio/src/prompt/translators/questions.ts` (modify)
- `tools/manual-story-studio/test/prompt-translators-beliefs.test.ts` (modify)
- `tools/manual-story-studio/test/prompt-translators-questions.test.ts` (modify)

## Out of Scope

- The broad non-cast schema field expansion (SPEC-118 §Out-of-scope, triage D1) — only the two already-present fields are wired.
- `never_prompt`, beat-count default, stop-rule wording (sibling tickets 001 / 002 / 003).
- Any change to translator registration or signatures.

## Acceptance Criteria

### Tests That Must Pass

1. A belief with each `confidence` value emits a correspondingly-scaled clause (`test/prompt-translators-beliefs.test.ts`).
2. A question reflects `answer_known` in its emitted guidance for both `true` and `false` (`test/prompt-translators-questions.test.ts`).
3. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. Translators read only existing required fields; no value is invented and no field is assumed absent.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-translators-beliefs.test.ts` (modify) — confidence-clause per value.
2. `tools/manual-story-studio/test/prompt-translators-questions.test.ts` (modify) — `answer_known` reflection for both booleans.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `<single-package backend test is the correct boundary — this ticket touches two backend translators and their backend tests; no web surface is affected.>`
