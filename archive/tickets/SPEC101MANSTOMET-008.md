# SPEC101MANSTOMET-008: Frontend API client + record form components

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/api/records.ts` and three reusable components (`RecordForm`, `RecordCard`, `RefList`).
**Deps**: SPEC101MANSTOMET-007

## Problem

The Records, Cast & Profiles, and Dashboard pages (SPEC101MANSTOMET-009/010) all consume the same CRUD + metadata endpoints from SPEC101MANSTOMET-007. Each page would otherwise re-implement HTTP fetch logic with its own error-handling shape, and each page would re-implement record-rendering (cards in a grid, form fields per class, refs renderer). The typed API client centralizes fetch + error-shape mapping; the three reusable components (RecordForm + RecordCard + RefList) centralize record rendering. SPEC-101 §4 names all four new frontend modules; without this ticket, SPEC101MANSTOMET-009 and 010 would duplicate the same plumbing twice.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/web/src/` exists with `App.tsx`, `main.tsx`, and `pages/` (Worlds, ManualStories, CreateManualStory from SPEC-100, verified via `ls tools/manual-story-studio/web/src/`). This ticket adds `api/` and `components/` directories. The `web/` package uses Vite + React + TypeScript per SPEC-100's scaffolding.
2. SPEC-101 §4 Files to touch lists all four new modules: *"`tools/manual-story-studio/web/src/components/RecordForm.tsx` — class-aware YAML-backed form (renders enum fields as selects, string arrays as chip inputs, etc.). `RecordCard.tsx` — compact record summary card. `RefList.tsx` — refs.* renderer with click-through. `api/records.ts` — typed client for CRUD routes."* The component contracts mirror the SPEC-101 §2.7 Records-screen UI (three-pane layout: left rail navigation, center card grid, right form).
3. Cross-artifact boundary under audit: the API client is typed against the response shapes from SPEC101MANSTOMET-007 routes (`{ records: ManualRecordSummary[] }`, `{ record: ManualRecord }`, `{ outcome: ..., ... }`, `{ metadata: ManualStoryMetadata }`); the components are typed against `ManualRecord` / `ManualRecordSummary` / `ManualCharacterProfile` from the schema types module (SPEC101MANSTOMET-001). The web/ TS surface independently imports the schema types because backend and frontend share the same shape contract — duplication of the types in web/ is a separate ticket if shared-types lift is wanted (not in scope for SPEC-101; tracked as M6 deferral if surfaced).

## Architecture Check

1. A single API-client module (vs. one per endpoint or one per page) is cleaner: error-shape mapping (`validation_failed` / `broken_refs` / `not_found`) lives in one place; pages and components consume typed return values. The three reusable components are scoped to record rendering — each has a narrow single-page-agnostic API.
2. No backwards-compatibility shims. SPEC-100's frontend covered world + manual-story enumeration only; this ticket is the first record-rendering surface in the web package.

## Verification Layers

1. API client exposes a typed function per SPEC-101 §2.6 endpoint → codebase grep-proof.
2. Error shapes (`validation_failed`, `broken_refs`, `not_found`) map to typed client return values → component tests asserting the rendered error message for each shape.
3. RecordForm renders enum fields as `<select>` (closed enums from SPEC101MANSTOMET-001) and string-array fields as chip inputs → component render tests.
4. RefList renders refs as clickable per-ID links → component test asserting the click handler is wired.

## What to Change

### 1. Create `tools/manual-story-studio/web/src/api/records.ts`

Module exports typed async functions (one per SPEC101MANSTOMET-007 endpoint):

- **`listRecords(worldSlug, msSlug, recordClass): Promise<ManualRecordSummary[]>`**
- **`readRecord<T extends ManualRecord>(worldSlug, msSlug, recordClass, id): Promise<T | null>`**
- **`createRecord<T extends ManualRecord>(worldSlug, msSlug, recordClass, body, opts?: { overrideBrokenRefs?: boolean }): Promise<CreateResult<T>>`** where `CreateResult` is a discriminated union `{ ok: true; id; record } | { ok: false; error: "validation_failed" | "broken_refs"; errors?; violations?; needsOverride?: boolean }`.
- **`updateRecord<T>(worldSlug, msSlug, recordClass, id, body, opts?): Promise<UpdateResult<T>>`** — same shape.
- **`deleteRecord(worldSlug, msSlug, recordClass, id, opts?: { force?: boolean }): Promise<DeleteResult>`** where `DeleteResult` is `{ outcome: "hard_deleted"; id } | { outcome: "inactive_default"; id; retiredReason; referrers } | { outcome: "force_deleted"; id; auditEntry }`.
- **`readMetadata(worldSlug, msSlug): Promise<ManualStoryMetadata | null>`**
- **`updateMetadata(worldSlug, msSlug, metadata): Promise<MetadataUpdateResult>`** where `MetadataUpdateResult` is `{ ok: true } | { ok: false; error: "validation_failed"; errors }`.

Each function uses the browser `fetch` API, sets `Content-Type: application/json` for write methods, parses JSON responses, and maps HTTP status codes to the typed return shape.

### 2. Create `tools/manual-story-studio/web/src/components/RecordCard.tsx`

Props: `{ summary: ManualRecordSummary; onOpen: (id: string) => void }`. Renders:
- Title (large)
- Importance badge (color-coded: low / medium / high / central)
- Active/archived indicator
- Tag chips
- Short summary preview
- Click → `onOpen(summary.id)`

### 3. Create `tools/manual-story-studio/web/src/components/RecordForm.tsx`

Props: `{ recordClass: ManualRecordClass; initial?: Partial<ManualRecord>; onSave: (record: ManualRecord, opts?: { overrideBrokenRefs?: boolean }) => void; onCancel: () => void; saveError?: CreateResult<ManualRecord> }`.

Renders the class-aware form:
- Common fields editor (title, importance select, tags chip input, summary textarea, details textarea, refs.characters/locations multi-select, prompt_visibility select, last_reviewed_after_segment input, notes textarea)
- Per-class additions editor (driven by `MANUAL_RECORD_SCHEMAS` from SPEC101MANSTOMET-002 → each enum becomes `<select>`, each string array becomes chip input, each scalar field becomes typed input)
- Manual Character Profile special case (when `recordClass === "cast"`): renders the §3 nested sections (identity / world_pressure_core / body_and_presence / voice / pressure_behavior / perception_and_embodiment / agency_and_planning / relationship_behavior / prose_constraints) as collapsible sub-sections; `source_world_character: CHAR-*` field is rendered READ-ONLY (display only; not editable in form per SPEC-101 §7 AC #6)
- When `saveError?.error === "broken_refs"`, render the broken-refs list with a "Save anyway?" button that calls `onSave(record, { overrideBrokenRefs: true })` per SPEC-101 §2.4
- When `saveError?.error === "validation_failed"`, render the field-level error messages inline near the offending fields

### 4. Create `tools/manual-story-studio/web/src/components/RefList.tsx`

Props: `{ refs: { characters: string[]; locations: string[]; related_records: string[] }; onRefClick: (recordClass: ManualRecordClass, id: string) => void }`. Renders three sub-sections (Characters, Locations, Related) each as a list of clickable IDs. The component derives the target class from the ID prefix using `MANUAL_RECORD_CLASS_PREFIXES` from SPEC101MANSTOMET-001.

### 5. Tests

Create `web/src/components/RecordCard.test.tsx`, `RecordForm.test.tsx`, `RefList.test.tsx` covering:

- **RecordCard**: renders title + importance + tags + summary; click invokes `onOpen` with id.
- **RecordForm**: renders common fields + per-class additions for at least 3 representative classes (beliefs, relationships, secrets); enum fields render as `<select>` with correct options; broken-refs error shows "Save anyway?" button; validation-failed error shows field-level inline messages; Cast specialization renders the §3 nested sections and shows `source_world_character` as read-only.
- **RefList**: renders three sub-sections; click invokes `onRefClick` with derived class + id.

## Files to Touch

- `tools/manual-story-studio/web/src/api/records.ts` (new)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (new)
- `tools/manual-story-studio/web/src/components/RecordCard.tsx` (new)
- `tools/manual-story-studio/web/src/components/RefList.tsx` (new)
- `tools/manual-story-studio/web/src/components/RecordForm.test.tsx` (new)
- `tools/manual-story-studio/web/src/components/RecordCard.test.tsx` (new)
- `tools/manual-story-studio/web/src/components/RefList.test.tsx` (new)

## Out of Scope

- Records / Cast & Profiles pages — SPEC101MANSTOMET-009.
- Dashboard page — SPEC101MANSTOMET-010.
- App.tsx route wiring — SPEC101MANSTOMET-009 / 010.
- World-canon `CHAR-*` resolution / display of source-world character details — M6 deferral per SPEC-101 §8 Risks.
- Shared-types lift between backend and frontend — M6 deferral if surfaced.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including `npm --prefix web test` for the new component tests.
2. `cd tools/manual-story-studio && npm run build` succeeds (backend + web build).
3. `grep -nE "^export (function|async function|const|type|interface)" tools/manual-story-studio/web/src/api/records.ts` returns the expected exports (7 typed functions + the discriminated-union result types).

### Invariants

1. RecordForm derives field layout from `MANUAL_RECORD_SCHEMAS` (SPEC101MANSTOMET-002) — adding a per-class field doesn't require a RecordForm edit; the form picks it up from the schema definition.
2. The `source_world_character: CHAR-*` field is read-only in the form — invariant for SPEC-101 §7 AC #6.
3. Error-shape mapping in api/records.ts covers all three SPEC101MANSTOMET-007 error responses (`validation_failed`, `broken_refs`, `not_found`).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/components/RecordCard.test.tsx` — render + click test.
2. `tools/manual-story-studio/web/src/components/RecordForm.test.tsx` — per-class render, enum-select, broken-refs override flow, validation-failed inline messages, Cast specialization + source_world_character read-only.
3. `tools/manual-story-studio/web/src/components/RefList.test.tsx` — render three sub-sections + click handler.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio/web && npm test` — web-only test suite for component dev-loop.
