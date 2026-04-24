# SPEC13ATOSRCMIG-002: world-index parser — add `_source/` atomic-record input path (legacy preserved)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (parser; adds atomic-source input path; legacy monolithic markdown parsing retained for transition window)
**Deps**: None

## Problem

SPEC-13 Stream B's §E step 13 runs `world-index build animalia` against the newly-authored `_source/*.yaml` tree. The current world-index parser (SPEC-01 deliverable at `tools/world-index/src/`) reads monolithic markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, and the 9 other retired root-level files) as canonical input. For Stream B (SPEC13ATOSRCMIG-003) to succeed, the parser must read `_source/*.yaml` atomic records as primary input for the 11 atomized file classes. Legacy markdown parsing must remain operational until the migration commits, because pre-migration animalia still has monolithic files and the parser must build against either state during the transition window (per `specs/IMPLEMENTATION-ORDER.md` Phase 1.5 Stream C).

## Assumption Reassessment (2026-04-24)

1. Verified current parser at `tools/world-index/src/commands/shared.ts`, `tools/world-index/src/enumerate.ts`, and `tools/world-index/src/parse/yaml.ts` reads monolithic markdown; `_source/` is currently excluded and `findMissingMandatoryFiles()` still requires the retired root files.
2. Verified `specs/IMPLEMENTATION-ORDER.md` Phase 1.5 Stream C directs this split: add atomic-source support with legacy retained, then remove legacy support in SPEC13ATOSRCMIG-004 after Stream B commits.
3. Cross-artifact boundary: the parser's output schema (`NodeRow`, existing node types `canon_fact_record`, `change_log_entry`, `invariant`, `mystery_reserve_entry`, `open_question_entry`, `named_entity`, `section`, and existing edge types) must remain stable across legacy and atomic-source input paths. Downstream consumers are storage-form-agnostic and must not require changes in this ticket.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Mandatory World Files now declares `_source/` as the sole canonical form for the eleven atomized concerns on machine-layer-enabled worlds; the parser must consume that storage form without requiring the retired root markdown files.
5. Schema extension assessment: parser **output** schema is preserved. Parser **input** adds atomic-YAML readers that emit existing `NodeRow` shapes. The live code has no `prose_section` node type, so SEC records emit existing `section` nodes. The existing test fixture contains `_source/raw.md`; atomic dispatch must require recognized `_source` YAML records, not mere `_source/` directory existence, until the fixture is migrated.

## Architecture Check

1. Parser gains a storage-form dispatch: if `worlds/<slug>/_source/` contains recognized SPEC-13 atomic YAML records, the atomic-YAML input path is taken for the 11 atomized file classes; otherwise legacy markdown parsing runs. `WORLD_KERNEL.md` and `ONTOLOGY.md` are always read as markdown in both paths. Dispatch remains filesystem-based, with recognized record presence used to avoid misclassifying the current legacy fixture's ignored `_source/raw.md`.
2. No backwards-compatibility aliasing introduced. Both paths preserve the same output schema and shared semantic node identities where records are equivalent; storage-specific `file_path`, raw `body`, and content hashes may differ. Legacy markdown path is removed cleanly in SPEC13ATOSRCMIG-004 after Stream B commits; this ticket does not rename, alias, or wrap existing parse functions.

## Verification Layers

1. Atomic-YAML path emits valid node model → schema validation: parser output conforms to the existing `NodeRow` interface in `tools/world-index/src/schema/types.ts`.
2. Legacy markdown path unchanged → targeted tool command: existing legacy fixture builds through the existing markdown path even though it still contains ignored `_source/raw.md`.
3. Dispatch correctness → targeted tool command: an atomic-source fixture with recognized `_source/*.yaml` records builds through the atomic path without the retired root markdown files.
4. Cross-path equivalence → schema validation: controlled legacy/atomic fixture pair with equivalent CF, CH, entity, and section content produces equivalent semantic node IDs and node types for the shared records; path and source-body hashes may differ because storage files differ.

## What to Change

### 1. Parser dispatch

Add a top-level check in the build/sync orchestrator for recognized atomic records under `worlds/<slug>/_source/`. Route to atomic-YAML input when present; otherwise to the legacy markdown path.

### 2. Atomic-YAML input path

Implement readers for each `_source/` subdirectory per SPEC-13 §B schemas:

- `_source/canon/CF-NNNN.yaml` → `canon_fact_record` nodes
- `_source/change-log/CH-NNNN.yaml` → `change_log_entry` nodes
- `_source/invariants/<ID>.yaml` → `invariant` nodes (IDs preserved verbatim: `ONT-1`, `CAU-1`, etc.)
- `_source/mystery-reserve/M-NNNN.yaml` → `mystery_reserve_entry` nodes
- `_source/open-questions/OQ-NNNN.yaml` → `open_question_entry` nodes
- `_source/entities/ENT-NNNN.yaml` → `named_entity` nodes (replaces the former `ONTOLOGY.md` §Named Entity Registry block)
- `_source/<prose-file-class>/SEC-<PREFIX>-NNN.yaml` for the 7 prose file classes (ELF/INS/MTS/GEO/ECR/PAS/TML) → existing `section` nodes; `touched_by_cf[]` produces `patched_by` edges from the SEC node to each listed CF.

### 3. Output stability

SQLite schema and edge types remain unchanged. Shared record node IDs and node types are equivalent across storage forms. `file_path`, raw `body`, and content hashes are allowed to differ where the storage form differs.

### 4. Legacy path retention

Existing markdown parsing remains fully functional and is the default when recognized atomic records are absent. SPEC13ATOSRCMIG-004 performs legacy removal after Stream B commits.

### 5. Test coverage

Add programmatic temp-world coverage in `tools/world-index/tests/atomic-source-input.test.ts`: one atomic-source world with no retired root markdown files, and one legacy fixture copy that still contains ignored `_source/raw.md`.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (new — atomic-source readers and logical domain-file emitters)
- `tools/world-index/src/commands/shared.ts` (modify — build/sync dispatch, atomic mandatory-file rules, atomic entity registry loading)
- `tools/world-index/tests/atomic-source-input.test.ts` (new)
- `tools/world-index/package.json` (not modified — existing `yaml` dependency was sufficient)

## Out of Scope

- Removing legacy markdown parsing (SPEC13ATOSRCMIG-004).
- `world-index render` CLI (Phase 2 per SPEC-13 Q2 disposition).
- Validator framework `world-validate` (SPEC-04 Phase 2).
- Implementing MCP tools `get_record`, `find_sections_touched_by`, `get_compiled_view` (Phase 2 SPEC-02 update).
- Modifying `tools/world-mcp/` query layer (consumers are already storage-form-agnostic).
- Updating the `create-base-world` skill to emit `_source/` directly (Phase 2 SPEC-06).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build` succeeds (tsc passes under the build script).
2. `cd tools/world-index && npm test` passes all existing legacy-path tests unchanged.
3. `cd tools/world-index && npm test` passes the new `atomic-source-input.test.ts` coverage for atomic-source and legacy-dispatch regression.
4. `node tools/world-index/dist/src/cli.js build animalia` from the repo root completes with 0 errors against pre-migration animalia. The CLI resolves worlds from `process.cwd()`, so repo root is the truthful command root.
5. Atomic-path build verification is covered by the temp atomic world in `atomic-source-input.test.ts`; no checked-in fixture directory is required.

### Invariants

1. Parser output node schema is unchanged across both input paths.
2. Legacy markdown parsing behaviour is unchanged for pre-migration worlds (animalia pre-SPEC13ATOSRCMIG-003 still builds cleanly).
3. `_source/` dispatch uses recognized SPEC-13 YAML record presence, not a config flag or environment variable.
4. `WORLD_KERNEL.md` and `ONTOLOGY.md` are parsed as markdown in both paths (they remain primary-authored root-level files in the atomic-source contract).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/atomic-source-input.test.ts` — verifies representative `_source/*.yaml` content emits the expected node model for CF, CH, invariant, Mystery Reserve, Open Question, Named Entity, SEC section, logical domain-file, required-world-update, and `touched_by_cf` edges.
2. `tools/world-index/tests/atomic-source-input.test.ts` — verifies the legacy fixture still uses markdown when `_source/` has no recognized atomic YAML records.

### Commands

1. `cd tools/world-index && npm run build` — TypeScript build.
2. `cd tools/world-index && node --test dist/tests/atomic-source-input.test.js` — targeted atomic-path and legacy-dispatch test.
3. `cd tools/world-index && npm test` — full world-index test suite.
4. `node tools/world-index/dist/src/cli.js build animalia` — repo-root CLI smoke for the current pre-migration animalia legacy path.

## Outcome

Implemented atomic-source support in `tools/world-index/src/parse/atomic.ts` and wired it through `tools/world-index/src/commands/shared.ts`.

- Recognized SPEC-13 `_source/<class>/*.yaml` records now emit existing `NodeRow` types without changing the SQLite schema.
- Atomic builds no longer require the 11 retired root markdown files; they require only `WORLD_KERNEL.md` and `ONTOLOGY.md` at the root.
- Logical domain-file nodes preserve existing `required_world_update` edge targets for atomized concerns.
- `_source/entities/*.yaml` now supplies the world entity registry in atomic mode while preserving generated `entity:<slug>` nodes for query compatibility.
- Legacy markdown parsing remains the default when recognized atomic records are absent.

## Verification Result

Passed on 2026-04-24:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/atomic-source-input.test.js`
3. `cd tools/world-index && npm test`
4. `node tools/world-index/dist/src/cli.js build animalia`

## Deviations

1. The draft's checked-in atomic fixture and separate cross-path determinism test were replaced with temp-world coverage inside `atomic-source-input.test.ts`. This keeps the proof focused and avoids adding fixture churn while still exercising atomic dispatch and legacy dispatch.
2. The draft's byte-identical cross-path content-hash claim was narrowed: shared semantic record IDs and node types are preserved, but raw bodies, file paths, and content hashes differ legitimately between monolithic markdown and per-record YAML storage.
3. Dispatch uses recognized atomic YAML record presence rather than bare `_source/` directory existence because the existing legacy fixture already contains ignored `_source/raw.md`.
