# SPEC102PROCOMREN-003: Translators bundle 1 — cast + world-state classes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 6 pure-function translators under `tools/manual-story-studio/src/prompt/translators/` and registers them in the translator registry. No impact on existing code paths.
**Deps**: 002

## Problem

Six per-class translators are needed to lower world-state Manual Studio records into novelist-facing prose fragments that the section emitters (ticket 006) and the compose pipeline (ticket 007) inject into §7 / §11 of the composed prompt: `cast` (Manual Character Profile → §7 Cast and Voice), `entities`, `statuses`, `locations`, `objects`, and `facts` (→ §11 Physical Continuity). Each translator is a pure function of the record's own fields; quality of the composed prompt depends on translator quality per SPEC-102 §8 Risks.

## Assumption Reassessment (2026-05-30)

1. Verified the 6 record classes exist in `tools/manual-story-studio/src/schema/manual-story.ts`: `cast` → `mchar` (line 161), `entities` → `ment`, `statuses` → `mstat`, `locations` → `mloc`, `objects` → `mobj`, `facts` → `mfact` (all in `MANUAL_RECORD_CLASS_PREFIXES`). Manual Character Profile has all 9 prompt-relevant fields verified at lines 209-276: `identity`, `world_pressure_core`, `voice`, `body_and_presence`, `pressure_behavior`, `perception_and_embodiment`, `agency_and_planning`, `relationship_behavior`, `prose_constraints`.
2. SPEC-102 §Scope item 3 §7 mandates "all nine prompt-relevant Manual Character Profile fields, translated into novelist-facing language" — the cast translator must emit all nine; section §11 (Physical Continuity) lists location / bodies / objects / props / recent facts as the surfaces consumed from `mloc-*` / cast `body_and_presence` / `mobj-*` / `mfact-*` records.
3. Cross-artifact shared boundary: the `RecordTranslator<C>` interface authored in 002 (`tools/manual-story-studio/src/prompt/translators/index.ts`) is the contract. Each translator emits a Markdown prose fragment with no leading `## ` heading (the section emitter owns headings); fragments do NOT emit raw record IDs (e.g., `mchar-3`) — they emit cast `title` or referenced-character names per SPEC-102 §Acceptance criterion 7 ("no Manual Studio internal record IDs in the prompt body").

## Architecture Check

1. Six small pure functions colocated under `src/prompt/translators/` keep the translator surface coherent and grep-findable; each translator file is independently testable with a fixture record. Bundling all 18 translators in one ticket would produce a 36-file diff; splitting into 3 bundles of 6 keeps each bundle reviewable.
2. No backwards-compatibility aliasing — translators are greenfield; the registry from 002 is the single source of dispatch.

## Verification Layers

1. Each translator is registered — codebase grep-proof (`grep -E "registerTranslator\\(.cast.|.entities.|.statuses.|.locations.|.objects.|.facts.\\)" tools/manual-story-studio/src/prompt/translators/index.ts` returns 6 matches).
2. Each translator passes a fixture test — schema validation (per-class fixture record → expected prose fragment, byte-identical).
3. No translator emits a Manual Studio record ID — codebase grep-proof on emitted fragments (test asserts no `m[a-z]+-[0-9]+` substring).

## What to Change

### 1. Translator registration helper in `src/prompt/translators/index.ts`

Extend the file authored in 002 with a `registerTranslator<C>(recordClass: C, translator: RecordTranslator<C>): void` helper that populates `translatorRegistry`, plus a `getTranslator(recordClass: ManualRecordClass): AnyRecordTranslator | undefined` accessor. Then import and register the 6 translators below.

### 2. Cast translator (`translators/cast.ts`)

Pure function `(record: ManualCharacterRecord) => string`. Emit a `### <title>` sub-heading followed by all 9 Manual Character Profile sections rendered as labeled prose blocks: `Identity:`, `World pressure core:`, `Voice:`, `Body and presence:`, `Pressure behavior:`, `Perception and embodiment:`, `Agency and planning:`, `Relationships:` (per-character lines from `relationship_behavior`), `Prose constraints:`. Never emit `mchar-N`; use the cast `title` for the sub-heading and the related-character record `title` for relationship lines.

### 3. Entities translator (`translators/entities.ts`)

Pure function `(record: ManualEntityRecord) => string`. Emit a one-line `- <title>: <summary>` bullet plus a `Details: <details>` block when non-empty. Skip records whose `active === false` upstream (the section emitter filters); translator is pure.

### 4. Statuses translator (`translators/statuses.ts`)

Pure function `(record: ManualStatusRecord) => string`. Emit a `- <title>: <summary>` bullet plus a `(currently active)` marker when `active === true`.

### 5. Locations translator (`translators/locations.ts`)

Pure function `(record: ManualLocationRecord) => string`. Emit a `### <title>` sub-heading followed by `Summary: <summary>` and `Details: <details>` paragraphs.

### 6. Objects translator (`translators/objects.ts`)

Pure function `(record: ManualObjectRecord) => string`. Emit a `- <title>: <summary>` bullet plus a `Details: <details>` block when non-empty.

### 7. Facts translator (`translators/facts.ts`)

Pure function `(record: ManualFactRecord) => string`. Emit a `- <title>: <details>` bullet; if `details` is empty, fall back to `<summary>`.

### 8. Per-translator fixture tests

Each translator gets `test/prompt-translators-<class>.test.ts` exercising one positive fixture and one no-internal-IDs assertion (regex `m[a-z]+-[0-9]+` against the emitted string returns no matches).

## Files to Touch

- `tools/manual-story-studio/src/prompt/translators/index.ts` (modify) — extends the file created in 002 with `registerTranslator` / `getTranslator` and the 6 registrations
- `tools/manual-story-studio/src/prompt/translators/cast.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/entities.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/statuses.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/locations.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/objects.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/facts.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-cast.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-entities.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-statuses.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-locations.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-objects.test.ts` (new)
- `tools/manual-story-studio/test/prompt-translators-facts.test.ts` (new)

## Out of Scope

- The other 12 translators (tickets 004 / 005).
- Section emitter wiring — ticket 006 consumes the registry via `getTranslator`.
- Compose-time filtering of `active === false` records — ticket 007.
- Lint sweeping the composed prompt for ID leakage — ticket 008.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — all 6 per-class translator fixture tests included in the suite.
2. `grep -nE 'registerTranslator\("(cast|entities|statuses|locations|objects|facts)"' tools/manual-story-studio/src/prompt/translators/index.ts` returns exactly 6 matches.
3. Each translator test asserts the emitted string contains no `m[a-z]+-[0-9]+` substring (no internal record IDs leak per SPEC-102 §Acceptance criterion 7).

### Invariants

1. Each translator is a pure function — no I/O, no LLM, no state; same input → same output per SPEC-102 §3 Key Decisions.
2. No translator emits a Manual Studio internal record ID; emitted fragments use record `title` or related-character `title` for identifying language.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-translators-cast.test.ts` — Manual Character Profile fixture → 9-section prose; no `mchar-N` substring.
2. `tools/manual-story-studio/test/prompt-translators-entities.test.ts` — entity record fixture → bullet + details; no `ment-N`.
3. `tools/manual-story-studio/test/prompt-translators-statuses.test.ts` — status record fixture → bullet + active marker.
4. `tools/manual-story-studio/test/prompt-translators-locations.test.ts` — location record fixture → sub-heading + summary/details.
5. `tools/manual-story-studio/test/prompt-translators-objects.test.ts` — object record fixture → bullet + details.
6. `tools/manual-story-studio/test/prompt-translators-facts.test.ts` — fact record fixture → bullet with details/summary fallback.

### Commands

1. `cd tools/manual-story-studio && npm test`
