# SPEC114MANSTOSTU-002: Backend delete rework — hard-delete-or-block + repair-mode force-delete with persisted repair-log

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` write layer (`src/write/records.ts`) + delete route (`src/server/routes/records.ts`); no impact on world canon or story-bundle pipeline (canon-fenced package). Establishes the per-manual-story `repair-log.yaml` control file.
**Deps**: archive/tickets/SPEC114MANSTOSTU-001.md

## Problem

At intake, the normal `deleteRecord` flow (`src/write/records.ts`) archived a referenced record as `active:false` with a machine-written `retired_reason` (`outcome: inactive_default`), then offered force-delete. That reintroduced the archive/supersession-lite lifecycle SPEC-114's clarified brief rejects ("records are mutable current truth") and produced the confusing "I deleted it but it's still here as inactive" surface. SPEC-114 §2 items 1+3 required: default = hard-delete-if-unreferenced / block-with-referrer-summaries (no `active:false` write); force-delete confined to an explicit repair flag and recorded in a **persisted** `repair-log.yaml` audit trail. The force path returned only an in-memory `auditEntry` that vanished on reload — SPEC-108's pattern, which this ticket deliberately improved on.

## Assumption Reassessment (2026-06-02)

1. At intake, `deleteRecord` (`src/write/records.ts`) and its `DeleteResult` union included the `inactive_default` outcome writing `active:false` + `retired_reason` for referenced records, and a `force_deleted` outcome returning an in-memory `auditEntry`. `deleteRecord` already called `scanReferences`; this ticket switched the block branch to consume the archived SPEC114MANSTOSTU-001 `resolveReferrerSummaries` implementation. The delete route (`src/server/routes/records.ts`) derived `force` from `queryForce || bodyConfirm`; this ticket replaced that loose trigger with `?force=true&mode=repair`. `safeWriteFile` (`src/write/sandbox.ts`) is the sandbox-bounded write primitive for the new `repair-log.yaml`.
2. SPEC-114 §2 items 1+3, §3 ("Force-delete is repair, and repair is logged durably" — `repair-log.yaml` schema `{deleted_class_and_id, deleted_at, referrers_at_deletion}`), and §7 AC 1-5 define the target behavior. `docs/FOUNDATIONS.md` §Rule 6 (No Silent Retcons) is the cited alignment.
3. **Cross-artifact shared boundary under audit**: the `DeleteResult` union is mirrored by the web client type (`web/src/api/records.ts:23`) and the beat-template client type (`web/src/api/beat-templates.ts:28`); `deleteRecord` is the shared backend for `beat-templates` too (`src/server/routes/beat-templates.ts:287`). This ticket owns the backend contract; the frontend mirrors land in 003/004.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)** motivates this ticket: a delete that silently archives a record as inactive is an unexplained state change. Hard-delete-or-block makes the outcome explicit, and the persisted `repair-log.yaml` gives force-delete a durable audit trail — the tooling-layer analogue of the no-silent-retcon discipline. An in-memory-only audit entry (SPEC-108's pattern) does not honor it.
5. (was template item 7 — `inactive_default` removal blast radius) Removing the `inactive_default` outcome from the normal backend path has consumers beyond `src/write/records.ts`: `README.md:107` (docs → SPEC114MANSTOSTU-005), `web/src/api/records.ts:26` + `web/src/pages/Records.tsx:398` (→ 003), `web/src/api/beat-templates.ts:29` + `web/src/pages/BeatTemplates.tsx:306` and `src/server/routes/beat-templates.ts` (→ 004), plus the asserting tests `test/write/records.test.ts`, `test/server/records.test.ts`, and `test/capstone-spec101.test.ts` (rewritten in this ticket). The capstone is SPEC-101's AC#5 hybrid-delete test; rewriting it is a deliberate, attributed change to a landed spec's tested behavior (Rule 6), not a silent edit.
6. `specs/SPEC-114-manual-story-studio-mutable-record-delete-lifecycle.md` had current-state prose that became partially historical once the backend landed. This ticket added a dated implementation note instead of rewriting the whole proposal, leaving remaining frontend/docs wording for 003-005.

## Architecture Check

1. Confining the destructive override behind an explicit repair flag + a persisted append-only log keeps the normal flow unambiguous (gone, or told what blocks you) and gives the one destructive path a durable trail — cleaner than the current "archive-as-default + ephemeral audit" because it removes the lingering-inactive surprise and the vanishing-on-reload audit gap in one change.
2. No backwards-compatibility shim: the `inactive_default` outcome is removed outright (not aliased or kept behind a flag); `repair-log.yaml` is net-new infrastructure, not a renamed artifact.

## Verification Layers

1. Unreferenced delete unlinks the file → `test/write/delete-lifecycle.test.ts` asserts the file is gone (codebase/unit).
2. Referenced delete blocks, returns referrer summaries, and does NOT flip `active` → unit assertion reads the record back and asserts `active` unchanged.
3. `inactive_default` no longer reachable on the normal path → grep-proof that the outcome is absent from `src/write/records.ts` + negative unit test.
4. Force-delete (repair flag) unlinks despite referrers AND appends to `repair-log.yaml` → unit test reads the file back after two force-deletes and asserts append (not overwrite).
5. Rule 6 audit-trail durability → `repair-log.yaml` persists across a re-read (FOUNDATIONS alignment check + file-read assertion).

## Landed Changes

### 1. Reworked `deleteRecord` (`src/write/records.ts`)

- Removed the `inactive_default` branch and its member from the backend `DeleteResult` union. Default path is now: unreferenced → `hard_deleted` (unlink); referenced → `blocked` carrying `referrers: Array<{recordClass, summary}>` from the archived SPEC114MANSTOSTU-001 `resolveReferrerSummaries` implementation. Delete no longer writes `active:false` or `retired_reason`.
- Force path (`opts.force === true`) unlinks despite referrers and appends an entry `{deleted_class_and_id, deleted_at, referrers_at_deletion}` to `repair-log.yaml` through `safeWriteFile`. Existing HTTP `auditEntry` remains camelCase for the current caller surface; persisted YAML uses the SPEC-114 snake_case schema.
- Timestamp still uses the injectable `opts.now` for deterministic tests.

### 2. Confined force to repair mode in the records delete route (`src/server/routes/records.ts`)

The route now accepts force-delete only as `?force=true&mode=repair` or with body `{mode:"repair"}` alongside the force query. Plain `?force=true` returns `405 repair-mode-required`; `{confirm:true}` no longer triggers force-delete. The structured `blocked` result passes through verbatim.

### 3. Rewrote delete tests

- `test/write/records.test.ts`: replaced the `inactive_default` assertion with block-on-referrer / no-auto-archive assertions and force-delete repair-log proof.
- `test/server/records.test.ts`: updated route force-delete coverage to prove the repair-mode gate and persisted repair log.
- `test/capstone-spec101.test.ts`: rewrote SPEC-101 AC#5 hybrid-delete assertion from `inactive_default` to the `blocked` outcome with a SPEC-114 attribution comment.
- `test/write/delete-lifecycle.test.ts` (new): full matrix per §7 AC 1-5.

## Files to Touch

- `tools/manual-story-studio/src/write/records.ts` (modify)
- `tools/manual-story-studio/src/server/routes/records.ts` (modify)
- `tools/manual-story-studio/test/write/records.test.ts` (modify)
- `tools/manual-story-studio/test/server/records.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec101.test.ts` (modify)
- `tools/manual-story-studio/test/write/delete-lifecycle.test.ts` (new)
- `specs/SPEC-114-manual-story-studio-mutable-record-delete-lifecycle.md` (modify — dated implementation note)

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
2. `tools/manual-story-studio/test/write/records.test.ts` (modified) — replaced `inactive_default` assertion with block-on-referrer and repair-log assertions.
3. `tools/manual-story-studio/test/server/records.test.ts` (modified) — proves force-delete requires `mode=repair` and writes `repair-log.yaml`.
4. `tools/manual-story-studio/test/capstone-spec101.test.ts` (modified) — rewrote SPEC-101 AC#5 hybrid-delete assertion (Rule 6 attribution).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm run build`
3. Backend `test:backend` is the correct boundary — the delete contract and repair-log are backend-only; the web mirrors are verified in 003/004.

## Outcome

Completed on 2026-06-02.

The backend delete lifecycle now matches SPEC-114 for records:

- unreferenced records hard-delete;
- referenced records return `outcome: "blocked"` with summary-bearing referrers and leave the record file unchanged;
- normal delete never writes `active:false` or `retired_reason`;
- force-delete appends durable audit entries to `repair-log.yaml` and then unlinks the record;
- the records delete route requires explicit repair mode for force-delete.

`specs/SPEC-114-manual-story-studio-mutable-record-delete-lifecycle.md` received a dated implementation note to mark the backend slice as landed while leaving frontend/docs work to active follow-up tickets.

## Verification Result

- `cd tools/manual-story-studio && npm run test:backend` — PASS before edits as baseline: 79 tests passed.
- `cd tools/manual-story-studio && npm run test:backend` — PASS after edits: 80 tests passed, including `dist/test/write/delete-lifecycle.test.js`.
- `cd tools/manual-story-studio && npm run build` — PASS after edits: web install/build and backend `tsc` completed successfully.
- Grep/manual review — PASS: `inactive_default` is absent from `tools/manual-story-studio/src/write/records.ts`; remaining frontend/beat-template/docs references are active 003/004/005 scope, not backend normal-path behavior.

## Deviations

- The route-level explicit repair flag landed as the package's existing repair-mode pattern: `?force=true&mode=repair` (or body `mode: "repair"` with the force query). The old `{confirm:true}` body no longer triggers force-delete.
- The persisted `repair-log.yaml` uses the SPEC-114 snake_case fields. The HTTP `force_deleted.auditEntry` remains camelCase for the current API surface; frontend type/UX cleanup is owned by SPEC114MANSTOSTU-003.
- Beat-template route force gating is still active scope in SPEC114MANSTOSTU-004, so `src/server/routes/beat-templates.ts` still contains the old force trigger until that ticket lands.
