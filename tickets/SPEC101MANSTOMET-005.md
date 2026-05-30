# SPEC101MANSTOMET-005: Read layer for Manual Studio records and metadata

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small-Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/read/records.ts` and `manual-story-metadata.ts`.
**Deps**: SPEC101MANSTOMET-001

## Problem

Every Manual Studio frontend page (Dashboard, Records, Cast & Profiles) and every prompt-composer invocation (SPEC-102) needs to read manual-story metadata and per-class record listings + single-record bodies. The CRUD write layer (SPEC101MANSTOMET-006) ALSO needs read access — both to assemble the `KnownIds` set for the ref validator (SPEC101MANSTOMET-003) and to compute the in-tool reference scan for hybrid delete. Without a typed read module, every consumer would parse YAML ad-hoc with no shared shape contract; the read module is the structural prerequisite for the write layer, the CRUD routes, and every frontend page.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/read/` exists with `manual-stories.ts` and `worlds.ts` from SPEC-100 (verified via the listing in the SPEC-100 archive). This ticket adds `records.ts` and `manual-story-metadata.ts` as sibling modules. The `yaml` package (v2.9.0) and `fs` / `path` standard modules are already in use by SPEC-100's read layer.
2. SPEC-101 §4 Files to touch names both modules: *"`tools/manual-story-studio/src/read/records.ts` — list / read per class. `tools/manual-story-studio/src/read/manual-story-metadata.ts` — read `manual-story.yaml`."* SPEC-101 §2.6 names the consuming HTTP routes: `GET /api/worlds/:slug/manual-stories/:msSlug/records?class=<class>`, `GET ...records/:class/:id`, `GET ...metadata`.
3. Cross-artifact boundary under audit: the read modules consume `ManualRecord` / `ManualStoryMetadata` types from SPEC101MANSTOMET-001 and return typed parsed objects. Boundary discipline: read modules do NOT validate schema (SPEC101MANSTOMET-002 validators are write-side); read returns raw parsed YAML typed to the declared shape, and consumers (write layer, CRUD routes, frontend) trust the on-disk content. The discipline matches the broader worldloom pattern: validation gates writes; reads trust the validated artifact on disk.

## Architecture Check

1. Two small modules (records + metadata) is cleaner than one combined module — `manual-story.yaml` is a singleton per manual story; records are a per-class plural set. Each module has its own narrow API surface (records: list-by-class + read-single; metadata: read-singleton).
2. No backwards-compatibility shims. SPEC-100's read layer covers the world enumeration and manual-stories enumeration surfaces; this ticket adds the per-record-content read surface.

## Verification Layers

1. `listRecords` returns parsed YAML summaries for every `<prefix>-*.yaml` in the class directory → schema validation + test fixture.
2. `readRecord` returns full parsed YAML body for an existing ID → test fixture round-trips a known record.
3. `readRecord` throws or returns null for a missing ID → test asserts the missing-record code path.
4. `readManualStoryMetadata` parses `manual-story.yaml` into the typed shape → test fixture round-trips a known metadata file.
5. Active-vs-archived filter behavior is consistent with the write layer's `KnownIds` assembly contract — test fixture covers both `active: true` and `active: false` records.

## What to Change

### 1. Create `tools/manual-story-studio/src/read/records.ts`

Module exports:

- **`listRecords(manualStoryRoot: string, recordClass: ManualRecordClass, opts?: { includeArchived?: boolean }): ManualRecordSummary[]`** — returns array of per-record summaries:
  - `ManualRecordSummary` shape: `{ id: string; title: string; active: boolean; importance: RecordImportance; tags: string[]; summary: string; prompt_visibility: PromptVisibility }` — a projection over the parsed record's common fields, sufficient for record-card displays without paying the full-body parse cost on list operations.
  - By default returns only `active: true` records; `opts.includeArchived: true` returns all records.
  - Scans `<manualStoryRoot>/records/<classDir>/*.yaml`, parses each, projects to summary.
- **`readRecord<T extends ManualRecord = ManualRecord>(manualStoryRoot: string, recordClass: ManualRecordClass, id: string): T | null`** — returns full parsed record or `null` if missing. Caller specifies the per-class type for narrowed return type.
- **`listAllKnownIds(manualStoryRoot: string): KnownIds`** — assembles the `KnownIds` map (per-class set of all IDs including archived) for ref validation. Convenience helper for the write layer (SPEC101MANSTOMET-006).
- **`scanReferences(manualStoryRoot: string, targetId: string): Array<{ recordClass: ManualRecordClass; id: string; field: string }>`** — scans every record in every class for refs that point to `targetId`. Returns the referrer list for hybrid delete (SPEC101MANSTOMET-006 uses this to decide hard-delete vs. active:false-default).

### 2. Create `tools/manual-story-studio/src/read/manual-story-metadata.ts`

Module exports:

- **`readManualStoryMetadata(manualStoryRoot: string): ManualStoryMetadata | null`** — reads and parses `<manualStoryRoot>/manual-story.yaml`; returns null if missing.

### 3. Tests

Create `tools/manual-story-studio/test/read/records.test.ts` covering:

- Empty class directory: `listRecords` returns `[]`.
- Populated class: fixture 3 belief records; assert `listRecords` returns 3 summaries with correct `id` / `title` / `active`.
- `includeArchived: true` returns active + inactive; default omits inactive.
- `readRecord` round-trips a known record; returns null for missing ID.
- `listAllKnownIds` assembles the per-class ID map across all 18 classes; archived records ARE included.
- `scanReferences` finds refs in `refs.characters`, per-class typed pointers, and `refs.related_records`.

Create `tools/manual-story-studio/test/read/manual-story-metadata.test.ts` covering:

- Existing metadata: fixture `manual-story.yaml`; assert parsed shape matches `ManualStoryMetadata`.
- Missing metadata file: returns null.

## Files to Touch

- `tools/manual-story-studio/src/read/records.ts` (new)
- `tools/manual-story-studio/src/read/manual-story-metadata.ts` (new)
- `tools/manual-story-studio/test/read/records.test.ts` (new)
- `tools/manual-story-studio/test/read/manual-story-metadata.test.ts` (new)

## Out of Scope

- Schema validation on read — SPEC101MANSTOMET-002 (validators are write-side).
- Caching / indexing — SPEC-101 §3 explicitly rejects (`No _index/ directory inside Manual Studio's content`); SPEC-101 §2 Out of scope lists "Optional rebuildable indexes" as M6 deferral.
- Cross-manual-story aggregation — M6 deferral per SPEC-101 §8 Risks.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including the new `test/read/records.test.ts` + `test/read/manual-story-metadata.test.ts`.
2. `cd tools/manual-story-studio && npm run build:backend` succeeds (no type errors against SPEC101MANSTOMET-001).
3. `grep -nE "^export (function|const)" tools/manual-story-studio/src/read/records.ts` returns the expected exports (`listRecords`, `readRecord`, `listAllKnownIds`, `scanReferences`).

### Invariants

1. `listRecords` projection field set matches the documented `ManualRecordSummary` shape — adding fields requires an explicit projection change, not silent drift.
2. `listAllKnownIds` includes `active: false` records (SPEC-101 §2.4: refs to archived records are valid).
3. `scanReferences` is shallow (one-hop) parallel to the ref validator's scope (SPEC101MANSTOMET-003) — does not recurse.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/records.test.ts` — list / read / knownIds / scanReferences tests with fixture per-class records.
2. `tools/manual-story-studio/test/read/manual-story-metadata.test.ts` — read + missing-file tests.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && node --test "dist/test/read/**/*.test.js"` (after `npm run build:backend`) — read-layer suite in isolation.
