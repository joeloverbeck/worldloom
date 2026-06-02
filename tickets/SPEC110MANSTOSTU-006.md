# SPEC110MANSTOSTU-006: Candidate card surfaces new fields + desired_pressure_type input + api send

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx`, `tools/manual-story-studio/web/src/api/beat-templates.ts`
**Deps**: 004, 005

## Problem

SPEC-110 §2 item 8 plus the frontend-send portion of item 9. The candidate card must show `pressure_type` / `turn_type` chips, `preconditions_text` as a one-line summary, and `do_not_resolve` / `anti_patterns` / `expected_state_review` in an expanded view; the Moment Composer must expose a `desired_pressure_type` directive input and the api client must send it as `optional_desired_pressure_type` in the candidate request.

## Assumption Reassessment (2026-06-02)

1. `web/src/components/BeatTemplateCandidates.tsx` renders the candidate card head (move_family chip, beat count, recently-used advisory at lines ~107-139) and the `why_suggested` list (lines ~140-146); it consumes `CandidateRequestBody` via `props.candidateInput`. `web/src/api/beat-templates.ts:111` defines `getCandidates(worldSlug, msSlug, input: CandidateRequestBody)` — the single frontend site that POSTs the candidate request body.
2. SPEC-110 §2 item 8 + item 9 (frontend send); §6 manual verification (set `desired_pressure_type` to `intimacy`; verify matching templates rank higher and the why-suggested trace shows the pressure line).
3. Cross-artifact boundary: candidate card ↔ api client (`CandidateRequestBody.optional_desired_pressure_type` defined by ticket 005's mirror) ↔ candidate route (ticket 004 receives the field). This ticket is the frontend producer of the pin; it must land after 005 (the request-body type carries the field) and 004 (the backend accepts it).
4. FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary (by analogy) / the SPEC-107 prose/state boundary: the candidate card and the `desired_pressure_type` input are display-and-curation surfaces only — they read template fields and set a filter pin; they never mutate manual-story state. Restating this before implementation guards against the card acquiring an automatic state effect; SPEC-110 keeps the new fields author-facing with no automatic effects.

## Architecture Check

1. The card additions are display-only reads of the already-typed `BeatTemplateCandidate.template` fields (ticket 005's mirror); the `desired_pressure_type` input is a single controlled `<select>` whose value flows into `candidateInput.optional_desired_pressure_type`, mirroring the existing optional-pin inputs.
2. No backwards-compatibility shim: the input is optional; omitting it sends no `optional_desired_pressure_type`, which the route (004) and archived filter ticket `archive/tickets/SPEC110MANSTOSTU-003.md` already treat as "no pin".

## Verification Layers

1. The card renders `pressure_type` / `turn_type` chips + the expanded `do_not_resolve` / `anti_patterns` / `expected_state_review` view → component render assertion / manual verification (SPEC-110 AC#9).
2. Setting the `desired_pressure_type` input causes the api client to send `optional_desired_pressure_type`, and matching templates rank higher → manual verification (SPEC-110 §6) backed by the route/filter tests (`archive/tickets/SPEC110MANSTOSTU-003.md` / ticket 004).
3. The `why_suggested` list shows the `pressure: <type>` line when the pin matches → manual verification, asserted programmatically in ticket 007.

## What to Change

### 1. Candidate card (`BeatTemplateCandidates.tsx`)

Add `pressure_type` / `turn_type` chips at the card head; `preconditions_text` as a one-line summary (full prose on hover/expand); `do_not_resolve` / `anti_patterns` as bulleted lists and `expected_state_review` as an "After prose, review: [chips]" line in the expanded view. Add a `desired_pressure_type` `<select>` (from the enum const) that sets `candidateInput.optional_desired_pressure_type`.

### 2. Api send (`web/src/api/beat-templates.ts`)

Ensure `getCandidates` forwards `optional_desired_pressure_type` from the `CandidateRequestBody` to the POST body (typically already covered once the type field exists; add the explicit field if the body is constructed field-by-field).

## Files to Touch

- `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx` (modify)
- `tools/manual-story-studio/web/src/api/beat-templates.ts` (modify)

## Out of Scope

- The `CandidateRequestBody` type definition (ticket 005's mirror) and the backend route (ticket 004).
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

1. `None — frontend display + request-field change; verification is the web build/test in `npm test` plus the manual round-trip in SPEC-110 §6. The pin's filter effect is asserted programmatically in ticket 007.`

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio/web && npm run build` — narrower check that the card + api client compile.
