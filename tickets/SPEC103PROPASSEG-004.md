# SPEC103PROPASSEG-004: Save Segment write flow + segment-specific operational hybrid delete

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/write/segments.ts` (save / edit-in-place / hybrid delete) + paired test under `tools/manual-story-studio/test/write/segments.test.ts` covering all three operations.
**Deps**: archive/tickets/SPEC103PROPASSEG-001.md, archive/tickets/SPEC103PROPASSEG-003.md, archive/tickets/SPEC103PROPASSEG-005.md, archive/tickets/SPEC103PROPASSEG-006.md

## Problem

SPEC-103 §2 item 2 requires a Save Segment write flow that allocates the next `SEG-<n>` ID, writes the prose body to `segments/SEG-<n>.md`, writes the typed sidecar to `segments/SEG-<n>.yaml`, appends `SEG-<n>` to `manual-story.yaml` `segment_order`, optionally triggers manuscript recompile when `compile_on_segment_save: true`, and returns `(segment_id, sidecar, checklist_payload)` so the frontend can render the post-save State Update Checklist modal. SPEC-103 §3 Key decisions add segment-edit (in-place update preserving `id` + `created_at`, refreshing `updated_at` + `word_count`) and segment-delete (operational hybrid keyed on `caused_by_segment` per the Q1=(a) reassessment resolution — distinct from SPEC-101's record hybrid because segments lack `active`/`retired_reason` fields).

## Assumption Reassessment (2026-05-31)

1. SPEC-100 sandbox at `tools/manual-story-studio/src/write/sandbox.ts` is the existing write-discipline boundary; all segment writes route through it (parallel to existing `src/write/records.ts` and `src/write/prompts.ts`). The existing ref validator at `tools/manual-story-studio/src/validate/refs.ts:71` already registers `caused_by_segment: { kind: "segment", nullable: true }` — segment references on consequence records are already a known surface. The existing read layer at `tools/manual-story-studio/src/read/records.ts:81-88,166` already reads `segment_order` from `manual-story.yaml` to populate the known-segments set consumed by the ref validator and maps `consequences` → `["caused_by_segment"]` — the new write flow integrates with these existing readers/validators rather than duplicating segment-knowledge.
2. SPEC-103 §2 item 2 (save flow), §2 item 7 (edit + delete), §3 Key decisions (segment-specific hybrid translation, added during reassessment), §7 AC#1, #3, #7, #8 cover the deliverable surface. §4 Create includes `src/write/segments.ts`. The `SegmentSidecar` type comes from ticket 001; the `SEG-N` allocator comes from `archive/tickets/SPEC103PROPASSEG-003.md`.
3. Cross-skill boundary: this write flow consumes ticket 001's `SegmentSidecar` type, `archive/tickets/SPEC103PROPASSEG-003.md`'s `allocateNextSegmentId`, ticket 005's State Update Checklist module (for the returned `checklist_payload`), and ticket 006's manuscript compiler (when `compile_on_segment_save: true`). It is consumed by ticket 008's HTTP routes (POST save, PUT edit, DELETE delete). The existing `src/validate/refs.ts:71` `caused_by_segment` registration is the boundary the delete hybrid keys on for "referenced vs unreferenced" determination.
4. FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary — pasted prose is durable manuscript text, not authoritative state. The save flow MUST NOT mutate any record file under `records/`; only segment files + `manual-story.yaml` `segment_order` + `manuscript.md` (via compiler) are written. The State Update Checklist payload returned by save explicitly disclaims state change (per ticket 005's module contract).
5. Segment-delete hybrid translation (per SPEC-103 §3 Key decisions, dictated by the Q1=(a) reassessment resolution) is a required consequence of this ticket — segments lack `active`/`retired_reason` fields (unlike SPEC-101 records); the operational hybrid keys on `caused_by_segment` references only. *Unreferenced* (no consequence cites `caused_by_segment: SEG-<n>`) → hard delete both `segments/SEG-<n>.md` and `.yaml` + remove from `segment_order`. *Referenced* (at least one consequence cites it) → remove from `segment_order` only (hides from manuscript) + keep both files (preserves audit trail and the consequence's referent). *Force-delete* with explicit confirmation flag → hard delete both files + return a warning payload naming unresolved `caused_by_segment` referrers (advisory; author cleans up consequence records afterward via the Records screen).

## Architecture Check

1. The save flow composes existing scaffolding (SPEC-100 sandbox + ticket 001 `SegmentSidecar` type + `archive/tickets/SPEC103PROPASSEG-003.md` `SEG-N` allocator + ticket 005 checklist module + ticket 006 compiler) without re-implementing any of them. The delete hybrid keys on the already-registered `caused_by_segment` ref-kind in `src/validate/refs.ts` rather than introducing a parallel segment-referent tracking surface.
2. No backwards-compatibility aliasing — net-new write surface; no prior segment write code exists. The implementation does not modify any of the existing scaffolding it consumes (sandbox, allocator, validator, read layer).

## Verification Layers

1. Save segment writes `segments/SEG-<n>.md` (prose body only, no frontmatter) + `segments/SEG-<n>.yaml` (full `SegmentSidecar` shape) and appends to `manual-story.yaml` `segment_order` → unit test with fixture manual story
2. Edit-in-place preserves `id` + `created_at`, refreshes `updated_at` + `word_count`, leaves `segment_order` unchanged → unit test
3. Hybrid delete: unreferenced → hard delete both files + segment_order remove; referenced (via consequence `caused_by_segment` cite) → segment_order remove only (files preserved); force-delete with confirmation → hard delete both files + warning payload naming unresolved referrers → unit test (three sub-cases)
4. Manuscript recompile triggered when `compile_on_segment_save: true`; NOT triggered when `compile_on_segment_save: false` → unit test (compiler invocation count assertion)
5. No record file under `records/` is mutated by any save / edit / delete operation → unit test (filesystem inspection assertion)

## What to Change

### 1. Create src/write/segments.ts

Implement three exported functions, each routing through the SPEC-100 sandbox + integrating with existing scaffolding:

- **`saveSegment(options)`**: allocates the next `SEG-N` via `archive/tickets/SPEC103PROPASSEG-003.md`'s allocator; writes `segments/SEG-<n>.md` (prose body only, no frontmatter — per SPEC-103 §3 Key decisions); writes `segments/SEG-<n>.yaml` (full `SegmentSidecar` shape from ticket 001 with `created_at` = `updated_at` = current ISO 8601, `word_count` computed by splitting on whitespace, `prompt_sha256` computed from referenced prompt file's body when `prompt_id != null`); reads `manual-story.yaml`, appends `SEG-<n>` to `segment_order`, writes back; if `manuscript.compile_on_segment_save: true`, invokes ticket 006's compiler; returns `{ segment_id, sidecar, checklist_payload }` (checklist_payload from ticket 005's module).

- **`editSegment(options)`**: reads existing `segments/SEG-<n>.yaml`; writes new prose to `segments/SEG-<n>.md`; writes updated sidecar preserving `id` + `created_at`, refreshing `updated_at` to current ISO 8601 and `word_count` to recomputed value; leaves `segment_order` unchanged (no append); if `manuscript.compile_on_segment_save: true`, invokes ticket 006's compiler; returns `{ segment_id, sidecar, checklist_payload }`.

- **`deleteSegment(options)`**: scans `<manualStoryRoot>/records/consequences/mcnsq-*.yaml` for entries with `caused_by_segment: SEG-<n>`; collects the list of referrer IDs. If empty AND `options.force !== true` → hard delete both `.md` + `.yaml` files + remove `SEG-<n>` from `segment_order` + write back manual-story.yaml + recompile if configured + return `{ outcome: "hard_deleted", referrers: [] }`. If non-empty AND `options.force !== true` → remove `SEG-<n>` from `segment_order` only (keep both files) + write back manual-story.yaml + recompile if configured + return `{ outcome: "segment_order_removed_files_preserved", referrers: [...] }`. If `options.force === true` (regardless of referrer count) → hard delete both files + remove from `segment_order` + write back + recompile + return `{ outcome: "force_deleted", referrers: [...], warning: "<message naming unresolved caused_by_segment referrers>" }`.

All three functions must:
- Resolve sandbox root via `tools/manual-story-studio/src/write/sandbox.ts`'s `resolveManualStoryRoot` (or equivalent — verify exact function name at implementation time).
- Never write outside the sandboxed manual-story root.
- Never touch any file under `records/` (the save flow's invariant per SPEC-103 §3 Plan-Authority Boundary).

### 2. Create test/write/segments.test.ts

Cover (per existing `test/write/records.test.ts` shape, using `fs.cpSync` to copy a fixture manual story to a temp directory):

- Save first segment: empty `segments/` → `SEG-1` created with `.md` + `.yaml` + `segment_order: [SEG-1]`
- Save second segment: `SEG-1` present → `SEG-2` created with `segment_order: [SEG-1, SEG-2]`
- Edit in-place: `SEG-1` updated; `id` + `created_at` preserved; `updated_at` + `word_count` refreshed; `segment_order` unchanged
- Delete unreferenced: `SEG-1` with no `caused_by_segment` referrers → files removed + `segment_order` empty
- Delete referenced via `caused_by_segment`: fixture has `mcnsq-X.yaml` with `caused_by_segment: SEG-1` → files preserved + `segment_order` empty + outcome includes `referrers: ["mcnsq-X"]`
- Delete force on referenced: same fixture as above + `force: true` → files removed + warning payload includes referrers
- Manuscript recompile triggered on save when `compile_on_segment_save: true` → compiler invocation count = 1 after one save
- Manuscript NOT recompiled when `compile_on_segment_save: false` → compiler invocation count = 0 after one save (use a spy/mock on the compiler module import)
- No record file under `records/` mutated by any operation → assert filesystem state of `records/` before and after

## Files to Touch

- `tools/manual-story-studio/src/write/segments.ts` (new)
- `tools/manual-story-studio/test/write/segments.test.ts` (new)

## Out of Scope

- HTTP routes wrapping these write functions (covered by ticket 008 — segments routes)
- Manuscript compilation logic itself (covered by ticket 006; this ticket invokes the compiler but doesn't implement it)
- State Update Checklist payload generation (covered by ticket 005; this ticket invokes the checklist module but doesn't implement it)
- Frontend wiring (covered by ticket 011 — PasteProse page)
- Reorder of `segment_order` (M6 deferral per SPEC-103 §2 Out of scope; `allow_reorder` from ticket 001 only gates the UI affordance)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/segments.test.js"` — new save / edit / hybrid delete tests pass
2. `cd tools/manual-story-studio && npm test` — full suite still green; existing record-write tests unaffected

### Invariants

1. Save flow NEVER mutates any record file under `<manualStoryRoot>/records/` — only writes under `<manualStoryRoot>/segments/`, `<manualStoryRoot>/manual-story.yaml` (segment_order field), and `<manualStoryRoot>/manuscript.md` (via compiler).
2. State Update Checklist payload returned by save explicitly disclaims state change (per FOUNDATIONS §Story Bundles §4a — pasted prose is publication, not state authority); the payload describes records the author should *review*, never records that *changed*.
3. Segment-delete hybrid follows the operational translation per SPEC-103 §3 Key decisions (keyed on `caused_by_segment` references, not on `active`/`retired_reason` fields which segments do not have).
4. Segment files (`segments/SEG-<n>.md` + `.yaml`) and `segment_order` are the only state surfaces this flow writes; the manuscript (`manuscript.md`) is a deterministic compilation by ticket 006, invoked by this flow but not directly written here.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/segments.test.ts` (new) — save / edit / hybrid delete (3 sub-cases) / recompile-on-save toggle / record-untouched invariant assertion.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/segments.test.js"` — targeted segment-write tests
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes new tests via chained `node --test "dist/test/**/*.test.js"`)
