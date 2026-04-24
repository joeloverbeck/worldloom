# SPEC13ATOSRCMIG-005: Make `world-index verify` truthful for atomic-source worlds

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` verify command and user-facing workflow docs
**Deps**: SPEC13ATOSRCMIG-003

## Problem

After the Animalia atomic-source migration, an exploratory `world-index verify animalia` returned non-zero and wrote `content_hash_drift` rows because `tools/world-index/src/commands/verify.ts` iterates `file_versions.file_path` and checks each row with `existsSync(resolveWorldDirectory(...) + '/' + file_path)`. Atomic builds can store synthetic logical rows for retired root markdown paths, so verify can treat valid atomic-mode index state as missing disk files. `docs/WORKFLOWS.md` still advertises `world-index verify <world-slug>` as a normal index-integrity command, which is now misleading for machine-layer-enabled worlds.

## Assumption Reassessment (2026-04-24)

1. `tools/world-index/src/commands/verify.ts` currently verifies every `file_versions.file_path` as a disk path and records `drift_check/content_hash_drift` failures when `existsSync` is false.
2. `tickets/SPEC13ATOSRCMIG-003.md` records the live mismatch: `world-index verify animalia` is not an acceptance surface after atomic build because it checks synthetic logical file rows as disk paths.
3. Cross-artifact boundary: the command behavior, integration tests, CLI help, `tools/world-index/README.md`, and `docs/WORKFLOWS.md` must agree on what `verify` means for atomic-source worlds.
4. FOUNDATIONS principle under audit: `§Canonical Storage Layer` says `_source/` is the sole source-of-truth for atomized concerns and root monolithic markdown files do not exist on machine-layer-enabled worlds.
5. Adjacent active ticket `SPEC13ATOSRCMIG-004` removes legacy markdown parser paths but does not own verify semantics or user-facing verify docs.

## Architecture Check

1. Fixing or explicitly narrowing `verify` is cleaner than leaving the CLI advertised while agents must remember it is unsafe in atomic mode.
2. No backwards-compatibility aliasing/shims introduced. If legacy-mode verify support is removed by `SPEC13ATOSRCMIG-004`, this ticket should simplify the command to the atomic contract rather than preserve a parallel legacy branch.

## Verification Layers

1. Atomic-source verify behavior -> targeted tool command / integration test.
2. Drift detection for real disk-backed files still works -> targeted test against an atomic fixture or temp-copied `animalia`.
3. User-facing command docs match behavior -> codebase grep-proof/manual review of CLI help, README, and `docs/WORKFLOWS.md`.

## What to Change

### 1. Reassess verify's atomic contract

Decide whether atomic `verify` should:

- skip synthetic logical rows and verify only disk-backed source files, or
- stop storing synthetic logical paths in `file_versions`, or
- explicitly fail with an actionable unsupported-mode message until the command is reworked.

Choose the smallest truthful fix aligned with the current `tools/world-index` architecture.

### 2. Patch tests

Add or update tests so an atomic-source world can be built and then verified without false drift rows, while a real edit to a disk-backed source file still produces drift.

### 3. Update docs/help

Update `tools/world-index/README.md`, CLI usage text if needed, and `docs/WORKFLOWS.md` so the quick reference no longer overstates unsupported verify behavior.

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

1. `tools/world-index/tests/**` — focused coverage for post-atomic verify behavior and real drift detection.

### Commands

1. `npm run build` from `tools/world-index`.
2. `npm test` from `tools/world-index`.
3. `node tools/world-index/dist/src/cli.js build animalia` from repo root.
4. `node tools/world-index/dist/src/cli.js verify animalia` from repo root, if the command remains supported for atomic-source worlds.
