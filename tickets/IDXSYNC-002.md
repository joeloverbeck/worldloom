# IDXSYNC-002: Incremental `world-index sync` does not converge to a full `build` — file-level drift token uses a different hash basis than the MCP staleness checker

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/commands/shared.ts` (reindex bookkeeping) and the file-level hash basis in `tools/world-index/src/parse/atomic.ts` / `tools/world-index/src/parse/canonical.ts`; the drift checker in `tools/world-mcp/src/db/open.ts`; plus tests in `tools/world-index/tests/commands.test.ts`, `tools/world-index/tests/schema.test.ts`, and `tools/world-mcp/tests/db/open.test.ts`
**Deps**: None (follow-up to IDXSYNC-001, which added the `sync → build` recovery escalation in the MCP freshness guard as a workaround for this defect)

> **Reassessment note (2026-05-30).** This ticket was reassessed against the actual codebase before scheduling. The original root-cause analysis was written against an architecture that does not exist and has been replaced. The empirically-observed symptom (a "successful" `sync` that leaves the index stale until a full `build`) is real and is reproduced below with the verified mechanism. See **Corrections To The Original Ticket** at the end.

## Problem

`docs/FOUNDATIONS.md` §Canonical Storage Layer is explicit: *"The index is a derived cache: it MUST be reproducible from disk by a full `world-index build`, and any incremental `world-index sync` MUST converge to the same state a full build would produce."*

Incremental `sync` violates that contract. Empirically (PG-6 turn-cycle on `red-bunny` / `erotica-world`), a `get_records` pre-flight failed with `stale_index` on storylet records under `worlds/erotica-world/stories/red-bunny/_source/storylets/`; the auto-`sync` reported success yet the MCP staleness checker still flagged the same files; only a full `node tools/world-index/dist/src/cli.js build erotica-world` reconciled the index. IDXSYNC-001 mitigated operator impact by auto-escalating `stale → sync → (still stale) → build`; that masks but does not fix the divergence.

## Verified Architecture (2026-05-30)

`build` and `sync` are **not** separate indexing code paths:

- `tools/world-index/src/commands/build.ts` and `.../sync.ts` are 12-line wrappers over `buildWorldIndex` / `syncWorldIndex` in `tools/world-index/src/commands/shared.ts`.
- Both functions call the **same** `reindexAllFiles(db, worldRoot, worldSlug, fullBuild, options)` (`shared.ts:384`). The only difference is the `fullBuild` flag: `build` deletes the DB and passes `true`; `sync` opens the existing DB and passes `false`.
- File enumeration is **unified** through `enumerate(worldDirectory)` (`tools/world-index/src/enumerate.ts`), which already covers base `_source/` records, `stories/**/_source/` story-bundle records, hybrid markdown surfaces (`characters/`, `diegetic-artifacts/`, `adjudications/`, `stories/*/story-characters/` STCHAR, proposals, audits, etc.), and story-bundle markdown/YAML artifacts.
- `sync` therefore already indexes story-bundle records **and** hybrid records, and already reconciles deletions (the `indexedBefore` set in `reindexAllFiles`, `shared.ts:414` + `:527`). Newly-added STCHAR hybrids under `sync` are explicitly covered and tested (`tools/world-index/tests/schema.test.ts:462`).

The functions named in the original root-cause analysis — `indexStoryBundles`, `indexHybridRecords`, `collectStoryFiles`, `STORY_GLOBS`, `collectWorldSourceFiles`, `HYBRID_SURFACES`, and a `tools/world-index/test/sync.test.ts` — **do not exist** (verified by grep: zero matches). The "two divergent enumeration paths" model is incorrect.

## Verified Root Cause (2026-05-30)

The divergence is a **hash-basis mismatch between the index writer and the MCP staleness checker**, amplified by a **build/sync timestamp-refresh asymmetry**.

### Defect 1 — file-level drift token uses a canonicalized basis; the staleness checker hashes raw bytes

The per-file token stored in `file_versions.content_hash` is `parsed.contentHash`, produced by the parser:

- `parseWorldFile` (`shared.ts:161`): `sha256Hex(source)` — raw bytes. ✓
- Hybrid markdown records (`parse/atomic.ts:299/317/351`, `spec.hybrid` branch): `sha256Hex(source)` — raw bytes. ✓
- **Non-hybrid atomic and story-bundle YAML records** (`parse/atomic.ts:248/344`): `contentHashForYaml(parsed)` = `sha256Hex(serializeStableYaml(parsed))` (`parse/canonical.ts:10`) — a hash of the **re-serialized, key-sorted, `lineWidth:0` canonical YAML**, *not* the raw file bytes.
- Some prose paths use `contentHashForProse(source)` = `sha256Hex(normalizeProseWhitespace(body))` (`parse/canonical.ts:14`) — a hash of **whitespace-normalized** content, not raw bytes.

The MCP staleness checker `findDriftedFiles` (`tools/world-mcp/src/db/open.ts:62`) compares that stored token against `hashFileContents(readFileSync(absolutePath, "utf8"))` (`open.ts:101`), where `hashFileContents` = `createHash("sha256").update(source.normalize("NFC"), "utf8")` (`open.ts:25`) — a hash of the **raw on-disk bytes**.

Both sides NFC-normalize (`hash/content.ts:6` and `open.ts:25`), so NFC is *not* the discrepancy. The **basis** differs: for every non-hybrid `_source/*.yaml` and `stories/*/_source/*.yaml` record (CF, CH, SEC, INV, M, OQ, ENT, SLT, SE, PG, … ) the writer stores `sha256Hex(serializeStableYaml(parsed))` while the checker computes `sha256Hex(rawBytes)`. These are equal **only when the on-disk file is already byte-identical to world-index's canonical re-serialization**. Any difference in key order, line wrapping, quoting style, comments, or blank lines — e.g. when the patch engine's YAML serializer output differs from `serializeStableYaml` — yields a **permanent token mismatch**, i.e. perpetual false "drift" for that file.

### Defect 2 — only `build` refreshes `last_indexed_at`, so only `build` masks Defect 1

`findDriftedFiles` does not hash unconditionally. It hash-checks a file only when `forceFullHashCheck || Number.isNaN(indexedAtMs) || fileStat.mtimeMs > indexedAtMs` (`open.ts:93-99`); otherwise it trusts `last_indexed_at` and skips the comparison.

- `build` (`fullBuild=true`): every file is reprocessed and `upsertFileVersion` sets `last_indexed_at = now` for all (`shared.ts:442` etc.). Immediately after build, `mtime <= last_indexed_at` for every file, so the checker skips the hash comparison entirely — **Defect 1 is masked**.
- `sync` (`fullBuild=false`): only files where `previousHash !== parsed.contentHash` are re-`upsertFileVersion`'d; the `if (!shouldProcess) continue;` branches (`shared.ts:436/453/474/495/516`) skip the timestamp refresh. A file that was rewritten on disk (mtime bumped, e.g. by the patch engine) but whose *canonical* hash is unchanged hits `shouldProcess=false`, so `last_indexed_at` is **not** refreshed and stays `< mtime`. The next `get_records` re-hashes it, the raw-vs-canonical token mismatch (Defect 1) fires, and the file is flagged `stale_index`. Re-running `sync` repeats the same `shouldProcess=false` skip → **the staleness never clears until a full `build`** resets all timestamps. This is exactly the observed symptom.

Under `WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1` (`open.ts:50`, tested at `tools/world-mcp/tests/db/open.test.ts:197`) the mtime gate is bypassed and Defect 1 is **not** maskable even by `build`: any record whose on-disk bytes differ from the canonical re-serialization is reported stale on every call.

## Fix

### Fix A — make `sync` refresh `last_indexed_at` for every still-present file (required for convergence)

In `reindexAllFiles`, `sync` already reads and re-hashes every enumerated file (the `parse*` call precedes the `shouldProcess` check in each loop). It therefore *has* re-verified each file and should record `last_indexed_at = now` for all still-present files, exactly as `build` does — not only for content-changed files. Concretely: in each per-surface loop, on the `!shouldProcess` path still `upsertFileVersion(db, worldSlug, relativeFilePath, parsed.contentHash)` (same hash, refreshed timestamp), or restructure the loop so the timestamp is always refreshed for present files while node re-indexing stays gated on `shouldProcess`.

This makes a synced index's freshness bookkeeping byte-for-byte equivalent to a built one, so `mtime <= last_indexed_at` holds after `sync` just as after `build`. This alone satisfies the FOUNDATIONS convergence contract (sync ≡ build) and resolves the observed symptom in normal (mtime-gated) mode.

### Fix B — unify the file-level drift basis to raw bytes (recommended for soundness)

Fix A makes `sync` converge to `build`, but both still rely on the mtime gate to *mask* Defect 1; under `WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1` the index is reported stale even immediately after a full `build`, which contradicts "the index is reproducible from disk." Make the **file-level** drift token a single shared raw-bytes NFC basis so the writer and the checker agree:

- Store `file_versions.content_hash = sha256Hex(rawSource)` for **all** file classes (not the canonicalized `contentHashForYaml` / `contentHashForProse`), and align world-index `verify`'s file-level comparison (`commands/verify.ts:100`) and the `shouldProcess` gate to the same raw-bytes basis.
- Keep the **per-node** canonical hashes (`contentHashForYaml` / `contentHashForProse`, stored in `nodes.content_hash`) unchanged — they legitimately serve `verify`'s semantic node-level drift detection (`verify.ts:71`).
- `world-mcp` already re-exports world-index hashing via `package-interop` (`@worldloom/world-index/hash/content`); prefer reusing `sha256Hex` there over the local `hashFileContents` duplicate so the basis cannot drift again.

Implementation must confirm this does not regress the migration-driven invalidation path (`tools/world-index/tests/schema.test.ts:454`, "parser-vocabulary migrations invalidate stale file versions before sync"), which relies on the index-version/migration mechanism rather than the content hash; switching the file-level token to raw bytes should leave that mechanism intact, but it must be verified.

## Verification Layers

1. Invariant (FOUNDATIONS §Canonical Storage Layer): after `sync`, an MCP freshness check (`openIndexDb`) reports a non-stale index for the same disk state that a full `build` produces — i.e. `sync` converges to `build`.
2. Invariant (soundness, Fix B): immediately after either `build` or `sync`, `openIndexDb` reports non-stale **even with `WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1`**, for records whose on-disk bytes are not in world-index canonical form.
3. Invariant: deletions still reconcile under `sync` (a removed record is removed from the index).
4. Regression: existing `tools/world-index` and `tools/world-mcp` suites stay green, including the STCHAR sync test (`schema.test.ts:462`) and the full-hash-drift test (`open.test.ts:197`).

## What To Change

1. `tools/world-index/src/commands/shared.ts` — `reindexAllFiles`: always refresh `last_indexed_at` for still-present enumerated files (Fix A).
2. `tools/world-index/src/parse/atomic.ts` / `tools/world-index/src/parse/canonical.ts` — change the **file-level** token to a raw-bytes basis; keep node-level canonical hashes (Fix B). Decouple the file-level `file_versions` hash from the node-level `ParsedFileResult.contentHash` if needed.
3. `tools/world-index/src/commands/verify.ts` — align the file-level comparison (`:100`) to the raw-bytes basis (Fix B).
4. `tools/world-mcp/src/db/open.ts` — `findDriftedFiles` / `hashFileContents`: reuse the shared world-index file-level hash via `package-interop` rather than the local NFC-raw duplicate (Fix B); no change to the mtime gate semantics.

## Files to Touch

- `tools/world-index/src/commands/shared.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` and/or `tools/world-index/src/parse/canonical.ts` (modify — file-level hash basis)
- `tools/world-index/src/commands/verify.ts` (modify — file-level comparison basis)
- `tools/world-mcp/src/db/open.ts` (modify — reuse shared hash)
- `tools/world-index/tests/commands.test.ts` (modify/add — sync convergence)
- `tools/world-index/tests/schema.test.ts` (modify/add — sync convergence; non-canonical-bytes regression)
- `tools/world-mcp/tests/db/open.test.ts` (modify/add — drift basis + full-hash-check soundness)

## Out of Scope

- Changing the `mtime > last_indexed_at` gating heuristic in `findDriftedFiles` (only align the hash basis it compares against).
- Removing the IDXSYNC-001 freshness-guard escalation — it stays as defense-in-depth even after `sync` converges.
- Per-node canonical hashing for `verify`'s semantic node drift — that stays as-is.

## Acceptance Criteria

### Tests That Must Pass

1. Reproduction: write a non-hybrid `_source` YAML record whose on-disk bytes are **not** in world-index canonical form (e.g. unsorted keys or an added blank line) but parse identically; run `build`; assert `openIndexDb` is non-stale; bump the file mtime without changing bytes; run `sync`; assert `openIndexDb` is **still non-stale** (pre-fix: stale after sync, only `build` clears it).
2. Soundness (Fix B): with `WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1`, the above record is non-stale immediately after `build` and after `sync`.
3. Deletion: a removed `_source` / story record is removed from the index by `sync`.
4. Regression: full `tools/world-index` suite green; full `tools/world-mcp` suite green (incl. `schema.test.ts:462`, `open.test.ts:197`).

### Invariants

1. For any disk state, `sync` produces an index a freshness check treats identically to one produced by a full `build` (FOUNDATIONS §Canonical Storage Layer convergence contract holds).
2. The MCP freshness guard's `build` escalation no longer fires on routine story-bundle / atomic-record drift (it remains a true-divergence backstop).

## Test Plan

### Commands

1. `npm --prefix tools/world-index test`  *(run from repo root; the suite resolves migrations relative to cwd)*
2. `npm --prefix tools/world-mcp test`
3. End-to-end smoke (manual): re-induce drift on `red-bunny`, run `node tools/world-index/dist/src/cli.js sync erotica-world`, then a `get_records` pre-flight, and confirm non-stale without a manual `build`.

## Docs Follow-up (post-fix)

Once `sync` converges, soften the IDXSYNC-001 operator notes in `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` and `docs/MACHINE-FACING-LAYER.md`: `still_stale_after_build` becomes a genuine "index/disk divergence — investigate" signal rather than the routine storylet/STCHAR case, and the auto-escalation to `build` should rarely fire.

## Corrections To The Original Ticket

The pre-reassessment ticket asserted that `build` and `sync` use different enumeration/indexing code paths and that `sync` omitted a hybrid-index pass and re-derived story records via a bespoke glob. That model is incorrect:

- `build` and `sync` share `reindexAllFiles`; enumeration is unified in `enumerate()`. `sync` already indexes story-bundle and hybrid (incl. STCHAR) records and reconciles deletions.
- `indexStoryBundles`, `indexHybridRecords`, `collectStoryFiles`, `STORY_GLOBS`, `collectWorldSourceFiles`, `HYBRID_SURFACES`, `story-index.ts`, `hybrid-index.ts`, and `tools/world-index/test/sync.test.ts` do not exist in the codebase.
- The real defect is the file-level hash-basis mismatch (Defect 1) plus the build/sync `last_indexed_at` refresh asymmetry (Defect 2), not a missing enumeration surface.
