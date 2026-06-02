# SPEC112MANSTOSTU-004: Mount RecordPicker in EditCurrentContext

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web page `EditCurrentContext.tsx`; removes the local `IdTextArea` and the raw `current_location` input + `pov_holder` select, replacing them with constrained `<RecordPicker>` mounts.
**Deps**: archive/tickets/SPEC112MANSTOSTU-003.md

## Problem

The current-context editor is the densest ID-typing surface: five fields use the `IdTextArea` (`current_cast`, `active_pressure_clocks`, `active_secrets_questions`, `pinned_records`, `must_not_reveal`), `current_location` is a plain text `<input>`, and `pov_holder` is a `<select>` keyed by id. SPEC-112 §2 item 3 replaces all seven with constrained `<RecordPicker>` mounts so the author sets every field by searching and selecting cards, never by typing an id.

## Assumption Reassessment (2026-06-02)

1. `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` defines a local `IdTextArea` (line ~112) used for the five list fields; `current_location` is a plain `<input>` (line ~322); `pov_holder` is a `<select>` over `current_cast` (lines ~341-351). Client-side validators in this file constrain `pinned_records` via `allManualPrefixes()` (any class, line ~203) and `must_not_reveal` via `allowedPrefixes(["secrets"])` (secrets only, line ~210). `IdTextArea` is local to this file (no other consumer) — removing it has no cross-file blast radius.
2. SPEC-112 §2 item 3 gives the exact per-field class constraints; the reassessment corrected the spec premise (`current_location`/`pov_holder` are not `IdTextArea`) and the `must_not_reveal` constraint (secrets-only, **not** any class).
3. Cross-artifact boundary under audit: this page consumes the `RecordPicker` prop contract (`classes`, `mode`, `value`/`onChange`, `seed`) from `archive/tickets/SPEC112MANSTOSTU-003.md`. The picker stores the same id arrays this page already persists to `current-context.yaml` — only the entry UX changes.
4. FOUNDATIONS §Tooling Recommendation (ID-free entry, SPEC-112 §5): this is the highest-value ID-elimination surface; after this ticket no current-context field requires typing an id.

## Architecture Check

1. Constrained mounts of one shared picker (vs. seven bespoke selectors) keep behavior and presentation uniform and let the existing per-field validators stay as a save-time backstop. The picker's class constraint makes invalid selections structurally impossible for the common path.
2. No backwards-compatibility shim: `IdTextArea` is removed outright (no parallel kept); the picker replaces it. Existing client-side validation stays (it is now a redundant backstop, not a shim).

## Verification Layers

1. `IdTextArea` is gone from this file → `grep -n "IdTextArea" EditCurrentContext.tsx` returns zero (also asserted by SPEC112MANSTOSTU-008).
2. Per-field constraints correct (esp. `must_not_reveal`→secrets, `pinned_records`→any) → web `tsc --noEmit` + manual review against §2 item 3 mapping.
3. POV picker surfaces current-cast first and the "POV must be in current cast" validation still holds → manual review + the existing current-context validator unchanged (grep it is untouched).

## Landed Changes

### 1. Replace the five IdTextArea fields with multi-select pickers

Replaced all five `IdTextArea` mounts with `<RecordPicker>` controls:

- `current_cast` uses `classes={["cast"]}` in multi-select mode.
- `active_pressure_clocks` uses `classes={["clocks"]}` in multi-select mode.
- `active_secrets_questions` uses `classes={["secrets", "questions"]}` in multi-select mode.
- `pinned_records` uses `classes={MANUAL_RECORD_CLASSES}` in multi-select mode.
- `must_not_reveal` uses `classes={["secrets"]}` in multi-select mode.

The local `IdTextArea`, `parseIdList`, and `listText` helpers were removed.

### 2. Replace current_location and pov_holder

Replaced `current_location` with a single-select location picker and `pov_holder` with a single-select cast picker. The POV picker receives `seed={ctx.current_cast}` so current-cast records surface first while the existing "POV must be in current cast" validator remains the save-time backstop.

## Outcome

The current-context editor no longer exposes raw ID entry for current location, current cast, POV holder, active clocks, active secrets/questions, pinned records, or must-not-reveal records. The persisted `CurrentContext` shape is unchanged: single selections still write nullable strings, and multi selections still write the existing id arrays.

## Verification Result

1. `grep -n IdTextArea tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` returned no matches, which is the expected zero-match proof.
2. `(cd tools/manual-story-studio && npm --prefix web test)` passed.
3. `(cd tools/manual-story-studio && npm run build)` passed.
4. `(cd tools/manual-story-studio && npm test)` passed: 454 backend tests plus web `tsc --noEmit`.
5. `git diff --check` passed.
6. Ignored verification artifacts remained under `tools/manual-story-studio/dist/`, `tools/manual-story-studio/node_modules/`, `tools/manual-story-studio/web/dist/`, and `tools/manual-story-studio/web/node_modules/`.

## Deviations

None. Segment fields stayed as text inputs, and no runtime DOM harness was added.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (modify)

## Out of Scope

- The picker component (`archive/tickets/SPEC112MANSTOSTU-003.md`).
- Segment fields (`last_accepted_segment` / `last_reviewed_after_segment`) — stay SEG-* text inputs (SPEC-112 §2 Out of scope).
- Changing the persisted `current-context.yaml` shape or the save-time validators' contracts.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "IdTextArea" tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` → zero matches.
2. `(cd tools/manual-story-studio && npm --prefix web test)` — web `tsc --noEmit` green.
3. `(cd tools/manual-story-studio && npm run build)` — web build succeeds.

### Invariants

1. Each field's picker class constraint matches §2 item 3 (esp. `must_not_reveal`→secrets, `pinned_records`→any).
2. The persisted id-array shape is unchanged; the existing "POV must be in current cast" validation still holds.

## Test Plan

### New/Modified Tests

1. `None — structural removal/mount is asserted by SPEC112MANSTOSTU-008 (grep IdTextArea absent + RecordPicker present); type coverage is web tsc --noEmit.`

### Commands

1. `grep -n "IdTextArea" tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx`
2. `(cd tools/manual-story-studio && npm --prefix web test)`
3. The grep + `tsc --noEmit` are the correct boundary; no DOM harness exists for interaction testing (SPEC-112 §8).
