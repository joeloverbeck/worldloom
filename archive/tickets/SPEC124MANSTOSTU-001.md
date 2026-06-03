# SPEC124MANSTOSTU-001: Narrow Source Browser creation to Cast + Fact

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modified the `tools/manual-story-studio` web frontend (`SourceBrowser.tsx`) and same-seam spec/status prose; no LLM/MCP/patch-engine; no backend change; world canon read-only.
**Deps**: None

## Problem

At intake, the Source Browser offered five source-derived creation classes via a `SOURCE_RECORD_CLASSES` dropdown (`facts`, `beliefs`, `locations`, `objects`, `cast`). Only two had a defensible source→story correlation — world character → story cast, and world canon fact / selected source text → story fact. Offering belief/location/object as default source-derived classes invited the wrong gesture: "create a belief from source" implied the deterministic tool was interpreting what a character believes (a semantic interpretation Manual Studio avoids), and direct source-to-location/object creation lacked the clean correlation cast/fact have. This ticket narrowed the primary source-derived set to Cast + Fact, removed Belief from the source-derived flow, routed Location/Object through a generic "selected text as note" advanced action, kept literal-copy helpers, and kept provenance lightweight and deterministic (cast: `source_world_character`; fact: a `notes` backlink). It implemented SPEC-124 §2 In-scope items 1–5 as a single coherent rework of the Record Workbench region of `SourceBrowser.tsx`.

## Assumption Reassessment (2026-06-03)

1. At intake, verified against then-current code: `SOURCE_RECORD_CLASSES = ["facts","beliefs","locations","objects","cast"]` in `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx`; the workbench class dropdown rendered it; `buildInitialRecord` set `initial[field] = text` for a `CopyField` of `title|summary|details|notes` and attached `source_world_character` only for `recordClass === "cast" && sourceItem.kind === "characters"`. `createRecord` (`web/src/api/records.ts`) posted the record as-is, so provenance remained client-side and no backend change was required. The final implementation removed `SOURCE_RECORD_CLASSES`, `CopyField`, and `buildInitialRecord`.
2. Verified against specs/docs: SPEC-124 was reassessed this session (Q1=(a) notes-backlink only, no schema change; Q2=(a) typed note-seed helper enforced by the web typecheck). SPEC-122 (archived) established the prose/state boundary — selected source prose lands in `notes`, never `summary`/`details`/`title`; this ticket applies the same discipline to the generic-note path.
3. Cross-artifact boundary under audit: the `ManualRecord` / `RecordCommonFields` contract (`tools/manual-story-studio/src/schema/manual-story.ts:147-157` — `title`/`summary`/`details`/`notes` are common fields; `source_world_character?: string` exists on `ManualCharacterRecord` (cast) at `:290`; `ManualFactRecord = RecordCommonFields` at `:336`) and the `createRecord` client call. No field is added to this contract — fact provenance uses the existing `notes` field.
4. FOUNDATIONS principle under audit: §Tooling Recommendation (least-agency / no prose-alone distillation). Removing source→belief (a semantic interpretation) and routing copied source text to `notes` only keeps the deterministic tool from distilling world source into interpreted story state; cast/fact carry deterministic provenance links, not inferred content. Restated before trusting the spec narrative: the tool must not infer record content from prose.
5. Rename/removal blast radius at intake (was template item 7): `SOURCE_RECORD_CLASSES` and `buildInitialRecord` were grep-confirmed local to `SourceBrowser.tsx` (definition + single in-file use each; zero consumers across `tools/`, `.claude/skills/`, `docs/`, other `specs/`). Removing/narrowing the construct touched one source file. The record classes themselves (`beliefs`/`locations`/`objects`) remain in `MANUAL_RECORD_CLASSES` and creatable via the normal manual record UI — only their source-derived creation path was removed.
6. Final implementation tightened one drafted ambiguity: the advanced note path excludes `beliefs` to preserve the stronger invariant "No source-derived path creates a belief"; it also excludes `beat-templates` because the generic `RecordForm` is not the beat-template editor. `locations` and `objects` remain reachable through the advanced note action.
7. Same-seam spec/status prose was truthed after implementation: `archive/specs/SPEC-124-manual-story-studio-source-browser-narrowing.md` records a dated implementation note, and `archive/specs/IMPLEMENTATION-ORDER-2026-06-03-2.md` marks SPEC-124 and the fifth-iteration batch completed.

## Architecture Check

1. An action model keyed to selection type ("character selected → cast", "text selected → fact") is cleaner than a class dropdown: it invites the obviously-correct gesture for what was selected rather than presenting five equally-weighted classes, three of which assert distillation the tool should not perform. The generic "selected text as note" advanced action serves Location/Object (and any other class) without baking a source→class correlation into the primary UI.
2. No backwards-compatibility shims: the 5-class dropdown is removed outright, not demoted or aliased. The typed note-seed helper replaces the free `copyField`-into-any-field path for the generic action; no parallel legacy path is retained.

## Verification Layers

1. No five-class source-derived dropdown remains → codebase grep-proof: `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` returns no matches.
2. Generic-note path writes `notes` only (never `summary`/`details`/`title`) → schema/type validation: the typed note-seed helper's return type permits only `notes`, so a violation fails `npm --prefix web test` (the web typecheck) — this is the type-level enforcement surface in lieu of a frontend test runner (none exists).
3. No schema field added; fact provenance is a `notes` backlink; cast carries existing `source_world_character` → codebase grep-proof: `grep -rn "source_paths" tools/manual-story-studio` returns zero matches post-change.
4. Belief remains creatable via the normal manual record flow (regression) → manual review: the manual record-creation UI still lists `beliefs` in `MANUAL_RECORD_CLASSES`; only the source-derived belief path is removed.

## Landed Changes

### 1. Replaced the 5-class dropdown with two selection-keyed primary actions

Removed `SOURCE_RECORD_CLASSES` and the workbench class `<select>`. In its place, `SourceBrowser.tsx` renders two primary actions:
- **"Create story cast from world character"** — enabled only when the selected source item's `kind === "characters"`; seeds a `cast` record carrying `source_world_character: sourceItem.path`.
- **"Create story fact from selected text"** — seeds a `facts` record carrying a `notes` backlink to the source path and selected/full source text.

### 2. Generic "Create manual record using selected text as note" advanced action

Added a single advanced action that lets the author pick a normal `RecordForm` class except `beliefs` and `beat-templates`; this includes `locations` and `objects`. The action drops selected/full source text into `notes` only through `buildNoteSeed`, whose `NoteOnlySeed` return type permits only `notes` plus non-content defaults, so the web typecheck structurally rejects seeding `summary`/`details`/`title`.

### 3. Keep literal-copy helpers

Kept deterministic literal-copy helpers as clipboard actions: "Copy selected source text" and "Copy source path".

### 4. Remove Belief / Location / Object as source-derived classes

There is no "create belief from source" path. Location/Object are reachable only through the generic note action in §2, not as default source-derived classes. The record classes remain creatable through the normal manual record UI elsewhere — this ticket removed only their source-derived entry points.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` (modify)
- `archive/specs/SPEC-124-manual-story-studio-source-browser-narrowing.md` (modify — implementation note)
- `archive/specs/IMPLEMENTATION-ORDER-2026-06-03-2.md` (modify — SPEC-124 completion status)

## Out of Scope

- Source-browser scale work (grouping by kind/folder, result snippets, lazy backend re-read) — triage D-scale.
- The full "World Source → Story Seeds" tabbed redesign (report §34 Characters / Canon-facts / Search-all tabs) and the §34 advanced action "Link source path to existing record" — deferred (D-cockpit).
- Any change to the read-only world-source read layer (enumeration/reading is unchanged).
- Schema changes — no new field; `source_paths` is verified absent and is NOT added; fact provenance uses the existing `notes` field. `source_world_character` already exists on the cast record.
- Backend / `createRecord` client changes — provenance is set client-side; the backend persists the record as-is.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` returns no matches (construct removed).
2. `grep -rn "source_paths" tools/manual-story-studio` returns zero matches (no schema field added).
3. `cd tools/manual-story-studio && npm --prefix web test` passes (web typecheck green, including the typed note-seed helper's notes-only constraint); `npm run test:backend` passes; full `npm test` green.

### Invariants

1. The generic-note path can write only `notes` — never `summary`/`details`/`title` — enforced at the type level (web typecheck), since no frontend test runner exists.
2. No source-derived path creates a belief; beliefs remain creatable via the normal manual record-creation flow (the manual belief path is untouched).
3. Cast provenance uses the existing `source_world_character` field; fact provenance is a `notes` backlink; no record schema field is added.

## Test Plan

### New/Modified Tests

1. `None — no frontend test runner exists (web `test` = `tsc -p tsconfig.json --noEmit`; zero `web/**/*.test.*` files). The notes-only guarantee is enforced at the type level via the typed note-seed helper (caught by the web typecheck). Existing backend tests (`tools/manual-story-studio/test/read/world-source.test.ts`, `test/server/world-source-readonly.test.ts`) cover the read-only source layer this ticket does not change.`

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck — the type-level proof surface for the notes-only constraint)
2. `cd tools/manual-story-studio && npm run test:backend && npm test` (backend regression + full suite)
3. `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` and `grep -rn "source_paths" tools/manual-story-studio` (removal grep-proofs — the narrower verification boundary for the structural narrowing, since the behavior is frontend-only)

## Outcome

Completed. `SourceBrowser.tsx` now has two primary source-derived creation actions (cast from character, fact from source text), an advanced note-only record action for non-belief `RecordForm` classes, and clipboard helpers for selected text and source path. The old copy-field selector and five-class source-derived dropdown are gone. Fact provenance uses `notes`; cast provenance uses existing `source_world_character`; no schema/backend/world-canon changes were made.

Same-seam prose was also truthed with an implementation note in `archive/specs/SPEC-124-manual-story-studio-source-browser-narrowing.md` and completed status in `archive/specs/IMPLEMENTATION-ORDER-2026-06-03-2.md`.

## Verification Result

1. Baseline before source edits: `cd tools/manual-story-studio && npm --prefix web test` passed.
2. Baseline before source edits: `cd tools/manual-story-studio && npm run test:backend` passed, 87/87 compiled backend test files passing.
3. Baseline before source edits: `cd tools/manual-story-studio && npm test` passed, 490/490 tests passing plus web typecheck.
4. Final post-change: `cd tools/manual-story-studio && npm --prefix web test` passed after the UI change and again after tightening the seed helper type.
5. Final post-change: `cd tools/manual-story-studio && npm run test:backend` passed, 87/87 compiled backend test files passing.
6. Final post-change: `cd tools/manual-story-studio && npm test` passed, 490/490 tests passing plus web typecheck.
7. Post-change grep proof: `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` returned no matches, as expected.
8. Post-change grep proof: `grep -rn "source_paths" tools/manual-story-studio` returned no matches, as expected.
9. Manual review: `MANUAL_RECORD_CLASSES` remains intact in the normal records UI, including `beliefs`; the Source Browser advanced note action filters out `beliefs` and `beat-templates`.

## Deviations

1. The drafted generic advanced action said "any class"; implementation excludes `beliefs` to preserve the ticket's stricter invariant that no source-derived path creates a belief, and excludes `beat-templates` because `RecordForm` is not the beat-template editor. This is a same-seam narrowing, not a schema or backend change.
