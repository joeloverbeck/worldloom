# MANSTOSTUFIX-004: Secret "Held by" should be a cast picker, not a raw id input

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` frontend (`web/src/components/recordSchemas.ts`, `web/src/components/RecordForm.tsx`)
**Deps**: None (independent of MANSTOSTUFIX-003; together they make secret holders render by name)

## Problem

Before this ticket, a secret's holders did not reliably reach the `held_by` field through normal use, so the prompt's "Held by:" line could be empty and holders were not named. Observed in the field on `worlds/erotica-world/manual-stories/red-bunny` secret `msecret-1`: the rendered prompt showed the secret and its audience clause but no holder line, while the stored record had:

```yaml
held_by: []
refs:
  characters:
    - mchar-1   # Ane Arrieta
```

The holder (Ane) landed in `refs.characters`, not `held_by`. The cause at intake was the secret edit form: it presented **two** character-association controls that looked interchangeable but were not —

- **"Refs (characters)"** — a friendly searchable `RecordPicker` (cast-scoped). Users naturally pick the character here.
- **"Held by (mchar list)"** — declared as a bare `stringArray`, which rendered as a raw "type the mchar-id string, press Enter" chip input with no picker, no name resolution, and no discoverability.

The backend renderer already resolves `held_by` ids to cast names (`getCastTitle(mchar-1)` → "Ane Arrieta") and emits a `Held by:` line whenever `held_by` is non-empty — so once `held_by` carries ids, holders render by name with no backend change. The defect is purely that the form makes `held_by` hard to populate correctly.

Landed behavior: "Held by" is a cast-scoped `RecordPicker` (same UX as "Refs (characters)"), so holders are selected by name and stored as an mchar id array in `held_by`.

`held_by` and `refs.characters` remain semantically distinct and are NOT merged: `refs.characters` records who/what the secret references; `held_by` records who actually holds/knows it (FOUNDATIONS §SF/BEL separation — what-is-true/referenced vs who-holds-it). This ticket only changes how `held_by` is *entered*, not its meaning.

## Assumption Reassessment (2026-06-04)

1. At intake, `web/src/components/recordSchemas.ts` declared the secrets field `{ field: "held_by", label: "Held by (mchar list)", required: true, kind: { kind: "stringArray" } }`. The landed schema declares `held_by` as `{ kind: "recordRefArray", classes: ["cast"] }` with label `Held by`.
2. `held_by` is `required: true` but the stored record persisted `held_by: []` — empty-array entry is currently accepted. Whether to keep `required` is a product decision (item 5); this ticket does not depend on tightening it.
3. The field-kind system in `recordSchemas.ts` had no record-reference/picker kind at intake (kinds: boolean, enum, enumArray, nullableString, number, pair, readonlyString, recordOfStrings, string, stringArray, stringOrNumber). The landed implementation adds `recordRefArray` as a schema-driven field kind rendered by `RecordForm.tsx`.
4. `RecordPicker` (`web/src/components/RecordPicker.tsx`) is a reusable component taking `classes: readonly ManualRecordClass[]`, `value: string[]`, `onChange: (nextIds) => void` — directly usable for a cast-scoped holder picker.
5. The landed implementation uses approach (a): a reusable `recordRefArray` field kind rendered in `RecordForm.tsx` through `RecordPicker`, with the current use scoped to `held_by`.
6. The web `test` script is `tsc -p tsconfig.json --noEmit` (typecheck only) — there is no runtime web test runner. This run added static source-contract assertions to the existing backend `test/web/record-picker.test.ts` and did not mutate local story data for a browser save smoke.
7. This is the non-canon authoring tool (`No LLM, no MCP, no patch engine`). No FOUNDATIONS enforcement surface, HARD-GATE, validator, or canon-write path is touched.
8. The existing `msecret-1` record's misfiled holder is corrected by the author in the UI after this lands (move Ane into the new "Held by" picker); it is data, not code, and is out of scope.

## Architecture Check

1. Reusing `RecordPicker classes={["cast"]}` keeps "Held by" visually and behaviorally identical to "Refs (characters)", removing the trap where two controls look like the same thing but write different fields.
2. The landed `recordRefArray` kind extends the existing schema-driven form mechanism rather than accreting another hardcoded special case. The public stored shape (`held_by: string[]` of mchar ids) is unchanged.
3. No backend, schema (`src/schema/manual-story.ts`), or persisted-file format change — `held_by` stays a string array of cast ids.

## Verification Layers

1. The secret edit form renders "Held by" as a cast `RecordPicker` (searchable, name-resolving), not a raw id text input → source-contract test + frontend typecheck.
2. Selecting a cast member in "Held by" updates the `held_by` per-class field path, not `refs.characters` → source-contract test over `recordSchemas.ts` and `RecordForm.tsx`; browser save was not exercised in this run.
3. "Refs (characters)" continues to write `refs.characters` and is unaffected → existing source-contract test over the hardcoded refs picker blocks.
4. With `held_by` populated, the rendered prompt shows `Held by: <name>` (relies on existing backend resolution; no backend change) → existing backend renderer behavior; this ticket did not change backend prompt code.
5. Frontend typecheck passes → `npm --prefix web test`.

## Files Touched

- `tools/manual-story-studio/web/src/components/recordSchemas.ts` (modified — added `recordRefArray` and changed `held_by` to a cast-scoped picker field)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modified — defaults and renders `recordRefArray` via `RecordPicker`)
- `tools/manual-story-studio/test/web/record-picker.test.ts` (modified — source-contract regression coverage for `held_by` picker schema/rendering)

## Out of Scope

- The secret prompt summary/details rendering (MANSTOSTUFIX-003).
- Backend, schema, or persisted-format changes to `held_by` (it stays `string[]` of cast ids).
- Migrating the existing `msecret-1` record's holder (author-side data edit after this lands).
- Merging `held_by` with `refs.characters` — they stay semantically distinct.
- Revisiting whether `held_by` should be `required` (note in Assumption Reassessment item 2; separate decision).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web test` (typecheck) passes with the new/changed field kind.
2. The secret edit form's source contract renders "Held by" as a cast-scoped picker; selecting a cast member flows through the `held_by` per-class field path. Covered by `tools/manual-story-studio/test/web/record-picker.test.ts`; live browser save was not exercised.
3. "Refs (characters)" behavior is unchanged (still writes `refs.characters`). Covered by the existing refs picker source-contract assertions in `tools/manual-story-studio/test/web/record-picker.test.ts`.

### Invariants

1. `held_by` persists as an array of cast (`mchar-*`) ids; the stored file shape is unchanged.
2. `held_by` and `refs.characters` remain independent fields with independent values.

## Test Plan

### New/Modified Tests

1. Frontend typecheck (`tsc --noEmit`) covers the type-level change; no runtime web test runner exists in this package.
2. `tools/manual-story-studio/test/web/record-picker.test.ts` covers the schema/rendering source contract: `held_by` is `recordRefArray` with `classes: ["cast"]`, `RecordForm` renders `recordRefArray` through `RecordPicker`, ordinary `stringArray` fields still use `ChipInput`, and refs pickers remain separate.
3. Manual browser save and prompt-preview verification were not exercised in this run to avoid mutating local story data.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test`
2. `cd tools/manual-story-studio && npm test`
3. The full `npm test` is run once as a regression gate (it builds the backend and runs the web typecheck); the targeted `npm --prefix web test` is the inner-loop check for this frontend-only change.

## Outcome

Completed: 2026-06-04

`tools/manual-story-studio/web/src/components/recordSchemas.ts` now supports a schema-driven `recordRefArray` field kind and declares `secrets.held_by` as a cast-scoped `RecordPicker` field labelled `Held by`.

`tools/manual-story-studio/web/src/components/RecordForm.tsx` now defaults `recordRefArray` fields to an empty id array and renders them through `RecordPicker` with the schema-provided classes and label. `stringArray` fields still render through `ChipInput`, so raw chip arrays like `forbidden_reveal_tags` are unchanged.

`tools/manual-story-studio/test/web/record-picker.test.ts` now proves the `held_by` schema/rendering contract and keeps the existing refs-picker separation checks.

## Verification Result

1. `cd tools/manual-story-studio && npm --prefix web test` — PASS on 2026-06-04; frontend TypeScript typecheck passed.
2. `cd tools/manual-story-studio && npm test` — PASS on 2026-06-04; backend build passed, 510 backend/runtime tests passed including the updated source-contract test, and `npm --prefix web test` typecheck passed.

## Deviations

- The first `npm test` attempt failed in the new static assertion because the negative regex searched from `held_by` through later secret fields and matched the legitimate `forbidden_reveal_tags` `stringArray`. The assertion was narrowed to the `held_by` schema block, then the full package gate passed.
- Manual browser save / on-disk story mutation / prompt-preview verification was not exercised. The accepted proof for this run is source-contract coverage plus typecheck/package gates; local `worlds/erotica-world/manual-stories/red-bunny` data was left untouched.
- `tools/manual-story-studio/dist/`, `tools/manual-story-studio/node_modules/`, `tools/manual-story-studio/web/dist/`, and `tools/manual-story-studio/web/node_modules/` were pre-existing ignored package artifacts and remained ignored verification artifacts.
