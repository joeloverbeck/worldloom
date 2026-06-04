# SPEC101MANSTOMET-006: Write layer with hybrid delete policy

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium-Large
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/write/records.ts` and `manual-story-metadata.ts`; integrates with SPEC-100 sandbox + SPEC101MANSTOMET-002/003/004 validators and allocator.
**Deps**: SPEC101MANSTOMET-001, SPEC101MANSTOMET-002, SPEC101MANSTOMET-003, SPEC101MANSTOMET-004, SPEC101MANSTOMET-005

## Problem

Manual Studio's record CRUD save flow is the structural enforcement point for four contracts simultaneously: (1) the SPEC-100 realpath sandbox (no writes outside `worlds/<slug>/manual-stories/<msSlug>/`); (2) the schema validator (SPEC101MANSTOMET-002 — required fields, enum membership); (3) the ref-integrity validator (SPEC101MANSTOMET-003 — shallow one-hop ref check); and (4) SPEC-101 §2.5's hybrid deletion policy (unreferenced records get hard-deleted; referenced records default to `active: false` with `retired_reason`; force-delete requires explicit confirmation flag and is audit-logged). Each contract must trip on save — not deferred to a periodic linter, not surfaced only at prompt-composition time. The write layer is also where the ref-validator override flow lives ("this record references missing IDs: <list>; save anyway?" per SPEC-101 §2.4).

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/write/sandbox.ts` from SPEC-100 (verified via `ls tools/manual-story-studio/src/write/`) provides the realpath sandbox primitive — `safeWriteFile(manualStoryRoot, relativePath, contents)` rejects symlink escapes, `..`, absolute paths, and any target outside `<manualStoryRoot>/`. This ticket consumes that primitive without re-implementing it. SPEC101MANSTOMET-004 provides the ID allocator; SPEC101MANSTOMET-002 provides the schema validator; SPEC101MANSTOMET-003 provides the ref validator; SPEC101MANSTOMET-005 provides `listAllKnownIds` (for ref-validator input) and `scanReferences` (for hybrid-delete decision).
2. SPEC-101 §4 Files to touch names both modules: *"`tools/manual-story-studio/src/write/records.ts` — create / update / delete records, invoking sandbox + ref-integrity validator. `tools/manual-story-studio/src/write/manual-story-metadata.ts` — update `manual-story.yaml`."* SPEC-101 §2.5 enumerates the hybrid delete policy; SPEC-101 §7 AC #4 + #5 name the test contracts (ref-validator override, hybrid delete, force-delete-with-audit).
3. Cross-artifact boundary under audit: the write layer is the integration seam where sandbox + schema validator + ref validator + ID allocator + read layer all compose. The boundary discipline: the write layer is the ONLY surface where any of these compose — neither the CRUD routes (SPEC101MANSTOMET-007) nor the frontend (SPEC101MANSTOMET-008) duplicates validation; routes/UI surface errors and confirmations only. Keeping the composition seam inside `src/write/records.ts` makes the validation contract a single-grep-discoverable surface.
4. FOUNDATIONS principle motivating this ticket: **Rule 5 No Consequence Evasion** at the authoring layer. The hybrid delete policy is the deliberate Rule 5 minimum for a non-canon authoring surface — a referenced record's hard-delete would silently break every referrer's reference closure (second-order effect); defaulting to `active: false` with `retired_reason` keeps the ID resolvable (per SPEC101MANSTOMET-003's "refs may point to records marked `active: false`") while marking the author's authoring intent. Force-delete is the explicit-acknowledgment escape hatch with audit logging. The discipline matches SPEC-101 §5 FOUNDATIONS Alignment row for §Story Bundles §8 record append-only discipline ("aligns @ inactive-default") at the spirit level.

## Architecture Check

1. Compose validators inside the write functions (`createRecord`, `updateRecord`, `deleteRecord`) rather than as middleware — the validation contract is per-operation (create vs update vs delete) and each operation has distinct validator requirements (create needs allocator + schema + refs; update needs schema + refs; delete needs reference scan + hybrid-policy decision). Middleware composition would either over-validate (run all validators on delete, wasting cycles) or require per-operation gating logic in the middleware (re-introducing per-operation logic at the middleware layer).
2. No backwards-compatibility shims. SPEC-100 introduced no record-write surface; this ticket is the first record-write integration in the package.

## Verification Layers

1. CRUD round-trip succeeds with valid record → schema validation + ref validation + test fixture.
2. Sandbox rejects out-of-root write target → SPEC-100 sandbox + test fixture asserting `safeWriteFile` throws on `../foo.yaml`.
3. Schema validator rejects missing-required-field record → schema validation + test (SPEC-101 §7 AC #1, #2).
4. Ref validator flags dangling refs; CRUD save refuses to write unless override flag set → ref validation + test (SPEC-101 §7 AC #4).
5. Hybrid delete: unreferenced → hard delete; referenced → `active: false` + `retired_reason` → test fixture covering both paths (SPEC-101 §7 AC #5).
6. Force-delete: requires explicit `force: true` flag + audit-log entry in response body → test fixture (SPEC-101 §7 AC #5: "audit-logged (in the response body for now; persistent audit log is M6 deferral)").

## What to Change

### 1. Create `tools/manual-story-studio/src/write/records.ts`

Module exports:

- **`createRecord<T extends ManualRecord>(manualStoryRoot: string, recordClass: ManualRecordClass, body: Omit<T, "id">, opts?: { overrideBrokenRefs?: boolean }): { id: string; record: T } | { ok: false; errors: ValidationResult["errors"] | RefViolation[]; needsOverride?: boolean }`** — orchestrates:
  1. Allocate next ID via `allocateNextIdForClass` (SPEC101MANSTOMET-004).
  2. Compose full record: `{ id: <allocated>, ...body }`.
  3. Validate schema (SPEC101MANSTOMET-002 `validateRecord`); on `ok: false`, return errors with `needsOverride: false`.
  4. Validate refs (SPEC101MANSTOMET-003 `validateRefs` against `listAllKnownIds` from SPEC101MANSTOMET-005); on broken refs AND `opts.overrideBrokenRefs !== true`, return violations with `needsOverride: true`.
  5. Serialize to YAML via the `yaml` package.
  6. Write via `safeWriteFile(manualStoryRoot, "records/<classDir>/<id>.yaml", yamlText)` (SPEC-100 sandbox).
  7. Return `{ id, record }`.

- **`updateRecord<T extends ManualRecord>(manualStoryRoot: string, recordClass: ManualRecordClass, id: string, body: T, opts?: { overrideBrokenRefs?: boolean }): { id: string; record: T } | { ok: false; errors: ...; needsOverride?: boolean }`** — same as create except no allocation (ID is preserved); rejects if record file is missing.

- **`deleteRecord(manualStoryRoot: string, recordClass: ManualRecordClass, id: string, opts: { force?: boolean }): DeleteResult`** where `DeleteResult` is:
  - `{ outcome: "hard_deleted"; id }` when unreferenced (zero referrers per `scanReferences`).
  - `{ outcome: "inactive_default"; id; retiredReason: string; referrers: Array<{ recordClass; id; field }> }` when referenced AND `opts.force !== true` — the record is rewritten in place with `active: false` + `retired_reason: "force-delete-blocked-by-referrers: <id-list>"` (caller can override `retired_reason` via a separate UpdateRecord call after seeing the referrer list).
  - `{ outcome: "force_deleted"; id; auditEntry: { deletedAt: ISO8601; deletedClassAndId: string; referrers: ... } }` when `opts.force === true` — hard-delete the file AND return an audit entry in the response body (persistent audit log is M6 deferral per SPEC-101 §7 AC #5).

### 2. Create `tools/manual-story-studio/src/write/manual-story-metadata.ts`

Module exports:

- **`updateManualStoryMetadata(manualStoryRoot: string, metadata: ManualStoryMetadata): { ok: true } | { ok: false; errors: ValidationResult["errors"] }`** — validates against `MANUAL_STORY_METADATA_SCHEMA` (SPEC101MANSTOMET-002); on `ok: true`, serializes and writes via `safeWriteFile(manualStoryRoot, "manual-story.yaml", yamlText)`. Updates `metadata.updated_at` to the current ISO 8601 timestamp before write.

### 3. Hybrid delete decision tree

The `deleteRecord` decision flow:

1. Read the target record via `readRecord` (SPEC101MANSTOMET-005). If missing, throw or return error.
2. Call `scanReferences(manualStoryRoot, id)` (SPEC101MANSTOMET-005) to enumerate referrers.
3. If referrers is empty AND `opts.force !== true`: hard-delete the file via `fs.unlinkSync` (the file path is inside the sandbox; no additional `safeWriteFile`-style gating is needed — but the unlink target IS validated against the manual-story root, paralleling sandbox discipline).
4. If referrers is non-empty AND `opts.force !== true`: rewrite the record in place with `active: false` + `retired_reason`; return the `inactive_default` outcome with the referrer list (caller surfaces this to UI for author to confirm force-delete).
5. If `opts.force === true` (regardless of referrers): hard-delete via `fs.unlinkSync` + return the `force_deleted` outcome with the audit-entry payload.

### 4. Tests

Create `tools/manual-story-studio/test/write/records.test.ts` covering:

- **Create round-trip**: write a valid record; assert file exists at expected path with parsed content matching the input.
- **Create with allocator**: write 3 sequential records; assert IDs are `<prefix>-1`, `<prefix>-2`, `<prefix>-3`.
- **Create with schema-fail**: write a record missing `holder`; assert response is `{ ok: false, errors: [...] }`; assert file is NOT created on disk.
- **Create with refs-fail (no override)**: write `mbel-*` with `holder: "mchar-99"` (missing); assert response is `{ ok: false, errors: [...], needsOverride: true }`; assert file is NOT created.
- **Create with refs-fail (override)**: same record with `opts.overrideBrokenRefs: true`; assert file IS created.
- **Create out-of-sandbox**: attempt write with crafted path containing `../`; assert sandbox throws or write rejects.
- **Update**: round-trip update; assert file is rewritten with new content.
- **Update missing**: attempt update on non-existent ID; assert error.
- **Delete unreferenced**: create a `mfact-*` with no refs to it; delete; assert `outcome: "hard_deleted"`; assert file is gone.
- **Delete referenced (default)**: create `mchar-1`; create `mbel-1` with `refs.characters: ["mchar-1"]`; delete `mchar-1`; assert `outcome: "inactive_default"`, `retiredReason: "force-delete-blocked-by-referrers: mbel-1"`; assert `mchar-1.yaml` STILL exists on disk with `active: false`.
- **Delete force**: same referenced setup; delete with `opts.force: true`; assert `outcome: "force_deleted"`, audit entry returned with referrer list; assert file IS gone.
- **Delete ID allocator gap preservation**: create `mbel-1`, `mbel-2`, `mbel-3`; delete `mbel-2`; allocate next ID; assert allocator returns `mbel-4` (gap at 2 preserved per SPEC101MANSTOMET-004).

Create `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` covering:

- **Update round-trip**: valid metadata; assert file written; `updated_at` is rewritten to current time.
- **Update with schema-fail**: metadata with invalid enum value (e.g., `pov: "third-omniscient"` not in closed set); assert error response; assert file NOT modified.
- **Update with sandbox**: parallel to records.test.ts sandbox check.

## Files to Touch

- `tools/manual-story-studio/src/write/records.ts` (new)
- `tools/manual-story-studio/src/write/manual-story-metadata.ts` (new)
- `tools/manual-story-studio/test/write/records.test.ts` (new)
- `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` (new)

## Out of Scope

- HTTP route handlers (request parsing, status-code mapping, error-body shape) — SPEC101MANSTOMET-007.
- Frontend form integration (UI for ref-override confirmation, force-delete confirmation modal) — SPEC101MANSTOMET-008 / 009.
- Persistent audit log — M6 deferral per SPEC-101 §7 AC #5 (response-body audit only for MVP).
- Cross-manual-story write coordination — M6 deferral.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including the new `test/write/records.test.ts` + `test/write/manual-story-metadata.test.ts` (SPEC-101 §7 AC #4, #5).
2. `cd tools/manual-story-studio && npm run build:backend` succeeds.
3. `grep -nE "outcome: \"(hard_deleted|inactive_default|force_deleted)\"" tools/manual-story-studio/src/write/records.ts` confirms all three hybrid-delete outcomes are present.

### Invariants

1. Every record write composes (sandbox + schema-validator + ref-validator + ID-allocator) in the documented order; no path bypasses any validator.
2. `deleteRecord` with referrers + `force: false` NEVER hard-deletes — invariant against accidental destruction (SPEC-101 §3 Key decisions).
3. `deleteRecord` with `force: true` ALWAYS returns an audit entry — invariant for the response-body audit contract (SPEC-101 §7 AC #5).
4. Allocator gap-preservation is preserved across delete cycles — verified end-to-end via the delete + allocate test in records.test.ts.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/records.test.ts` — CRUD round-trip + schema-fail + refs-fail + sandbox + hybrid-delete (all three outcomes) + gap-preservation tests.
2. `tools/manual-story-studio/test/write/manual-story-metadata.test.ts` — metadata update + schema-fail + sandbox tests.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && node --test "dist/test/write/**/*.test.js"` (after `npm run build:backend`) — write-layer suite in isolation.
