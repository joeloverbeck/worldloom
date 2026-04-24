# SPEC13ATOSRCMIG-004: world-index parser — remove legacy markdown record-parsing for 11 retired file classes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` (parser; removes legacy monolithic-markdown parse code-paths for the 11 retired file classes; `WORLD_KERNEL.md` and `ONTOLOGY.md` prose-parsing retained)
**Deps**: SPEC13ATOSRCMIG-003 archived and user-owned migration commit created

## Problem

SPEC13ATOSRCMIG-002 landed the atomic-YAML input path with legacy monolithic-markdown parsing preserved for the transition window. SPEC13ATOSRCMIG-003 migrated animalia to `_source/` and left the final migration commit for user review, per `AGENTS.md`. Once that user-owned migration commit exists, no machine-layer-enabled world remains in monolithic form and legacy parse code-paths for the 11 retired file classes are dead code. `specs/IMPLEMENTATION-ORDER.md` Phase 1.5 Stream C Phase B directs their removal once Stream B commits; this ticket executes that cleanup.

## Assumption Reassessment (2026-04-24)

1. Verified SPEC13ATOSRCMIG-003 must be archived and the user-owned migration commit must exist before this ticket runs. No machine-layer-enabled world remains in monolithic form after Stream B is committed; `create-base-world` (Phase 2 SPEC-06) will emit `_source/` directly for future worlds.
2. Verified `tools/world-index` parser dispatch (installed by SPEC13ATOSRCMIG-002) currently routes to legacy path when `_source/` is absent; this ticket simplifies dispatch to an assertion that `_source/` exists.
3. Cross-artifact boundary: parser output node schema remains unchanged; removing legacy parse functions is an internal code-cleanliness refactor that does not touch any downstream consumer (`world-mcp` query layer, context-packet assembler, future Phase 2 validators and patch engine).
4. FOUNDATIONS principle under audit: none directly — internal cleanup. Indirectly supports `§Canonical Storage Layer` by making atomic-source the sole parser input path.
5. Removal blast radius: legacy parse functions (`parseCanon`, `parseInvariants`, `parseMysteryReserve`, `parseOpenQuestions`, `parseTimeline`, `parseGeography`, `parseInstitutions`, `parseEverydayLife`, `parseEconomyResources`, `parsePeoplesSpecies`, `parseMagicTech` — exact names follow SPEC-01's parser module layout) are called only from the parser's own dispatch site and from their own tests. No external consumer of the parser depends on legacy-path internals (confirmed by SPEC13ATOSRCMIG-002's atomic-source input coverage — consumers observe the storage-form-agnostic node model and shared semantic node identities).

## Architecture Check

1. Removes dead code. Parser becomes single-path: assume `_source/` exists; fail loudly with a clear error if missing. Cleaner than maintaining a dual-path dispatch indefinitely, and the parser's signature at the external boundary is unchanged.
2. No backwards-compatibility aliasing introduced — this ticket IS the removal of backward-compatibility code. The transition window the SPEC-13 bundle opened closes here.

## Verification Layers

1. Legacy code paths removed → codebase grep-proof: `grep -rEn "parseCanon|parseInvariants|parseMysteryReserve|parseOpenQuestions|parseTimeline|parseGeography|parseInstitutions|parseEverydayLife|parseEconomyResources|parsePeoplesSpecies|parseMagicTech" tools/world-index/src/` returns zero matches (or matches only in renamed atomic-path code — verify each remaining match is intentional).
2. Atomic-source tests from SPEC13ATOSRCMIG-002 unchanged and passing → skill dry-run: `cd tools/world-index && npm run build && npm test` succeeds.
3. Clear error for missing `_source/` → skill dry-run: building a minimal fixture world without `_source/` exits non-zero with an error message directing the user to SPEC-13 migration docs or `create-base-world` for new worlds.

## What to Change

### 1. Remove legacy parse modules

Delete the parse modules under `tools/world-index/src/parse/` that implemented monolithic-markdown parsing for the 11 retired file classes. Exact module names follow SPEC-01's layout; verify during implementation by grepping for the function names listed in Assumption Reassessment item 5.

### 2. Simplify dispatch

Remove the "does `_source/` exist?" branch installed in SPEC13ATOSRCMIG-002. Assume `_source/` exists; if missing, emit a clear error directing the user to SPEC-13 migration procedure or `create-base-world` for net-new worlds.

### 3. Retain `WORLD_KERNEL.md` and `ONTOLOGY.md` parsing

These remain as prose lexical inputs per SPEC-13 §A's directory contract. Do not remove their parse functions.

### 4. Remove legacy test fixtures

Delete `tools/world-index/tests/fixtures/` directories that carried monolithic-markdown test worlds, if any remain after SPEC13ATOSRCMIG-002's atomic-source fixtures landed. Atomic-source fixtures and the cross-path determinism fixture pair (if SPEC13ATOSRCMIG-002 retained it) should be reviewed: the legacy side of the determinism-pair fixture can be removed alongside the parse code it exercised.

### 5. Update parser docs / README

If `tools/world-index/README.md` documents a monolithic-markdown input path, update to reflect atomic-source-only input.

## Files to Touch

- `tools/world-index/src/parse/<legacy-markdown-modules>.ts` (delete, × up to 11 modules following SPEC-01 layout)
- `tools/world-index/src/` dispatch site (modify — simplify, remove dual-path branch)
- `tools/world-index/tests/fixtures/<legacy-markdown-test-worlds>/` (delete if present)
- `tools/world-index/tests/legacy-path-removed.test.ts` (new — asserts the failure-mode error message)
- `tools/world-index/README.md` (modify if documents legacy input path)

## Out of Scope

- `WORLD_KERNEL.md` and `ONTOLOGY.md` prose parsing (retained per SPEC-13 §A).
- `world-index render` CLI (Phase 2 per SPEC-13 Q2).
- Validator framework (SPEC-04 Phase 2).
- MCP tool additions `get_record` / `find_sections_touched_by` / `get_compiled_view` (Phase 2 SPEC-02 update).
- Skill `SKILL.md` rewrites (Phase 2 SPEC-06).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && npm test` succeeds (atomic-source test suite from SPEC13ATOSRCMIG-002 is unaffected).
2. `grep -rEn "parseCanon|parseInvariants|parseMysteryReserve|parseOpenQuestions|parseTimeline|parseGeography|parseInstitutions|parseEverydayLife|parseEconomyResources|parsePeoplesSpecies|parseMagicTech" tools/world-index/src/` returns zero matches (or only intentional renames flagged by implementer).
3. Building a world without `_source/` exits non-zero with a clear error message (verified by the new `legacy-path-removed.test.ts` against a minimal fixture).
4. `cd tools/world-index && node dist/src/cli.js build animalia` continues to succeed (regression check against the migrated animalia from SPEC13ATOSRCMIG-003).

### Invariants

1. Parser has exactly one input path after this ticket: `_source/` atomic-YAML reading (plus `WORLD_KERNEL.md` + `ONTOLOGY.md` prose for lexical input).
2. `WORLD_KERNEL.md` and `ONTOLOGY.md` prose parsing is preserved at the root-level of every machine-layer-enabled world.
3. No legacy markdown parse function for the 11 retired file classes remains in production code under `tools/world-index/src/`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/legacy-path-removed.test.ts` (new) — asserts that building a world without `_source/` fails with a clear, actionable error message (directing the user to SPEC-13 migration procedure or `create-base-world`).
2. Existing atomic-source tests from SPEC13ATOSRCMIG-002 retained unchanged — their continued passage is itself part of the acceptance.

### Commands

1. `cd tools/world-index && npm run build && npm test` — full world-index test suite.
2. `cd tools/world-index && node dist/src/cli.js build animalia` — regression check against the migrated animalia.
3. `grep -rEn "parseCanon|parseInvariants|parseMysteryReserve|parseOpenQuestions|parseTimeline|parseGeography|parseInstitutions|parseEverydayLife|parseEconomyResources|parsePeoplesSpecies|parseMagicTech" tools/world-index/src/` — targeted dead-code grep-proof; expect zero matches.
