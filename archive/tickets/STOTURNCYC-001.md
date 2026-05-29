# STOTURNCYC-001: Incremental world-index sync does not register STCHAR story-character authority nodes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` incremental sync path and regression coverage. `tools/patch-engine` was source-reviewed and did not require code changes.
**Deps**: None

## Problem

At intake during a `branching-story-turn-cycle` on a freshly-created bundle (`erotica-world/red-bunny`), the sanctioned STCHAR retrieval path failed: `mcp__worldloom__get_record(record_id='STCHAR-1', section_path='body')` and `get_records(['STCHAR-1','STCHAR-2'])` returned `record_not_found` even though `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` existed on disk. `node tools/world-index/dist/src/cli.js stats erotica-world` showed **zero** `story_character_authority_record` nodes. `world-index sync erotica-world` ran clean (exit 0) but did **not** create the nodes; a full `world-index build erotica-world` did (`stats` then showed `story_character_authority_record: 3`), after which MCP retrieval worked with no server restart. The `get_records` `freshness_audit` had repeatedly reported `drifted_files_synced: ["stories/red-bunny/story-characters/STCHAR-2.md"]` on read without ever producing a node.

This broke the only lawful STCHAR retrieval surface. The `branching-story-turn-cycle` HARD-GATE condition (a) states: "**Direct `Read` on STCHAR `.md` hybrid files is NOT a sanctioned fallback** — `section_path` projection is the only mechanism." A sync-path gap left an operator with no lawful way to load STCHAR authority for a fresh bundle, forcing either a HARD-GATE violation or a manual full rebuild that the skill never documents.

## Assumption Reassessment (2026-05-29)

1. `tools/world-index/src/commands/shared.ts` `reindexAllFiles` was the root cause. In atomic mode it built `storyArtifactFiles` from every non-`_source` story path and parsed those files with `parseWorldFile` before the `storyFiles` pass parsed `listStoryBundleSourceFiles()`. `stories/<slug>/story-characters/STCHAR-*.md` appeared in both sets. During incremental `sync`, the generic artifact pass upserted `file_versions` with the raw file hash, then the story-source pass saw the same hash and skipped the STCHAR parser. Full `build` masked the bug because `fullBuild === true` forced the later story-source pass to run anyway.
2. `tools/world-index/src/parse/atomic.ts` and `tools/world-index/src/schema/types.ts` already support `story_character_authority_record`; parser support was not missing. The landed fix keeps STCHAR paths in `storyFiles` and excludes them from generic `storyArtifactFiles` via a `storyFileSet`.
3. Shared boundary under audit: the `tools/world-index` sync vs. build node-production contract for hybrid story-character files. `tools/patch-engine/src/apply.ts` already invokes the shared `sync(worldRoot, envelope.target_world)` after commit, and `collectNewNodes` already includes `append_story_character_authority_record` / `supersede_story_character_authority_record`, so no patch-engine code change was required.
4. FOUNDATIONS Tooling Recommendation prescribes indexed retrieval as the authoritative machine-facing surface; `branching-story-turn-cycle` HARD-GATE (a) and `references/pre-flight-and-prerequisites.md` step 9/40 make MCP `section_path` projection the *only* sanctioned STCHAR path. A sync that silently omits these nodes violates that contract in practice.
5. Adjacent contradiction classification: the misleading `freshness_audit.drifted_files_synced` report shared the same sync-path root cause. With STCHAR routed only through the story-source parser, a read-time sync of a changed STCHAR file now produces the resolvable node instead of only a `file_versions` row.

## Architecture Check

1. Making incremental sync produce the same node set as full build for hybrid story-character files removes a class of "valid on disk, invisible to retrieval" states — strictly cleaner than documenting a "run a full build if STCHAR 404s" workaround, which would institutionalize a fragile manual step in front of a HARD-GATE.
2. No backwards-compatibility shim: the fix converges sync onto build's existing node-production behavior; no alias path or epoch flag is introduced.

## Verification Layers

1. Sync registers STCHAR nodes -> targeted tool command: `node --test dist/tests/schema.test.js` includes a build-then-add-STCHAR-then-sync regression and asserts a `story_character_authority_record` node plus one `file_versions` row.
2. Build/sync parity for STCHAR routing -> code review: STCHAR paths are excluded from generic story-artifact parsing and handled by `parseStoryBundleSourceFile`.
3. Patch-engine post-submit refresh covers STCHAR -> source review: patch-engine already calls the shared `world-index sync` after commit and already includes STCHAR ops in receipt `new_nodes`.
4. `freshness_audit` truthfulness -> covered by the same sync regression: changed/new STCHAR files now produce a node when sync reports success.

## Landed Changes

### 1. Incremental sync node production for story-character hybrids
`syncWorldIndex` now computes `storyFiles` first and excludes those paths from the generic non-`_source` story artifact parser. New or changed `stories/<slug>/story-characters/STCHAR-*.md` files are parsed only through `parseStoryBundleSourceFile`, so incremental sync upserts `story_character_authority_record` nodes instead of generic prose rows.

### 2. Patch-engine post-submit refresh coverage
Confirmed no patch-engine code change was needed. `tools/patch-engine/src/apply.ts` already invokes the shared sync path after commit, so it inherits this fix.

### 3. `freshness_audit` honesty
The root sync path now produces the STCHAR node for changed/new STCHAR files, so read-time auto-sync no longer has the underlying condition that caused `drifted_files_synced` to name a file without creating a retrievable node.

## Files to Touch

- `tools/world-index/src/commands/shared.ts` (modify)
- `tools/world-index/tests/schema.test.ts` (modify)

## Out of Scope

- Re-architecting the build vs sync split generally.
- Any change to STCHAR schema or the `append_story_character_authority_record` op shape.

## Acceptance Criteria

### Tests That Must Pass

1. New world-index test: build an atomic fixture, add `story-characters/STCHAR-1.md`, run incremental sync, and assert a `story_character_authority_record` node exists.
2. Focused compiled proof: `cd tools/world-index && npm run build && node --test dist/tests/schema.test.js`.
3. Full package proof: `cd tools/world-index && npm test`.

### Invariants

1. For any world, `sync` and `build` produce identical `story_character_authority_record` node sets for the same on-disk STCHAR files.
2. A patch submit that writes a STCHAR makes it retrievable via `get_record` without a subsequent full build.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/schema.test.ts` — `sync indexes newly added STCHAR hybrid files as story-character authority records`.
2. `None for tools/patch-engine — source review showed it already delegates post-submit refresh to the shared sync path fixed here.`

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/schema.test.js`
3. `cd tools/world-index && npm test`
4. Narrower boundary: the world-index sync regression is the correct primary surface because the defect reproduced through the shared sync command independent of MCP transport; patch-engine delegates to that same sync path.

## Outcome

Completion date: 2026-05-29.

Completed. Incremental world-index sync now excludes story-bundle source files such as `story-characters/STCHAR-*.md` from the generic story-artifact parser and lets the story-bundle parser produce the authoritative `story_character_authority_record` nodes. The patch-engine post-submit path did not need edits because it already calls the shared sync command after commit.

## Verification Result

1. `cd tools/world-index && npm run build` — PASS.
2. `cd tools/world-index && node --test dist/tests/schema.test.js` — PASS; 8 schema tests passed, including `sync indexes newly added STCHAR hybrid files as story-character authority records`.
3. `cd tools/world-index && npm test` — PASS; 131 non-CLI compiled tests plus CLI serial tests passed.
4. Manual/source review — PASS; `tools/patch-engine/src/apply.ts` post-submit refresh uses `sync(worldRoot, envelope.target_world)`, and STCHAR operations are already included in `collectNewNodes`.
5. Package docs/surface review — PASS; `tools/world-index/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` describe the existing build/sync/retrieval contract and did not need command or user-facing behavior changes for this internal routing fix.

## Deviations

1. The drafted live-world `erotica-world` CLI smoke and direct MCP retrieval smoke were not run. The accepted proof uses a temp atomic fixture to avoid mutating private live-world `_index/` state while exercising the same shared sync path.
2. No `tools/patch-engine` test was added because reassessment found no patch-engine-specific omission: the submit path already delegates to `world-index sync`, and this ticket fixed that shared sync implementation.
