# SPEC104BEATEMDET-002: Beat-template schema types + declarative validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new module `tools/manual-story-studio/src/schema/beat-template.ts` (TypeScript types + zod-style schema) + new module `tools/manual-story-studio/src/validate/beat-template-schema.ts` (declarative validator); modifies `tools/manual-story-studio/src/validate/schema.ts` to register the new class
**Deps**: 001

## Problem

SPEC-104 §2.1 defines the Manual Beat Template schema: a per-template YAML file with closed-enum fields (`move_family`, `tone_fit`, `intensity`, `relationship_axes`), structured nested blocks (`role_slots`, `requires`, `excludes`), the 1-5-item `beat_guidance` array, `forbidden_inventions`, and `author_notes`. Once ticket 001 registers the `beat-templates` class in `MANUAL_RECORD_CLASSES`, ticket 001's allocator works, but no schema validator exists for the beat-template body — CRUD endpoints (ticket 006) cannot accept or reject beat-template writes without the declarative validator and TypeScript types this ticket lands.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/src/validate/schema.ts` imports `MANUAL_RECORD_CLASSES` (line 4) and exposes a per-class declarative schema validation pattern (returns the registered class list at line 846); other per-class schemas (e.g., `mbel-*`, `mrel-*`) are registered into this surface per SPEC-101 §4 (`tools/manual-story-studio/src/validate/schema.ts`). `tools/manual-story-studio/src/schema/manual-story.ts:119` defines `ManualStoryRole` as a closed enum of 11 values (`viewpoint | primary_actor | opposing_actor | allied_actor | authority | dependent | witness | information_source | pressure_source | social_bridge | background`); `tools/manual-story-studio/src/schema/manual-story.ts:14` defines `ManualStoryContentIntensity` as `general | mature | explicit`. Once 001 registers `"beat-templates"` in the union and prefix map, the validator framework iterates the registered class and looks up a per-class schema rule.
2. Spec: SPEC-104 §2.1 in-scope item 1 enumerates every beat-template field (`id`, `title`, `active`, `classification.move_family`, `classification.tags`, `classification.intensity`, `classification.tone_fit`, `role_slots` map, `requires.*`, `excludes.*`, `beat_guidance` 1-5 items, `forbidden_inventions`, `author_notes`); §2.1 names the closed enums (`move_family`: 17 values; `tone_fit`: 11 values; `relationship_axes`: 6 values from SPEC-101 `mrel-*.axes` keys; `beat_guidance.function`: `setup | pressure | turn | exit | aftermath`); §3 key decisions documents the rationale (move-family closed-but-broad; tone-fit closed; relationship-axes closed mirroring SPEC-101; beat-guidance 1-5 per FOUNDATIONS §Story Bundles §9 prose-length discipline).
3. Cross-skill boundary: the new schema becomes visible to validate/schema.ts (this ticket's modification) which is consumed by routes/beat-templates.ts (ticket 006 CRUD validation) and to the typed web mirror (ticket 010). The `ManualStoryRole` import from `schema/manual-story.ts:119` is the shared enum surface for `role_slots.<slot>.compatible_roles` — keeping this import-and-reuse posture preserves the single-source-of-truth for the role enum (SPEC-101 contract).
4. Schema extension (was template item 6): this introduces a new beat-template schema definition. The schema is additive (no existing schema is modified); the new TypeScript types are consumed by ticket 003 (recent-use), ticket 004 (why-suggested), ticket 005 (filter), ticket 006 (routes), ticket 010 (web mirror). Per SPEC-103 §4's hand-maintained-mirror rule, ticket 010 will hand-mirror these types in `web/src/types/manual-story.ts`.

## Architecture Check

1. Per-class declarative validator preserves SPEC-101's pattern: each manual-story record class has its own typed schema + declarative validation rule, and the validate/schema.ts framework dispatches by class. Beat-template's larger schema (nested `role_slots` map, multiple closed enums) fits the existing per-class pattern without forcing a parallel validator framework. Alternative considered and rejected: a generic JSON Schema validator pulled in as an `ajv` dependency — rejected because the existing manual-story-studio package follows lightweight per-class TS validation (no `ajv`/`zod` runtime deps; only `yaml`); adding an ajv dependency for a single class is disproportionate.
2. No backwards-compatibility aliasing or shims introduced. The new schema is greenfield; the closed enums (`move_family`, `tone_fit`, etc.) are codified once and consumed by the validator and downstream type consumers.

## Verification Layers

1. The beat-template TypeScript types compile against the schema definition → TypeScript compile (`npm run build:backend` passes).
2. The declarative validator rejects a beat-template YAML missing required fields → targeted test against a fixture with `id`, `title`, `classification.move_family` removed; validator returns specific violations.
3. The declarative validator rejects a beat-template YAML with closed-enum violations → targeted tests for each of `move_family` / `tone_fit` / `relationship_axes` / `beat_guidance.function` accepting out-of-enum strings.
4. The declarative validator rejects a beat-template YAML with `beat_guidance` outside 1-5 items → targeted tests for length-0 and length-6 fixtures.
5. The validator surface is registered in `validate/schema.ts` (consumed by `MANUAL_RECORD_CLASSES` iteration) → codebase grep-proof (`grep -n 'beat-template' tools/manual-story-studio/src/validate/schema.ts`).

## What to Change

### 1. Create `tools/manual-story-studio/src/schema/beat-template.ts`

Define the closed enums and TypeScript interfaces:

- `BeatTemplateMoveFamily` (17 values): `negotiation | confrontation | seduction | escape | reveal | concealment | bargaining | care | grief | celebration | confession | refusal | observation | travel | preparation | aftermath | other`.
- `BeatTemplateToneFit` (11 values): `intimate | tender | tense | comic | bleak | wry | reverent | clinical | feverish | hushed | ceremonial`.
- `BeatTemplateRelationshipAxis` (6 values, subset of SPEC-101 relationship axes per §3 key decision): `trust | fear | attraction | power | respect | familiarity`.
- `BeatTemplateBeatFunction` (5 values): `setup | pressure | turn | exit | aftermath`.
- `BeatTemplateClassification`: `{ move_family: BeatTemplateMoveFamily; tags: string[]; intensity: ManualStoryContentIntensity; tone_fit: BeatTemplateToneFit[] }` (re-uses `ManualStoryContentIntensity` from `manual-story.ts:14`).
- `BeatTemplateRoleSlot`: `{ compatible_roles: ManualStoryRole[] }` (re-uses `ManualStoryRole` from `manual-story.ts:119` — preserves SPEC-101 single-source-of-truth for the role enum).
- `BeatTemplateRequires`: `{ record_classes_any: string[]; record_tags_any: string[]; relationship_axes_any: BeatTemplateRelationshipAxis[]; location_tags_any: string[] }`.
- `BeatTemplateExcludes`: `{ record_tags_any: string[]; forbidden_if_secret_tags: string[] }`.
- `BeatTemplateBeat`: `{ function: BeatTemplateBeatFunction; instruction: string }`.
- `BeatTemplate`: top-level record `{ id: string; title: string; active: boolean; classification: BeatTemplateClassification; role_slots: Record<string, BeatTemplateRoleSlot>; requires: BeatTemplateRequires; excludes: BeatTemplateExcludes; beat_guidance: BeatTemplateBeat[]; forbidden_inventions: string[]; author_notes: string }`.

### 2. Create `tools/manual-story-studio/src/validate/beat-template-schema.ts`

Declarative validator function `validateBeatTemplate(raw: unknown): { valid: true; record: BeatTemplate } | { valid: false; violations: BeatTemplateViolation[] }`. Each violation names the field path + the violation reason. Enforce:

- Required top-level fields present (`id`, `title`, `active`, `classification`, `role_slots`, `requires`, `excludes`, `beat_guidance`, `forbidden_inventions`, `author_notes`).
- `id` matches `^mtemplate-\d+$` (per ticket 001's integer-only ID convention).
- Closed enums (`move_family`, `tone_fit[]`, `intensity`, `relationship_axes[]`, `beat_guidance[].function`) only accept declared values.
- `role_slots` map keys are non-empty strings; each value's `compatible_roles[]` only contains valid `ManualStoryRole` values.
- `beat_guidance` array length is 1-5 (inclusive).
- All string arrays (`tags`, `record_classes_any`, `record_tags_any`, `location_tags_any`, `forbidden_reveal_tags` siblings, `forbidden_inventions`) are well-typed.

### 3. Modify `tools/manual-story-studio/src/validate/schema.ts`

Register the `beat-templates` class with `validateBeatTemplate` so the framework dispatch (per the existing `MANUAL_RECORD_CLASSES` iteration at line 846) reaches the new validator when a beat-template YAML is read.

## Files to Touch

- `tools/manual-story-studio/src/schema/beat-template.ts` (new)
- `tools/manual-story-studio/src/validate/beat-template-schema.ts` (new)
- `tools/manual-story-studio/src/validate/schema.ts` (modify)
- `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` (new)

## Out of Scope

- The `recent-use.ts` consumer (which uses the `BeatTemplate` type) — ticket 003.
- The `why-suggested.ts` consumer — ticket 004.
- The `filter.ts` consumer — ticket 005.
- The CRUD routes consumer — ticket 006.
- The hand-maintained web types mirror — ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. `validateBeatTemplate(<valid fixture>)` returns `{ valid: true, record: <typed BeatTemplate> }`.
2. `validateBeatTemplate(<missing id fixture>)` returns `{ valid: false, violations: [...] }` naming `id` as the missing field.
3. `validateBeatTemplate(<beat_guidance length 0 fixture>)` returns `{ valid: false, ... }` with a violation citing the 1-5 length constraint; same for length 6.
4. `validateBeatTemplate(<closed-enum violation fixture>)` returns `{ valid: false, ... }` for each of `move_family` (out-of-set value), `tone_fit[0]` (out-of-set value), `relationship_axes_any[0]` (out-of-set value), `beat_guidance[0].function` (out-of-set value).
5. `validateBeatTemplate(<role_slots invalid role fixture>)` returns `{ valid: false, ... }` when `compatible_roles[]` contains a value not in the `ManualStoryRole` enum.
6. `cd tools/manual-story-studio && npm run build:backend` succeeds (TypeScript types compile against the schema definition).
7. `grep -n 'beat-template' tools/manual-story-studio/src/validate/schema.ts` returns the registration site.

### Invariants

1. The `BeatTemplate` TypeScript type is the single source of truth for the schema; downstream consumers (filter, why-suggested, recent-use, routes, web types) import from `schema/beat-template.ts` — no parallel typedef.
2. The `ManualStoryRole` enum (declared at `schema/manual-story.ts:119` per SPEC-101) is re-used for `role_slots[].compatible_roles[]` — not duplicated locally in `beat-template.ts`.
3. The `ManualStoryContentIntensity` enum (declared at `schema/manual-story.ts:14`) is re-used for `classification.intensity` — not duplicated.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` (new) — fixture-driven tests for each acceptance criterion (valid template, missing-required-field, beat_guidance length bounds, closed-enum violations per enum, role_slots invalid-role).

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/templates/beat-template-schema.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because this ticket's edits are scoped to the new schema module + the dispatch registration; per-class validation tests for other classes already in place at `test/records-<class>.test.ts` (per SPEC-101) are not affected.
