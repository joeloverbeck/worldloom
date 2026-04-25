# SPEC03PATENG-006: Apply orchestration — two-phase commit, 3-tier write order, per-world lock, post-apply sync

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — introduces `tools/patch-engine/src/apply.ts` (top-level orchestrator), `src/commit/{order,temp-file,rename,lock}.ts` (commit subtree), promotes the required `@worldloom/world-index` subpath exports, and updates the patch-engine/tooling READMEs. No world-mcp rewire yet; ticket 007 owns MCP delegation.
**Deps**: SPEC03PATENG-002, SPEC03PATENG-003, archive/tickets/SPEC03PATENG-004.md, archive/tickets/SPEC03PATENG-005.md

## Problem

This is the engine's integration point. Tickets 002–005 deliver per-op modules and the approval verifier as independent units. Ticket 006 wires them into the two-phase commit orchestration SPEC-03 §Atomicity model (post-reassessment spec lines 173–189) prescribes:

- Phase A validates everything without writing (approval, content hashes, allocations, anchor checksums, and delegates to SPEC-04 pre-apply validators).
- Phase B stages temp-files per target, fsyncs them, atomically renames, marks the token consumed, and triggers `world-index sync`.

This ticket also implements the 3-tier write order (creates → updates → hybrid-file artifacts) that SPEC-03 §Write-order discipline (lines 145–164) requires, including the auto-add of `append_touched_by_cf` ops whenever an `append_extension` targets a SEC with a new `originating_cf` (spec line 87). Per-world file locking serializes concurrent plans (spec §Risks line 297). Post-apply `world-index sync` dispatch ensures the index reflects engine writes (SPEC-03 line 188 + reassessment M3).

## Assumption Reassessment (2026-04-25)

1. `tools/world-index/src/commands/sync.ts` exports `sync(worldRoot, worldSlug): number`, `tools/world-index/src/index/open.ts` exports `openExistingIndex`, and `tools/world-index/src/hash/content.ts` exposes hash helpers, but `@worldloom/world-index` only exported `./public/types` at intake. Correction: this ticket promotes `./commands/sync`, `./index/open`, and `./hash/content` as additive package exports in `tools/world-index/package.json` so patch-engine consumes a real public API instead of private paths.
2. `tools/patch-engine/package.json` already points the package root at `dist/src/apply.js` / `dist/src/apply.d.ts`, but `src/apply.ts` did not exist at intake. Correction: this ticket creates the package-root entrypoint and re-exports `PatchReceipt`.
3. Shared boundary: `tools/patch-engine` consumes `@worldloom/world-index`'s public API — specifically the DB-open helper, sync command, hash helpers, and record-class interfaces. No `src/parse/` internals are consumed.
4. FOUNDATIONS principle under audit: **Rule 6 No Silent Retcons** at the orchestration layer. The engine's auto-add of `append_touched_by_cf` for SEC `append_extension` ops ensures the structural CF↔SEC bidirectional mapping is never broken by a skill that only remembered to append the extension. Combined with ticket 003's `update_record_field` retcon gate, the two form the engine-level Rule 6 upstream teeth. SPEC-04's `rule6_no_silent_retcons` validator is the pre-apply downstream check (invoked from Phase A step 5).
5. HARD-GATE enforcement surface: the `approval_token` path here IS the HARD-GATE's cryptographic enforcement. Phase A invokes ticket 005's verifier before any stage/write path.
6. SPEC-04 validator framework is not implemented in the live repo (`tools/validators/README.md` still says not yet implemented; `world-mcp` returns `validator_unavailable`). Correction: `submitPatchPlan` fails closed with `validator_unavailable` at the pre-apply validator step. This preserves the HARD-GATE/validator boundary without pretending a no-op validator is enforcement. Ticket 009 or SPEC-04 follow-up must replace the sentinel once validators exist.
7. Rename/removal blast radius: `tools/patch-engine/README.md` documented the pre-SPEC-13 op vocabulary and was rewritten here. Adjacent `tools/README.md` status was also updated so package-level docs no longer say patch-engine is wholly unimplemented.
8. Adjacent contradictions: the pre-SPEC-13 pattern of inter-step checkpoint-grep commands inside `canon-addition/SKILL.md` (cited by SPEC-03 Problem Statement line 11) becomes obsolete once the full write path is live. Removing the checkpoint-grep commands is SPEC-06 Phase 2 work (not this ticket). Classification: **future cleanup, separate ticket in SPEC-06**.

## Architecture Check

1. Single entry point `apply.ts` exporting `submitPatchPlan(envelope, approval_token, opts?)` makes the engine's public surface uniform and minimal. `apply.ts` also re-exports the `PatchReceipt` type from `src/envelope/schema.ts`, because `tools/patch-engine/package.json` points the package root at `dist/src/apply.js` / `dist/src/apply.d.ts` and ticket 007 imports both `submitPatchPlan` and `PatchReceipt` from `@worldloom/patch-engine`.
2. Write-order tier ordering lives in `commit/order.ts` as a pure function `reorderPatches(patches: PatchOperation[]): PatchOperation[]` — tested in isolation, independent of disk I/O. The auto-add of `append_touched_by_cf` for SEC `append_extension` ops happens here too, since it is a patch-list transformation.
3. Per-target temp-file staging (`commit/temp-file.ts`) separates the stage step (executing each op's `stage*()` function to produce a `StagedWrite`) from the commit step (`commit/rename.ts` fsyncs + renames). If any op's stage fails, no temp files have been created for earlier ops in the same batch (each op writes its temp file atomically at stage time; if stage fails mid-batch, the orchestrator unlinks all already-staged temp files before returning the error).
4. Per-world file lock via `<worldRoot>/worlds/<slug>/_index/.patch-engine.lock` (flock-style advisory lock on POSIX; the engine opens the file with `O_WRONLY | O_CREAT | O_EXCL` semantics for lock acquisition, falls back to fail-fast on contention returning `{code: 'world_locked'}`). The lock is in `_index/` (gitignored) rather than `_source/` to keep the source tree clean.
5. `world-index sync` is wired programmatically after Phase B rename completes. If sync fails, the receipt still reports success for the apply — the sync is an index-refresh, not a storage-commit. (Storage is the source of truth; index is derived.) Sync failure is surfaced in the receipt as `index_sync_duration_ms: -1` plus a separate `index_sync_error?` field once the validator gate is live enough for successful applies.
6. No backwards-compatibility aliasing/shims introduced. The pre-SPEC-13 compile-step path is absent; atomic records ARE canonical form.

## Verification Layers

1. Two-phase commit wiring exists -> targeted build + codebase grep-proof for `acquirePerWorldLock`, `stageAllOps`, `commitStaged`, token consumption, and `sync`.
2. 3-tier write order enforced regardless of patch-list order -> codebase grep-proof for `reorderPatches`; behavioral test remains ticket 008/009.
3. `append_touched_by_cf` auto-add triggers when `append_extension` targets a SEC with a new `originating_cf` -> codebase grep-proof for `autoAddTouchedByCfOps`; behavioral test remains ticket 008/009.
4. Per-world write lock serializes concurrent plans -> codebase grep-proof for `acquirePerWorldLock`; contention test remains ticket 009.
5. Post-apply `world-index sync` is wired programmatically -> build + codebase grep-proof. Successful post-apply sync cannot be truthfully smoke-tested yet because apply fails closed until SPEC-04 validators exist.
6. Approval token gates the apply -> build + codebase grep-proof for the verifier call path; ticket 008 owns the verdict matrix.
7. Retcon attestation remains enforced by ticket 003's op-level `stageUpdateRecordField`; ticket 008 owns direct behavioral proof.

## What to Change

### 1. Create `tools/patch-engine/src/commit/order.ts`

Export `reorderPatches(patches: PatchOperation[]): PatchOperation[]`:
- Tier 1: all `create_*` ops (preserve relative order from input).
- Tier 2: all `update_record_field` / `append_extension` / `append_touched_by_cf` / `append_modification_history_entry` ops (preserve relative order from input).
- Tier 3: all `append_adjudication_record` / `append_character_record` / `append_diegetic_artifact_record` ops (preserve relative order from input).

Export `autoAddTouchedByCfOps(patches: PatchOperation[], ctx: OpContext): PatchOperation[]`:
- For each `append_extension` op targeting a SEC record (resolve `target_record_id` → record class via `ctx.db`):
  - Read current `touched_by_cf[]` through the world-index `patched_by` edge for the SEC.
  - If `op.payload.extension.originating_cf` is NOT in `touched_by_cf[]`, append a new `{op: 'append_touched_by_cf', target_sec_id: op.target_record_id, cf_id: op.payload.extension.originating_cf}` op to the patch list (injected into Tier 2 immediately after the triggering `append_extension` op).
- Ops targeting non-SEC records do not trigger auto-add.

### 2. Create `tools/patch-engine/src/commit/temp-file.ts`

Export `stageAllOps(envelope: PatchPlanEnvelope, ctx: OpContext): Promise<{staged: StagedWrite[]; error?: EngineError}>`:
- Dispatches each op in the reordered patch list to its corresponding `stage*()` function from tickets 002/003/004.
- Collects all `StagedWrite` results. On any op failure, unlinks all temp files created so far and returns the error.

### 3. Create `tools/patch-engine/src/commit/rename.ts`

Export `commitStaged(staged: StagedWrite[]): Promise<void>`:
- For each `StagedWrite`: `fsync(temp_fd)`, `rename(temp_file_path, target_file_path)` (atomic on POSIX).
- If any rename fails, the already-renamed writes are in place (POSIX rename is individually atomic; the full commit is NOT transactionally atomic across multiple files). This is the deliberate failure mode SPEC-03 §Atomicity model accepts — restoration of partial commits is via `git` (§Out of Scope).
- Export `unlinkAllTempFiles(staged: StagedWrite[]): Promise<void>` for Phase A failure cleanup.

### 4. Create `tools/patch-engine/src/commit/lock.ts`

Export `acquirePerWorldLock(worldRoot: string, worldSlug: string): {ok: true; release: () => void} | {ok: false; code: 'world_locked'}`. POSIX flock-style advisory lock on `<worldRoot>/worlds/<worldSlug>/_index/.patch-engine.lock`. Lock path in `_index/` (gitignored) so the lock file is never tracked.

### 5. Create `tools/patch-engine/src/apply.ts`

Export `submitPatchPlan(envelope: PatchPlanEnvelope, approval_token: string, opts?: {worldRoot?: string}): Promise<PatchReceipt | EngineError>`:

Also re-export `PatchReceipt` from `./envelope/schema.js` so the package root exposes the output type once `dist/src/apply.d.ts` is emitted.

**Phase A — Validate (no writes)**:
1. Structural envelope validation via `validateEnvelopeShape` (ticket 001).
2. Acquire per-world lock via `acquirePerWorldLock` (this ticket).
3. Open SQLite handle (`openWorldIndexDb(worldRoot, envelope.target_world)` from world-index).
4. Load HMAC secret from `tools/world-mcp/.secret`.
5. Verify approval token via `verifyApprovalToken` (ticket 005). Failure → release lock, return verdict.
6. For each op: verify `expected_content_hash` matches disk state (atomic records) OR `expected_anchor_checksum` matches body prose (hybrid files). Drift → release lock, return `record_hash_drift` / `anchor_drift` error.
7. Verify `expected_id_allocations` still match `allocate_next_id` (re-query SPEC-02). Race → release lock, return `id_allocation_race` error.
8. For each `update_record_field` op with a structural field-path: verify `retcon_attestation` present (delegates to ticket 003's op-level check — orchestrator surfaces the error early).
9. Delegate to SPEC-04 validator framework with `mode: 'pre-apply'`. In the current repo, SPEC-04 is not implemented, so the orchestrator fails closed with `validator_unavailable` before staging. Any future validator fail → release lock, return validator verdicts.
10. Apply `autoAddTouchedByCfOps` to the patch list.
11. Apply `reorderPatches` to the patch list.

**Phase B — Apply**:
1. `stageAllOps` — produces `StagedWrite[]` with temp files on disk. Failure → release lock, unlink temps, return error.
2. `commitStaged` — fsync + rename. Failure mid-batch → temp files that were never renamed are unlinked; the renamed subset is left on disk (forward-only, per spec).
3. `markTokenConsumed` (ticket 005).
4. Release per-world lock.
5. `sync(worldRoot, envelope.target_world)` from world-index — post-apply index refresh.
6. Assemble and return `PatchReceipt` including `files_written[]`, `new_nodes[]`, `id_allocations_consumed`, `index_sync_duration_ms`.

### 6. Rewrite `tools/patch-engine/README.md`

Replace the pre-SPEC-13 op-vocabulary documentation with a thin pointer to SPEC-03 + a one-paragraph summary of the public surface (`submitPatchPlan(envelope, token)`). Remove the misleading op list (`insert_before_node` etc.) — those ops do not exist in this package.

### 7. Promote required `world-index` subpath exports

Add package exports for `./commands/sync`, `./index/open`, and `./hash/content` in `tools/world-index/package.json`. This keeps patch-engine on a public producer contract while avoiding parser/index internals.

## Files to Touch

- `tools/patch-engine/src/apply.ts` (new)
- `tools/patch-engine/src/commit/order.ts` (new)
- `tools/patch-engine/src/commit/temp-file.ts` (new)
- `tools/patch-engine/src/commit/rename.ts` (new)
- `tools/patch-engine/src/commit/lock.ts` (new)
- `tools/patch-engine/README.md` (modify — replace pre-SPEC-13 content)
- `tools/world-index/package.json` (modify — additive subpath exports)
- `tools/README.md` (modify — status truthing)

## Out of Scope

- world-mcp integration (updating `submit-patch-plan.ts` to import `submitPatchPlan` from this package) — ticket 007.
- Per-op unit tests — ticket 008.
- Integration/acceptance tests (end-to-end canon-addition replay, atomicity injection, drift, approval-token cases, write-order pathological ordering, post-apply sync integration, perf gate) — ticket 009.
- Cross-plan merge, rollback/undo, time-travel queries — spec §Out of Scope lines 299–311.
- SPEC-04 `record_schema_compliance` validator implementation — SPEC-04's scope; this ticket invokes the validator framework but does not implement individual validators.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build` exits 0 with all 6 new files + README update.
2. `grep -n "^export function submitPatchPlan" tools/patch-engine/src/apply.ts` returns 1 match.
3. `grep -n "^export function reorderPatches\|^export function autoAddTouchedByCfOps" tools/patch-engine/src/commit/order.ts` returns 2.
4. `grep -n "export type { PatchReceipt }" tools/patch-engine/src/apply.ts` returns 1 match (package root exposes the receipt type for ticket 007's import).
5. `grep -c "insert_before_node\|append_cf_record\|replace_yaml_field" tools/patch-engine/README.md` returns 0 (pre-SPEC-13 op names eliminated from docs).

### Invariants

1. **Two-phase commit holds**: any failure in Phase A leaves disk unchanged; any failure in Phase B leaves only the subset of renames that completed before the failure (forward-only; restoration via git).
2. **Write-order tiers enforced by engine, not caller**: regardless of patch-list input order, `reorderPatches` produces a canonical Tier 1 → Tier 2 → Tier 3 sequence.
3. **`append_touched_by_cf` auto-add is idempotent**: if the caller already included the correct `append_touched_by_cf` op, `autoAddTouchedByCfOps` does not duplicate it (same `(target_sec_id, cf_id)` short-circuits).
4. **Per-world lock prevents concurrent writes**: a second apply against the same world while one is in progress either waits (default) or fails-fast with `world_locked`, based on `opts.lock_mode`.
5. **Approval token consumed after apply**: `markTokenConsumed` runs only after `commitStaged` succeeds.
6. **Post-apply `world-index sync` runs programmatically** (not via subprocess) so the apply result is typed; sync failure is surfaced in the receipt without rolling back the apply.
7. **SPEC-03 Rule 6 structural attribution preserved**: every `append_extension` on a SEC triggers `append_touched_by_cf` auto-add; `update_record_field` on structural CF fields requires `retcon_attestation`.

## Test Plan

### New/Modified Tests

1. `None — orchestration module; behavioral testing is split between ticket 008 (per-op unit tests including retcon gate + auto-add + approval) and ticket 009 (integration / acceptance capstone exercising every SPEC-03 §Verification bullet).`

### Commands

1. `cd tools/patch-engine && npm run build` (targeted).
2. `grep -n "verifyToken\|consumeApprovalToken" tools/patch-engine/src/apply.ts` confirms the approval verifier and token-consumption call path is wired.
3. `node -e "const p = require('./tools/patch-engine/package.json'); process.exit(p.main === 'dist/src/apply.js' && p.types === 'dist/src/apply.d.ts' ? 0 : 1)"` exits 0, and `grep -n "export type { PatchReceipt }" tools/patch-engine/src/apply.ts` returns 1.
4. `node -e "const m = require('./tools/patch-engine/dist/src/apply.js'); if (typeof m.submitPatchPlan !== 'function') process.exit(1); console.log(typeof m.submitPatchPlan)"` prints `function`.

## Outcome

Completed: 2026-04-25.

Implemented the patch-engine public entrypoint and orchestration modules:

1. `tools/patch-engine/src/apply.ts` now exports `submitPatchPlan` and re-exports `PatchReceipt`.
2. `tools/patch-engine/src/commit/order.ts` implements 3-tier ordering plus SEC `append_extension` -> `append_touched_by_cf` auto-add.
3. `tools/patch-engine/src/commit/temp-file.ts`, `rename.ts`, and `lock.ts` provide staging dispatch, fsync/rename commit, temp cleanup, and per-world lock acquisition.
4. `tools/patch-engine/README.md` now documents the post-SPEC-13 surface instead of retired pre-SPEC-13 ops.
5. `tools/world-index/package.json` now exposes the needed public subpaths for patch-engine consumption.

`submitPatchPlan` fails closed with `validator_unavailable` at the SPEC-04 pre-apply step because the validator framework is not implemented in this repo yet. That is intentional for this ticket: the engine no longer silently lacks an entrypoint, but it also does not bypass the validator gate.

## Verification Result

1. `cd tools/patch-engine && npm run build` — passed.
2. `cd tools/world-index && npm run build` — passed.
3. `grep -n "^export function submitPatchPlan" tools/patch-engine/src/apply.ts` — found the exported package entrypoint.
4. `grep -n "^export function reorderPatches\|^export function autoAddTouchedByCfOps" tools/patch-engine/src/commit/order.ts` — returned both exported functions.
5. `grep -n "export type { PatchReceipt }" tools/patch-engine/src/apply.ts` — found the receipt re-export.
6. `grep -c "insert_before_node\|append_cf_record\|replace_yaml_field" tools/patch-engine/README.md` — returned 0.
7. `node -e "const p = require('./tools/patch-engine/package.json'); process.exit(p.main === 'dist/src/apply.js' && p.types === 'dist/src/apply.d.ts' ? 0 : 1)"` — passed.
8. `node -e "const m = require('./tools/patch-engine/dist/src/apply.js'); if (typeof m.submitPatchPlan !== 'function') process.exit(1); console.log(typeof m.submitPatchPlan)"` — printed `function`.
9. `node -e "const p = require('./tools/world-index/package.json'); for (const k of ['./index/open','./commands/sync','./hash/content']) if (!p.exports[k]) process.exit(1)"` — passed.
10. From `tools/patch-engine`: `node -e "for (const p of ['@worldloom/world-index/index/open','@worldloom/world-index/commands/sync','@worldloom/world-index/hash/content']) { const m = require(p); if (!m) process.exit(1); } console.log('ok')"` — printed `ok`.

## Deviations

1. The drafted post-apply sync dry-run was not run because a successful apply would require bypassing SPEC-04 validators, which are not implemented yet. The landed behavior fails closed with `validator_unavailable`; ticket 009/SPEC-04 should replace that sentinel with real pre-apply validation before successful mutation proof.
2. The drafted proof command counting orchestration calls was brittle because it also counted import lines. Closeout used build proof plus focused grep checks for the entrypoint, order functions, receipt re-export, package metadata, README cleanup, and runtime importability.
3. `tools/README.md` was updated as same-seam documentation fallout so repo-level tool status no longer claims patch-engine is wholly unimplemented.
