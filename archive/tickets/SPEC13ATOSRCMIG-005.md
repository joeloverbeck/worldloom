# SPEC13ATOSRCMIG-005: Make `world-index verify` truthful for atomic-source worlds

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` verify command and user-facing workflow docs
**Deps**: SPEC13ATOSRCMIG-003

## Problem

After the Animalia atomic-source migration, an exploratory `world-index verify animalia` returned non-zero and wrote `content_hash_drift` rows because `tools/world-index/src/commands/verify.ts` iterates `file_versions.file_path` and assumes each row is a markdown disk file parsed by `parseWorldFile(...)`. Atomic builds store synthetic logical rows for retired root markdown paths and disk-backed `_source/*.yaml` rows that must be parsed by the atomic YAML parser, so verify can treat valid atomic-mode index state as missing or no longer parser-produced. `docs/WORKFLOWS.md` still advertises `world-index verify <world-slug>` without naming that atomic logical rows are skipped and real disk-backed source files remain checked.

## Assumption Reassessment (2026-04-24)

1. `tools/world-index/src/commands/verify.ts` currently verifies every `file_versions.file_path` as a markdown disk path; retired logical rows fail `existsSync(...)`, and `_source/*.yaml` rows are reparsed through `parseWorldFile(...)` instead of `parseAtomicSourceFile(...)`.
2. `tickets/SPEC13ATOSRCMIG-003.md` records the live mismatch: `world-index verify animalia` is not an acceptance surface after atomic build because it checks synthetic logical file rows as disk paths.
3. Cross-artifact boundary: the command behavior, integration tests, CLI help, `tools/world-index/README.md`, and `docs/WORKFLOWS.md` must agree on what `verify` means for atomic-source worlds.
4. FOUNDATIONS principle under audit: `§Canonical Storage Layer` says `_source/` is the sole source-of-truth for atomized concerns and root monolithic markdown files do not exist on machine-layer-enabled worlds.
5. Adjacent active ticket `SPEC13ATOSRCMIG-004` removes legacy markdown parser paths but does not own verify semantics or user-facing verify docs.
6. Current `verify(...)` only inserts new drift rows on failure and does not clear stale `drift_check` rows before a clean rerun, so this ticket also owns replacing prior verify results for the same world.

## Architecture Check

1. Fixing or explicitly narrowing `verify` is cleaner than leaving the CLI advertised while agents must remember it is unsafe in atomic mode.
2. No backwards-compatibility aliasing/shims introduced. If legacy-mode verify support is removed by `SPEC13ATOSRCMIG-004`, this ticket should simplify the command to the atomic contract rather than preserve a parallel legacy branch.

## Verification Layers

1. Atomic-source verify behavior -> targeted tool command / integration test.
2. Drift detection for real disk-backed files still works -> targeted test against an atomic fixture or temp-copied `animalia`.
3. User-facing command docs match behavior -> codebase grep-proof/manual review of CLI help, README, and `docs/WORKFLOWS.md`.

## What to Change

### 1. Reassess verify's atomic contract

Atomic `verify` should skip synthetic logical rows from `ATOMIC_LOGICAL_WORLD_FILES`, parse `_source/*.yaml` rows with `parseAtomicSourceFile(...)`, keep `parseWorldFile(...)` for disk-backed markdown/hybrid rows, and replace prior `drift_check` rows each run.

### 2. Patch tests

Add or update tests so an atomic-source world can be built and then verified without false drift rows for either synthetic logical rows or unchanged `_source/*.yaml` rows, while a real edit to a disk-backed source file still produces drift.

### 3. Update docs/help

Update `tools/world-index/README.md`, CLI usage text, and `docs/WORKFLOWS.md` so the quick reference states that verify checks disk-backed indexed files and skips synthetic atomic logical rows.

## Files to Touch

- `tools/world-index/src/commands/verify.ts` (modify)
- `tools/world-index/src/cli.ts` (modify if help text changes)
- `tools/world-index/tests/**` (modify/add focused verify coverage)
- `tools/world-index/README.md` (modify if needed)
- `docs/WORKFLOWS.md` (modify)

## Out of Scope

- Parser legacy-path removal owned by `SPEC13ATOSRCMIG-004`.
- General-purpose validator framework owned by `SPEC-04`.
- Changing atomic record schemas or migrated Animalia source records.

## Acceptance Criteria

### Tests That Must Pass

1. Building and verifying an atomic-source world does not produce false `content_hash_drift` rows for retired root markdown logical paths.
2. A manual edit to a real disk-backed source file still makes `world-index verify` return non-zero and record a targeted drift row.
3. CLI/help/docs describe the truthful `verify` contract after the fix.

### Invariants

1. `_source/` remains the sole canonical storage surface for atomized concerns.
2. Verify must not silently ignore real disk-backed source drift.
3. Verification docs must not recommend a command shape that is known to produce false failures on the current canonical storage form.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/atomic-source-input.test.ts` — focused coverage for post-atomic verify behavior and real drift detection.

### Commands

1. `npm run build` from `tools/world-index`.
2. `npm test` from `tools/world-index`.
3. `node tools/world-index/dist/src/cli.js build animalia` from repo root.
4. `node tools/world-index/dist/src/cli.js verify animalia` from repo root.
5. `node -e "const Database=require('better-sqlite3'); const db=new Database('../../worlds/animalia/_index/world.db',{readonly:true}); const row=db.prepare(\"SELECT COUNT(*) AS count FROM validation_results WHERE world_slug='animalia' AND validator_name='drift_check'\").get(); console.log(row.count); db.close();"` from `tools/world-index`.

## Outcome

Completed: 2026-04-24.

Implemented `world-index verify` as a truthful atomic-source drift check:

1. Synthetic atomic logical rows for retired root markdown concerns are skipped only when the backing disk file is absent; legacy fixture worlds still verify their real root markdown files.
2. Disk-backed `_source/*.yaml` rows are reparsed through `parseAtomicSourceFile(...)` instead of `parseWorldFile(...)`.
3. Disk-backed markdown and hybrid rows still use `parseWorldFile(...)`.
4. Prior `drift_check` rows are replaced on each verify run so a clean rerun clears stale verify failures.
5. The CLI help, `tools/world-index/README.md`, and `docs/WORKFLOWS.md` now describe the disk-backed-file contract and synthetic-row skip.

## Verification Result

1. PASS — `npm run build` from `tools/world-index`.
2. PASS — `npm test` from `tools/world-index`.
3. PASS — `node tools/world-index/dist/src/cli.js build animalia` from repo root.
4. PASS — `node tools/world-index/dist/src/cli.js verify animalia` from repo root.
5. PASS — direct DB check from `tools/world-index` returned `0` `drift_check` rows for `animalia` after clean verify.

## Deviations

1. Reassessment widened the failure from missing synthetic logical rows to include `_source/*.yaml` rows being reparsed by the markdown parser.
2. The implementation also compares stored file hashes when node-level hashes do not catch a disk-backed file edit, preserving legacy markdown drift detection.
