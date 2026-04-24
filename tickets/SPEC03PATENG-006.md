# SPEC03PATENG-006: Apply orchestration — two-phase commit, 3-tier write order, per-world lock, post-apply sync

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — introduces `tools/patch-engine/src/apply.ts` (top-level orchestrator), `src/commit/{order,temp-file,rename}.ts` (commit subtree), and a per-world file lock. No impact on existing world-index or world-mcp code beyond their published interfaces (read-side DB handle, sync CLI).
**Deps**: SPEC03PATENG-002, SPEC03PATENG-003, archive/tickets/SPEC03PATENG-004.md, SPEC03PATENG-005

## Problem

This is the engine's integration point. Tickets 002–005 deliver per-op modules and the approval verifier as independent units. Ticket 006 wires them into the two-phase commit orchestration SPEC-03 §Atomicity model (post-reassessment spec lines 173–189) prescribes:

- Phase A validates everything without writing (approval, content hashes, allocations, anchor checksums, and delegates to SPEC-04 pre-apply validators).
- Phase B stages temp-files per target, fsyncs them, atomically renames, marks the token consumed, and triggers `world-index sync`.

This ticket also implements the 3-tier write order (creates → updates → hybrid-file artifacts) that SPEC-03 §Write-order discipline (lines 145–164) requires, including the auto-add of `append_touched_by_cf` ops whenever an `append_extension` targets a SEC with a new `originating_cf` (spec line 87). Per-world file locking serializes concurrent plans (spec §Risks line 297). Post-apply `world-index sync` dispatch ensures the index reflects engine writes (SPEC-03 line 188 + reassessment M3).

## Assumption Reassessment (2026-04-24)

1. `tools/world-index/src/commands/sync.ts` exports `sync(worldRoot, worldSlug): number` — the engine invokes this programmatically (not as a shelled-out CLI call) after Phase B to avoid subprocess fork overhead and keep the success signal typed. Confirmed via `grep -n "export function sync" tools/world-index/src/commands/sync.ts` at reassessment time.
2. `tools/world-index/src/hash/content.ts` exposes `sha256Hex` and `normalizeProseWhitespace` (confirmed at reassessment). The engine reuses these for content-hash comparisons on atomic records and for body-prose anchor-checksum comparisons on hybrid files.
3. Shared boundary: `tools/patch-engine` consumes `@worldloom/world-index`'s public API — specifically the DB-open helper (exported from `src/index/open.ts`), hash helpers, record-class interfaces, and the `sync` command. It does NOT reach into `src/parse/` or `src/index/` internals. If an API needed by the engine currently lives inside those internals, ticket 006's implementation phase promotes it to `src/public/` as an additive export — flag that promotion as a scope-extending note to reviewers.
4. FOUNDATIONS principle under audit: **Rule 6 No Silent Retcons** at the orchestration layer. The engine's auto-add of `append_touched_by_cf` for SEC `append_extension` ops ensures the structural CF↔SEC bidirectional mapping is never broken by a skill that only remembered to append the extension. Combined with ticket 003's `update_record_field` retcon gate, the two form the engine-level Rule 6 upstream teeth. SPEC-04's `rule6_no_silent_retcons` validator is the pre-apply downstream check (invoked from Phase A step 5).
5. HARD-GATE enforcement surface: the `approval_token` path here IS the HARD-GATE's cryptographic enforcement. Phase A step 1 invokes ticket 005's `verifyApprovalToken`. No apply path skips this check; there is no "dry-run bypass" in production code (test fixtures use their own test-mode scaffolding).
6. Rename/removal blast radius: `tools/patch-engine/README.md` currently documents the pre-SPEC-13 op vocabulary (pre-migration) and must be rewritten as part of this ticket (or at latest ticket 007) to match the post-SPEC-13 atomic-record vocabulary. Leaving the stale README in place would silently contradict the engine it documents.
7. Adjacent contradictions: the pre-SPEC-13 pattern of inter-step checkpoint-grep commands inside `canon-addition/SKILL.md` (cited by SPEC-03 Problem Statement line 11) becomes obsolete once this ticket's atomicity model is in place. Removing the checkpoint-grep commands is SPEC-06 Phase 2 work (not this ticket). Classification: **future cleanup, separate ticket in SPEC-06**.

## Architecture Check

1. Single entry point `apply.ts` exporting `submitPatchPlan(envelope, approval_token, opts?)` makes the engine's public surface uniform and minimal. `apply.ts` also re-exports the `PatchReceipt` type from `src/envelope/schema.ts`, because `tools/patch-engine/package.json` points the package root at `dist/src/apply.js` / `dist/src/apply.d.ts` and ticket 007 imports both `submitPatchPlan` and `PatchReceipt` from `@worldloom/patch-engine`.
2. Write-order tier ordering lives in `commit/order.ts` as a pure function `reorderPatches(patches: PatchOperation[]): PatchOperation[]` — tested in isolation, independent of disk I/O. The auto-add of `append_touched_by_cf` for SEC `append_extension` ops happens here too, since it is a patch-list transformation.
3. Per-target temp-file staging (`commit/temp-file.ts`) separates the stage step (executing each op's `stage*()` function to produce a `StagedWrite`) from the commit step (`commit/rename.ts` fsyncs + renames). If any op's stage fails, no temp files have been created for earlier ops in the same batch (each op writes its temp file atomically at stage time; if stage fails mid-batch, the orchestrator unlinks all already-staged temp files before returning the error).
4. Per-world file lock via `<worldRoot>/worlds/<slug>/_index/.patch-engine.lock` (flock-style advisory lock on POSIX; the engine opens the file with `O_WRONLY | O_CREAT | O_EXCL` semantics for lock acquisition, falls back to fail-fast on contention returning `{code: 'world_locked'}`). The lock is in `_index/` (gitignored) rather than `_source/` to keep the source tree clean.
5. `world-index sync` is called programmatically after Phase B rename completes. If sync fails, the receipt still reports success for the apply — the sync is an index-refresh, not a storage-commit. (Storage is the source of truth; index is derived.) Sync failure is surfaced in the receipt as `index_sync_duration_ms: -1` plus a separate `index_sync_error?` field, not as a rollback trigger.
6. No backwards-compatibility aliasing/shims introduced. The pre-SPEC-13 compile-step path is absent; atomic records ARE canonical form.

## Verification Layers

1. Two-phase commit holds (no partial writes on any failure) -> integration test (ticket 009 fault-injects at Phase A step 2, Phase B temp-write, Phase B rename; disk unchanged from Phase A start in all cases).
2. 3-tier write order enforced regardless of patch-list order -> integration test (ticket 009 submits a plan with `append_adjudication_record` first and `create_cf_record` last; verifies on-disk state matches the canonical create → update → hybrid order).
3. `append_touched_by_cf` auto-add triggers when `append_extension` targets a SEC with a new `originating_cf` -> integration test (ticket 009 submits a plan with `append_extension` alone; verifies the applied plan also wrote `touched_by_cf[]` with the new CF-ID).
4. Per-world write lock serializes concurrent plans -> integration test (ticket 009 fork-writes two plans against the same world; second plan errors with `{code: 'world_locked'}` OR waits, depending on `opts.lock_mode`).
5. Post-apply `world-index sync` triggered and successful -> integration test (ticket 009 applies a plan creating new CF + SEC records; verifies `find_sections_touched_by(new_cf_id)` after apply returns the new SEC, proving sync refreshed the index).
6. Approval token gates the apply -> unit test (ticket 008 submits a plan with an expired token; apply.ts returns `approval_expired` without staging any temp files).
7. Retcon attestation enforced at the orchestrator's envelope validation (in addition to ticket 003's op-level check) -> unit test (ticket 008 submits a plan with `update_record_field` on `CF-0001.statement` without attestation; apply.ts rejects at Phase A).

## What to Change

### 1. Create `tools/patch-engine/src/commit/order.ts`

Export `reorderPatches(patches: PatchOperation[]): PatchOperation[]`:
- Tier 1: all `create_*` ops (preserve relative order from input).
- Tier 2: all `update_record_field` / `append_extension` / `append_touched_by_cf` / `append_modification_history_entry` ops (preserve relative order from input).
- Tier 3: all `append_adjudication_record` / `append_character_record` / `append_diegetic_artifact_record` ops (preserve relative order from input).

Export `autoAddTouchedByCfOps(patches: PatchOperation[], ctx: OpContext): PatchOperation[]`:
- For each `append_extension` op targeting a SEC record (resolve `target_record_id` → record class via `ctx.db`):
  - Read current `touched_by_cf[]` from the SEC file on disk.
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
9. Delegate to SPEC-04 validator framework with `mode: 'pre-apply'`. Any fail → release lock, return validator verdicts.
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

## Files to Touch

- `tools/patch-engine/src/apply.ts` (new)
- `tools/patch-engine/src/commit/order.ts` (new)
- `tools/patch-engine/src/commit/temp-file.ts` (new)
- `tools/patch-engine/src/commit/rename.ts` (new)
- `tools/patch-engine/src/commit/lock.ts` (new)
- `tools/patch-engine/README.md` (modify — replace pre-SPEC-13 content)

## Out of Scope

- world-mcp integration (updating `submit-patch-plan.ts` to import `submitPatchPlan` from this package) — ticket 007.
- Per-op unit tests — ticket 008.
- Integration/acceptance tests (end-to-end canon-addition replay, atomicity injection, drift, approval-token cases, write-order pathological ordering, post-apply sync integration, perf gate) — ticket 009.
- Cross-plan merge, rollback/undo, time-travel queries — spec §Out of Scope lines 299–311.
- SPEC-04 `record_schema_compliance` validator implementation — SPEC-04's scope; this ticket invokes the validator framework but does not implement individual validators.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build` exits 0 with all 5 new files + README update.
2. `grep -n "^export function submitPatchPlan" tools/patch-engine/src/apply.ts` returns 1 match.
3. `grep -n "^export function reorderPatches\|^export function autoAddTouchedByCfOps" tools/patch-engine/src/commit/order.ts` returns 2.
4. `grep -n "export type { PatchReceipt }" tools/patch-engine/src/apply.ts` returns 1 match (package root exposes the receipt type for ticket 007's import).
5. `grep -c "insert_before_node\|append_cf_record\|replace_yaml_field" tools/patch-engine/README.md` returns 0 (pre-SPEC-13 op names eliminated from docs).

### Invariants

1. **Two-phase commit holds**: any failure in Phase A leaves disk unchanged; any failure in Phase B leaves only the subset of renames that completed before the failure (forward-only; restoration via git).
2. **Write-order tiers enforced by engine, not caller**: regardless of patch-list input order, `reorderPatches` produces a canonical Tier 1 → Tier 2 → Tier 3 sequence.
3. **`append_touched_by_cf` auto-add is idempotent**: if the caller already included the correct `append_touched_by_cf` op, `autoAddTouchedByCfOps` does not duplicate it (same `(target_sec_id, cf_id)` short-circuits).
4. **Per-world lock prevents concurrent writes**: a second apply against the same world while one is in progress either waits (default) or fails-fast with `world_locked`, based on `opts.lock_mode`.
5. **Approval token consumed atomically with apply**: `markTokenConsumed` runs after `commitStaged` succeeds, inside a path that cannot observe a half-applied state.
6. **Post-apply `world-index sync` runs programmatically** (not via subprocess) so the apply result is typed; sync failure is surfaced in the receipt without rolling back the apply.
7. **SPEC-03 Rule 6 structural attribution preserved**: every `append_extension` on a SEC triggers `append_touched_by_cf` auto-add; `update_record_field` on structural CF fields requires `retcon_attestation`.

## Test Plan

### New/Modified Tests

1. `None — orchestration module; behavioral testing is split between ticket 008 (per-op unit tests including retcon gate + auto-add + approval) and ticket 009 (integration / acceptance capstone exercising every SPEC-03 §Verification bullet).`

### Commands

1. `cd tools/patch-engine && npm run build` (targeted).
2. `grep -c "await acquirePerWorldLock\|await verifyApprovalToken\|await stageAllOps\|await commitStaged\|await markTokenConsumed\|sync(" tools/patch-engine/src/apply.ts` should equal 6 (confirms every Phase A/B step is wired; no silent omission).
3. `node -e "const p = require('./tools/patch-engine/package.json'); process.exit(p.main === 'dist/src/apply.js' && p.types === 'dist/src/apply.d.ts' ? 0 : 1)"` exits 0, and `grep -n "export type { PatchReceipt }" tools/patch-engine/src/apply.ts` returns 1.
4. Post-apply sync dry-run: invoke `submitPatchPlan` against a fixture world with a no-op patch (e.g., `append_touched_by_cf` with a CF-ID already present); confirm `receipt.index_sync_duration_ms >= 0` and the fixture's `_index/world.db` timestamp advanced.
