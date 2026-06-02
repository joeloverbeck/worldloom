# SPEC110MANSTOSTU-005: Frontend type mirror + Beat Template form fields

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio/web/src/types/manual-story.ts`, `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx`
**Deps**: archive/tickets/SPEC110MANSTOSTU-001.md

## Problem

Before this ticket, the frontend hand-maintained `BeatTemplate` type mirror at `web/src/types/manual-story.ts` still had the pre-SPEC-110 shape, and `BeatTemplateForm.tsx` could not author the 7 new backend-required fields. This ticket updated the mirror with the 2 new enums and 7 new fields, added the request-body type for `optional_desired_pressure_type`, and added author controls/defaults for the 7 fields.

## Assumption Reassessment (2026-06-02)

1. `web/src/types/manual-story.ts` is a hand-maintained frontend mirror — it independently *defines* `BeatTemplateMoveFamily`, `BeatTemplateClassification`, `BeatTemplateRequires`, `BeatTemplateExcludes`, `BeatTemplateBeat`, and `BeatTemplate` (it does not re-export the backend schema; the Vite frontend cannot import backend TS directly). `BeatTemplateForm.tsx` imports `BeatTemplate` + the enum consts + `MANUAL_RECORD_CLASSES` from `../types/manual-story.js` and builds `defaultTemplate(): Omit<BeatTemplate,"id">`; adding required fields to the mirror breaks `defaultTemplate()` until it supplies them.
2. SPEC-110 §2 item 7; §4 ("No modification to … `recordSchemas.ts` — `BeatTemplateForm.tsx` is a custom form"); the reassessment's ES-1 finding (the spec named the form/card components but not the type mirror they import).
3. Cross-artifact boundary: the frontend mirror ↔ the backend `BeatTemplate` schema (ticket 001). The mirror now tracks 001's field/enum additions; this ticket also added `optional_desired_pressure_type?` to the frontend `CandidateRequestBody` type so ticket 006 can send it.
4. (was template item 6 — frontend-mirror schema extension): extended the frontend `BeatTemplate` mirror with the same 7 fields + 2 enums as 001. Additive to the mirror's existing consumers (form, candidate card); the breaking `defaultTemplate()` site now supplies all required fields.

## Architecture Check

1. The mirror duplicates the backend enum/field shape by necessity (separate frontend build); keeping it a literal mirror — rather than wiring a shared package — preserves the existing SPEC-100 frontend/backend package boundary the studio uses.
2. No backwards-compatibility shim: `defaultTemplate()` is updated to supply the new fields with sensible blank defaults (`pressure_type`/`turn_type` default to a representative enum value; empty strings/arrays for the rest); no optional-field fallbacks.

## Verification Layers

1. The mirror declares all 7 fields + both enums → `tsc`/`vite build` of `web` compiles only when `defaultTemplate()` and the form supply them.
2. Saving a template with all 7 fields round-trips through the form without data loss → component test / manual verification (SPEC-110 AC#8).
3. The form renders a control per new field (select / textarea / chips) → component render assertion or manual verification.

## Landed Changes

### 1. Extend the frontend type mirror (`web/src/types/manual-story.ts`)

Added `BeatTemplatePressureType` + `BEAT_TEMPLATE_PRESSURE_TYPES`, `BeatTemplateTurnType` + `BEAT_TEMPLATE_TURN_TYPES`, and the 7 fields on the `BeatTemplate` interface — mirroring ticket 001. Added `optional_desired_pressure_type?: BeatTemplatePressureType` to the frontend `CandidateRequestBody` type.

### 2. Form controls (`BeatTemplateForm.tsx`)

Added controls: `pressure_type` / `turn_type` as `<select>` from the enum consts; `preconditions_text` / `stop_after` as `<textarea>`; `do_not_resolve` / `anti_patterns` as line-per-entry textareas with shared split-on-newline parsing; `expected_state_review` as checkbox chips from `MANUAL_RECORD_CLASSES` excluding `beat-templates`. Updated `defaultTemplate()` to supply all 7 fields.

## Files to Touch

- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` (modify)

## Out of Scope

- Backend schema/enums (ticket 001).
- Candidate card chips/expanded view and the `desired_pressure_type` author input (ticket 006).
- `recordSchemas.ts` — the form is custom, not the generic scaffold (SPEC-110 §4).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` (includes `npm --prefix web test`) is green, and `cd tools/manual-story-studio/web && npm run build` is green — the mirror + `defaultTemplate()` supply the 7 fields.
2. The form exposes a control for each of the 7 new fields; saving a fully-populated template round-trips without data loss (manual verification per SPEC-110 AC#8).

### Invariants

1. The frontend `BeatTemplate` mirror is field-for-field consistent with the backend schema (ticket 001) for the 7 new fields + 2 enums.
2. The `expected_state_review` chip control never offers `beat-templates`.

## Test Plan

### New/Modified Tests

1. None — the package currently has a web TypeScript check but no component test runner. Verification is `npm --prefix web test`, `npm --prefix web run build`, the package `npm test`, and manual source review of the controlled form state/onSave path.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio/web && npm test`
3. `cd tools/manual-story-studio/web && npm run build` — narrower check that the mirror + form compile.

## Outcome

Completed 2026-06-02. The frontend beat-template mirror now matches the backend SPEC-110 fields/enums for `pressure_type`, `turn_type`, `preconditions_text`, `do_not_resolve`, `expected_state_review`, `stop_after`, and `anti_patterns`. `BeatTemplateForm` now initializes, renders, edits, and submits all 7 fields through its existing draft/onSave path. The expected-state-review control excludes `beat-templates`.

## Verification Result

1. `cd tools/manual-story-studio/web && npm test` — PASS.
2. `cd tools/manual-story-studio/web && npm run build` — PASS.
3. `cd tools/manual-story-studio && npm test` — PASS, 437 backend tests plus `web` TypeScript check.
4. Manual source review — PASS: each new field is a controlled input bound to `draft`; `handleSubmit` submits `draft` or `{ ...draft, id: initial.id }`; `STATE_REVIEW_RECORD_CLASSES` filters out `beat-templates`.

## Deviations

No browser session or component-test runner was available in the package. The round-trip acceptance was verified by TypeScript plus source review of the controlled form state and submit path.
