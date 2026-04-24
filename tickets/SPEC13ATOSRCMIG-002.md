# SPEC13ATOSRCMIG-002: world-index parser — add `_source/*.yaml` atomic-record input path (legacy preserved)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (parser; adds atomic-source input path; legacy monolithic markdown parsing retained for transition window)
**Deps**: None

## Problem

SPEC-13 Stream B's §E step 13 runs `world-index build animalia` against the newly-authored `_source/*.yaml` tree. The current world-index parser (SPEC-01 deliverable at `tools/world-index/src/`) reads monolithic markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, and the 9 other retired root-level files) as canonical input. For Stream B (SPEC13ATOSRCMIG-003) to succeed, the parser must read `_source/*.yaml` atomic records as primary input for the 11 atomized file classes. Legacy markdown parsing must remain operational until the migration commits, because pre-migration animalia still has monolithic files and the parser must build against either state during the transition window (per `specs/IMPLEMENTATION-ORDER.md` Phase 1.5 Stream C).

## Assumption Reassessment (2026-04-24)

1. Verified current parser at `tools/world-index/src/` reads monolithic markdown per SPEC-01 delivery (archived at `archive/specs/SPEC-01-world-index.md`); an atomic-YAML input path does not exist yet.
2. Verified `specs/IMPLEMENTATION-ORDER.md` Phase 1.5 Stream C directs exactly this split: Phase A adds atomic-source support with legacy retained; Phase B (SPEC13ATOSRCMIG-004) removes legacy support once Stream B commits.
3. Cross-artifact boundary: the parser's output schema (node types `canon_fact`, `change_log_entry`, `invariant`, `mystery_reserve_entry`, `open_question`, `named_entity`, `prose_section`, and their edges) must remain stable across legacy and atomic-source input paths. Downstream consumers — `tools/world-mcp/` query layer, context-packet assembler (`get_context_packet`), any future Phase 2 validator framework (SPEC-04) and patch engine (SPEC-03) — are all storage-form-agnostic and must not require changes in this ticket.
4. FOUNDATIONS principle under audit: `§Canonical Storage Layer` (authored by SPEC-13) — `_source/` is the primary storage form for machine-layer-enabled worlds; the parser must consume it as such.
5. Schema extension assessment: parser **output** node schema is storage-form-agnostic and preserved as-is. Parser **input** adds an atomic-YAML path that emits the same node shape. Consumers of the parser's output (world-mcp query layer, context-packet assembler) are unaffected — additive-only at the input boundary, zero change at the output boundary.

## Architecture Check

1. Parser gains a storage-form dispatch: if `worlds/<slug>/_source/` exists, atomic-YAML input path is taken for the 11 atomized file classes; otherwise (pre-migration) legacy markdown parsing runs. `WORLD_KERNEL.md` and `ONTOLOGY.md` (the two root-level primary-authored files) are always read as markdown in both paths. Dispatch is keyed on filesystem directory existence, not a config flag or environment variable — zero-configuration transition.
2. No backwards-compatibility aliasing introduced. Both paths produce identical node-model output for equivalent semantic content. Legacy markdown path is removed cleanly in SPEC13ATOSRCMIG-004 after Stream B commits; this ticket does not rename, alias, or wrap existing parse functions.

## Verification Layers

1. Atomic-YAML path emits valid node model → schema validation: parser output conforms to the existing node-record interface(s) exported from `tools/world-index/src/schema/` (or wherever SPEC-01 placed the node model). Existing `world-mcp` query code consuming the indexed nodes continues to function against atomic-path-built indexes with no changes.
2. Legacy markdown path unchanged → codebase grep-proof: existing parser functions (`parseCanon`, `parseInvariants`, `parseMysteryReserve`, etc. — exact names follow SPEC-01's layout) remain present and are the default when `_source/` is absent.
3. Dispatch correctness → skill dry-run: `world-index build animalia` on pre-migration animalia (no `_source/`) succeeds via legacy path; same command on an atomic-source test fixture succeeds via atomic path.
4. Cross-path determinism → schema validation: controlled fixture with equivalent content in both storage forms produces byte-identical node records through `world-index build`.

## What to Change

### 1. Parser dispatch

Add a top-level check at the entry point of `tools/world-index/src/` (likely in the build orchestrator invoked by `src/commands/build.ts`) for `worlds/<slug>/_source/` directory existence. Route to atomic-YAML input path if present; otherwise to the legacy markdown path.

### 2. Atomic-YAML input path

Implement readers for each `_source/` subdirectory per SPEC-13 §B schemas:

- `_source/canon/CF-NNNN.yaml` → `canon_fact` nodes
- `_source/change-log/CH-NNNN.yaml` → `change_log_entry` nodes
- `_source/invariants/<ID>.yaml` → `invariant` nodes (IDs preserved verbatim: `ONT-1`, `CAU-1`, etc.)
- `_source/mystery-reserve/M-NNNN.yaml` → `mystery_reserve_entry` nodes
- `_source/open-questions/OQ-NNNN.yaml` → `open_question` nodes
- `_source/entities/ENT-NNNN.yaml` → `named_entity` nodes (replaces the former `ONTOLOGY.md` §Named Entity Registry block)
- `_source/<prose-file-class>/SEC-<PREFIX>-NNN.yaml` for the 7 prose file classes (ELF/INS/MTS/GEO/ECR/PAS/TML) → `prose_section` nodes carrying `touched_by_cf[]` reverse-index edges

### 3. Output stability

SQLite schema, node IDs, edge types, and content-hash values remain byte-identical for equivalent content regardless of input path. Legacy-path callers (pre-migration animalia) observe no behavioural change.

### 4. Legacy path retention

All existing `parseCanon`, `parseInvariants`, etc. functions remain fully functional and are the default when `_source/` is absent. Do not remove, rename, or wrap them — SPEC13ATOSRCMIG-004 performs the removal cleanly after Stream B commits.

### 5. Test fixtures

Add an atomic-source test-world fixture under `tools/world-index/tests/fixtures/` with a fully-populated `_source/` tree exercising all 7 record classes. Add a cross-path determinism fixture pair (one monolithic, one atomic) with semantically equivalent content for the determinism test.

## Files to Touch

- `tools/world-index/src/parse/atomic/` (new — per-record-class atomic readers; exact module layout per implementer's discretion but follow SPEC-01 parse-module conventions)
- `tools/world-index/src/` dispatch site (modify — the build orchestrator that currently drives markdown parsing)
- `tools/world-index/tests/atomic-source-input.test.ts` (new)
- `tools/world-index/tests/cross-path-determinism.test.ts` (new)
- `tools/world-index/tests/fixtures/<atomic-test-world>/` (new)
- `tools/world-index/package.json` (modify only if `js-yaml` or equivalent YAML parser is not already a dependency; do not introduce new unrelated deps)

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
3. `cd tools/world-index && npm test` passes the new `atomic-source-input.test.ts` and `cross-path-determinism.test.ts`.
4. `cd tools/world-index && node dist/src/cli.js build <atomic-test-world>` completes with 0 errors against the new atomic fixture.
5. `cd tools/world-index && node dist/src/cli.js build <pre-migration-monolithic-fixture>` continues to succeed (legacy-path regression).

### Invariants

1. Parser output node schema is unchanged across both input paths.
2. Legacy markdown parsing behaviour is unchanged for pre-migration worlds (animalia pre-SPEC13ATOSRCMIG-003 still builds cleanly).
3. `_source/` directory detection uses filesystem existence, not a config flag or environment variable.
4. `WORLD_KERNEL.md` and `ONTOLOGY.md` are parsed as markdown in both paths (they remain primary-authored root-level files in the atomic-source contract).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/atomic-source-input.test.ts` — verifies each of the 7 record classes' readers emits the expected node model from representative `_source/*.yaml` content.
2. `tools/world-index/tests/cross-path-determinism.test.ts` — verifies node-model byte-equality across legacy and atomic-source input paths for a semantically equivalent fixture pair.
3. `tools/world-index/tests/fixtures/<atomic-test-world>/` — fully-populated atomic test fixture.
4. Cross-path fixture pair — equivalent monolithic + atomic content for determinism verification.

### Commands

1. `cd tools/world-index && npm run build && npm test` — full world-index build and test suite.
2. `cd tools/world-index && node dist/src/cli.js build <atomic-test-world>` — targeted atomic-path build verification.
3. `cd tools/world-index && node dist/src/cli.js build <legacy-fixture>` — legacy-path regression verification.
