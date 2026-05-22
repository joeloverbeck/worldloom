# ENGINESYNC-005: `file_versions` hash basis mismatch between world-index and the pre-apply stale-index guard permanently blocks story-bundle patches

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` (`parse/atomic.ts` hybrid `contentHash` for `file_versions`) and/or `tools/patch-engine` (`apply.ts` `detectStaleIndex`); a one-time `world-index build` re-stamp of affected worlds.
**Deps**: ENGINESYNC-001 (introduced the pre-apply `index_stale` guard whose hash basis this ticket aligns).

## Problem

The patch engine's pre-apply `index_stale` guard and the world-index store **disagree on how `file_versions.content_hash` is computed for hybrid story-character markdown**, so the guard can never be satisfied for `stories/<slug>/story-characters/STCHAR-*.md`. The first post-bootstrap patch submitted to *any* story bundle is rejected with `index_stale`, and no canonical re-index path fixes it (a full `world-index build` re-writes the same disagreeing hash). This blocked a fully-validated `branching-story-turn-cycle` commit to `worlds/erotica-world/stories/red-bunny/` on 2026-05-22 (dry-run `validate-patch-plan` returned `pass`, 0 fails; `submit-patch-plan` returned `index_stale` for STCHAR-1/2/3).

Concretely:

- The guard `detectStaleIndex` in `tools/patch-engine/src/apply.ts:197` selects `file_versions` rows for four globs (lines 205–208): `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md`, `stories/%/story-characters/%.md`. For each it recomputes `sha256Hex(readFileSync(absolutePath, "utf8"))` — the **raw file bytes** (`apply.ts:229`) — and fails if it differs from the stored `content_hash`.
- The world-index stores, for hybrid story-bundle files, `contentHashForProse(source)` (`tools/world-index/src/parse/atomic.ts:335`, `spec.hybrid ? contentHashForProse(source) : contentHashForYaml(parsed)`). `contentHashForProse` is `sha256Hex(normalizeProseWhitespace(body))` (`tools/world-index/src/parse/canonical.ts:13-15`) — a **whitespace-normalized** hash.
- For the same STCHAR-1 file these differ: `contentHashForProse` = `aa4cf1e7…`, raw `sha256Hex` = `b15a33ae…`. The guard expects the raw value; the index holds the normalized value; they never match.
- World-level `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md` do **not** trip the guard because they are indexed through `parseWorldFile`, which stores raw `sha256Hex(source)` (`tools/world-index/src/commands/shared.ts:158`) — already consistent with the guard. Only `parseStoryBundleSourceFile` (hybrid branch) diverges.

Net: the staleness guard's contract (`file_versions.content_hash` == raw sha256 of on-disk bytes) is honored for three of its four guarded path classes and silently violated for the fourth.

## Assumption Reassessment (2026-05-22)

1. **Guard hash basis** — confirmed `detectStaleIndex` recomputes raw `sha256Hex(readFileSync(absolutePath, "utf8"))` at `tools/patch-engine/src/apply.ts:229`, comparing to `file_versions.content_hash` selected at `apply.ts:201-213`. The guarded globs are `apply.ts:205-208`.
2. **Index hash basis** — confirmed `tools/world-index/src/parse/atomic.ts:335` stores `contentHashForProse(source)` for `spec.hybrid` story files; `parseWorldFile` stores raw `sha256Hex(source)` (`tools/world-index/src/commands/shared.ts:158`); `contentHashForProse = sha256Hex(normalizeProseWhitespace(body))` (`tools/world-index/src/parse/canonical.ts:13-15`). `file_versions` upsert is `tools/world-index/src/index/file-versions.ts:21-42`; the build/sync indexing loop that calls it for story files is `tools/world-index/src/commands/shared.ts:396` + `:484`.
3. **Shared boundary under audit** — the contract of `file_versions.content_hash`: it must be the value the patch-engine pre-apply guard recomputes from disk. That contract is implicit and currently unwritten; the index and the guard each assume a different basis for hybrid story-character files. This ticket makes `file_versions.content_hash` mean "raw sha256 of on-disk file bytes" uniformly for the guarded path classes, and (recommended) for all `file_versions` rows.
4. **`build`/`sync` cannot self-heal** — `listStoryBundleSourceFiles` (`tools/world-index/src/parse/atomic.ts:128-176`) *does* enumerate `stories/<slug>/story-characters/*.md` (second loop, `:161-174`), so the files are indexed; the defect is the hash *basis*, not enumeration. A full `world-index build erotica-world` was run during diagnosis and left the rows at the normalized `aa4cf1e7…` value, confirming re-indexing reproduces the disagreeing hash rather than fixing it.
5. **Adjacent contradiction (separate, pre-existing)** — the STCHAR frontmatter hashes (`profile_hash`/`voice_block_hash`/`page_packet_hash`) on red-bunny STCHAR-1/2/3 also do not reproduce under `compute-stchar-hashes` (the original bootstrap JIT-hasher drift). That is a **separate** non-blocking defect (no runtime validator recomputes those frontmatter hashes) and is **out of scope** here; this ticket addresses only the `file_versions`/guard hash-basis mismatch that blocks patch submission.
6. **Temporary band-aid in place** — on 2026-05-22 the three red-bunny `file_versions` rows were hand-reconciled to raw sha256 to unblock one approved commit. Because `parseStoryBundleSourceFile` still returns the normalized hash, the next `world-index build`/`sync` of those files will revert the rows to `aa4cf1e7…` and re-block submission. This ticket is the durable fix; the band-aid must not be relied on.

## Architecture Check

1. **Single hash basis for `file_versions`.** The cleanest design makes `file_versions.content_hash` mean exactly one thing — the raw `sha256` of the on-disk file bytes — for every guarded path class, matching what the pre-apply guard already recomputes and what `parseWorldFile` already stores for world-level hybrid markdown. The recommended change is to have `parseStoryBundleSourceFile` store `sha256Hex(source)` (raw) in the value used for `file_versions` for hybrid story-character markdown, leaving `contentHashForProse` for node-level/anchor content identity where it is genuinely needed. This removes the asymmetry rather than teaching the guard about per-path normalization rules (which would couple `tools/patch-engine` to `tools/world-index` normalization internals — the worse alternative).
2. **No backwards-compatibility shims.** No alias hash columns, no dual-read fallback. `file_versions.content_hash` becomes raw-bytes sha256 for the guarded classes; existing worlds are corrected by a one-time `world-index build`. The implementer must reassess whether the cleanest cut is at the index write side (recommended) or by giving the guard a per-path hash function, and pick one — not both.

## Verification Layers

1. Guard recomputes raw bytes sha256 -> codebase grep-proof (`tools/patch-engine/src/apply.ts:229` `sha256Hex(readFileSync(... "utf8"))`).
2. Index stores normalized hash for hybrid story files -> codebase grep-proof (`tools/world-index/src/parse/atomic.ts:335`; `tools/world-index/src/parse/canonical.ts:13-15`).
3. Post-fix: index `file_versions.content_hash` for `stories/%/story-characters/%.md` equals raw `sha256Hex(file)` -> schema/data validation (DB query vs `sha256sum`, command below).
4. Post-fix: a representative story-bundle second-turn patch submits without `index_stale` -> skill dry-run + engine submit (`branching-story-turn-cycle` against red-bunny, or the engine integration test below).
5. World-level `characters/%.md` rows remain raw-sha256 and still match (no regression) -> schema/data validation (same DB-vs-`sha256sum` command, all four guarded globs).

## What to Change

### 1. Align `file_versions.content_hash` to raw bytes for guarded hybrid story files (recommended cut)

In `tools/world-index/src/parse/atomic.ts`, `parseStoryBundleSourceFile` (around `:335`): the `contentHash` returned for the `file_versions` upsert must be `sha256Hex(source)` (raw on-disk bytes) for hybrid story-character markdown, matching `parseWorldFile` (`shared.ts:158`) and the guard. If the same returned `contentHash` is reused as a node content hash that legitimately needs prose normalization, separate the two values so the `file_versions` value is the raw-bytes hash while node identity keeps `contentHashForProse`.

### 2. (Alternative, only if 1 is rejected) Make the guard normalization-aware

In `tools/patch-engine/src/apply.ts` `detectStaleIndex`, recompute the comparison hash with the same per-path basis the index uses (`contentHashForProse` for `stories/%/story-characters/%.md`, raw for the others). Discouraged: couples patch-engine to world-index normalization. Pick exactly one of change 1 or 2.

### 3. One-time re-stamp + revert the band-aid

After the code change, `world-index build <world>` for every world with a story bundle so `file_versions` rows are rewritten under the corrected basis. This also overwrites the 2026-05-22 hand-reconciled red-bunny rows with the now-consistent value.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify — hybrid `file_versions` content-hash basis in `parseStoryBundleSourceFile`)
- `tools/world-index/src/parse/canonical.ts` (modify only if a new raw-vs-prose split helper is introduced)
- `tools/patch-engine/src/apply.ts` (modify only if change 2 is chosen instead of change 1)
- `tools/world-index/tests/…` and/or `tools/patch-engine/tests/…` (new — see Test Plan)

## Out of Scope

- The STCHAR frontmatter `profile_hash`/`voice_block_hash`/`page_packet_hash` drift (Assumption Reassessment item 5) — separate ticket if it is ever to serve tamper-detection.
- Changing `contentHashForProse`/`contentHashForYaml` semantics for node identity, anchors, or `_source/*.yaml` (not guarded by `detectStaleIndex`).
- Any change to STCHAR generation in `story-character-profile` or `branching-story-bootstrap`.

## Acceptance Criteria

### Tests That Must Pass

1. After a `world-index build` of a fixture world containing a story bundle, every `file_versions` row whose `file_path` matches a `detectStaleIndex` guarded glob has `content_hash == sha256Hex(raw file bytes)`.
2. Submitting a second patch to a story bundle (one whose `story-characters/*.md` were written at bootstrap) succeeds without `index_stale`, given the index was last refreshed by `build`/`sync` (not hand-edited).
3. World-level `characters/%.md` / `diegetic-artifacts/%.md` / `adjudications/%.md` rows are unchanged (still raw sha256) — no regression for the previously-passing classes.

### Invariants

1. `file_versions.content_hash` for every `detectStaleIndex`-guarded path equals the exact value the guard recomputes from disk (raw `sha256Hex` of file bytes).
2. `world-index build`/`sync` is the canonical, idempotent way to make the pre-apply guard pass for hybrid story-character files — no manual DB edit is ever required.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` — extend with a `stories/<slug>/story-characters/STCHAR-*.md` case proving a build-fresh index does NOT trigger `index_stale` (currently only world-level/`_source` cases are covered; this is the gap that let the defect ship).
2. `tools/world-index/tests/…` (new or existing parse-layer test) — assert `parseStoryBundleSourceFile` yields a `file_versions` content hash equal to raw `sha256Hex(source)` for a hybrid `.md` fixture, and that world-level hybrid markdown is unchanged.

### Commands

1. Targeted data check (current repo, proves the defect and later the fix):
   `python3 - <<'PY'` reading `worlds/erotica-world/_index/world.db` `file_versions` for the four guarded globs and comparing each `content_hash` to `hashlib.sha256(open(path,'rb').read()).hexdigest()`; expect all `OK` after the fix + `world-index build erotica-world`.
2. Full-pipeline: `node tools/world-index/dist/src/cli.js build erotica-world` then `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <a story-bundle turn envelope>` (`pass`) then `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <envelope> <signed-token>` against a sacrificial branch — expect a `PatchReceipt` (no `index_stale`).
3. Package tests: `npm test` in `tools/world-index` and `tools/patch-engine` (the narrower boundary is the two extended tests in New/Modified Tests, which fail before the fix and pass after).
