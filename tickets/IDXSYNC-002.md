# IDXSYNC-002: Incremental `world-index sync` does not converge to a full `build` — story-bundle and hybrid records drift survive sync

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/sync.ts` (reconciliation path) plus tests (`tools/world-index/test/sync.test.ts`); possibly shared enumeration helpers in `story-index.ts` / `hybrid-index.ts`
**Deps**: None (follow-up to IDXSYNC-001, which added the `sync → build` recovery escalation in the MCP freshness guard as a workaround for this defect)

## Problem

`docs/FOUNDATIONS.md` §Canonical Storage Layer is explicit: *"The index is a derived cache: it MUST be reproducible from disk by a full `world-index build`, and any incremental `world-index sync` MUST converge to the same state a full build would produce."*

Incremental `sync` violates that contract. Empirically, during the PG-6 turn-cycle on `red-bunny` (`erotica-world`), a `get_records` pre-flight failed with `stale_index` on `SLT-20`..`SLT-25` (`worlds/erotica-world/stories/red-bunny/_source/storylets/`); the auto-`sync` reported success (`Synced N record(s)`) yet `detectStaleIndex` still flagged the same files as drifted; only a full `node tools/world-index/dist/src/cli.js build erotica-world` reconciled the index. This matches the previously recorded STCHAR index-sync gap, where story-local STCHAR hybrid character profiles survive an incremental sync and require a full build.

IDXSYNC-001 mitigated the operator impact by making the MCP freshness guard auto-escalate `stale → sync → (still stale) → build`. That is a workaround: it pays a full-rebuild cost on every story-bundle storylet/STCHAR drift and masks — but does not fix — the divergence between `sync` and `build`. This ticket fixes the divergence at the source so a synced index is equivalent to a freshly built one.

## Root-Cause Analysis (2026-05-30)

`build` and `sync` use **different enumeration/indexing code paths**, so they do not produce the same index state:

1. **`build.ts` (`buildWorldIndex`)** indexes three surfaces (lines 18-25):
   - `collectWorldSourceFiles(worldRoot)` → base `_source/` records
   - `indexStoryBundles(db, worldRoot)` → full story-bundle enumeration (`tools/world-index/src/story-index.ts`)
   - `indexHybridRecords(db, worldRoot)` → hybrid records (`tools/world-index/src/hybrid-index.ts`), whose `HYBRID_SURFACES` covers `characters` (CHAR), `diegetic-artifacts` (DA), `adjudications` (PA), and `stories/*/story-characters` (STCHAR).

2. **`sync.ts` (`reconcile` → `collectSyncSourceFiles`, lines 36-91)** indexes only:
   - `collectWorldSourceFiles(worldRoot)` → base `_source/` records
   - `collectStoryFiles(worldRoot)` → a single bespoke glob `STORY_GLOBS = ["stories/*/_source/**/*.yaml"]`, then a generic hash-compare + `upsertRecord`/`deleteRecord`.

Two concrete divergences follow:

- **Divergence A — hybrid surfaces are never reconciled by sync.** `sync` does not call `indexHybridRecords`, so STCHAR story-character profiles (and world-level CHAR/DA/PA hybrid files) drift right through an incremental sync. This is exactly the recorded STCHAR gap.
- **Divergence B — story-bundle `_source` records are indexed via a different derivation than `build`.** Even though `STORY_GLOBS` *does* match `stories/*/_source/storylets/SLT-*.yaml` (verified on disk), the synced rows produced by `sync`'s generic `upsertRecord` are not what `indexStoryBundles` + `detectStaleIndex` expect — hence SLT-20..SLT-25 remained flagged stale after a "successful" sync and only `build` cleared them. The precise field/representation mismatch must be pinned down during implementation (compare `indexStoryBundles`'s per-record write against `sync.upsertRecord` and against `detectStaleIndex` in `tools/world-mcp/src/db/open.ts`).

The architectural defect is the duplication itself: `sync` re-implements a narrower, divergent subset of `build`'s indexing instead of reusing the same record-derivation functions.

## Architecture Check

1. The clean fix is to make `sync` reuse `build`'s indexing functions for the story-bundle and hybrid surfaces (`indexStoryBundles`, `indexHybridRecords`) rather than the bespoke `STORY_GLOBS` glob + generic upsert. Incrementality (skip-unchanged via hash/mtime) is desirable but MUST be implemented inside the shared derivation path so that what sync writes for a changed record is byte-for-byte what build writes — guaranteeing convergence. If incrementality cannot be made provably convergent cheaply, the safe interim is to have `sync` delegate the story-bundle + hybrid passes to the same full-pass functions `build` uses (correctness over micro-optimization), since IDXSYNC-001 already makes a stale sync escalate to build anyway.
2. No backwards-compatibility shims: callers (`syncWorldIndex` signature, CLI `sync <slug>`, MCP `package-interop` binding) are unchanged; only the internal reconciliation is corrected.

## Verification Layers

1. Invariant (FOUNDATIONS §Canonical Storage Layer): for any world state, `sync` then a freshness check produces a non-stale index — i.e. `sync` converges to `build`. Test: seed a story bundle, mutate an SLT record and an STCHAR profile on disk, run `sync`, assert the resulting index rows equal those produced by a full `build` (and that `detectStaleIndex` reports clean).
2. Invariant: STCHAR / CHAR / DA / PA hybrid drift is reconciled by `sync` (not only `build`). Test: mutate a hybrid record, `sync`, assert the index reflects it.
3. Invariant: deletions still reconcile (a removed SLT/STCHAR file is removed from the index by `sync`).
4. Regression: existing `sync.test.ts`, `build.test.ts`, `story-index.test.ts`, `hybrid-index.test.ts`, `scan.test.ts` stay green; the `world-mcp` freshness-guard suite stays green.

## What to Change

### 1. `tools/world-index/src/sync.ts` — converge sync onto build's derivation

Replace the bespoke `STORY_GLOBS`/`collectStoryFiles` story-bundle path and add the missing hybrid pass, so `sync` reconciles the same surfaces as `build` using the same record-derivation functions (`indexStoryBundles`, `indexHybridRecords`). Preserve deletion reconciliation for files that disappeared. Keep the `world-not-found` and exit-code contract unchanged.

### 2. Pin the SLT representation mismatch

Diff how `indexStoryBundles` writes a storylet record vs how `sync.upsertRecord` writes it vs what `detectStaleIndex` (`tools/world-mcp/src/db/open.ts`) compares against; eliminate the field/hash divergence as part of routing sync through the shared function.

### 3. Docs follow-up

Once sync converges, soften the IDXSYNC-001 operator notes in `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` and `docs/MACHINE-FACING-LAYER.md`: the `still_stale_after_build` path becomes a genuine "index/disk divergence — investigate" signal rather than the routine storylet/STCHAR case, and the auto-escalation to `build` should rarely fire.

## Files to Touch

- `tools/world-index/src/sync.ts` (modify)
- possibly `tools/world-index/src/story-index.ts` / `hybrid-index.ts` (extract/share an incremental-capable entry if needed)
- `tools/world-index/test/sync.test.ts` (modify/add)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify — soften, post-fix)
- `docs/MACHINE-FACING-LAYER.md` (modify — soften, post-fix)

## Out of Scope

- Changing `detectStaleIndex` drift-detection semantics in `tools/world-mcp/src/db/open.ts` (only align sync's output to what it already expects).
- Removing the IDXSYNC-001 freshness-guard escalation — it stays as defense-in-depth even after sync converges.

## Acceptance Criteria

### Tests That Must Pass

1. Unit/integration: after mutating an SLT storylet record on disk and running `sync`, the index is not stale and matches a full `build` (no escalation needed).
2. Unit/integration: after mutating an STCHAR (and CHAR/DA/PA) hybrid record on disk and running `sync`, the index reflects the change.
3. Unit/integration: a deleted SLT/STCHAR file is removed from the index by `sync`.
4. Regression: full `tools/world-index` suite green; full `tools/world-mcp` suite green.

### Invariants

1. For any disk state, `sync` produces the same index as a full `build` (FOUNDATIONS §Canonical Storage Layer convergence contract holds).
2. The MCP freshness guard's `build` escalation no longer fires on routine story-bundle storylet/STCHAR drift (it remains only a true-divergence backstop).

## Test Plan

### Commands

1. `npm --prefix tools/world-index test`
2. `npm --prefix tools/world-mcp test`
3. End-to-end smoke (manual): re-induce SLT and STCHAR drift on `red-bunny`, run `node tools/world-index/dist/src/cli.js sync erotica-world`, then `... verify erotica-world` and confirm exit 0 without a manual `build`.
