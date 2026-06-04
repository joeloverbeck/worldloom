# MSSUX-009: Remove the unused `source_world_character` field from cast records

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio package only (`tools/manual-story-studio`): its frontend form/schema, backend record schema, ref/schema validators, package README, the SourceBrowser import seed, and associated tests. Reverses the readonly-field contract introduced by SPEC-101 §2.4.
**Deps**: None

## Problem

At intake, Cast (Manual Character Profile) records carried an optional `source_world_character` field intended to link a story-local cast member back to a world `CHAR-*` record. In the form it rendered as a readonly text input (`recordSchemas.ts` field kind `readonlyString`), so on the "New" cast path it appeared as a permanently-empty, un-fillable box labelled "Source world character (CHAR-*)" that confused authors — it looked required and broken but was neither.

Investigation showed the field was **vestigial provenance metadata with no functional consumer**:

- It was optional, not required.
- Nothing read it: a grep across prompt assembly / manuscript / all `tools/manual-story-studio/src` found zero consumers.
- The ref validator explicitly skipped it.
- It was written by exactly one flow, `SourceBrowser.tsx`, during world-source import — and that write stored a *path* into a field whose schema pattern expected `CHAR-*`, a latent mismatch that this removal moots.

Per the decision on this ticket, the field was removed entirely. This aligns with FOUNDATIONS §6.1 (world-to-story character provenance "must not be used as an operational shortcut") and the standalone nature of the Manual Story Studio — its `manual-story` bundles are not story-bundle records, so a dead world-`CHAR` pointer was non-load-bearing surface.

## Assumption Reassessment (2026-06-03)

1. At intake, the field was consumed by nothing: `grep -rn "source_world_character" tools/manual-story-studio/src` showed only the schema definition, the validator optional/pattern entries, and the explicit no-op skip branch. No prompt-assembly, manuscript, or display reader existed.
2. SPEC-101 §2.4 deliberately specced this field with a read-only contract, and the capstone referenced that contract before this ticket removed it. This ticket reverses that committed design at the user's explicit direction; the reversal is recorded here so the spec history stays reconcilable.
3. Cross-artifact boundary under audit: the frontend `recordSchemas.ts` `PER_CLASS_FIELDS.cast` is documented as a mirror of the backend `MANUAL_RECORD_SCHEMAS`. Both sides plus the `ManualCharacterProfile` TS type and the `CastFormState` form state must be removed together to keep the mirror consistent.
4. FOUNDATIONS principle motivating removal: §6.1 (story-local character authority) holds `CHAR` provenance must be non-operational; nothing here uses it operationally, so removal does not weaken any canon or provenance guarantee.
5. Intake schema-removal blast radius found 9 non-dist code/test files:
   - `src/schema/manual-story.ts` (type field)
   - `src/validate/schema.ts` (optional list and pattern map)
   - `src/validate/refs.ts` (skip-rule comment and no-op branch)
   - `web/src/components/recordSchemas.ts` (field definition)
   - `web/src/components/RecordForm.tsx` (`CastFormState` field)
   - `web/src/pages/SourceBrowser.tsx` (`buildCastSeed` write)
   - `test/validate/schema.test.ts` (pattern-accept / pattern-reject / absence tests)
   - `test/validate/refs.test.ts` (not-inspected test)
   - `test/capstone-spec101.test.ts` (read-only-contract assertions)
   The pipeline-wide grep (`.claude/skills/`, `docs/`, `specs/`, other `tools/` packages) shows no external consumers of this field name; only `specs/SPEC-101-*.md` documents it (spec is historical and not edited by this ticket — note the reversal in the spec only if the team's process requires it; out of scope here).
6. Adjacent contradiction classification: the `SourceBrowser.tsx:89` path-vs-`CHAR-*` pattern mismatch is a required consequence of this removal (the write is deleted), not a separate bug to file.
7. Same-seam package docs fallout: current package docs at `tools/manual-story-studio/README.md` still documented the field as informational provenance skipped by the ref validator. This was not historical spec prose; it was current package contract prose, so this ticket removed that current README reference as part of closeout.

## Architecture Check

1. Full removal is cleaner than keep-but-hide: the field has zero readers, so retaining it (even hidden) preserves dead schema surface, the latent SourceBrowser path/pattern mismatch, and author confusion risk. Removing it deletes the symptom and its cause.
2. No backwards-compatibility shim/alias: the field is dropped from schema, type, validator, form, and import seed in one pass; no deprecation stub is left behind.

## Verification Layers

1. Field absent from frontend -> non-dist `rg -n "source_world_character" tools/manual-story-studio` returns no current package matches.
2. Field absent from backend schema + validators -> same non-dist grep-proof plus TypeScript build.
3. No stale tests reference the field -> same non-dist grep-proof plus removed/rewritten test files passing.
4. Cast records still validate and round-trip without the field -> backend validator + capstone tests pass.

## Landed Changes

### 1. Backend schema + validators

- `src/schema/manual-story.ts`: removed the `source_world_character?: string;` member from the cast/Manual Character Profile type.
- `src/validate/schema.ts`: removed `"source_world_character"` from the cast `optional` list and removed its pattern-map entry.
- `src/validate/refs.ts`: removed the explicit skip-rule comment and no-op cast branch.

### 2. Frontend form + schema mirror

- `web/src/components/recordSchemas.ts`: removed the `source_world_character` `FieldDef` from `PER_CLASS_FIELDS.cast`.
- `web/src/components/RecordForm.tsx`: removed `source_world_character?: string;` from `CastFormState`.

### 3. SourceBrowser import seed

- `web/src/pages/SourceBrowser.tsx`: in `buildCastSeed`, removed the `source_world_character: sourceItem.path` line. The cast seed keeps `title` and `baseRecordSeed` output.

### 4. Tests

- `test/validate/schema.test.ts`: removed the three `source_world_character` cases (pattern accepted / rejects STCHAR / absence accepted).
- `test/validate/refs.test.ts`: removed the "not inspected by the validator" test.
- `test/capstone-spec101.test.ts`: removed the `source_world_character` read-only-contract assertions so the capstone no longer asserts a field that no longer exists.

### 5. Package docs

- `tools/manual-story-studio/README.md`: removed the current package-doc claim that cast records carry `source_world_character` provenance ignored by the ref validator.

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
- `tools/manual-story-studio/README.md` (modify)

## Out of Scope

- Editing `specs/SPEC-101-manual-story-metadata-and-records.md` (historical spec; reversal is documented in this ticket).
- The RecordPicker popup-dismissal fix (completed separately in `archive/tickets/MSSUX-008-record-picker-popup-dismissal.md`).
- Any data migration of existing saved cast records that already carry `source_world_character` — since nothing reads it and new SourceBrowser saves no longer emit it, cleanup of older local files is outside this ticket. Such files should drop the unknown key when edited or migrated later.

## Acceptance Criteria

### Tests That Must Pass

1. Non-dist `rg -n "source_world_character" tools/manual-story-studio --glob '!dist/**' --glob '!web/dist/**' --glob '!node_modules/**' --glob '!web/node_modules/**'` returns no matches.
2. `npm test` from `tools/manual-story-studio/` passes (backend `node --test` over `dist/test/**` + web tests) with the removed cases gone and no remaining references.
3. The capstone test (`test/capstone-spec101.test.ts`) passes after its `source_world_character` assertions are removed.

### Invariants

1. The cast record schema (frontend `recordSchemas.ts` and backend `MANUAL_RECORD_SCHEMAS`) contains no `source_world_character` field, and the two remain mirrors of each other.
2. Creating a cast member (both via "New" in `RecordForm` and via `SourceBrowser` import) succeeds and validates without the field.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/validate/schema.test.ts` — removed the three `source_world_character` pattern/absence cases.
2. `tools/manual-story-studio/test/validate/refs.test.ts` — removed the "not inspected" case.
3. `tools/manual-story-studio/test/capstone-spec101.test.ts` — removed the read-only-contract assertions so the capstone reflects the field's removal.

### Commands

1. From repo root: `rg -n "source_world_character" tools/manual-story-studio --glob '!dist/**' --glob '!web/dist/**' --glob '!node_modules/**' --glob '!web/node_modules/**'`
2. From `tools/manual-story-studio/`: `npm run build:backend`
3. From `tools/manual-story-studio/`: `node --test dist/test/validate/schema.test.js dist/test/validate/refs.test.js dist/test/capstone-spec101.test.js`
4. From `tools/manual-story-studio/`: `npm test`
5. From `tools/manual-story-studio/`: `npm run build`

## Outcome

Completed 2026-06-03.

The unused `source_world_character` field was removed from the Manual Story Studio cast record type, backend schema validator, ref-validator skip prose, frontend cast form schema/state, SourceBrowser cast import seed, affected validation/capstone tests, and current package README. Cast records now validate and create without this world-character provenance field, and the SourceBrowser no longer seeds a path into a removed `CHAR-*` field.

No data migration was added. Existing saved local records that still contain the key remain outside this ticket's migration scope.

## Verification Result

Passed:

1. `rg -n "source_world_character" tools/manual-story-studio --glob '!dist/**' --glob '!web/dist/**' --glob '!node_modules/**' --glob '!web/node_modules/**'` from repo root — no matches.
2. `npm run build:backend` from `tools/manual-story-studio/`.
3. `node --test dist/test/validate/schema.test.js dist/test/validate/refs.test.js dist/test/capstone-spec101.test.js` from `tools/manual-story-studio/` — 37 affected tests passed.
4. `npm test` from `tools/manual-story-studio/` — 496 backend/static tests passed, followed by the web TypeScript test gate.
5. `npm run build` from `tools/manual-story-studio/` — web install check, Vite build, and backend TypeScript build passed.

## Deviations

The landed file set includes `tools/manual-story-studio/README.md`, which was not listed in the drafted Files to Touch. Reassessment found a current package-doc reference to the removed field; leaving it stale would contradict the package contract, so it was included as same-seam cleanup.
