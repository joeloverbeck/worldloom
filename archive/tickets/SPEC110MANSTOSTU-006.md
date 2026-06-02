# SPEC110MANSTOSTU-006: Candidate card surfaces new fields + desired_pressure_type input + api send

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx`, `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`
**Deps**: archive/tickets/SPEC110MANSTOSTU-004.md, archive/tickets/SPEC110MANSTOSTU-005.md

## Problem

Before this ticket, the candidate card did not surface the new SPEC-110 template fields, and Moment Composer had no `desired_pressure_type` directive input. This ticket added the card display surfaces and a controlled Moment Composer selector that sends `optional_desired_pressure_type` in the candidate request only when the author supplies a value.

## Assumption Reassessment (2026-06-02)

1. `web/src/components/BeatTemplateCandidates.tsx` renders the candidate card head, `why_suggested` list, and fetch request key; it consumes `CandidateRequestBody` via `props.candidateInput`. `web/src/api/beat-templates.ts` posts the whole typed `CandidateRequestBody`, so no field-by-field API edit was required after `archive/tickets/SPEC110MANSTOSTU-005.md` added the type field.
2. SPEC-110 §2 item 8 + item 9 (frontend send); §6 manual verification (set `desired_pressure_type` to `intimacy`; verify matching templates rank higher and the why-suggested trace shows the pressure line).
3. Cross-artifact boundary: candidate card ↔ api client (`CandidateRequestBody.optional_desired_pressure_type` defined by `archive/tickets/SPEC110MANSTOSTU-005.md`) ↔ candidate route (`archive/tickets/SPEC110MANSTOSTU-004.md` receives the field). This ticket is the frontend producer of the pin; it must land after `archive/tickets/SPEC110MANSTOSTU-005.md` (the request-body type carries the field) and `archive/tickets/SPEC110MANSTOSTU-004.md` (the backend accepts it).
4. FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary (by analogy) / the SPEC-107 prose/state boundary: the candidate card and the `desired_pressure_type` input are display-and-curation surfaces only — they read template fields and set a filter pin; they never mutate manual-story state. Restating this before implementation guards against the card acquiring an automatic state effect; SPEC-110 keeps the new fields author-facing with no automatic effects.

## Architecture Check

1. The card additions are display-only reads of the already-typed `BeatTemplateCandidate.template` fields (`archive/tickets/SPEC110MANSTOSTU-005.md`); the `desired_pressure_type` input is a single controlled `<select>` whose value flows into `candidateInput.optional_desired_pressure_type`, mirroring the existing optional-pin inputs.
2. No backwards-compatibility shim: the input is optional; omitting it sends no `optional_desired_pressure_type`, which the route (`archive/tickets/SPEC110MANSTOSTU-004.md`) and archived filter ticket `archive/tickets/SPEC110MANSTOSTU-003.md` already treat as "no pin".

## Verification Layers

1. The card renders `pressure_type` / `turn_type` chips + the expanded `do_not_resolve` / `anti_patterns` / `expected_state_review` view → component render assertion / manual verification (SPEC-110 AC#9).
2. Setting the `desired_pressure_type` input causes the api client to send `optional_desired_pressure_type`, and matching templates rank higher → manual verification (SPEC-110 §6) backed by the route/filter tests (`archive/tickets/SPEC110MANSTOSTU-003.md` / `archive/tickets/SPEC110MANSTOSTU-004.md`).
3. The `why_suggested` list shows the `pressure: <type>` line when the pin matches → manual verification, asserted programmatically in ticket 007.

## Landed Changes

### 1. Candidate card (`BeatTemplateCandidates.tsx`)

Added `pressure_type` / `turn_type` chips at the card head; `preconditions_text` as a one-line summary with full text available in details; `stop_after`, `do_not_resolve`, `anti_patterns`, and `expected_state_review` in a details view. Added `optional_desired_pressure_type` to the candidate request key so changing the pin refetches candidates.

### 2. Moment Composer directive input (`MomentComposer.tsx`)

Added a `desired_pressure_type` select populated from `BEAT_TEMPLATE_PRESSURE_TYPES`. The candidate request object includes `optional_desired_pressure_type` only when the selected value is non-empty.

## Files to Touch

- `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)

## Out of Scope

- The `CandidateRequestBody` type definition (`archive/tickets/SPEC110MANSTOSTU-005.md`) and the backend route (`archive/tickets/SPEC110MANSTOSTU-004.md`).
- The filter tie-breaker and why-suggested trace logic (`archive/tickets/SPEC110MANSTOSTU-003.md`).

## Acceptance Criteria

### Tests That Must Pass

1. The candidate card surfaces `pressure_type` and `turn_type` chips and shows `do_not_resolve` / `anti_patterns` / `expected_state_review` in an expanded view (manual verification, SPEC-110 AC#9).
2. With the `desired_pressure_type` input set to `intimacy`, candidate templates whose `pressure_type` is `intimacy` rank higher and the why-suggested trace shows the `pressure: intimacy` line (manual verification, SPEC-110 §6).
3. `cd tools/manual-story-studio && npm test`.

### Invariants

1. The card reads template fields only; it performs no state mutation (preserves the SPEC-107 prose/state boundary).
2. The api client sends `optional_desired_pressure_type` only when the author supplied it.

## Test Plan

### New/Modified Tests

1. None — the package has a web TypeScript check but no component test runner. Verification is `npm --prefix web test`, `npm --prefix web run build`, package `npm test`, and manual source review of display/request wiring. The pin's filter effect is asserted programmatically in `archive/tickets/SPEC110MANSTOSTU-003.md` / `archive/tickets/SPEC110MANSTOSTU-004.md` and remains covered by ticket 007.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio/web && npm test`
3. `cd tools/manual-story-studio/web && npm run build` — narrower check that the card + Moment Composer compile.

## Outcome

Completed 2026-06-02. Candidate cards now show pressure/turn chips, preconditions, stop cues, expected state-review chips, and do-not-resolve / anti-pattern lists. Moment Composer now exposes a desired-pressure selector and includes `optional_desired_pressure_type` only when the author chooses a pressure type.

## Verification Result

1. `cd tools/manual-story-studio/web && npm test` — PASS.
2. `cd tools/manual-story-studio/web && npm run build` — PASS.
3. `cd tools/manual-story-studio && npm test` — PASS, 438 backend tests plus `web` TypeScript check.
4. Manual source review — PASS: card display reads template fields only; candidate request key includes `optional_desired_pressure_type`; Moment Composer conditionally spreads the request field only for non-empty selections; `getCandidates` posts the full typed request body.

## Deviations

No browser session or component-test runner was available in the package. Display and request wiring were verified by TypeScript, Vite build, package tests, and source review.
