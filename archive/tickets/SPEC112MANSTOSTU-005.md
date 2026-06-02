# SPEC112MANSTOSTU-005: Replace ChipInput with RecordPicker on RecordForm ref fields

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web component `RecordForm.tsx`; replaces `ChipInput` on the three `refs` fields with `<RecordPicker>`, leaving `ChipInput` in place for `tags` and the cast nested string-array fields.
**Deps**: archive/tickets/SPEC112MANSTOSTU-003.md

## Problem

`RecordForm.tsx` uses a free-text `ChipInput` for `refs.characters`, `refs.locations`, and `refs.related_records`, accepting raw id strings with no lookup or validation against the existing record set (SPEC-112 §1). SPEC-112 §2 item 4 replaces those three ref inputs with `<RecordPicker>` (class-constrained for characters/locations, any-class for related_records), so a reference can no longer point at a non-existent record.

## Assumption Reassessment (2026-06-02)

1. `tools/manual-story-studio/web/src/components/RecordForm.tsx` defines a local `ChipInput` (line ~81) used for `refs.characters` / `refs.locations` / `refs.related_records` (lines ~569-598) AND for `tags` (line ~549), cast nested `chipArray` fields (anti_generic_warnings, prose constraints), and `stringArray` per-class fields (line ~873). The `refs` shape is `{ characters, locations, related_records }` (the `ensureRefs` helper). So `ChipInput` must NOT be removed wholesale — only the three ref-field mounts swap to the picker.
2. SPEC-112 §2 item 4 and §4 (RecordForm modify) define this ticket; the reassessment confirmed `ChipInput` stays for tags/cast-nested (it is not an id-typed surface there).
3. Cross-artifact boundary under audit: this component consumes the `RecordPicker` prop contract from `archive/tickets/SPEC112MANSTOSTU-003.md`. The picker writes the same id array into `common.refs.<field>` the form already persists.
4. FOUNDATIONS §Tooling Recommendation (ID-free entry, SPEC-112 §5): record refs are the second ID-typing surface; after this ticket the author picks referenced records from cards, never typing an id.

## Architecture Check

1. Swapping only the three ref fields (vs. removing `ChipInput` entirely) preserves the free-text chip affordance where it is correct (tags, prose-constraint arrays — not record references) while making record references selection-validated.
2. No backwards-compatibility shim: the ref-field `ChipInput` mounts are replaced outright by the picker; `ChipInput` survives for its legitimate non-reference uses.

## Verification Layers

1. `ChipInput` no longer wraps the three `refs` fields → source-structure assertion in SPEC112MANSTOSTU-008 + manual review of the three mounts.
2. `ChipInput` still present for tags/cast-nested → `grep -n "ChipInput" RecordForm.tsx` returns >0 (it is retained), and the three ref mounts use `RecordPicker`.
3. Persisted refs shape unchanged → web `tsc --noEmit` (the form still builds `common.refs` as the same `{characters, locations, related_records}` id arrays).

## Landed Changes

### 1. Swap the three ref-field mounts to RecordPicker

Replaced the three record-reference `ChipInput` mounts with `RecordPicker`:

- `refs.characters` uses `classes={["cast"]}` in multi-select mode.
- `refs.locations` uses `classes={["locations"]}` in multi-select mode.
- `refs.related_records` uses `classes={MANUAL_RECORD_CLASSES}` in multi-select mode.

Each picker writes back into the same `common.refs.<field>` id-array shape the form already persists. `RecordForm` reads `worldSlug` and `msSlug` from the current route so the picker can fetch summaries without widening the component's parent prop contract.

### 2. Leave ChipInput for non-reference fields

Left `ChipInput` intact for tags, cast nested chip arrays, and per-class `stringArray` fields.

## Outcome

Record reference entry in `RecordForm` is now card-based and class-constrained while the persisted record schema remains unchanged. Free-text chip entry remains available only for non-reference string arrays.

## Verification Result

1. `grep -n 'ChipInput\|RecordPicker\|Refs (characters)\|Refs (locations)\|Refs (related records)' tools/manual-story-studio/web/src/components/RecordForm.tsx` showed `RecordPicker` on the three ref fields and retained `ChipInput` for non-reference fields.
2. `(cd tools/manual-story-studio && npm --prefix web test)` passed.
3. `(cd tools/manual-story-studio && npm run build)` passed.
4. `(cd tools/manual-story-studio && npm test)` passed: 454 backend tests plus web `tsc --noEmit`.
5. `git diff --check` passed.
6. Ignored verification artifacts remained under `tools/manual-story-studio/dist/`, `tools/manual-story-studio/node_modules/`, `tools/manual-story-studio/web/dist/`, and `tools/manual-story-studio/web/node_modules/`.

## Deviations

None. No schema or save-contract changes were made.

## Files to Touch

- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modify)

## Out of Scope

- The picker component (`archive/tickets/SPEC112MANSTOSTU-003.md`).
- Removing `ChipInput` (it stays for tags + cast-nested string arrays).
- Any change to the record schema or the form's persisted `refs` shape.

## Acceptance Criteria

### Tests That Must Pass

1. The three `refs` fields render `<RecordPicker>`, not `ChipInput` — asserted structurally by SPEC112MANSTOSTU-008.
2. `grep -n "ChipInput" tools/manual-story-studio/web/src/components/RecordForm.tsx` → still >0 (retained for tags/cast-nested).
3. `(cd tools/manual-story-studio && npm --prefix web test)` and `(cd tools/manual-story-studio && npm run build)` succeed.

### Invariants

1. The form persists the identical `refs` id-array shape; only the ref-entry UX changes.
2. `ChipInput` remains the control for tags and cast-nested string-array fields.

## Test Plan

### New/Modified Tests

1. `None — the ref-field swap is asserted structurally by SPEC112MANSTOSTU-008; type coverage is web tsc --noEmit.`

### Commands

1. `grep -n "ChipInput\|RecordPicker" tools/manual-story-studio/web/src/components/RecordForm.tsx`
2. `(cd tools/manual-story-studio && npm --prefix web test)`
3. The grep distinguishes retained vs. replaced `ChipInput` mounts; `tsc --noEmit` covers the type-level wiring. No DOM harness exists (SPEC-112 §8).
