# patch-engine

Deterministic patch applier for the SPEC-03 write path. The package entrypoint is `submitPatchPlan(envelope, approvalToken, opts?)`, exported from `src/apply.ts` and emitted at `dist/src/apply.js`.

The engine consumes post-SPEC-13 atomic-record patch plans, verifies the HARD-GATE approval token, stages writes through temp files, commits with atomic per-file rename, consumes the token, and triggers `world-index sync` after storage commit. Canonical storage remains `worlds/<slug>/_source/`; `_index/world.db` is derived and may be regenerated.

Design authority: `archive/specs/SPEC-03-patch-engine.md`, amended by `specs/SPEC-14-pa-contract-and-vocabulary-reconciliation.md` for adjudication frontmatter and bidirectional CF/SEC checks.

## Public Surface

- `submitPatchPlan(envelope, approvalToken, opts?)`
- `canonicalOpHash(op)` for approval-token hash construction and cross-package tests
- `PatchReceipt`

The operation vocabulary is the SPEC-03 post-SPEC-13 vocabulary: `create_*` record ops, `update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`, and the three hybrid-file append ops for adjudications, characters, and diegetic artifacts. Per SPEC-14, adjudication frontmatter uses `pa_id` and the shared canonical verdict enum. Section-to-CF writes through `append_touched_by_cf` or section-target `append_extension` reject pointers whose target CF does not list the section `file_class` in `required_world_updates`.

## Write Order

The orchestrator controls write order:

1. Create atomic records.
2. Update or append to existing atomic records.
3. Write hybrid-file artifacts.

Callers do not rely on patch-list order for correctness. `append_extension` on a section auto-adds the originating CF to `touched_by_cf[]` when it is not already attached.

Staging keeps an in-memory overlay of earlier same-plan atomic creates and updates. This lets later operations validate against post-overlay records before any source write is committed.

## Atomicity

Phase A validates without source writes. Phase B writes temp files, fsyncs them, and renames each temp file over its target. Per-file rename is atomic; a mid-commit failure is forward-only and leaves the successfully renamed subset in place, with recovery via git rather than engine rollback.
