# MSSUX-009: Remove the unused `source_world_character` field from cast records

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio package only (`tools/manual-story-studio`): its frontend form/schema, backend record schema, ref/schema validators, the SourceBrowser import seed, and associated tests. Reverses the readonly-field contract introduced by SPEC-101 §2.4.
**Deps**: None

## Problem

Cast (Manual Character Profile) records carry an optional `source_world_character` field intended to link a story-local cast member back to a world `CHAR-*` record. In the form it renders as a readonly text input (`recordSchemas.ts` field kind `readonlyString`), so on the "New" cast path it appears as a permanently-empty, un-fillable box labelled "Source world character (CHAR-*)" that confuses authors — it looks required and broken but is neither.

Investigation shows the field is **vestigial provenance metadata with no functional consumer**:

- It is optional, not required (`recordSchemas.ts:69`, backend `validate/schema.ts:260`).
- Nothing reads it: a grep across prompt assembly / manuscript / all `tools/manual-story-studio/src` finds zero consumers.
- The ref validator explicitly skips it — `validate/refs.ts:189`: *"source_world_character on cast records is informational only. The validator explicitly does NOT inspect it."*
- It is written by exactly one flow, `SourceBrowser.tsx:89` (`source_world_character: sourceItem.path`), during world-source import — and that write stores a *path* into a field whose schema pattern is `/^CHAR-[0-9]+$/`, a latent mismatch that this removal moots.

Per the decision on this ticket, the field is removed entirely. This aligns with FOUNDATIONS §6.1 (world→story character provenance "must not be used as an operational shortcut") and the standalone nature of the Manual Story Studio — its `manual-story` bundles are not story-bundle records, so a dead world-`CHAR` pointer is non-load-bearing surface.

## Assumption Reassessment (2026-06-03)

1. Field is consumed by nothing: `grep -rn "source_world_character" tools/manual-story-studio/src` shows only the schema definition (`src/schema/manual-story.ts:290`), the validator optional/pattern entries (`src/validate/schema.ts:260,265`), and the explicit no-op skip branch (`src/validate/refs.ts:189`). No prompt-assembly, manuscript, or display reader exists.
2. SPEC-101 §2.4 deliberately specced this field with a read-only contract (referenced in `test/capstone-spec101.test.ts:32` and `:501`). This ticket reverses that committed design at the user's explicit direction; the reversal is recorded here so the spec history stays reconcilable.
3. Cross-artifact boundary under audit: the frontend `recordSchemas.ts` `PER_CLASS_FIELDS.cast` is documented as a mirror of the backend `MANUAL_RECORD_SCHEMAS`. Both sides plus the `ManualCharacterProfile` TS type and the `CastFormState` form state must be removed together to keep the mirror consistent.
4. FOUNDATIONS principle motivating removal: §6.1 (story-local character authority) holds `CHAR` provenance must be non-operational; nothing here uses it operationally, so removal does not weaken any canon or provenance guarantee.
5. Schema-removal blast radius (broad-scope grep `grep -rln "source_world_character" tools/manual-story-studio --include=*.ts --include=*.tsx | grep -v /dist/`), 9 non-dist files:
   - `src/schema/manual-story.ts` (type field, line ~290)
   - `src/validate/schema.ts` (optional list line ~260, pattern map line ~265)
   - `src/validate/refs.ts` (skip-rule comment + no-op branch, line ~189)
   - `web/src/components/recordSchemas.ts` (field def, line ~67)
   - `web/src/components/RecordForm.tsx` (`CastFormState.source_world_character`, line ~268)
   - `web/src/pages/SourceBrowser.tsx` (`buildCastSeed` write, line ~89)
   - `test/validate/schema.test.ts` (pattern-accept / pattern-reject / absence tests, lines ~369–381)
   - `test/validate/refs.test.ts` (not-inspected test, line ~347)
   - `test/capstone-spec101.test.ts` (read-only-contract assertions, lines ~32, ~501, ~507)
   The pipeline-wide grep (`.claude/skills/`, `docs/`, `specs/`, other `tools/` packages) shows no external consumers of this field name; only `specs/SPEC-101-*.md` documents it (spec is historical and not edited by this ticket — note the reversal in the spec only if the team's process requires it; out of scope here).
6. Adjacent contradiction classification: the `SourceBrowser.tsx:89` path-vs-`CHAR-*` pattern mismatch is a required consequence of this removal (the write is deleted), not a separate bug to file.

## Architecture Check

1. Full removal is cleaner than keep-but-hide: the field has zero readers, so retaining it (even hidden) preserves dead schema surface, the latent SourceBrowser path/pattern mismatch, and author confusion risk. Removing it deletes the symptom and its cause.
2. No backwards-compatibility shim/alias: the field is dropped from schema, type, validator, form, and import seed in one pass; no deprecation stub is left behind.

## Verification Layers

1. Field absent from frontend → `grep -rn "source_world_character" tools/manual-story-studio/web/src` returns nothing.
2. Field absent from backend schema + validators → `grep -rn "source_world_character" tools/manual-story-studio/src` returns nothing.
3. No stale tests reference the field → `grep -rn "source_world_character" tools/manual-story-studio/test` returns nothing; removed/rewritten test files still pass.
4. Cast records still validate and round-trip without the field → backend validator + capstone tests pass.

## What to Change

### 1. Backend schema + validators

- `src/schema/manual-story.ts`: remove the `source_world_character?: string;` member from the cast/Manual Character Profile type (line ~290).
- `src/validate/schema.ts`: remove `"source_world_character"` from the cast `optional` list (line ~260) and its entry from the `pattern` map (line ~265).
- `src/validate/refs.ts`: remove the explicit skip-rule comment and the no-op `if (recordClass === "cast")` branch (lines ~188–194); if removing the branch leaves no other cast handling, delete it cleanly.

### 2. Frontend form + schema mirror

- `web/src/components/recordSchemas.ts`: remove the `source_world_character` `FieldDef` from `PER_CLASS_FIELDS.cast` (lines ~66–71).
- `web/src/components/RecordForm.tsx`: remove `source_world_character?: string;` from `CastFormState` (line ~268). Confirm no other reference to it remains in the form.

### 3. SourceBrowser import seed

- `web/src/pages/SourceBrowser.tsx`: in `buildCastSeed`, remove the `source_world_character: sourceItem.path` line (line ~89). The cast seed keeps `title` and `baseRecordSeed` output.

### 4. Tests

- `test/validate/schema.test.ts`: remove the three `source_world_character` cases (pattern accepted / rejects STCHAR / absence accepted), lines ~369–381.
- `test/validate/refs.test.ts`: remove the "not inspected by the validator" test (line ~347).
- `test/capstone-spec101.test.ts`: remove or rewrite the `source_world_character` read-only-contract assertions (lines ~32 docstring, ~501, ~507) so the capstone no longer asserts a field that no longer exists.

## Files to Touch

- `tools/manual-story-studio/src/schema/manual-story.ts` (modify)
- `tools/manual-story-studio/src/validate/schema.ts` (modify)
- `tools/manual-story-studio/src/validate/refs.ts` (modify)
- `tools/manual-story-studio/web/src/components/recordSchemas.ts` (modify)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` (modify)
- `tools/manual-story-studio/test/validate/schema.test.ts` (modify)
- `tools/manual-story-studio/test/validate/refs.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec101.test.ts` (modify)

## Out of Scope

- Editing `specs/SPEC-101-manual-story-metadata-and-records.md` (historical spec; reversal is documented in this ticket).
- The RecordPicker popup-dismissal fix (separate ticket MSSUX-008).
- Any data migration of existing saved cast records that already carry `source_world_character` — the field becomes ignored/unknown; since nothing reads it, no migration is required (existing files retain the key harmlessly unless re-saved).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "source_world_character" tools/manual-story-studio --include=*.ts --include=*.tsx | grep -v /dist/` returns no matches (broad-scope completeness sweep).
2. `npm --prefix tools/manual-story-studio test` passes (backend `node --test` over `dist/test/**` + web tests) with the removed cases gone and no remaining references.
3. The capstone test (`test/capstone-spec101.test.ts`) passes after its `source_world_character` assertions are removed/rewritten.

### Invariants

1. The cast record schema (frontend `recordSchemas.ts` and backend `MANUAL_RECORD_SCHEMAS`) contains no `source_world_character` field, and the two remain mirrors of each other.
2. Creating a cast member (both via "New" in `RecordForm` and via `SourceBrowser` import) succeeds and validates without the field.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/validate/schema.test.ts` — remove the three `source_world_character` pattern/absence cases.
2. `tools/manual-story-studio/test/validate/refs.test.ts` — remove the "not inspected" case.
3. `tools/manual-story-studio/test/capstone-spec101.test.ts` — remove/rewrite the read-only-contract assertions so the capstone reflects the field's removal.

### Commands

1. `grep -rn "source_world_character" tools/manual-story-studio --include=*.ts --include=*.tsx | grep -v /dist/` — completeness sweep; must be empty.
2. `npm --prefix tools/manual-story-studio run build && npm --prefix tools/manual-story-studio test` — build (web + `tsc` backend) then full suite; the unified package test is the correct boundary since removal spans backend schema/validators and frontend form together.
