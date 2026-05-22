# ENGINESYNC-005: Align story-character `file_versions` hash basis with the pre-apply stale-index guard

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` (`parse/atomic.ts` hybrid story-character parser-result `contentHash` for `file_versions`), focused `tools/world-index` parser coverage, and a one-time `world-index build erotica-world` re-stamp of the affected derived index.
**Deps**: `archive/tickets/ENGINESYNC-001-stale-index-detection-on-pre-apply-validation.md` (introduced the pre-apply `index_stale` guard whose hash basis this ticket aligns).

## Problem

At intake, the patch engine's pre-apply `index_stale` guard and the world-index store **disagreed on how `file_versions.content_hash` was computed for hybrid story-character markdown**, so the guard could never be satisfied for `stories/<slug>/story-characters/STCHAR-*.md`. The first post-bootstrap patch submitted to a story bundle could be rejected with `index_stale`, and the previous canonical re-index path reproduced the same disagreeing hash. This blocked a fully-validated `branching-story-turn-cycle` commit to `worlds/erotica-world/stories/red-bunny/` on 2026-05-22 (dry-run `validate-patch-plan` returned `pass`, 0 fails; `submit-patch-plan` returned `index_stale` for STCHAR-1/2/3).

Concretely:

- The guard `detectStaleIndex` in `tools/patch-engine/src/apply.ts` selects `file_versions` rows for four globs: `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md`, `stories/%/story-characters/%.md`. For each it recomputes `sha256Hex(readFileSync(absolutePath, "utf8"))` — the **raw file bytes** — and fails if it differs from the stored `content_hash`.
- At intake, world-index stored, for hybrid story-bundle files, `contentHashForProse(source)`. `contentHashForProse` is `sha256Hex(normalizeProseWhitespace(body))` — a **whitespace-normalized** hash.
- For the same STCHAR-1 file these differed before this ticket: `contentHashForProse` = `aa4cf1e7…`, raw `sha256Hex` = `b15a33ae…`. The guard expected the raw value; the index held the normalized value.
- World-level `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md` do **not** trip the guard because they are indexed through `parseWorldFile`, which stores raw `sha256Hex(source)` (`tools/world-index/src/commands/shared.ts:158`) — already consistent with the guard. Only `parseStoryBundleSourceFile` (hybrid branch) diverges.

Landed result: the staleness guard's contract (`file_versions.content_hash` == raw sha256 of on-disk bytes) is now honored for all four guarded path classes. STCHAR node identity still uses normalized prose hashing; only the parser result hash used by `file_versions` changed.

## Assumption Reassessment (2026-05-22)

1. **Guard hash basis** — confirmed `detectStaleIndex` recomputes raw `sha256Hex(readFileSync(absolutePath, "utf8"))` in `tools/patch-engine/src/apply.ts`, comparing to `file_versions.content_hash` selected for `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md`, and `stories/%/story-characters/%.md`.
2. **Index hash basis** — confirmed at intake that `tools/world-index/src/parse/atomic.ts` returned `contentHashForProse(source)` for `spec.hybrid` story files while `parseWorldFile` returned raw `sha256Hex(source)` for world-level hybrid markdown. The landed code returns `sha256Hex(source)` as the hybrid story-character parser-result `contentHash` used by `file_versions`, while the STCHAR node row and non-hybrid story-bundle YAML parser-result hashes keep the previous `contentHashForProse(source)` basis.
3. **Shared boundary under audit** — the contract of `file_versions.content_hash`: it must be the value the patch-engine pre-apply guard recomputes from disk for guarded disk-backed hybrid files. This ticket makes `file_versions.content_hash` raw `sha256Hex(source)` for the STCHAR guarded path without changing canonical YAML or normalized-prose node identity hashes.
4. **Intake `build`/`sync` could not self-heal** — `listStoryBundleSourceFiles` did enumerate `stories/<slug>/story-characters/*.md`, so the files were indexed; the defect was the hash *basis*, not enumeration. A full `world-index build erotica-world` run during diagnosis left the rows at the normalized `aa4cf1e7…` value, confirming that pre-fix re-indexing reproduced the disagreeing hash rather than fixing it.
5. **Adjacent contradiction (separate, pre-existing)** — the STCHAR frontmatter hashes (`profile_hash`/`voice_block_hash`/`page_packet_hash`) on red-bunny STCHAR-1/2/3 also do not reproduce under `compute-stchar-hashes` (the original bootstrap JIT-hasher drift). That is a **separate** non-blocking defect (no runtime validator recomputes those frontmatter hashes) and is **out of scope** here; this ticket addresses only the `file_versions`/guard hash-basis mismatch that blocks patch submission.
6. **Temporary band-aid replaced** — on 2026-05-22 the three red-bunny `file_versions` rows were hand-reconciled to raw sha256 to unblock one approved commit. The landed parser change plus `node tools/world-index/dist/src/cli.js build erotica-world` makes the corrected raw values reproducible by the canonical index path rather than by manual DB edits.
7. **Relationship to `archive/tickets/VALENH-030.md`** — `archive/tickets/VALENH-030.md` owns the STCHAR `page_packet_hash` projection and validator recompute contract. It was not a blocker for this ticket, and this ticket did not change `computeStcharPagePacketHash`, `profile_hash`, `voice_block_hash`, or STCHAR page-packet validation semantics. The landed story-character file-version vs node/prose hash split is local to the `file_versions`/stale-index boundary.

## Architecture Check

1. **Single guard-facing hash basis.** The landed design makes `file_versions.content_hash` equal raw `sha256` of the on-disk file bytes for every `detectStaleIndex`-guarded path class, matching what the pre-apply guard already recomputes and what `parseWorldFile` already stores for world-level hybrid markdown. STCHAR node content identity remains normalized prose because that hash serves a different purpose.
2. **No backwards-compatibility shims.** No alias hash columns, no dual-read fallback, and no patch-engine normalization branch were introduced. Existing derived indexes are corrected by `world-index build` / `sync`.

## Verification Layers

1. Guard recomputes raw bytes sha256 -> codebase grep-proof (`tools/patch-engine/src/apply.ts` uses `sha256Hex(readFileSync(... "utf8"))`).
2. STCHAR parser result hash is raw while STCHAR node identity hash remains normalized prose, and non-hybrid story-bundle YAML parser-result hashes remain prose-source based -> focused parser tests in `tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts`.
3. Post-fix live index `file_versions.content_hash` for the four guarded globs equals raw `sha256Hex(file)` -> `world-index build erotica-world` plus DB-vs-file Python data check.
4. Patch-engine stale-index guard still accepts raw-hash story-character rows and rejects divergent rows -> existing `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` coverage.

## Landed Changes

### 1. Aligned `file_versions.content_hash` to raw bytes for guarded hybrid story files

In `tools/world-index/src/parse/atomic.ts`, `parseStoryBundleSourceFile` now returns `sha256Hex(source)` as the parser-result `contentHash` for hybrid story-character markdown. The STCHAR node row still uses `contentHashForProse(source)` for normalized node identity.

### 2. Added focused parser proof

`tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts` now asserts that a hybrid STCHAR parser result hash equals raw `sha256Hex(source)`, that the node hash equals `contentHashForProse(source)`, and that those values differ for a whitespace-sensitive fixture. It also asserts that non-hybrid story-bundle YAML parser-result hashes keep the previous `contentHashForProse(source)` basis rather than switching to canonical YAML hashing.

### 3. Re-stamped the affected live derived index

`node tools/world-index/dist/src/cli.js build erotica-world` was run after `tools/world-index` build, and the resulting `worlds/erotica-world/_index/world.db` rows for all four guarded globs now match raw file hashes.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify — hybrid `file_versions` content-hash basis in `parseStoryBundleSourceFile`)
- `tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts` (modify — focused raw-vs-prose split proof)
- `worlds/erotica-world/_index/world.db` (ignored derived artifact refreshed by `world-index build erotica-world`)

## Out of Scope

- The STCHAR frontmatter `profile_hash`/`voice_block_hash`/`page_packet_hash` drift (Assumption Reassessment item 5) — separate ticket if it is ever to serve tamper-detection.
- Changing `contentHashForProse`/`contentHashForYaml` semantics for node identity, anchors, or `_source/*.yaml` (not guarded by `detectStaleIndex`).
- Any change to STCHAR generation in `story-character-profile` or `branching-story-bootstrap`.
- Any change to the `archive/tickets/VALENH-030.md` page-packet projection contract; this ticket only aligns the persisted `file_versions.content_hash` value with the pre-apply stale-index guard.

## Acceptance Criteria

### Tests That Must Pass

1. After `world-index build erotica-world`, every `file_versions` row whose `file_path` matches a `detectStaleIndex` guarded glob has `content_hash == sha256Hex(raw file bytes)`.
2. The existing patch-engine STCHAR stale-index test continues to prove that a raw-hash story-character row is accepted as fresh, while a divergent row returns `index_stale` before validators or writes run.
3. World-level `characters/%.md` / `diegetic-artifacts/%.md` / `adjudications/%.md` rows are unchanged (still raw sha256) — no regression for the previously-passing classes.

### Invariants

1. `file_versions.content_hash` for every `detectStaleIndex`-guarded path equals the exact value the guard recomputes from disk (raw `sha256Hex` of file bytes).
2. `world-index build`/`sync` is the canonical, idempotent way to make the pre-apply guard pass for hybrid story-character files — no manual DB edit is ever required.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts` — asserts `parseStoryBundleSourceFile` yields a parser-result `contentHash` equal to raw `sha256Hex(source)` for a hybrid STCHAR `.md` fixture while the node `content_hash` remains normalized prose, and asserts non-hybrid story YAML file-version hashes remain prose-source based.
2. `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` — existing coverage confirms the guard accepts matching raw STCHAR rows and returns `index_stale` for divergent STCHAR rows before validators or writes run.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/parse/atomic-edges-for-story-character-authority.test.js`
3. `cd tools/world-index && npm test`
4. `cd tools/patch-engine && npm test`
5. `node tools/world-index/dist/src/cli.js build erotica-world`
6. `python3 - <<'PY' ... PY` reading `worlds/erotica-world/_index/world.db` `file_versions` for the four guarded globs and comparing each `content_hash` to raw SHA-256 of the file bytes; all rows must print `OK`.

## Outcome

Completed: 2026-05-22.

Implemented the index-side cut. Hybrid story-character parser results now carry raw `sha256Hex(source)` for `file_versions`, while the emitted STCHAR node keeps normalized-prose `contentHashForProse(source)`. The patch-engine stale-index guard was not changed.

The live `erotica-world` derived index was rebuilt through the compiled `world-index build` path, replacing the temporary hand-reconciled red-bunny rows with canonical build-produced raw hashes.

## Verification Result

1. Pre-edit baseline: `cd tools/world-index && npm test` — pass, 138 tests. Existing expected diagnostics were emitted for schema-pattern skips and legacy-world atomic-source absence.
2. Pre-edit baseline: `cd tools/patch-engine && npm test` — pass, 92 tests.
3. `cd tools/world-index && npm run build` — pass.
4. `cd tools/world-index && node --test dist/tests/parse/atomic-edges-for-story-character-authority.test.js` — pass, 3 tests.
5. `cd tools/world-index && npm test` — pass, 139 tests. Existing expected diagnostics were emitted for schema-pattern skips and legacy-world atomic-source absence.
6. `cd tools/patch-engine && npm test` — pass, 92 tests.
7. `node tools/world-index/dist/src/cli.js build erotica-world` — pass; refreshed `worlds/erotica-world/_index/world.db`.
8. Python DB-vs-file data check over `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md`, and `stories/%/story-characters/%.md` rows in `worlds/erotica-world/_index/world.db` — pass. All guarded rows printed `OK`, including `stories/red-bunny/story-characters/STCHAR-1.md`, `STCHAR-2.md`, and `STCHAR-3.md`.

## Deviations

1. The implementation did not edit `tools/patch-engine/src/apply.ts`; the existing guard already recomputes raw hashes and had focused STCHAR coverage. Changing the guard would have coupled patch-engine to world-index normalization internals.
2. The implementation did not change `tools/world-index/src/parse/canonical.ts`; the raw/prose split is local to the hybrid story-character parser result vs node identity.
3. The drafted full-pipeline story-bundle submit smoke was not run against a sacrificial branch. The accepted proof is the stronger local split: focused parser proof, full `tools/world-index` suite, full `tools/patch-engine` suite, live `erotica-world` rebuild, and direct DB-vs-file hash verification.

## Post-Ticket Review Refinement (2026-05-22)

Post-ticket review initially blocked archival because the first implementation changed more than the ticket-owned STCHAR hybrid branch: for parsed non-hybrid story-bundle YAML records, the parser-result `contentHash` returned `contentHashForYaml(parsed)` instead of the previous `contentHashForProse(source)`. That would have broadened the `file_versions` hash-basis change beyond the guarded `stories/%/story-characters/%.md` path and beyond the ticket closeout's claim that only the hybrid story-character parser-result hash changed.

Resolved in the resumed implementation: non-hybrid story-bundle YAML parser-result hashes now keep the previous `contentHashForProse(source)` basis, while hybrid STCHAR parser results keep the raw `sha256Hex(source)` basis needed by the pre-apply stale-index guard.

Final post-refinement proof: `cd tools/world-index && node --test dist/tests/parse/atomic-edges-for-story-character-authority.test.js` passed 3 tests, `cd tools/world-index && npm test` passed 139 tests, `cd tools/patch-engine && npm test` passed 92 tests, and the rebuilt `worlds/erotica-world/_index/world.db` guarded rows all matched raw file hashes.
