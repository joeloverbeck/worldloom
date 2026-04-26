# CIINT-002: Reconcile enumerate.ts and indexer-output semantics post-SPEC-13

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — affects `tools/world-index/src/enumerate.ts`, `tools/world-index/src/commands/shared.ts`, `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/parse/semantic.ts`, and related tests
**Deps**: None (implementation is independent of `archive/tickets/CIINT-001.md`)

## Problem

At intake, three failing tests in `tools/world-index/tests/integration/build-animalia.test.ts` revealed architectural drift between `enumerate()` (the file-system walker that classifies world paths) and the indexer's actual file-tracking behavior, plus one test that still seeded a pre-SPEC-13 `ONTOLOGY.md` registry block.

The test assertions are not the bug — they expose unresolved inconsistencies in the post-SPEC-13 state.

### Test 1 — `build succeeds, writes the current schema version, and matches source-derived node counts` (lines 335-367)

At intake, `enumerate()` reported `audits/validation-grandfathering-pre-spec14.yaml` as **unexpected** (the test asserted `enumeration.unexpected.length === 0`). The file genuinely exists in `worlds/animalia/audits/` and is tracked in the private world repo. `enumerate.ts` only treated `audits/*.md` and `audits/<AU-NNNN>/retcon-proposals/*.md` as indexable. There was no provision for `audits/*.yaml`.

Intake question: is this `.yaml` file an audit artifact that should be indexable, an obsolete file that should be deleted from animalia, or a SPEC-14 grandfathering record that should live elsewhere? The landed decision is that top-level `audits/*.yaml` files are expected audit-sidecar artifacts and are explicitly ignored by `enumerate()`.

### Test 5 — `build promotes explicit ontology registry declarations from the copied world fixture` (lines 560-626)

At intake, the test called `replaceNamedEntityRegistry(root, ...)`, expecting to find a `## Named Entity Registry` block in `ONTOLOGY.md` and replace its YAML content. Per `CLAUDE.md` "Named Entity Registry atomized to `_source/entities/`", that block was removed by SPEC-13. The current `ONTOLOGY.md` did not contain the `## Named Entity Registry` heading; the regex did not match; the test's `assert.notEqual(updated, existing, "expected copied animalia ONTOLOGY.md to contain a named-entity registry")` failed.

Intake question: does the indexer still have a code path that reads a yaml registry block from `ONTOLOGY.md` (legacy behavior) and a separate path that reads `_source/entities/*.yaml` (SPEC-13)? The landed test now seeds `_source/entities/*.yaml`, matching the build path's `loadAtomicEntityRegistry()` contract for atomic-source worlds.

### Test 12 — `all indexable files appear in file_versions` (lines 914-943)

At intake, the test asserted `file_versions.file_path[]` deep-equaled `enumerate(root).indexable`. They diverged: `file_versions` contained `_source/canon/CF-NNNN.yaml`, `_source/change-log/CH-NNNN.yaml`, etc. (the indexer was correctly tracking atomic records), and it contained synthetic logical concern rows like `INVARIANTS.md`, `CANON_LEDGER.md`, `ECONOMY_AND_RESOURCES.md` that do not exist as disk files in the fixture. Meanwhile `enumerate()` returned only `WORLD_KERNEL.md`, `ONTOLOGY.md`, plus `adjudications/*.md`, `characters/*.md`, etc.

Two distinct contracts are nested here:

1. The indexer intentionally creates synthetic logical `domain_file` rows for retired atomized concern names via `createAtomicLogicalFileResults()` in `tools/world-index/src/parse/atomic.ts`. These rows are not physical disk files and are not ghost rows.
2. `enumerate()` excludes `_source/` even though the indexer processes `_source/*.yaml`. If `enumerate()` is the canonical disk-backed inventory, it is stale and should include the atomic source records that build/sync actually index.

## Assumption Reassessment (2026-04-26)

1. `tools/world-index/src/enumerate.ts` exists with `enumerate()`, `MANDATORY_WORLD_FILES` (13 entries), `PRIMARY_AUTHORED_ROOT_FILES` (`{WORLD_KERNEL.md, ONTOLOGY.md}`), and `isExcludedPath` excluding `_source/` and `_index/`. Confirmed via `grep -n 'MANDATORY_WORLD_FILES\|PRIMARY_AUTHORED_ROOT_FILES\|isExcludedPath' tools/world-index/src/enumerate.ts`.
2. `tools/world-index/src/commands/build.ts` delegates immediately to `buildWorldIndex()` in `tools/world-index/src/commands/shared.ts`. `shared.ts::reindexAllFiles()` currently calls `enumerate(worldDirectory)`, then separately adds `createAtomicLogicalFileResults(worldSlug)` and `listAtomicSourceFiles(worldDirectory)`. The current indexer therefore uses `enumerate()` for root/hybrid prose files, not as the full disk-backed inventory.
3. Cross-artifact boundary: the contract under audit is the relationship between `enumerate()` and the `file_versions` table population logic in `buildWorldIndex()` / `reindexAllFiles()`. Both sit inside `tools/world-index`; no cross-package contract is at stake. SPEC-13's atomic-source mandate (FOUNDATIONS §Mandatory World Files; CLAUDE.md §Repository Layout) sets the direction: `_source/*.yaml` is canonical storage and must be part of the disk-backed index inventory.
4. FOUNDATIONS principle under audit: §Mandatory World Files says machine-layer-enabled worlds store the eleven atomized concerns and Named Entity Registry as atomic YAML under `_source/`, with only `WORLD_KERNEL.md` and `ONTOLOGY.md` primary-authored at the root. The 13-prose-file `MANDATORY_WORLD_FILES` set is still used by `parse/prose.ts` and `parse/semantic.ts` for domain-file node IDs and attribution target resolution, so it is not dead code and should not be deleted in this ticket.
5. Adjacent contradictions surfaced during reassessment:
   - The retired root concern names in `file_versions` are synthetic logical rows from `createAtomicLogicalFileResults()`, not physical-file ghost rows. This ticket preserves them and makes the test distinguish synthetic logical rows from disk-backed rows.
   - Test 5 assumes a legacy `ONTOLOGY.md` registry mutation on the Animalia fixture. `shared.ts::finalizeEntityState()` now loads the build registry from `_source/entities/` through `loadAtomicEntityRegistry(worldDirectory)`. The same test should seed `_source/entities/*.yaml`, not mutate `ONTOLOGY.md`.
   - `audits/validation-grandfathering-pre-spec14.yaml` is an expected audit-sidecar YAML artifact, not a world-index parsed source record. It should be explicitly ignored by `enumerate()` so audit policy/baseline YAML does not become either an unexpected path warning or an indexed markdown/YAML source.
6. The fixture at `tests/fixtures/animalia/` is the test source. It contains root `WORLD_KERNEL.md` / `ONTOLOGY.md`, 225 `_source/*.yaml` records, hybrid markdown content, and `audits/validation-grandfathering-pre-spec14.yaml`.
7. Implementation surfaced same-seam fallout after `_source/*.yaml` entered the enumerated build inventory: atomic `required_world_updates` can cite primary-authored root concerns as `ONTOLOGY` / `WORLD_KERNEL` without the `.md` suffix. `tools/world-index/src/parse/atomic.ts` and `tools/world-index/src/parse/semantic.ts` now normalize extensionless mandatory concern targets before resolving `domain_file` node IDs.

## Architecture Check

1. Single-source-of-truth principle: post-SPEC-13, `_source/*.yaml` is the canonical storage layer; `enumerate()` should reflect the indexer's disk-backed processing surface, not a stale prose-file inventory. `reindexAllFiles()` should consume `enumerate().indexable` for both markdown/hybrid files and atomic source YAML. Synthetic logical concern rows remain a separate generated layer because they are not disk-backed files.
2. No backwards-compatibility aliasing/shims introduced. The legacy Animalia `ONTOLOGY.md` registry test setup is replaced by atomic `_source/entities/` setup. No fallback to a missing Animalia registry block is added.

## Verification Layers

1. `enumerate()` post-fix returns a list whose semantics match a documented contract -> codebase grep-proof of `enumerate.ts` exports + manual review of new docstring/comment naming the contract.
2. Disk-backed `file_versions` rows correspond 1:1 to files that physically exist in the world tree; synthetic logical rows are explicitly exempted by `ATOMIC_LOGICAL_WORLD_FILES` -> targeted SQL/test helper probe.
3. `audits/validation-grandfathering-pre-spec14.yaml` resolves to a definite classification (expected ignored audit-sidecar YAML) -> codebase grep-proof of `enumerate.ts` decision + decision recorded in a comment.
4. The Animalia registry promotion test is re-tested against atomic-source `_source/entities/` -> codebase grep-proof of `loadAtomicEntityRegistry` in `shared.ts` + the test passing.
5. Tests 1, 5, 12 in `build-animalia.test.ts` pass against the current fixture -> targeted `node --test` invocation.
6. No silent disk-backed `file_versions` ghost rows -> SQL/test helper probe asserting every non-synthetic `file_versions.file_path` exists on disk.

## What to Change

### 1. Investigate `build()` to determine current `file_versions` population path

Read `tools/world-index/src/commands/build.ts` and `tools/world-index/src/commands/shared.ts` end-to-end. `build.ts` delegates to `buildWorldIndex()`. `reindexAllFiles()` currently combines three sources: `enumerate().indexable` for markdown/hybrid files, generated `ATOMIC_LOGICAL_WORLD_FILES`, and `listAtomicSourceFiles()` for `_source/*.yaml`.

### 2. Decide and implement the canonical "indexable file set" contract

Implement Shape A for disk-backed files: `enumerate()` becomes the canonical disk-backed file inventory. Update it to include `_source/*.yaml` files in recognized atomic source subdirectories. Update `reindexAllFiles()` to consume those enumerated `_source` paths instead of calling `listAtomicSourceFiles()` separately. Keep generated `ATOMIC_LOGICAL_WORLD_FILES` separate because they are synthetic logical rows, not filesystem inventory.

### 3. Resolve the audit-yaml classification

Classify `audits/validation-grandfathering-pre-spec14.yaml` as an out-of-band audit-sidecar policy/baseline artifact. Add an explicit `audits/*.yaml` ignore rule in `enumerate.ts` so this class is neither indexed nor reported as unexpected. Do not move or remove the fixture file in this ticket.

### 4. Remove or rewrite test 5

Rewrite test 5 to seed atomic-source equivalents (`_source/entities/ENT-9998.yaml` and `ENT-9999.yaml`) and assert the same entity/alias outcome. Do not mutate `ONTOLOGY.md` in the Animalia fixture test.

### 5. Remove the `MANDATORY_WORLD_FILES` constant if it is dead code

Keep `MANDATORY_WORLD_FILES` because `parse/prose.ts` and `parse/semantic.ts` still use it for domain-file and attribution-target semantics. Do not expand this ticket into that lower-level semantic contract.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify — likely substantial refactor)
- `tools/world-index/src/commands/shared.ts` (modify — use enumerated atomic source paths)
- `tools/world-index/src/parse/atomic.ts` (modify — resolve extensionless primary-authored required-world-update targets)
- `tools/world-index/src/parse/semantic.ts` (modify — resolve extensionless mandatory required-world-update targets)
- `tools/world-index/tests/integration/build-animalia.test.ts` (modify — tests 1, 5, 12)
- `tools/world-index/tests/enumerate.test.ts` (modify — enumerator fixture expectation)
- `tools/world-index/tests/prose-domain-file.test.ts` (modify — extensionless required-world-update coverage)

## Out of Scope

- Tests 3, 9, 10 in the same file. Completed in `archive/tickets/CIINT-001.md`.
- The glob change in `tools/world-index/package.json`. Reserved for `CIINT-003` (depends on this ticket + `archive/tickets/CIINT-001.md`).
- Migrating the `audits/validation-grandfathering-pre-spec14.yaml` file itself if the decision is "move it elsewhere" — that's a separate world-content change and would need its own PR against the private world repo, plus a fixture refresh.
- Touching specs under `specs/` or `archive/specs/` — this is implementation cleanup, not a new spec.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && node dist/tests/integration/build-animalia.test.js` shows all 12 subtests as `ok`, including tests 1, 5, and 12.
2. The other tests in the file (2, 3, 4, 6, 7, 8, 9, 10, 11) remain `ok` (3, 9, 10 require the completed `archive/tickets/CIINT-001.md` changes to be present in the branch).
3. `cd tools/world-index && npm test` continues to pass (55/55 top-level suite).
4. No non-synthetic `file_versions` row references a non-existent file; the concrete probe is written into the integration test.

### Invariants

1. `enumerate()`'s return value has a documented contract (single-source canonical or prose-only with explicit naming). The contract is named in code or doc-comment, not implicit.
2. Non-synthetic `file_versions.file_path` rows correspond to files that physically exist in the world directory.
3. `MANDATORY_WORLD_FILES` is preserved only for the live semantic consumers that still import it; it is not used as the enumerator's disk-file contract.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/build-animalia.test.ts` — tests 1 and 12 updated to reflect the chosen contract; test 5 rewritten to seed `_source/entities/*.yaml`. Rationale: align tests with the post-SPEC-13 indexer contract.
2. `tools/world-index/tests/integration/build-animalia.test.ts` — added a non-synthetic `file_versions` path-existence probe. Rationale: structural invariant that the prior test only weakly implied.
3. `tools/world-index/tests/enumerate.test.ts` — updated the fixture expectation for unrecognized `_source/raw.md`. Rationale: `_source/` is no longer wholesale excluded.
4. `tools/world-index/tests/prose-domain-file.test.ts` — added extensionless `ONTOLOGY` resolution coverage. Rationale: primary-authored concern references must resolve consistently from prose and atomic records.

### Commands

1. `cd tools/world-index && npm run build` — producer build for compiled tests.
2. `cd tools/world-index && node dist/tests/integration/build-animalia.test.js` — targeted diagnostic: confirms all 12 Animalia integration subtests pass.
3. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js` — accepted wrapper: confirms the compiled integration file passes under `node --test`.
4. `cd tools/world-index && npm test` — package-level: confirms top-level suite (55/55) still passes.
5. `cd tools/patch-engine && npm test`; `cd tools/validators && npm test`; `cd tools/world-mcp && npm test`; `cd tools/hooks && npm test` — full-pipeline regression check.

## Outcome

Completed: 2026-04-26.

`enumerate()` now documents and implements the disk-backed indexable file inventory: root primary-authored markdown, hybrid markdown surfaces, and recognized `_source/*.yaml` atomic records. `reindexAllFiles()` consumes enumerated `_source` paths instead of independently calling `listAtomicSourceFiles()`, while synthetic `ATOMIC_LOGICAL_WORLD_FILES` remain generated logical rows outside filesystem enumeration.

`audits/*.yaml` at the top level is explicitly ignored as audit-sidecar policy/baseline data, so `audits/validation-grandfathering-pre-spec14.yaml` no longer creates an unexpected-path warning or indexed source row.

The Animalia integration test now computes expected counts from both enumerated disk-backed files and generated logical rows, rewrites the registry-promotion test to seed `_source/entities/*.yaml`, and asserts every non-synthetic `file_versions` row resolves to an actual copied fixture file. Same-seam `required_world_updates` resolution was also tightened so extensionless `ONTOLOGY` / `WORLD_KERNEL` / mandatory concern targets resolve to their `domain_file` nodes.

## Verification Result

1. `cd tools/world-index && npm run build` — passed.
2. `cd tools/world-index && node dist/tests/integration/build-animalia.test.js` — passed; 12/12 Animalia integration subtests passed.
3. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js` — passed.
4. `cd tools/world-index && npm test` — passed; 55/55 top-level tests passed.
5. `cd tools/patch-engine && npm test` — passed; 40/40 tests passed.
6. `cd tools/validators && npm test` — passed; 54/54 tests passed.
7. `cd tools/world-mcp && npm test` — passed; 137/137 tests passed.
8. `cd tools/hooks && npm test` — passed; 17/17 tests passed.
9. `git diff --check` — passed.

Ignored generated artifacts observed after verification: `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/patch-engine/dist/`, `tools/patch-engine/node_modules/`, `tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, `tools/world-mcp/.secret`, `tools/hooks/dist/`, and `tools/hooks/node_modules/`. These are expected package/test artifacts from the verification lanes.

## Deviations

1. The drafted `node --test ... | grep -E "^(ok|not ok) (1|5|12)"` proof is not the clearest subtest proof once the wrapper passes; direct execution of the compiled test file is the diagnostic subtest proof, and `node --test` is retained as the wrapper proof.
2. `MANDATORY_WORLD_FILES` was not deleted. It is still used by `parse/prose.ts` and `parse/semantic.ts` for domain-file and required-world-update semantics.
3. The landed file set includes `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/parse/semantic.ts`, and `tools/world-index/tests/prose-domain-file.test.ts` because indexing atomic records exposed extensionless required-world-update targets in the same build/file-version seam.
