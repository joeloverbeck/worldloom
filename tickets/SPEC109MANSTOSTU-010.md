# SPEC109MANSTOSTU-010: EditCurrentContext page + App.tsx route

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds `web/src/pages/EditCurrentContext.tsx`; modifies `web/src/App.tsx` to bind the new route.
**Deps**: SPEC109MANSTOSTU-005

## Problem

The cockpit needs an author-facing form to author and edit `current-context.yaml`. Without a dedicated page, the author would have to hand-edit the YAML file via an external editor, which defeats the cockpit's "one-loop" UX goal. The Dashboard "Set current context" affordance (008) and the explicit edit affordances surfaced elsewhere in the cockpit all route to this page. The page presents typed-ID inputs for record references, a POV dropdown populated from `current_cast`, and a textarea for `current_handoff_summary`; on save it PUTs the full body and renders structured 422 findings inline when validation fails.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/web/src/components/RecordForm.tsx` (lines 295-525) is the canonical form-page pattern in the package — typed inputs, validation-error display via the existing 422 finding shape, save button calling a fetch wrapper. `tools/manual-story-studio/web/src/components/RefList.tsx:71` is a read-only display component (click-to-navigate buttons); it is NOT a form input. `tools/manual-story-studio/web/src/App.tsx` declares all top-level routes; adding the edit route is a single-line change. `tools/manual-story-studio/web/src/types/manual-story.ts` exports `MANUAL_RECORD_CLASS_PREFIXES` (consumable by the form's client-side ID-prefix validation).
2. **Spec**: SPEC-109 §2 item 9 (rewritten per `/reassess-spec`) declares: "Records-typed input fields follow the typed-ID input idiom from `RecordForm.tsx` (textarea+parser entry of comma- or newline-separated typed IDs, validated client-side against `MANUAL_RECORD_CLASS_PREFIXES`); the read-only display of pinned records reuses `RefList.tsx` directly." SPEC-109 §4 modify list calls for App.tsx to bind `/worlds/:worldSlug/manual-stories/:msSlug/current-context/edit` to `<EditCurrentContext />`.
3. **Cross-skill boundary**: The page consumes `fetchCurrentContext` + `saveCurrentContext` from `web/src/api/current-context.ts` (005). The 422 finding shape is the same one rendered by `RecordForm.tsx`'s validation-error block — the page reuses that visual treatment.

## Architecture Check

1. Using the existing `RecordForm.tsx` typed-ID input idiom (textarea+parser) rather than introducing a new input component keeps the package's form-input vocabulary uniform; authors who already know how to enter typed IDs in record forms learn nothing new here.
2. The page is a thin composition surface: load → form state → save handler → on-success-navigate-back, no caching, no optimistic updates. Matches the existing form-page pattern.
3. No backwards-compatibility shims: the page is new; the route binding is additive.

## Verification Layers

1. Page loads existing current-context.yaml via `fetchCurrentContext` and pre-populates form fields → manual verification.
2. POV holder dropdown is populated from `current_cast` field state (live-updated as the author edits the cast list) → manual verification.
3. Saving an invalid POV (not in cast) returns a structured 422; the page renders the finding inline next to the POV field → manual verification (matches AC #5 from a UI standpoint; backend assertion lives in 005).
4. Saving a valid body navigates back to the Dashboard (or stays on the page with a success indicator — implementer's choice; either is consistent with the existing form-page pattern) → manual verification.
5. App.tsx route binding compiles under `tsc --noEmit` → AC #12.

## What to Change

### 1. New page at `web/src/pages/EditCurrentContext.tsx`

Component shape:
- `useParams<{ worldSlug, msSlug }>()` to read the route params.
- `useEffect` to `fetchCurrentContext(worldSlug, msSlug)` on mount; populate form state from the result.
- Form state: a typed `CurrentContext` object initialized from the loaded payload (or sensible defaults when null).
- Inputs:
  - `current_handoff_summary` — `<textarea>`.
  - `current_location` — `<input type="text">` with `mloc-` prefix hint.
  - `current_cast` — typed-ID input idiom from `RecordForm.tsx` (textarea+parser; comma or newline separators; validated client-side against `MANUAL_RECORD_CLASS_PREFIXES.cast`).
  - `pov_holder` — `<select>` populated from `current_cast` field state (live).
  - `active_pressure_clocks`, `active_secrets_questions`, `pinned_records`, `must_not_reveal` — typed-ID input idiom (each with its own prefix validation).
  - `last_accepted_segment`, `last_reviewed_after_segment` — `<input type="text">` with `SEG-` prefix hint.
- Save button calls `saveCurrentContext(worldSlug, msSlug, formState)` from 005's API wrapper. On `{ok: true}`, navigate to `/worlds/<world>/manual-stories/<ms>` (the Dashboard). On `{ok: false}`, render the `findings: ValidationError[]` inline using the existing `RecordForm.tsx` validation-error rendering pattern.
- Read-only display of `pinned_records` resolution: reuse `<RefList>` directly to show the current pinned-records list with click-to-navigate behavior (separate visual block from the typed-ID textarea input above; the textarea is the editor, RefList is the resolved preview).

### 2. Route binding at `web/src/App.tsx`

Add a `<Route path="/worlds/:worldSlug/manual-stories/:msSlug/current-context/edit" element={<EditCurrentContext />} />` entry alongside the existing route declarations.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)

## Out of Scope

- Backend route / API wrapper — owned by 005.
- Schema / validate / write functions — owned by 001 / 003 / 004.
- Dashboard panel + affordance — owned by 008.
- MomentComposer seeding — owned by 009.
- Mark-state-reviewed button — owned by 011.
- Optimistic UI updates / autosave / draft persistence — explicit non-goal; SPEC-111 cockpit scope may revisit.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) — confirms type-correctness of new page + route binding.
2. Manual verification per the five verification layers above (covers SPEC-109 §6 manual verification's POV-dropdown + 422-validation requirements).

### Invariants

1. The page never silently drops invalid input — validation failures route through the 422 finding-shape pattern from 005, rendered inline.
2. The POV dropdown's options always reflect the current `current_cast` field state — no stale options after the author edits the cast list.

## Test Plan

### New/Modified Tests

1. `None — UI-only ticket; verification is the web tsc command (AC #12) and manual verification of the form behavior. Pipeline-level test coverage of the underlying validate / write surfaces lives in 003 / 004 / 005's tests.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm test` (full pipeline).
