# CIINT-002: Reconcile enumerate.ts and indexer-output semantics post-SPEC-13

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — likely affects `tools/world-index/src/enumerate.ts` and possibly `tools/world-index/src/commands/build.ts`; possibly removes a now-defunct ontology-registry promotion code path
**Deps**: None (implementation is independent of `archive/tickets/CIINT-001.md`)

## Problem

Three failing tests in `tools/world-index/tests/integration/build-animalia.test.ts` reveal architectural drift between `enumerate()` (the file-system walker that classifies world paths) and the indexer's actual file-tracking behavior, plus one test that exercises a feature presumably removed by SPEC-13.

The test assertions are not the bug — they expose unresolved inconsistencies in the post-SPEC-13 state.

### Test 1 — `build succeeds, writes the current schema version, and matches source-derived node counts` (lines 335-367)

`enumerate()` reports `audits/validation-grandfathering-pre-spec14.yaml` as **unexpected** (the test asserts `enumeration.unexpected.length === 0`). The file genuinely exists in `worlds/animalia/audits/` and is tracked in the private world repo. `enumerate.ts:120-126` only treats `audits/*.md` and `audits/<AU-NNNN>/retcon-proposals/*.md` as indexable. There is no provision for `audits/*.yaml`.

Question: is this `.yaml` file an audit artifact that should be indexable, an obsolete file that should be deleted from animalia, or a SPEC-14 grandfathering record that should live elsewhere? Resolution requires a decision about the audit directory's file-class contract.

### Test 5 — `build promotes explicit ontology registry declarations from the copied world fixture` (lines 560-626)

The test calls `replaceNamedEntityRegistry(root, ...)` which expects to find a `## Named Entity Registry` block in `ONTOLOGY.md` and replace its YAML content. Per `CLAUDE.md` "Named Entity Registry atomized to `_source/entities/`", that block was removed by SPEC-13. The current `ONTOLOGY.md` does not contain the `## Named Entity Registry` heading; the regex doesn't match; the test's `assert.notEqual(updated, existing, "expected copied animalia ONTOLOGY.md to contain a named-entity registry")` fails.

Question: does the indexer still have a code path that reads a yaml registry block from `ONTOLOGY.md` (legacy behavior) AND a separate path that reads `_source/entities/*.yaml` (SPEC-13)? If the legacy path was removed, the test should be deleted. If both paths coexist as a dual-source contract, the test should be rewritten to seed the atomic-source path.

### Test 12 — `all indexable files appear in file_versions` (lines 914-943)

Asserts `file_versions.file_path[]` deep-equals `enumerate(root).indexable`. They diverge: `file_versions` contains `_source/canon/CF-NNNN.yaml`, `_source/change-log/CH-NNNN.yaml`, etc. (the indexer is correctly tracking atomic records), AND it contains rows for legacy prose files like `INVARIANTS.md`, `CANON_LEDGER.md`, `ECONOMY_AND_RESOURCES.md` that **do not exist** in the fixture. Meanwhile `enumerate()` returns only `WORLD_KERNEL.md`, `ONTOLOGY.md`, plus `adjudications/*.md`, `characters/*.md`, etc.

Two distinct possible bugs nested here:

1. The indexer is creating `file_versions` rows for files that don't physically exist (legacy prose paths). If true, that's a real `build()` bug — possibly a hardcoded mandatory-file list (`MANDATORY_WORLD_FILES` in `enumerate.ts:9-23` lists 13 prose files; the indexer may iterate this set blindly rather than filtering by existence).
2. `enumerate()` excludes `_source/` (line 81-83) but the indexer correctly walks it. If `enumerate` is supposed to be the canonical "what should the indexer process" surface, it's stale; if it's supposed to mean "what prose files the indexer parses for prose nodes", then the test's equality assertion is the wrong shape.

## Assumption Reassessment (2026-04-26)

1. `tools/world-index/src/enumerate.ts` exists with `enumerate()`, `MANDATORY_WORLD_FILES` (13 entries), `PRIMARY_AUTHORED_ROOT_FILES` (`{WORLD_KERNEL.md, ONTOLOGY.md}`), and `isExcludedPath` excluding `_source/` and `_index/`. Confirmed via `grep -n 'MANDATORY_WORLD_FILES\|PRIMARY_AUTHORED_ROOT_FILES\|isExcludedPath' tools/world-index/src/enumerate.ts`.
2. `tools/world-index/src/commands/build.ts` is the indexer entry point; whether it consults `enumerate()` or walks the world independently is the central uncertainty of this ticket and must be answered before deciding which side of the mismatch is wrong.
3. Cross-artifact boundary: the contract under audit is the relationship between `enumerate()` and the `file_versions` table population logic in `build()`. Both sit inside `tools/world-index`; no cross-package contract is at stake. SPEC-13's atomic-source mandate (CLAUDE.md §Repository Layout, §Mandatory World Files) sets the direction: `_source/*.yaml` is the canonical storage form post-migration, so the indexer must process it; whether `enumerate()` should also enumerate it is the open question.
4. FOUNDATIONS principle under audit: §Mandatory World Files (atomic-source classification per SPEC-13). The 13-prose-file `MANDATORY_WORLD_FILES` set in `enumerate.ts` predates the atomization. Resolving it likely requires removing or repurposing that constant.
5. Adjacent contradictions surfaced during reassessment:
   - The `MANDATORY_WORLD_FILES` constant in `enumerate.ts:9-23` lists 13 prose files (`INVARIANTS.md`, `TIMELINE.md`, etc.) that no longer exist in animalia. If `build()` relies on this set, it generates ghost `file_versions` rows. This is classified as a **separate bug surfaced during reassessment** that this ticket must resolve, since fixing test 12 without resolving the ghost rows would just paper over the real defect.
   - Test 5 assumes a legacy ONTOLOGY.md registry promotion path. If that path was removed by SPEC-13 without removing the test, that's classified as **future cleanup that this ticket should action** (delete the test or rewrite to the atomic path), not a separate ticket — it lives in the same file and shares the SPEC-13 reconciliation theme.
6. The fixture at `tests/fixtures/animalia/` (committed alongside the CI rollout) is the test source; its file inventory is canonical for this ticket's investigation. Run `find tests/fixtures/animalia -maxdepth 2 -type f` for the authoritative listing.

## Architecture Check

1. Single-source-of-truth principle: post-SPEC-13, `_source/*.yaml` is the canonical storage layer; `enumerate()` should reflect the indexer's actual processing surface (whatever that is post-investigation), not a stale prose-file inventory. Either `enumerate()` is updated to include `_source/` and audits-yaml, or it is repurposed with a clearer name (`enumerateProseFiles()`) and the file_versions test is rewritten to its actual contract.
2. No backwards-compatibility aliasing/shims introduced. If the legacy `MANDATORY_WORLD_FILES` constant is dead code, delete it outright. If the legacy ONTOLOGY.md registry promotion path is dead code, delete it (and test 5) outright. No fallback paths, no compat shims.

## Verification Layers

1. `enumerate()` post-fix returns a list whose semantics match a documented contract -> codebase grep-proof of `enumerate.ts` exports + manual review of new docstring/comment naming the contract.
2. `file_versions` rows correspond 1:1 to files that physically exist in the world tree -> targeted SQL probe inside the test (no rows where `file_path` does not resolve to an extant file under `worldRoot`).
3. `audits/validation-grandfathering-pre-spec14.yaml` resolves to a definite classification (indexable, ignored, or removed from animalia) -> codebase grep-proof of `enumerate.ts` decision + decision recorded in a comment or docstring.
4. The `## Named Entity Registry` block promotion code path is either gone or re-tested against atomic-source `_source/entities/` -> codebase grep-proof of `extractEntities` / `loadOntologyRegistry` (or successor) + the test passing or being deleted.
5. Tests 1, 5, 12 in `build-animalia.test.ts` pass against the current fixture -> targeted `node --test` invocation.
6. No silent `file_versions` ghost rows -> SQL probe asserting `COUNT(*) FROM file_versions WHERE file_path NOT IN (<enumerated set>)` returns 0.

## What to Change

### 1. Investigate `build()` to determine current `file_versions` population path

Read `tools/world-index/src/commands/build.ts` end-to-end. Identify whether it consults `enumerate()`, iterates `MANDATORY_WORLD_FILES`, walks the filesystem independently, or some combination. Document the finding inline (in the ticket on update before implementation) before changing code.

### 2. Decide and implement the canonical "indexable file set" contract

Two viable shapes; pick one based on the investigation:

- **Shape A** (enumerate is canonical): `enumerate()` becomes the single source of truth. Update it to include `_source/*.yaml` (per atomic-source classification) and `audits/*.yaml` (or whichever specific yaml files the audit directory legitimately holds). `build()` consumes `enumerate().indexable` and only creates `file_versions` rows for those paths.
- **Shape B** (enumerate is prose-only, indexer walks atomic-source separately): rename `enumerate()` to `enumerateProseFiles()` (or similar) to reflect its actual scope. Add a parallel `enumerateAtomicRecords()` for `_source/*.yaml`. Test 12 is rewritten to assert `file_versions` equals the union.

Shape A is preferred (single source, simpler test) unless investigation reveals a hard architectural reason for the split.

### 3. Resolve the audit-yaml classification

Decide whether `audits/validation-grandfathering-pre-spec14.yaml` (and any future `audits/*.yaml`) is:
(a) a legitimate audit artifact format that `enumerate()` should treat as indexable;
(b) an out-of-band record that lives outside the indexable set (in which case `enumerate()` should explicitly exclude it via an `audits/*.yaml` rule, not silently flag as unexpected); or
(c) a misplaced file that should be moved or removed from animalia.

Decision is recorded in `enumerate.ts` (comment) and reflected in test 1's assertion or fixture content.

### 4. Remove or rewrite test 5

If investigation confirms the ONTOLOGY.md `## Named Entity Registry` promotion path was removed by SPEC-13: delete test 5 outright. If the path still exists and serves a SPEC-13-era purpose: rewrite the test to seed the atomic-source equivalent (`_source/entities/<id>.yaml` records) and assert the same indexer outcome.

### 5. Remove the `MANDATORY_WORLD_FILES` constant if it is dead code

If the constant is no longer consulted after the `build()` refactor in step 2, delete it. Do not leave a dead 13-entry set in `enumerate.ts` post-SPEC-13.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify — likely substantial refactor)
- `tools/world-index/src/commands/build.ts` (modify — likely changes to `file_versions` population path)
- `tools/world-index/tests/integration/build-animalia.test.ts` (modify — tests 1, 5, 12; possibly delete test 5)
- Possibly `tools/world-index/src/parse/entities.ts` and related files if the ontology-registry promotion path is touched (verify before implementation)

## Out of Scope

- Tests 3, 9, 10 in the same file. Completed in `archive/tickets/CIINT-001.md`.
- The glob change in `tools/world-index/package.json`. Reserved for `CIINT-003` (depends on this ticket + `archive/tickets/CIINT-001.md`).
- Migrating the `audits/validation-grandfathering-pre-spec14.yaml` file itself if the decision is "move it elsewhere" — that's a separate world-content change and would need its own PR against the private world repo, plus a fixture refresh.
- Touching specs under `specs/` or `archive/specs/` — this is implementation cleanup, not a new spec.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && node --test dist/tests/integration/build-animalia.test.js 2>&1 | grep -E "^(ok|not ok) (1|5|12) "` shows all three as `ok` (or test 5 absent if deleted, with the deletion reflected in the file).
2. The other tests in the file (2, 3, 4, 6, 7, 8, 9, 10, 11) remain `ok` (3, 9, 10 require the completed `archive/tickets/CIINT-001.md` changes to be present in the branch).
3. `cd tools/world-index && npm test` continues to pass (55/55 top-level suite).
4. No `file_versions` row references a non-existent file: `cd tools/world-index && node -e "const Database = require('better-sqlite3'); const db = new Database('/tmp/...world.db'); /* probe */"` returns 0 ghost rows. (Concrete probe to be written into the integration test as part of step 2.)

### Invariants

1. `enumerate()`'s return value has a documented contract (single-source canonical or prose-only with explicit naming). The contract is named in code or doc-comment, not implicit.
2. `file_versions.file_path` rows correspond to files that physically exist in the world directory.
3. No dead code remains in `enumerate.ts`: if `MANDATORY_WORLD_FILES` is unused, it is deleted.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/build-animalia.test.ts` — tests 1, 12 updated to reflect the chosen contract; test 5 deleted or rewritten to atomic-source path. Rationale: align tests with the post-SPEC-13 indexer contract.
2. New SQL probe inside the integration test asserting no ghost `file_versions` rows. Rationale: structural invariant that the prior test only weakly implied.

### Commands

1. `cd tools/world-index && npm run build && node --test dist/tests/integration/build-animalia.test.js 2>&1 | tail -30` — targeted: confirms tests 1, 5, 12 pass and no regression in the file.
2. `cd tools/world-index && npm test` — package-level: confirms top-level suite (55/55) still passes.
3. `for pkg in world-index patch-engine validators world-mcp hooks; do (cd tools/$pkg && npm test 2>&1 | tail -5); done` — full-pipeline: confirms no cross-package regression. The world-index changes are downstream of patch-engine, validators, world-mcp via `file:` deps; if `enumerate()` or `build()` semantics change in a way that affects exports, those packages may need rebuilds.
