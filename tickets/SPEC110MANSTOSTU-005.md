# SPEC110MANSTOSTU-005: Frontend type mirror + Beat Template form fields

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio/web/src/types/manual-story.ts`, `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx`
**Deps**: 001

## Problem

SPEC-110 §2 item 7 plus the reassessment's expand-scope finding ES-1. The frontend keeps a hand-maintained `BeatTemplate` type mirror at `web/src/types/manual-story.ts` (the form and candidate card import from it); it must gain the 2 new enums and 7 new fields so the form can reference them. `BeatTemplateForm.tsx` then gains author controls for the 7 fields and updates `defaultTemplate()`.

## Assumption Reassessment (2026-06-02)

1. `web/src/types/manual-story.ts:333+` is a hand-maintained frontend mirror — it independently *defines* `BeatTemplateMoveFamily`, `BeatTemplateClassification`, `BeatTemplateRequires`, `BeatTemplateExcludes`, `BeatTemplateBeat`, and `BeatTemplate` (it does not re-export the backend schema; the Vite frontend cannot import backend TS directly). `BeatTemplateForm.tsx` imports `BeatTemplate` + the enum consts + `MANUAL_RECORD_CLASSES` from `../types/manual-story.js` and builds `defaultTemplate(): Omit<BeatTemplate,"id">` (lines 41-63) — adding required fields to the mirror breaks `defaultTemplate()` until it supplies them.
2. SPEC-110 §2 item 7; §4 ("No modification to … `recordSchemas.ts` — `BeatTemplateForm.tsx` is a custom form"); the reassessment's ES-1 finding (the spec named the form/card components but not the type mirror they import).
3. Cross-artifact boundary: the frontend mirror ↔ the backend `BeatTemplate` schema (ticket 001). The mirror must track 001's field/enum additions; this ticket also adds `optional_desired_pressure_type?` to the frontend `CandidateRequestBody` type so ticket 006 can send it.
4. (was template item 6 — frontend-mirror schema extension): extends the frontend `BeatTemplate` mirror with the same 7 fields + 2 enums as 001. Additive to the mirror's existing consumers (form, candidate card); the only breaking site is `defaultTemplate()`, updated here. Naming the mirror as a distinct schema surface is the ES-1 correction.

## Architecture Check

1. The mirror duplicates the backend enum/field shape by necessity (separate frontend build); keeping it a literal mirror — rather than wiring a shared package — preserves the existing SPEC-100 frontend/backend package boundary the studio uses.
2. No backwards-compatibility shim: `defaultTemplate()` is updated to supply the new fields with sensible blank defaults (`pressure_type`/`turn_type` default to a representative enum value; empty strings/arrays for the rest); no optional-field fallbacks.

## Verification Layers

1. The mirror declares all 7 fields + both enums → `tsc`/`vite build` of `web` compiles only when `defaultTemplate()` and the form supply them.
2. Saving a template with all 7 fields round-trips through the form without data loss → component test / manual verification (SPEC-110 AC#8).
3. The form renders a control per new field (select / textarea / chips) → component render assertion or manual verification.

## What to Change

### 1. Extend the frontend type mirror (`web/src/types/manual-story.ts`)

Add `BeatTemplatePressureType` + `BEAT_TEMPLATE_PRESSURE_TYPES`, `BeatTemplateTurnType` + `BEAT_TEMPLATE_TURN_TYPES`, and the 7 fields on the `BeatTemplate` interface — mirroring ticket 001 exactly. Add `optional_desired_pressure_type?: BeatTemplatePressureType` to the frontend `CandidateRequestBody` type.

### 2. Form controls (`BeatTemplateForm.tsx`)

Add controls: `pressure_type` / `turn_type` as `<select>` from the enum consts; `preconditions_text` / `stop_after` as `<textarea>`; `do_not_resolve` / `anti_patterns` as line-per-entry textareas with split-on-newline parsing (matching the existing `forbidden_inventions` control); `expected_state_review` as multi-select chips from `MANUAL_RECORD_CLASSES` excluding `beat-templates`. Update `defaultTemplate()` to supply all 7 fields.

## Files to Touch

- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` (modify)

## Out of Scope

- Backend schema/enums (ticket 001).
- Candidate card chips/expanded view and the `desired_pressure_type` author input (ticket 006).
- `recordSchemas.ts` — the form is custom, not the generic scaffold (SPEC-110 §4).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` (includes `npm --prefix web test` and the web build) is green — the mirror + `defaultTemplate()` supply the 7 fields.
2. The form exposes a control for each of the 7 new fields; saving a fully-populated template round-trips without data loss (manual verification per SPEC-110 AC#8).

### Invariants

1. The frontend `BeatTemplate` mirror is field-for-field consistent with the backend schema (ticket 001) for the 7 new fields + 2 enums.
2. The `expected_state_review` chip control never offers `beat-templates`.

## Test Plan

### New/Modified Tests

1. `None — frontend form change; verification is the web build/test in `npm test` plus manual round-trip verification (SPEC-110 §6). Existing web component coverage is exercised by `npm --prefix web test`.`

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio/web && npm run build` — narrower check that the mirror + form compile.
