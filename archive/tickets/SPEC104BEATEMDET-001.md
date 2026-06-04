# SPEC104BEATEMDET-001: Register beat-templates class + add prompt_policy.recent_template_advisory_window field

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/manual-story-studio` schema (new record class registered in `MANUAL_RECORD_CLASSES`; new field on `ManualStoryPromptPolicy`)
**Deps**: None

## Problem

SPEC-104 introduces a new `beat-templates` record class under `worlds/<slug>/manual-stories/<slug>/records/beat-templates/mtemplate-<integer>.yaml`. Per SPEC-101's per-class allocation contract (`tools/manual-story-studio/src/write/id-allocator.ts:60`, `allocateNextIdForClass`), the allocator looks up the class's prefix in `MANUAL_RECORD_CLASS_PREFIXES`; without an entry, `allocateNextIdForClass("beat-templates")` throws. SPEC-104 also introduces a new `prompt_policy.recent_template_advisory_window` field (default `2`) consumed by `recent-use.ts` (ticket 003) for the §2.2 stage-8 advisory window. Both surfaces are foundational — every other ticket in this batch consumes the registered class and/or the new field.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/src/schema/manual-story.ts` defines `ManualRecordClass` union (line 160), `MANUAL_RECORD_CLASS_PREFIXES` map (line 180), `MANUAL_RECORD_CLASSES` array (line 201), and `ManualStoryPromptPolicy` interface (line 67) per SPEC-101's landed schema; `tools/manual-story-studio/src/write/manual-story-metadata.ts` initializer defaults the existing `prompt_policy.*` fields (`save_prompts`, `require_moment_directive`, `default_beat_count`, `include_recent_segments`) and `manuscript.allow_reorder` per SPEC-103's landed initializer pattern. `tools/manual-story-studio/src/write/id-allocator.ts:60` looks up `MANUAL_RECORD_CLASS_PREFIXES[recordClass]` and throws when the class is unregistered.
2. Spec: SPEC-104 §2.1 in-scope item 1 declares the `beat-templates` record class with `mtemplate-<integer>` ID format (per the reassess-spec correction dropping the slug-form claim — see `specs/SPEC-104-beat-templates-and-deterministic-filtering.md` §2.1 item 1 + §3 Key Decisions); §2.1 in-scope item 1's `manual-story.yaml prompt_policy extension` declares `prompt_policy.recent_template_advisory_window: int (default 2)`; §3 key decision restates the integer-only ID convention.
3. Cross-skill boundary: the registered class becomes visible to id-allocator (ticket 002 consumer), validate/schema.ts (ticket 002 consumer), routes/records.ts (ticket 006 dispatch coordination — records.ts will start admitting `GET /records/beat-templates/...` once `beat-templates` is added to `MANUAL_RECORD_CLASSES`; ticket 006 adds a special-case skip for class `beat-templates` since the dedicated routes/beat-templates.ts owns that URL space). The `recent_template_advisory_window` field becomes visible to recent-use.ts (ticket 003 consumer) and to the web types mirror (ticket 010 consumer per SPEC-103 §4's hand-maintained-mirror rule).
4. Schema extension (was template item 6): this extends an existing output schema (`ManualStoryPromptPolicy` and the `MANUAL_RECORD_CLASSES` / `MANUAL_RECORD_CLASS_PREFIXES` registries that govern allocator / validator dispatch). The `prompt_policy.recent_template_advisory_window` extension is additive (new optional field with a default of `2`; existing manual stories will get the default at next metadata read); the `MANUAL_RECORD_CLASSES` extension is additive (new array entry); consumers are listed at item 3 above. No breaking changes.

## Architecture Check

1. Single-point registration via the existing three maps (`ManualRecordClass` union, `MANUAL_RECORD_CLASS_PREFIXES`, `MANUAL_RECORD_CLASSES`) preserves the SPEC-101 convention every other class follows. Adding `beat-templates` here means downstream consumers (id-allocator, validate/schema.ts) automatically pick up the new class without per-consumer wiring. Alternative considered and rejected: register `beat-templates` only in the new dedicated routes file (skipping the shared registries), which would force a parallel ID-allocator surface and break the single-point-of-truth pattern SPEC-101 established.
2. No backwards-compatibility aliasing or shims introduced. The new `recent_template_advisory_window` field is additive with a documented default; existing manual stories that don't define the field will receive `2` at metadata-read time (the `manual-story-metadata.ts` initializer's default discipline).

## Verification Layers

1. `MANUAL_RECORD_CLASSES` includes `"beat-templates"` → codebase grep-proof (`grep -n '"beat-templates"' tools/manual-story-studio/src/schema/manual-story.ts`).
2. `MANUAL_RECORD_CLASS_PREFIXES["beat-templates"]` resolves to `"mtemplate"` → codebase grep-proof + targeted test (`allocateNextIdForClass("beat-templates")` returns `mtemplate-1` against an empty class directory).
3. `ManualStoryPromptPolicy.recent_template_advisory_window` is a typed `number` field → TypeScript compile (`npm run build:backend` passes).
4. `manual-story-metadata.ts` initializer defaults `recent_template_advisory_window: 2` alongside existing defaults → grep-proof + targeted test (a freshly-initialized `manual-story.yaml` carries the field at value `2`).

## What to Change

### 1. Extend `tools/manual-story-studio/src/schema/manual-story.ts`

- Add `"beat-templates"` to the `ManualRecordClass` union (line ~160).
- Add the entry `"beat-templates": "mtemplate"` to the `MANUAL_RECORD_CLASS_PREFIXES` map (line ~180).
- Append `"beat-templates"` to the `MANUAL_RECORD_CLASSES` readonly array (line ~201).
- Extend the `ManualStoryPromptPolicy` interface (line ~67) with `recent_template_advisory_window: number` (no `?` — required-with-default, populated by the initializer).

### 2. Extend `tools/manual-story-studio/src/write/manual-story-metadata.ts`

- Add `recent_template_advisory_window: 2` to the `prompt_policy` block of the metadata initializer, alongside the existing `save_prompts`, `require_moment_directive`, `default_beat_count`, `include_recent_segments` defaults (around lines 83-85 per SPEC-103 §4's `allow_reorder` precedent).

## Files to Touch

- `tools/manual-story-studio/src/schema/manual-story.ts` (modify)
- `tools/manual-story-studio/src/write/manual-story-metadata.ts` (modify)

## Out of Scope

- The beat-template schema definition itself (TypeScript types for the body) — ticket 002.
- The dedicated CRUD routes for `beat-templates` — ticket 006.
- The `routes/records.ts` dispatch coordination (special-case skip for class `beat-templates`) — ticket 006.
- The recent-use.ts consumer that reads `recent_template_advisory_window` — ticket 003.
- The web types mirror that mirrors `ManualStoryPromptPolicy.recent_template_advisory_window` — ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n '"beat-templates"' tools/manual-story-studio/src/schema/manual-story.ts` returns 3 matches (union member, prefix map entry, array entry).
2. `grep -n 'recent_template_advisory_window' tools/manual-story-studio/src/schema/manual-story.ts tools/manual-story-studio/src/write/manual-story-metadata.ts` returns matches in both files.
3. `cd tools/manual-story-studio && npm run build:backend` succeeds (TypeScript compile).
4. A targeted test exercising `allocateNextIdForClass("beat-templates")` against an empty class directory returns `"mtemplate-1"`.

### Invariants

1. `MANUAL_RECORD_CLASSES` is the single source of truth for valid manual-story-studio record classes; downstream consumers (id-allocator, validate/schema.ts) iterate this array. Adding `"beat-templates"` MUST register it everywhere — no parallel registry surface introduced.
2. `prompt_policy.recent_template_advisory_window` defaults to `2` at initializer time; existing manual stories that don't carry the field receive the default at metadata-read time (additive extension preserves backward compatibility).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/id-allocator.test.ts` (modify, existing per SPEC-101) — extend to assert `allocateNextIdForClass("beat-templates")` returns `"mtemplate-1"` against an empty fixture class directory.
2. `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` (modify if existing, else new) — assert that a freshly-initialized `manual-story.yaml` carries `prompt_policy.recent_template_advisory_window: 2`.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/id-allocator.test.js" "dist/test/write/manual-story-metadata.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because this ticket's edits are scoped to the schema types + initializer; per-class CRUD and id-allocator tests in `test/write/` exercise the registered class via the live `MANUAL_RECORD_CLASSES` / `MANUAL_RECORD_CLASS_PREFIXES` maps.
