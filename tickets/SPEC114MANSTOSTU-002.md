# SPEC114MANSTOSTU-002: Backend delete rework — hard-delete-or-block + repair-mode force-delete with persisted repair-log

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` write layer (`src/write/records.ts`) + delete route (`src/server/routes/records.ts`); no impact on world canon or story-bundle pipeline (canon-fenced package). Establishes the per-manual-story `repair-log.yaml` control file.
**Deps**: SPEC114MANSTOSTU-001

## Problem

The normal `deleteRecord` flow (`src/write/records.ts:177`) currently archives a referenced record as `active:false` with a machine-written `retired_reason` (`outcome: inactive_default`), then offers force-delete. This reintroduces exactly the archive/supersession-lite lifecycle SPEC-114's clarified brief rejects ("records are mutable current truth") and produces the confusing "I deleted it but it's still here as inactive" surface. SPEC-114 §2 items 1+3 require: default = hard-delete-if-unreferenced / block-with-referrer-summaries (no `active:false` write); force-delete confined to an explicit repair flag and recorded in a **persisted** `repair-log.yaml` audit trail. The current force path returns only an in-memory `auditEntry` that vanishes on reload — SPEC-108's pattern, which this spec deliberately improves on.

## Assumption Reassessment (2026-06-02)

1. `deleteRecord` (`src/write/records.ts:177`) and its `DeleteResult` union (`src/write/records.ts:59`) include the `inactive_default` outcome (lines 64, 247) writing `active:false` + `retired_reason` for referenced records, and a `force_deleted` outcome returning an in-memory `auditEntry` (lines 69-77, 213-224). `deleteRecord` already calls `scanReferences`; this ticket switches the block branch to consume SPEC114MANSTOSTU-001's `resolveReferrerSummaries`. The delete route (`src/server/routes/records.ts:232-273`) currently derives `force` from `queryForce || bodyConfirm` and returns the result verbatim. `safeWriteFile` (`src/write/sandbox.ts`) is the sandbox-bounded write primitive for the new `repair-log.yaml`.
2. SPEC-114 §2 items 1+3, §3 ("Force-delete is repair, and repair is logged durably" — `repair-log.yaml` schema `{deleted_class_and_id, deleted_at, referrers_at_deletion}`), and §7 AC 1-5 define the target behavior. `docs/FOUNDATIONS.md` §Rule 6 (No Silent Retcons) is the cited alignment.
3. **Cross-artifact shared boundary under audit**: the `DeleteResult` union is mirrored by the web client type (`web/src/api/records.ts:23`) and the beat-template client type (`web/src/api/beat-templates.ts:28`); `deleteRecord` is the shared backend for `beat-templates` too (`src/server/routes/beat-templates.ts:287`). This ticket owns the backend contract; the frontend mirrors land in 003/004.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)** motivates this ticket: a delete that silently archives a record as inactive is an unexplained state change. Hard-delete-or-block makes the outcome explicit, and the persisted `repair-log.yaml` gives force-delete a durable audit trail — the tooling-layer analogue of the no-silent-retcon discipline. An in-memory-only audit entry (SPEC-108's pattern) does not honor it.
5. (was template item 7 — `inactive_default` removal blast radius) Removing the `inactive_default` outcome from the normal path has consumers beyond `src/write/records.ts`: `README.md:107` (docs → SPEC114MANSTOSTU-005), `web/src/api/records.ts:26` + `web/src/pages/Records.tsx:398` (→ 003), `web/src/api/beat-templates.ts:29` + `web/src/pages/BeatTemplates.tsx:306` (→ 004), and the asserting tests `test/write/records.test.ts:296` + `test/capstone-spec101.test.ts:410,445` (rewritten in THIS ticket). The capstone is SPEC-101's AC#5 hybrid-delete test; rewriting it is a deliberate, attributed change to a landed spec's tested behavior (Rule 6), not a silent edit — no production consumer of `inactive_default` survives.

## Architecture Check

1. Confining the destructive override behind an explicit repair flag + a persisted append-only log keeps the normal flow unambiguous (gone, or told what blocks you) and gives the one destructive path a durable trail — cleaner than the current "archive-as-default + ephemeral audit" because it removes the lingering-inactive surprise and the vanishing-on-reload audit gap in one change.
2. No backwards-compatibility shim: the `inactive_default` outcome is removed outright (not aliased or kept behind a flag); `repair-log.yaml` is net-new infrastructure, not a renamed artifact.

## Verification Layers

1. Unreferenced delete unlinks the file → `test/write/delete-lifecycle.test.ts` asserts the file is gone (codebase/unit).
2. Referenced delete blocks, returns referrer summaries, and does NOT flip `active` → unit assertion reads the record back and asserts `active` unchanged.
3. `inactive_default` no longer reachable on the normal path → grep-proof that the outcome is absent from `src/write/records.ts` + negative unit test.
4. Force-delete (repair flag) unlinks despite referrers AND appends to `repair-log.yaml` → unit test reads the file back after two force-deletes and asserts append (not overwrite).
5. Rule 6 audit-trail durability → `repair-log.yaml` persists across a re-read (FOUNDATIONS alignment check + file-read assertion).

## What to Change

### 1. Rework `deleteRecord` (`src/write/records.ts`)

- Remove the `inactive_default` branch and its member from the `DeleteResult` union. Default path: unreferenced → `hard_deleted` (unlink); referenced → a new `blocked` outcome carrying `referrers: Array<{recordClass, summary}>` from SPEC114MANSTOSTU-001's `resolveReferrerSummaries`. Never write `active:false` / `retired_reason` on delete.
- Force path (`opts.force === true`, i.e. the repair flag): unlink despite referrers, append an entry `{deleted_class_and_id, deleted_at (ISO-8601), referrers_at_deletion: [{recordClass, id, field}]}` to `worlds/<slug>/manual-stories/<slug>/repair-log.yaml` via a read-append-write helper using `safeWriteFile` (create with a single-element list if absent). Keep the in-memory `force_deleted` result for the HTTP caller.
- Timestamp via the existing injectable `opts.now` (keeps tests deterministic).

### 2. Confine force to the repair flag in the delete route (`src/server/routes/records.ts`)

Require an explicit repair flag for force-delete rather than the loose `queryForce || bodyConfirm`; pass the structured `blocked` result through verbatim (it already returns `result`).

### 3. Rewrite the existing delete tests

- `test/write/records.test.ts`: replace the `inactive_default` assertion (line ~296) with block-on-referrer / no-auto-archive assertions.
- `test/capstone-spec101.test.ts`: rewrite the AC#5 hybrid-delete assertion (lines ~410-447) from `inactive_default` to the `blocked` outcome (Rule 6 attribution in-comment).
- `test/write/delete-lifecycle.test.ts` (new): the full matrix per §7 AC 1-5.

## Files to Touch

- `tools/manual-story-studio/src/write/records.ts` (modify)
- `tools/manual-story-studio/src/server/routes/records.ts` (modify)
- `tools/manual-story-studio/test/write/records.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec101.test.ts` (modify)
- `tools/manual-story-studio/test/write/delete-lifecycle.test.ts` (new)

## Out of Scope

- Frontend delete UX (003) and beat-template frontend (004) — this ticket is backend + route + backend tests only.
- Removing the `active` / `retired_reason` schema fields — both retained for explicit author use (SPEC-114 §Out of scope).
- A general repair-mode redesign beyond force-delete confinement + the repair-log append (SPEC-114 §Out of scope).
- The `includeArchived` list option — retained (SPEC-114 §Out of scope).

## Acceptance Criteria

### Tests That Must Pass

1. Deleting an unreferenced record unlinks the file (test confirms the file is gone).
2. Deleting a referenced record returns `blocked` with referrer summaries (id + class + title + summary) and leaves `active` unchanged (no auto-archive).
3. The `inactive_default` outcome no longer occurs on the normal delete path (grep + negative test).
4. Force-delete (repair flag) unlinks despite referrers and APPENDS to `repair-log.yaml` — verified by reading the file back after two force-deletes (append, not overwrite).
5. `cd tools/manual-story-studio && npm run test:backend` passes.

### Invariants

1. `deleteRecord` never writes `active:false` or `retired_reason`.
2. `repair-log.yaml` is append-only and lives inside the write sandbox; force-delete is unreachable without the explicit repair flag.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/delete-lifecycle.test.ts` (new) — §7 AC 1-5 matrix incl. repair-log append.
2. `tools/manual-story-studio/test/write/records.test.ts` (modify) — replace `inactive_default` assertion with block-on-referrer.
3. `tools/manual-story-studio/test/capstone-spec101.test.ts` (modify) — rewrite SPEC-101 AC#5 hybrid-delete assertion (Rule 6 attribution).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm run build`
3. Backend `test:backend` is the correct boundary — the delete contract and repair-log are backend-only; the web mirrors are verified in 003/004.
