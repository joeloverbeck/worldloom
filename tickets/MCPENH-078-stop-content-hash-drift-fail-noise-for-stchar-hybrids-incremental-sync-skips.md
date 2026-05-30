# MCPENH-078: Stop `content_hash_drift` `severity: fail` noise for STCHAR hybrids that incremental `sync` skips

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/commands/sync.ts` (extend incremental sync to STCHAR hybrids) AND/OR `tools/world-index/src/commands/verify.ts` (refine `content_hash_drift` severity when the at-call-boundary auto-resync has already neutralized the drift). One focused `world-index` test plus one regression test on the verify ledger.
**Deps**: `archive/tickets/MCPENH-063.md` (added `story-characters` to inventory + at-call-boundary auto-resync); `archive/tickets/MCPENH-037.md` (extend world-index inventory with story-bundle markdown paths — establishes the parser-registered-but-enumerator-omitted pattern this ticket extends).

## Problem

`get_context_packet` for `task_type: story_turn_cycle` returns `task_header.open_risks` populated with 60+ `severity: fail` entries of `code: content_hash_drift` for STCHAR-1 / STCHAR-2 / STCHAR-3 and every child section anchor (`Stable Persona Core`, `Emotional Appraisal Map`, `Pressure Behavior`, ten more per profile). Observed during the 2026-05-30 `branching-story-turn-cycle` exercise on `red-bunny`:

```
{"severity":"fail","code":"content_hash_drift","message":"Indexed node 'red-bunny:STCHAR-3' is no longer produced by the parser.", ...}
{"severity":"fail","code":"content_hash_drift","message":"Node 'erotica-world:STCHAR-3.md:Validation / Audit Anchors:bullet-cluster:0:0' exists on disk but not in the index.", ...}
# ... 60+ similar entries across STCHAR-1, STCHAR-2, STCHAR-3 ...
```

These same STCHAR records were retrieved correctly throughout the run via `get_record(record_id='STCHAR-N', section_path='body.<section>')`, returning the right operational content. The `severity: fail` signal is therefore a **false-fail** for any caller that only uses `section_path` projection — exactly the path the `branching-story-turn-cycle` SKILL.md HARD-GATE (a) mandates: *"Direct `Read` on STCHAR `.md` hybrid files is NOT a sanctioned fallback … `section_path` projection is the only mechanism that delivers the targeted operational sections."*

Two operational costs:

1. **Real-fail masking.** Every `story_turn_cycle` and `story_bootstrap` packet call publishes 60+ `severity: fail` entries that the operator must visually skip. A genuine `severity: fail` (a hook block, a structural mis-write, a real content_hash_drift on a non-STCHAR record) is buried in the noise.
2. **MEMORY-confirmed sync gap.** Per `MEMORY.md` entry `project_stchar_index_sync_gap`: *"world-index incremental sync skips STCHAR hybrid files; run full build if get_record(STCHAR-N) 404s on disk-present files."* MCPENH-063 added at-call-boundary auto-resync for parser-registration drift but did not extend the standalone `sync` command to refresh STCHAR hybrid content, and did not lower the verify-ledger severity when the at-call-boundary auto-resync has already healed the drift.

## Assumption Reassessment (2026-05-30)

1. `tools/world-index/src/commands/sync.ts` (the only file under `tools/world-index/src/` matching `*sync*`) has zero matches for `STCHAR`, `story_character_authority`, or `story-character` — confirmed via grep. Incremental sync therefore does not touch STCHAR hybrid records when they are rewritten by `supersede_story_character_authority_record` (or the analogous create/append ops). `tools/world-index/src/commands/verify.ts:180` hardcodes `severity: "fail"` for `code: "content_hash_drift"` in `createDriftResult`, with no severity-attenuation path when the at-call-boundary auto-resync has already updated the index.
2. `docs/FOUNDATIONS.md` §Story Bundles §6.1 (Story-Local Character Authority): *"Normal story runtime consumes active `STCHAR` profiles, not world `CHAR` dossiers."* The hybrid is operationally load-bearing; its verify-ledger health is a story-pipeline operational concern, not a niche surface. `docs/MACHINE-FACING-LAYER.md` documents `get_record(record_id, section_path)` as the canonical reader for hybrid records; the SKILL.md HARD-GATE elevates this to a mandatory path for STCHAR.
3. Cross-package boundary under audit: the read path (`get_record(section_path=...)` via `tools/world-mcp/`) and the integrity path (`world-index` verify ledger + `sync` command) cross at the same STCHAR hybrid surface. Both must hold the same truth — the read path is healthy at HEAD; the integrity path is not.
4. FOUNDATIONS Rule 6 (No Silent Retcons) governs append-only canon and change-log discipline; it does not directly govern derived-index integrity. However, the read/integrity divergence is a *failure of the derived-index contract* to remain in sync with append-only mutations, which is the operational substrate Rule 6 depends on. Treating the false-fail entries as benign without code change risks the operator dismissing a future *real* `content_hash_drift` that signals an actual append-only-discipline violation.
5. This ticket does NOT touch HARD-GATE semantics. The SKILL.md HARD-GATE (a) section_path mandate stands; this ticket repairs the derived-index integrity so the HARD-GATE's path is consistent with the index-verify ledger.
7. No symbol rename; the change is additive in `sync.ts` (extend the incremental walker to cover STCHAR hybrids alongside the world `CHAR` hybrids already handled by the full `build`) and/or refined in `verify.ts` (`createDriftResult` learns a "drift already neutralized at call boundary" path that downgrades severity).
8. Adjacent contradictions:
   - World `CHAR` hybrid records may have the same incremental-sync gap; in scope if discovered during implementation, otherwise a sibling ticket.
   - Other hybrid record classes (world `DA`, `PA`, story `DA`) may have analogous gaps; out of scope for this ticket — verify and file siblings as discovered.

## Architecture Check

1. The root cause is single-surface: the incremental `sync` walker does not enumerate STCHAR hybrid files. Adding STCHAR hybrids to the incremental walker (mirroring the pattern in the full `build` command, and the MCPENH-063 inventory-classification fix that added `story-characters` to `STORY_BUNDLE_MARKDOWN_DIRECTORIES`) is a direct, contained fix. A complementary verify-ledger severity refinement (`severity: info` when at-call-boundary auto-resync has already neutralized the drift) makes the ledger honest about the post-MCPENH-063 reality.
2. No backwards-compatibility shim is introduced. The fix is forward-only: the incremental walker stops skipping STCHAR, and the verify-ledger severity reflects post-auto-resync state. Any pre-fix index database is correctly classified after the next sync or call-boundary auto-resync.

## Verification Layers

1. **Incremental `sync` covers STCHAR hybrids** → unit test at `tools/world-index/tests/sync-stchar-hybrid.test.ts` (new): write a bundle with a baseline STCHAR profile, run `build`, mutate the STCHAR `.md` file (simulate a supersede-write), run incremental `sync`, then assert the indexed `content_hash` for the STCHAR node matches the post-mutation file hash.
2. **Verify ledger stops emitting `severity: fail` for healthy STCHAR hybrids** → integration test at the same path (or extension of `tools/world-mcp/tests/context-packet/story-character-profile.test.ts`): run a `get_context_packet` call with `task_type: story_turn_cycle` against a fresh bundle and assert `task_header.open_risks` contains zero `severity: fail` entries with `code: content_hash_drift` whose `node_id` starts with `<story-slug>:STCHAR-` or whose `file_path` contains `story-characters/`.
3. **No regression on real drift detection** → existing `tools/world-index/tests/commands.test.ts` (and any drift-detection coverage there) continues to flag genuine content_hash_drift at full `severity: fail` when the file content actually diverges from the index without auto-resync healing it.
4. **Single-layer mapping is not applicable** because the fix crosses two distinct invariants (sync coverage + verify-ledger severity); each gets its own proof surface above.

## What to Change

### 1. Extend incremental `sync` to cover STCHAR hybrids

In `tools/world-index/src/commands/sync.ts`, extend the incremental walker to enumerate `worlds/<slug>/stories/<story-slug>/story-characters/STCHAR-*.md` alongside whatever world-canon hybrid surfaces it currently handles. Mirror the pattern used in the full `build` command (and the MCPENH-063 inventory-classification fix that added `story-characters` to `STORY_BUNDLE_MARKDOWN_DIRECTORIES`). The walker should produce the same node tree the full `build` produces for STCHAR — re-using existing parsing helpers from `tools/world-index/src/parse/atomic.ts`.

### 2. Refine verify-ledger severity when auto-resync has neutralized the drift

In `tools/world-index/src/commands/verify.ts`, refine `createDriftResult` (or its caller) to emit `severity: "info"` (not `"fail"`) for `code: "content_hash_drift"` rows whose `file_path` corresponds to a hybrid record class already covered by the MCPENH-063 at-call-boundary auto-resync. The fail severity is preserved for non-auto-resynced classes and for STCHAR drift the auto-resync did not heal (the residual-real-drift path).

If implementation discovers that the MCPENH-063 auto-resync is *already* updating the index but the verify ledger is reading a pre-resync snapshot, the fix may instead be to re-read the ledger AFTER auto-resync runs in the at-call-boundary path. Both fix shapes are acceptable; the test in Verification Layer 2 governs correctness.

### 3. Document the post-fix expectation in the MEMORY note

The auto-memory entry `project_stchar_index_sync_gap` becomes obsolete after this ticket lands. The implementing change should NOT edit the memory note (the user owns memory), but the ticket Outcome section (added at ticket completion) should suggest deleting or updating the memory once verified.

## Files to Touch

- `tools/world-index/src/commands/sync.ts` (modify — extend incremental walker to STCHAR hybrids)
- `tools/world-index/src/commands/verify.ts` (modify — severity refinement on `createDriftResult`)
- `tools/world-index/tests/sync-stchar-hybrid.test.ts` (new — sync coverage)
- `tools/world-mcp/tests/context-packet/story-character-profile.test.ts` (modify — extend to assert open_risks has zero STCHAR `severity: fail` content_hash_drift)

## Out of Scope

- World `CHAR-*` hybrid sync coverage (sibling ticket if discovered during implementation).
- Other hybrid record classes (DA, PA, etc.) — sibling tickets as discovered.
- Editing the `MEMORY.md` entry `project_stchar_index_sync_gap` (memory is user-owned; ticket Outcome can suggest a follow-up).
- Changes to the `Read` / `Edit` / `Write` hook boundary for STCHAR `.md` files (Hook 3 already governs `_source/<class>/*.yaml` and the SKILL.md governs STCHAR section_path projection).
- Changing the SKILL.md HARD-GATE (a) prose — the section_path mandate is correct under both pre- and post-fix index states.

## Acceptance Criteria

### Tests That Must Pass

1. New test `tools/world-index/tests/sync-stchar-hybrid.test.ts` — incremental `sync` after an STCHAR rewrite produces a content_hash equal to the post-rewrite file hash.
2. Modified test `tools/world-mcp/tests/context-packet/story-character-profile.test.ts` — `get_context_packet` for `story_turn_cycle` on a fresh bundle returns zero `severity: fail` `content_hash_drift` entries scoped to STCHAR files.
3. `npm --prefix tools/world-index test` AND `npm --prefix tools/world-mcp test` both exit 0 (run with cwd at each tools subdir per `MEMORY.md project_tool_tests_require_npm_cwd`).

### Invariants

1. STCHAR hybrid records remain retrievable via `get_record(section_path=...)` at HEAD and after every supersede; the read path is unchanged.
2. `content_hash_drift` at `severity: fail` is reserved for genuine index/file divergence that the at-call-boundary auto-resync did not heal; benign post-mutation states emit at most `severity: info`.
3. Incremental `sync` covers every hybrid record class that the full `build` covers; the two walkers stay in feature parity for hybrid surfaces.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/sync-stchar-hybrid.test.ts` — covers Verification Layer 1 (sync coverage); models the supersede-write path the patch engine actually performs for STCHAR.
2. `tools/world-mcp/tests/context-packet/story-character-profile.test.ts` — extend with the Verification Layer 2 assertion that `open_risks` carries zero `severity: fail` STCHAR `content_hash_drift` after a clean sync.

### Commands

1. `npm --prefix tools/world-index test -- --grep stchar-hybrid` — targeted run for the new test.
2. `npm --prefix tools/world-mcp test -- --grep story-character-profile` — targeted run for the modified packet test.
3. `npm --prefix tools/world-index test && npm --prefix tools/world-mcp test` — full coverage for both packages. The two-package boundary is correct because sync coverage lives in `tools/world-index/` and packet response shape lives in `tools/world-mcp/`; both must stay green for the fix to be complete.
