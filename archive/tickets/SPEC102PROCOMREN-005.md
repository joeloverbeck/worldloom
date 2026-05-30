# SPEC102PROCOMREN-005: Translators bundle 3 — narrative / temporal classes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 6 pure-function translators under `tools/manual-story-studio/src/prompt/translators/` and registers them in the translator registry. No impact on existing code paths.
**Deps**: 002

## Problem

Six per-class translators are needed to lower narrative/temporal Manual Studio records into novelist-facing prose fragments that the section emitters (ticket 006) inject into §10 / §11 / §5 (clock-driven beat framing) of the composed prompt: `obligations`, `consequences`, `clocks`, `threads`, `questions`, and `artifacts`. Spec §Scope item 2 stage 8 gives the worked example "a clock becomes 'trust toward Ane is rising slowly'". Spec §Scope item 3 §10 also enumerates `mq-*` records into "Relevant Beliefs, Secrets, and Open Questions" with `question.must_not_resolve_unless` translating into reveal-permission language.

## Assumption Reassessment (2026-05-30)

1. Verified the 6 record classes exist in `tools/manual-story-studio/src/schema/manual-story.ts` with their `m`-prefix mappings: `obligations` → `mobl`, `consequences` → `mcnsq`, `clocks` → `mclock`, `threads` → `mthr`, `questions` → `mq`, `artifacts` → `martifact` (`MANUAL_RECORD_CLASS_PREFIXES`). The `mcnsq` prefix and consequences record class were ratified at SPEC-101 land time per the user's 2026-05-30 confirmation in `specs/IMPLEMENTATION-ORDER.md` ("user confirmed the consequences interpretation 2026-05-30"). The `mq` prefix for questions and `must_not_resolve_unless` field are consumed by §10's reveal-permission language.
2. SPEC-102 §Scope item 3 §10 routes `mq-*` records into "Relevant Beliefs, Secrets, and Open Questions" with reveal-permission language inferred from `question.must_not_resolve_unless`; §11 (Physical Continuity) takes `martifact-*` for props/artifacts; §5 Required Beat Cluster does NOT directly read clocks but clocks render into §11 alongside other recent concrete facts; §10 takes `mq-*` records active. Translators here emit per-record fragments; section assignment is the emitter's job.
3. Cross-artifact shared boundary: the `RecordTranslator<C>` interface authored in 002 remains the contract. Questions-translator reveal-permission language derives from the schema's `must_not_resolve_unless` field; clock-translator rate/direction language derives from the schema's clock fields (`direction`, `rate`, or equivalent). Translators do not invent fields beyond what the schema source-of-truth at `src/schema/manual-story.ts` declares.

## Architecture Check

1. Six small pure functions colocated under `src/prompt/translators/`, completing the 18-translator surface. Uniform interface across bundles keeps the fixture-test grid simple.
2. No backwards-compatibility aliasing — translators are greenfield; reveal-permission language for questions is constructed from explicit schema fields rather than inferred.

## Verification Layers

1. Each translator is registered — codebase grep-proof (`grep -E "registerTranslator\\(.(obligations|consequences|clocks|threads|questions|artifacts).\\)" tools/manual-story-studio/src/prompt/translators/index.ts` returns 6 matches).
2. Each translator passes a fixture test — schema validation (per-class fixture record → expected prose fragment).
3. Translator registry is complete — codebase grep-proof: `grep -cE 'registerTranslator\(' tools/manual-story-studio/src/prompt/translators/index.ts` returns 18 (sum of bundles 1+2+3).
4. No translator emits a Manual Studio record ID — codebase grep-proof on emitted fragments.

## What to Change

### 1. Obligations translator (`translators/obligations.ts`)

Pure function `(record: ManualObligationRecord) => string`. Emit `- Open obligation (<holder title>): <details>`; include `Urgency: <urgency>` line if the schema carries an urgency field.

### 2. Consequences translator (`translators/consequences.ts`)

Pure function `(record: ManualConsequenceRecord) => string`. Emit `- Pending consequence: <details>`; include `Trigger: <triggering record title>` line when a trigger reference is named.

### 3. Clocks translator (`translators/clocks.ts`)

Pure function `(record: ManualClockRecord) => string`. Emit `- Clock — <title>: <details>`. If the schema carries `direction` / `rate` fields, append a derived line such as `Currently <direction> at <rate> pace` per the worked example in SPEC-102 §Scope item 2 stage 8 ("trust toward Ane is rising slowly"). Fall back to neutral framing when fields are absent.

### 4. Threads translator (`translators/threads.ts`)

Pure function `(record: ManualThreadRecord) => string`. Emit `### Thread — <title>` followed by `Summary: <summary>` and `Current status: <details>` blocks.

### 5. Questions translator (`translators/questions.ts`)

Pure function `(record: ManualQuestionRecord) => string`. Emit `- Open question: <title>` followed by:
- `Context: <summary>` line.
- A `Reveal: ` clause derived from `must_not_resolve_unless` per SPEC-102 §Scope item 3 §10: when `must_not_resolve_unless` is non-empty, emit `Do not let the prose resolve this question unless: <must_not_resolve_unless>`; when empty, emit `May be referenced; resolution is at author discretion`.

### 6. Artifacts translator (`translators/artifacts.ts`)

Pure function `(record: ManualArtifactRecord) => string`. Emit `- Artifact — <title>: <summary>`; include a `Details: <details>` block when non-empty.

### 7. Per-translator fixture tests

Each translator gets `test/prompt-translators-<class>.test.ts` exercising one positive fixture and one no-internal-IDs assertion. The questions test additionally covers the `must_not_resolve_unless`-derived reveal-permission variants (empty vs. non-empty).

## Files to Touch

- `tools/manual-story-studio/src/prompt/translators/index.ts` (modify) — adds 6 registrations alongside bundles 1 and 2's
- `tools/manual-story-studio/src/prompt/translators/obligations.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/consequences.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/clocks.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/threads.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/questions.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/artifacts.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-obligations.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-consequences.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-clocks.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-threads.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-questions.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-artifacts.test.ts` (new)

## Out of Scope

- Section emitter wiring — ticket 006 owns mapping per-class translator output to per-section Markdown bodies.
- Clock "direction/rate" field-naming negotiation — if the schema source-of-truth at `src/schema/manual-story.ts` uses different field names, the translator follows the schema; this ticket does not amend the schema.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — all 6 fixture tests included.
2. `grep -nE 'registerTranslator\("(obligations|consequences|clocks|threads|questions|artifacts)"' tools/manual-story-studio/src/prompt/translators/index.ts` returns exactly 6 matches.
3. `grep -cE 'registerTranslator\(' tools/manual-story-studio/src/prompt/translators/index.ts` returns 18 — completes the per-class translator surface.
4. Questions-translator fixture test covers `must_not_resolve_unless` empty vs. non-empty → distinct reveal-permission language.

### Invariants

1. Each translator is a pure function — no I/O, no LLM, no state.
2. No translator emits a Manual Studio internal record ID.
3. Reveal-permission language for questions is derived from the schema field, not from heuristics or inferred from `details` content.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-translators-obligations.test.ts` — holder/details/urgency emission.
2. `tools/manual-story-studio/test/prompt-translators-consequences.test.ts` — details/trigger emission.
3. `tools/manual-story-studio/test/prompt-translators-clocks.test.ts` — title/details/direction/rate emission.
4. `tools/manual-story-studio/test/prompt-translators-threads.test.ts` — title/summary/status emission.
5. `tools/manual-story-studio/test/prompt-translators-questions.test.ts` — `must_not_resolve_unless` variants.
6. `tools/manual-story-studio/test/prompt-translators-artifacts.test.ts` — title/summary/details emission.

### Commands

1. `cd tools/manual-story-studio && npm test`
