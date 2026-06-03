# SPEC124MANSTOSTU-001: Narrow Source Browser creation to Cast + Fact

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies the `tools/manual-story-studio` web frontend (`SourceBrowser.tsx`); no LLM/MCP/patch-engine; no backend change; world canon read-only.
**Deps**: None

## Problem

The Source Browser currently offers five source-derived creation classes via a `SOURCE_RECORD_CLASSES` dropdown (`facts`, `beliefs`, `locations`, `objects`, `cast`). Only two have a defensible source→story correlation — world character → story cast, and world canon fact / selected source text → story fact. Offering belief/location/object as default source-derived classes invites the wrong gesture: "create a belief from source" implies the deterministic tool is interpreting what a character believes (a semantic interpretation Manual Studio avoids), and direct source-to-location/object creation lacks the clean correlation cast/fact have. This ticket narrows the primary source-derived set to Cast + Fact, removes Belief from the source-derived flow, routes Location/Object through a generic "selected text as note" advanced action, keeps the literal-copy helpers, and keeps provenance lightweight and deterministic (cast: `source_world_character`; fact: a `notes` backlink). It implements SPEC-124 §2 In-scope items 1–5 as a single coherent rework of the Record Workbench region of `SourceBrowser.tsx`.

## Assumption Reassessment (2026-06-03)

1. Verified against current code: `SOURCE_RECORD_CLASSES = ["facts","beliefs","locations","objects","cast"]` at `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx:17-23`; the workbench class dropdown renders it at `:300`; `buildInitialRecord` (`:54-75`) sets `initial[field] = text` for a `CopyField` of `title|summary|details|notes` (`:25`) and attaches `source_world_character` only for `recordClass === "cast" && sourceItem.kind === "characters"` (`:71-73`). `createRecord` (`web/src/api/records.ts:124`) posts the record as-is — provenance is set client-side, so no backend change is required.
2. Verified against specs/docs: SPEC-124 was reassessed this session (Q1=(a) notes-backlink only, no schema change; Q2=(a) typed note-seed helper enforced by the web typecheck). SPEC-122 (archived) established the prose/state boundary — selected source prose lands in `notes`, never `summary`/`details`/`title`; this ticket applies the same discipline to the generic-note path.
3. Cross-artifact boundary under audit: the `ManualRecord` / `RecordCommonFields` contract (`tools/manual-story-studio/src/schema/manual-story.ts:147-157` — `title`/`summary`/`details`/`notes` are common fields; `source_world_character?: string` exists on `ManualCharacterRecord` (cast) at `:290`; `ManualFactRecord = RecordCommonFields` at `:336`) and the `createRecord` client call. No field is added to this contract — fact provenance uses the existing `notes` field.
4. FOUNDATIONS principle under audit: §Tooling Recommendation (least-agency / no prose-alone distillation). Removing source→belief (a semantic interpretation) and routing copied source text to `notes` only keeps the deterministic tool from distilling world source into interpreted story state; cast/fact carry deterministic provenance links, not inferred content. Restated before trusting the spec narrative: the tool must not infer record content from prose.
5. Rename/removal blast radius (was template item 7): `SOURCE_RECORD_CLASSES` and `buildInitialRecord` are grep-confirmed local to `SourceBrowser.tsx` (definition + single in-file use each; zero consumers across `tools/`, `.claude/skills/`, `docs/`, other `specs/`). Removing/narrowing the construct touches one file. The record classes themselves (`beliefs`/`locations`/`objects`) remain in `MANUAL_RECORD_CLASSES` (`src/schema/manual-story.ts:203-223`) and creatable via the normal manual record UI — only their source-derived creation path is removed.

## Architecture Check

1. An action model keyed to selection type ("character selected → cast", "text selected → fact") is cleaner than a class dropdown: it invites the obviously-correct gesture for what was selected rather than presenting five equally-weighted classes, three of which assert distillation the tool should not perform. The generic "selected text as note" advanced action serves Location/Object (and any other class) without baking a source→class correlation into the primary UI.
2. No backwards-compatibility shims: the 5-class dropdown is removed outright, not demoted or aliased. The typed note-seed helper replaces the free `copyField`-into-any-field path for the generic action; no parallel legacy path is retained.

## Verification Layers

1. No five-class source-derived dropdown remains → codebase grep-proof: `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src` returns no five-class array.
2. Generic-note path writes `notes` only (never `summary`/`details`/`title`) → schema/type validation: the typed note-seed helper's return type permits only `notes`, so a violation fails `npm --prefix web test` (the web typecheck) — this is the type-level enforcement surface in lieu of a frontend test runner (none exists).
3. No schema field added; fact provenance is a `notes` backlink; cast carries existing `source_world_character` → codebase grep-proof: `grep -rn "source_paths" tools/manual-story-studio` returns zero matches post-change.
4. Belief remains creatable via the normal manual record flow (regression) → manual review: the manual record-creation UI still lists `beliefs` in `MANUAL_RECORD_CLASSES`; only the source-derived belief path is removed.

## What to Change

### 1. Replace the 5-class dropdown with two selection-keyed primary actions

Remove `SOURCE_RECORD_CLASSES` (`:17-23`) and the workbench class `<select>` (`~:290-305`). In its place, render two primary actions gated on the selected source item's type:
- **"Create story cast from world character"** — enabled when the selected source item's `kind === "characters"`; seeds a `cast` record carrying `source_world_character: sourceItem.path` (existing behavior in `buildInitialRecord`, now the dedicated cast action).
- **"Create story fact from selected text"** — enabled when canon-fact / source text is selected; seeds a `facts` record carrying a `notes` backlink to the source (source path / citation dropped into `notes`).

### 2. Generic "Create manual record using selected text as note" advanced action

Add a single advanced action that lets the author pick any class (including `locations`/`objects`) and drops the selected text into `notes` only. Route it through a **typed note-seed helper** whose return type permits only `notes` (e.g. a function returning a `Partial<ManualRecord>` narrowed to `{ notes: string }` plus the non-content defaults), so the web typecheck structurally rejects any seed that writes `summary`/`details`/`title`. This replaces the current `copyField`-into-any-field behavior for the generic path.

### 3. Keep literal-copy helpers

Ensure "Copy selected source text" (existing `copySelection`/`copyText`) and "Copy source citation/path" helpers are present (add the copy-path helper if missing). These are already-deterministic, no-distillation helpers.

### 4. Remove Belief / Location / Object as source-derived classes

No "create belief from source" path at all. Location/Object are reachable only through the generic note action in §2, not as default source-derived classes. The record classes remain creatable through the normal manual record UI elsewhere — this ticket removes only their source-derived entry points.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` (modify)

## Out of Scope

- Source-browser scale work (grouping by kind/folder, result snippets, lazy backend re-read) — triage D-scale.
- The full "World Source → Story Seeds" tabbed redesign (report §34 Characters / Canon-facts / Search-all tabs) and the §34 advanced action "Link source path to existing record" — deferred (D-cockpit).
- Any change to the read-only world-source read layer (enumeration/reading is unchanged).
- Schema changes — no new field; `source_paths` is verified absent and is NOT added; fact provenance uses the existing `notes` field. `source_world_character` already exists on the cast record.
- Backend / `createRecord` client changes — provenance is set client-side; the backend persists the record as-is.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src` returns no five-class array (construct removed or reduced to the two primary actions).
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
3. `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src` and `grep -rn "source_paths" tools/manual-story-studio` (removal grep-proofs — the narrower verification boundary for the structural narrowing, since the behavior is frontend-only)
