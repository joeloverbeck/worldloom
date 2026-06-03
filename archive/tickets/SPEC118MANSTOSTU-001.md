# SPEC118MANSTOSTU-001: `never_prompt` prompt-visibility mode (end-to-end)

**Status**: ✅ COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` (schema enum, validator literal, composer, prompt ledger reason, web type mirror, record-form selector); no impact on the canon pipeline (the package is SPEC-100 canon-fenced).
**Deps**: None

## Problem

At intake, the per-record visibility enum (`PromptVisibility`) had exactly three values — `always | include_when_relevant | only_if_pinned` — with no way to mark a record as "must never reach the external LLM in any form." `only_if_pinned` still permitted inclusion once a record was pinned, and `must_not_reveal` rendered the record's *title* into the prompt by design (section-10's "Must not reveal:" block). So author-only answers, the true resolution of a mystery, spoiler metadata, and private notes had no permanent per-record guard (`excluded_records` is per-focus, not per-record). This ticket added `never_prompt` as a fourth, absolute, per-record suppression primitive that overrides pin / relevance / `active` / `must_not_reveal`, and surfaces it in the resolution ledger as `excluded`/`never_prompt`.

## Assumption Reassessment (2026-06-03)

1. At intake, `PromptVisibility` was at `tools/manual-story-studio/src/schema/manual-story.ts` with 3 values, used by `ManualRecordSummary`; after this ticket it includes `never_prompt`. The closed-set is enforced at the validator literal in `tools/manual-story-studio/src/validate/schema.ts` (required-field list unchanged). A web mirror is at `web/src/types/manual-story.ts`; the form options array is `PROMPT_VISIBILITY_VALUES` in `web/src/components/RecordForm.tsx`. No exhaustive `switch`/`case` consumes the enum values (only `typeof === "string"` guards at `RecordForm.tsx` and `src/read/records.ts`), so the addition stayed structurally additive.
2. Spec SPEC-118 §2 items 1–3 + §4 + §8 Risks (the dual-mirror discipline). SPEC-119 (`specs/SPEC-119-manual-story-studio-prompt-inspector-confidence-cockpit.md`) Depends-on SPEC-118 and owns the inspector *rendering* of the `never_prompt` reason — its §Out-of-scope carves out "the `never_prompt` value itself (SPEC-118)"; this ticket produces the value + ledger reason, SPEC-119 renders it.
3. Cross-artifact boundaries under audit: **(a)** the backend↔web type-mirror boundary — `PromptVisibility` (`manual-story.ts:135` ↔ `web/src/types/manual-story.ts:162`) AND `PromptExcludedReason` (`src/prompt/types.ts:92` ↔ `web/src/types/manual-story.ts:321`); **(b)** the composer↔section-10 contract — section-10's "Must not reveal:" block (`sections/section-10-beliefs-secrets-questions.ts:63-71`) renders titles from `input.must_not_reveal` (passed at `compose.ts:354`), **independent of `SectionEmitterInput.records`**, so suppression requires stripping `never_prompt` IDs from BOTH the `records` path and the `must_not_reveal` list.
4. FOUNDATIONS principle: §Tooling Recommendation (least-agency at the prompt boundary) + prose/state prompt-boundary safety (SPEC-118 §5) — a permanent per-record suppression is the deterministic, least-surprising guard for "this never leaves the tool"; no heuristic/LLM judgment is added. The package is canon-fenced (SPEC-100), so no Canon Fact Record or Mystery Reserve surface is touched and no canon-write gate is altered.
5. Enum extension (was template item 6): two existing enums extend additively — `PromptVisibility` and `PromptExcludedReason` each gain `never_prompt`. Consumers: validator literal (`validate/schema.ts:65`), web mirrors (`web/src/types/manual-story.ts:162` + `:321`), record-form options (`RecordForm.tsx:30-34`), and the ledger display `reasonLabel()` (`web/src/pages/PromptPreview.tsx:25`, which takes `string` — no exhaustive narrowing, so it renders the new value as "never prompt" with no change required here; richer labeling is SPEC-119's). Additive-only — no value removed or renamed.

## Architecture Check

1. `never_prompt` is one additive enum value plus a single composer gate; it reuses the existing resolution-ledger `excluded` bucket (one new `PromptExcludedReason`) rather than introducing a new suppression subsystem. Stripping `never_prompt` IDs from `must_not_reveal` at the composer — the one place the working-set lists are assembled — keeps the absolute-suppression guarantee in a single deterministic location rather than patching each section emitter.
2. No backwards-compatibility aliasing or shims; the enum extension is additive and the composer gate is new logic, not a compatibility layer.

## Verification Layers

1. Enum closed-set integrity (validator accepts `never_prompt`, rejects unknown) -> schema validation + `test/validate/schema.test.ts:433` enum-membership assertion.
2. Absolute suppression incl. the section-10 "Must not reveal:" path -> composer unit test (`test/prompt/never-prompt.test.ts`): a `never_prompt` record that is pinned/seeded/`active` AND one listed in `must_not_reveal` both appear nowhere in the composed markdown, logged `excluded`/`never_prompt`.
3. Precedence coexistence (a `must_not_reveal` non-`never_prompt` record still renders its title) -> same test, positive control.
4. Backend↔web mirror parity -> codebase grep-proof that `never_prompt` is present in both `PromptVisibility` mirrors and both `PromptExcludedReason` mirrors.
5. Prompt-boundary safety (no `never_prompt` record crosses into the prompt) -> FOUNDATIONS alignment check against SPEC-118 §5.

## Landed Changes

### 1. Add `never_prompt` to the visibility enum (4 sites)

- `src/schema/manual-story.ts` — added `| "never_prompt"` to `PromptVisibility`.
- `src/validate/schema.ts` — added `"never_prompt"` to the `prompt_visibility` value-enum array; the required-field list is unchanged.
- `web/src/types/manual-story.ts` — added `"never_prompt"` to the web `PromptVisibility` mirror.
- `web/src/components/RecordForm.tsx` — added `"never_prompt"` to `PROMPT_VISIBILITY_VALUES`; the selector now offers it.

### 2. Add the `never_prompt` ledger reason (backend + web mirror)

- `src/prompt/types.ts` — extended `PromptExcludedReason` with `"never_prompt"`.
- `web/src/types/manual-story.ts` — added `"never_prompt"` to the web `PromptExcludedReason` mirror (type-honesty with the backend ledger; the inspector consumes this type).

### 3. Composer enforcement (`src/prompt/compose.ts`)

- In the seeded-record loop, before pushing an active record into `records[]`, records with `prompt_visibility === "never_prompt"` are pushed to `resolution.excluded` with `reason: "never_prompt"` and skipped from `records[]`, overriding pin / `included_records` / `active`.
- The composer now strips `never_prompt` IDs from the `must_not_reveal` surface before calling `assembleSections`. Because `must_not_reveal` is an ID list, the composer reads each seeded record's `prompt_visibility`, drops the `never_prompt` ones from the section input, and records each as `excluded`/`never_prompt`. This is the load-bearing correctness step — excluding from `records` alone does not suppress section-10's title block.

### 4. Tests

- New `test/prompt/never-prompt.test.ts` (Verification Layers 2–3).
- Updated `test/validate/schema.test.ts` enum-membership assertion to include `never_prompt`.

## Files to Touch

- `tools/manual-story-studio/src/schema/manual-story.ts` (modify)
- `tools/manual-story-studio/src/validate/schema.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify — both `PromptVisibility` `:162` and `PromptExcludedReason` `:321`)
- `tools/manual-story-studio/src/prompt/types.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modify)
- `tools/manual-story-studio/test/prompt/never-prompt.test.ts` (new)
- `tools/manual-story-studio/test/validate/schema.test.ts` (modify)
- `tools/manual-story-studio/test/web/prompt-inspector.test.ts` (modify)
- `specs/SPEC-118-manual-story-studio-prompt-visibility-and-language.md` (modify — dated implementation note for the completed slice)

## Out of Scope

- Inspector RENDERING of the `never_prompt` reason (author-readable label, "why excluded" affordance) — owned by SPEC-119.
- The source report's rename of the existing enum values (`relevant_by_default`, `only_when_pinned`) — declined per SPEC-118 §Out-of-scope.
- The broad non-cast schema field expansion (SPEC-118 §Out-of-scope, triage D1).
- Beat-count default, stop-rule wording, translator wiring (sibling tickets 002 / 003 / 004).

## Acceptance Criteria

### Tests That Must Pass

1. `PromptVisibility` includes `never_prompt`; the validator accepts it and rejects unknown values (`test/validate/schema.test.ts`).
2. A `never_prompt` record — even when pinned, `active`, or listed in `must_not_reveal` — appears nowhere in the composed markdown (incl. section-10's "Must not reveal:" block) and is logged `excluded`/`never_prompt` (`test/prompt/never-prompt.test.ts`).
3. A `must_not_reveal` (non-`never_prompt`) record still renders its title in the "Must not reveal:" block (`test/prompt/never-prompt.test.ts`).
4. `cd tools/manual-story-studio && npm test` is green (backend + web typecheck, exercising both mirrors).

### Invariants

1. No record with `prompt_visibility: never_prompt` appears anywhere in the composed prompt markdown, regardless of pin / seed / `active` / `must_not_reveal` state.
2. The `never_prompt` value exists identically across all four enum surfaces (backend `PromptVisibility` / `PromptExcludedReason`, web mirrors of each), keeping the type contract honest across the backend↔web boundary.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/never-prompt.test.ts` (new) — absolute suppression incl. section-10 + precedence coexistence.
2. `tools/manual-story-studio/test/validate/schema.test.ts` (modify) — enum-membership assertion at `:433` gains `never_prompt`.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`  (full run — includes the web typecheck for the mirrors + RecordForm)

## Outcome

Completed on 2026-06-03.

The Manual Story Studio backend and web prompt visibility contract now includes `never_prompt`. The validator accepts the new visibility value, the prompt resolution ledger can report `excluded` / `never_prompt`, the composer excludes `never_prompt` records before section emission, and it also removes those IDs from `must_not_reveal` before section-10 can render their titles. The web type mirror and record form selector carry the same value. A dated SPEC-118 implementation note records that this slice is complete while the rest of the draft remains active for sibling tickets.

## Verification Result

1. `cd tools/manual-story-studio && npm test` before source edits passed: 482 backend/static tests plus `npm --prefix web test`.
2. `cd tools/manual-story-studio && npm run test:backend` after source edits passed: 85 compiled test files, including `dist/test/prompt/never-prompt.test.js`, all green.
3. `cd tools/manual-story-studio && npm test` after source edits passed: 483 backend/static tests plus `npm --prefix web test`.
4. Manual/grep review confirmed `never_prompt` appears in both backend and web `PromptVisibility` mirrors, both backend and web `PromptExcludedReason` mirrors, the validator enum, `RecordForm` options, and the focused prompt test. The only remaining active sibling-ticket references are out-of-scope mentions in SPEC118MANSTOSTU-002/003/004.

## Deviations

- The web prompt-inspector mirror test was updated in addition to the originally named files because the backend/web `PromptExcludedReason` mirror is part of the owned type-honesty boundary.
- SPEC-118 received a dated implementation note rather than a row-by-row rewrite; the overall spec remains active until sibling tickets 002-004 complete.
