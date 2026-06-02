# SPEC109MANSTOSTU-011: Mark-state-reviewed button

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `web/src/components/StateUpdateChecklist.tsx` to add the "Mark state reviewed after SEG-N" button; extends the `StateUpdateChecklistPayload` type in both `src/state-update-checklist.ts` (backend) and `web/src/types/manual-story.ts` (frontend mirror) to carry the latest accepted segment.
**Deps**: archive/tickets/SPEC109MANSTOSTU-005.md

## Problem

The state-update checklist (landed by SPEC-103) prompts the author to review record categories after each accepted segment. SPEC-109 introduces the `last_reviewed_after_segment` surface that SPEC-108's repair-mode `force_replace` precondition consults to decide whether a non-latest segment may be silently replaced. This ticket landed the "Mark state reviewed after SEG-N" button that updates the current-context's `last_reviewed_after_segment` field via the PUT route, providing the explicit author action that gates SPEC-108's silent-replacement check.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` (108 lines) currently renders a list of record categories per the `StateUpdateChecklistPayload` it receives; the dialog has a "Skip review" button but no "Mark reviewed" affordance. The payload type is defined at both `tools/manual-story-studio/src/state-update-checklist.ts:34` (backend, used by the route layer that builds the payload) and `tools/manual-story-studio/web/src/types/manual-story.ts:126` (frontend mirror). The payload does NOT currently carry the latest accepted segment ID — this ticket extends both types in lockstep.
2. **Spec**: SPEC-109 §2 item 10 specifies: "A small 'Mark state reviewed after SEG-N' button on the state-update checklist ... sets `last_reviewed_after_segment = SEG-N` via ... `PUT` of the full context with that one field changed — preferred for simplicity." AC #10 names this behavior as a backend acceptance test.
3. **Cross-skill boundary**: The button consumes `fetchCurrentContext` + `saveCurrentContext` from `web/src/api/current-context.ts` (005). The PUT call mutates a single field of the full payload — fetch current, patch the field, PUT back. The payload extension is the shared boundary with the existing backend `buildStateUpdateChecklist` builder (in `src/state-update-checklist.ts`); the builder must populate the new `last_accepted_segment` field from `metadata.segment_order` tail.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)**: `last_reviewed_after_segment` is the surface that prevents silent state-review-marked inference; it must be set only by explicit author action (the button click), never by an automatic side effect. The button's behavior preserves the Rule 6 audit trail at the cockpit level — every state-review attestation is a visible click.

## Architecture Check

1. Extending the payload with a single new field (`last_accepted_segment: string | null`) is the minimal-surface change that lets the checklist component name the right SEG-N in its button label without an extra fetch — the backend already has `metadata.segment_order` at payload-build time.
2. The button's "fetch current-context → patch field → PUT" pattern is the spec's preferred simplicity choice (Q1-equivalent decision: full PUT over PATCH); aligns with the writer's full-file-replace contract from 004.
3. No backwards-compatibility shims: the payload extension is additive (new optional field); the button is new; existing call sites of `buildStateUpdateChecklist` will populate `last_accepted_segment` from `metadata.segment_order` once they're updated to do so.

## Verification Layers

1. Payload extension lands in both backend and frontend types → codebase grep-proof (`grep -n "last_accepted_segment" tools/manual-story-studio/src/state-update-checklist.ts tools/manual-story-studio/web/src/types/manual-story.ts`).
2. Button is rendered when `payload.last_accepted_segment` is non-null → manual verification.
3. Button click PUTs the full context with `last_reviewed_after_segment = payload.last_accepted_segment` → manual verification + (if test infrastructure permits) an acceptance test asserting the PUT request body via the existing routes-test harness from 005.
4. AC #10 (state-update checklist's "Mark state reviewed after SEG-N" button updates `last_reviewed_after_segment` correctly) — covered by the verification at layer 3.

## Landed Changes

### 1. Extend `StateUpdateChecklistPayload` at `src/state-update-checklist.ts`

Added `last_accepted_segment: string | null` to the backend payload interface. `buildStateUpdateChecklist` now reads `manual-story.yaml` through `readManualStoryMetadata` and populates the field from the `metadata.segment_order` tail, or `null` when the order is empty.

### 2. Mirror the type at `web/src/types/manual-story.ts`

Added the same `last_accepted_segment: string | null` field to the frontend `StateUpdateChecklistPayload` mirror.

### 3. Add the button at `web/src/components/StateUpdateChecklist.tsx`

When `payload.last_accepted_segment` is non-null, the checklist footer now renders a button labeled `Mark state reviewed after SEG-N`. The button:

- Calls `fetchCurrentContext(worldSlug, msSlug)`.
- Refuses to auto-create current-context when the payload is absent and renders an inline error instead.
- Patches the loaded payload's `last_reviewed_after_segment` to `payload.last_accepted_segment`.
- Calls `saveCurrentContext(worldSlug, msSlug, patchedCtx)`.
- Closes the dialog on success through the existing `onClose` convention.
- Renders structured validation findings or request errors inline on failure.

### 4. Focused tests

- Extended `tools/manual-story-studio/test/state-update-checklist.test.ts` to seed `manual-story.yaml` and assert `last_accepted_segment` is populated from the metadata `segment_order` tail.
- Extended `tools/manual-story-studio/test/current-context/routes-current-context.test.ts` to assert a PUT body with `last_reviewed_after_segment = SEG-1` writes the reviewed marker to disk.

## Files to Touch

- `tools/manual-story-studio/src/state-update-checklist.ts` (modify — add field + populate in builder)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify — mirror field)
- `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` (modify — add button + handler)
- `tools/manual-story-studio/test/state-update-checklist.test.ts` (modify — payload-tail coverage)
- `tools/manual-story-studio/test/current-context/routes-current-context.test.ts` (modify — reviewed-marker PUT coverage)

## Out of Scope

- SPEC-108's `force_replace` precondition reading `last_reviewed_after_segment` — that's a SPEC-108 follow-up edit (already archived; the cross-spec follow-up routes through a new sibling spec per the Step 6 summary).
- PATCH endpoint for field-targeted updates — spec explicitly prefers full PUT over PATCH for simplicity.
- Backend route / API wrapper — owned by 005.
- Dashboard CurrentStatePanel / EditCurrentContext page — owned by 008 / 010.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` passes (covers the payload-builder extension).
2. `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) — confirms type-correctness of frontend mirror + button.
3. AC #10 — Button click updates `last_reviewed_after_segment` correctly. (Acceptance test: extend 005's routes-current-context.test.ts with a PUT body matching `last_reviewed_after_segment = SEG-N`, OR add a focused test in the existing state-update-checklist test surface.)

### Invariants

1. `last_reviewed_after_segment` is set only by the explicit button click; no automatic side effect mutates it — FOUNDATIONS Rule 6 audit trail preserved.
2. Backend and frontend `StateUpdateChecklistPayload` types stay in sync; the field is mirrored in both files in this single ticket.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/state-update-checklist.test.ts` — asserts the new field is populated from `metadata.segment_order` tail.
2. `tools/manual-story-studio/test/current-context/routes-current-context.test.ts` — asserts the PUT body matching `last_reviewed_after_segment = SEG-N` writes correctly.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio/web && npm test`
3. `cd tools/manual-story-studio && npm test`

## Outcome

Ticket complete. The state-update checklist payload now carries the latest accepted segment, and the checklist dialog exposes an explicit mark-reviewed action that writes `last_reviewed_after_segment` through the full current-context PUT route. The action is visible only when there is a latest accepted segment, refuses to auto-create current-context, and keeps `last_reviewed_after_segment` as an explicit author-click surface.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` — PASS (70 compiled backend test files).
2. `cd tools/manual-story-studio/web && npm test` — PASS (`tsc -p tsconfig.json --noEmit`).
3. `cd tools/manual-story-studio && npm test` — PASS (429 backend tests plus web `tsc --noEmit`).
4. Manual code review of `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` — PASS: the button renders only with `payload.last_accepted_segment`, fetches current-context, refuses absent context, PUTs a patched full payload, and renders findings/errors inline.

## Deviations

The success path closes the existing checklist dialog via `onClose()` rather than adding a new toast system; this follows the component's current UI convention and avoids introducing a one-off notification mechanism.
