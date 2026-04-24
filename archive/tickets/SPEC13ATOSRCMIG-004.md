# SPEC13ATOSRCMIG-004: world-index parser — remove legacy markdown record-parsing for 11 retired file classes

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` (parser; removes legacy monolithic-markdown parse code-paths for the 11 retired file classes; `WORLD_KERNEL.md` and `ONTOLOGY.md` prose-parsing retained)
**Deps**: SPEC13ATOSRCMIG-003 archived and user-owned migration commit created

## Problem

SPEC13ATOSRCMIG-002 landed the atomic-YAML input path with legacy monolithic-markdown parsing preserved for the transition window. SPEC13ATOSRCMIG-003 migrated animalia to `_source/` and left the final migration commit for user review, per `AGENTS.md`. Once that user-owned migration commit exists, no machine-layer-enabled world remains in monolithic form and legacy parse code-paths for the 11 retired file classes are dead code. `specs/IMPLEMENTATION-ORDER.md` Phase 1.5 Stream C Phase B directs their removal once Stream B commits; this ticket executes that cleanup.

## Assumption Reassessment (2026-04-24)

1. Verified SPEC13ATOSRCMIG-003 is archived and the private-world migration commit exists as `99f6a97` (`Atomized animalia.`, committed `2026-04-24 18:55:41 +0200` in `worlds/`). No machine-layer-enabled world remains in monolithic form after Stream B is committed; `create-base-world` (Phase 2 SPEC-06) will emit `_source/` directly for future worlds.
2. Verified live `tools/world-index` dispatch at `tools/world-index/src/commands/shared.ts` still used `hasAtomicSourceRecords(worldDirectory)` as a mode selector: atomic records present meant atomic mode; no recognized records meant legacy mandatory-file checks and legacy markdown build mode.
3. Cross-artifact boundary: parser output node schema remains unchanged; this ticket removes legacy world-build dispatch while preserving root prose parsing for `WORLD_KERNEL.md` / `ONTOLOGY.md`, hybrid markdown artifact parsing, and low-level markdown/YAML parser unit utilities used by tests and future hybrid surfaces.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Mandatory World Files declares `_source/` atomic YAML as the sole canonical storage form for the eleven atomized concerns on machine-layer-enabled worlds, with only `WORLD_KERNEL.md` and `ONTOLOGY.md` retained as root primary-authored files.
5. Removal blast radius correction: the drafted legacy function names (`parseCanon`, `parseInvariants`, `parseMysteryReserve`, `parseOpenQuestions`, `parseTimeline`, `parseGeography`, `parseInstitutions`, `parseEverydayLife`, `parseEconomyResources`, `parsePeoplesSpecies`, `parseMagicTech`) do not exist in the live codebase. The live removal seam is `buildWorldIndex` / `syncWorldIndex` dispatch in `tools/world-index/src/commands/shared.ts`, root-file enumeration in `tools/world-index/src/enumerate.ts`, and same-package tests that still built against `tests/fixtures/fixture-world` as a legacy world.
6. Same-seam proof fallout: command-level tests needed to stop depending on a legacy fixture build. The new `tools/world-index/tests/helpers/atomic-fixture.ts` creates atomic temp worlds for command and dispatch tests; unit tests that parse standalone markdown/YAML strings remain valid because they test parser utilities, not legacy world-build support.

## Architecture Check

1. Removes dead code. Parser becomes single-path: assume `_source/` exists; fail loudly with a clear error if missing. Cleaner than maintaining a dual-path dispatch indefinitely, and the parser's signature at the external boundary is unchanged.
2. No backwards-compatibility aliasing introduced — this ticket IS the removal of backward-compatibility code. The transition window the SPEC-13 bundle opened closes here.

## Verification Layers

1. Legacy world-build dispatch removed → targeted tool command / code review: worlds without recognized SPEC-13 `_source/*.yaml` records now exit 3 with an actionable SPEC-13 migration / create-base-world message.
2. Atomic-source tests from SPEC13ATOSRCMIG-002 unchanged and passing → skill dry-run: `cd tools/world-index && npm run build && npm test` succeeds.
3. Clear error for missing `_source/` → targeted test: `tools/world-index/tests/atomic-source-input.test.ts` builds a minimal world with only root primary files and `_source/raw.md`, then asserts exit code 3.
4. Stale legacy function-name inventory remains absent → codebase grep-proof: `rg -n "parseCanon|parseInvariants|parseMysteryReserve|parseOpenQuestions|parseTimeline|parseGeography|parseInstitutions|parseEverydayLife|parseEconomyResources|parsePeoplesSpecies|parseMagicTech" tools/world-index/src` returns no matches.

## What to Change

### 1. Remove legacy parse modules

No dedicated legacy parse modules exist. Remove the legacy world-build mode by changing the command dispatch to require recognized SPEC-13 atomic YAML records before build/sync can proceed.

### 2. Simplify dispatch

Remove the fallback from recognized-atomic-record dispatch to legacy mandatory-file mode. If no recognized `_source/*.yaml` records exist, emit a clear error directing the user to SPEC-13 migration procedure or `create-base-world` for net-new worlds.

### 3. Retain `WORLD_KERNEL.md` and `ONTOLOGY.md` parsing

These remain as prose lexical inputs per SPEC-13 §A's directory contract. Do not remove their parse functions.

### 4. Remove legacy test fixtures

Stop command-level tests from building the monolithic fixture world. Keep the legacy fixture files for low-level parser and enumeration tests where they are explicit parser input, but move build/sync/verify coverage to atomic temp worlds.

### 5. Update parser docs / README

No README update was needed; `tools/world-index/README.md` already describes output as regenerable from root primary-authored markdown plus `_source/*.yaml` atomic records.

## Files to Touch

- `tools/world-index/src/commands/shared.ts` (modify — require recognized `_source/*.yaml` records for build/sync; remove legacy entity-registry fallback)
- `tools/world-index/src/enumerate.ts` (modify — only root primary-authored markdown files are enumerated as indexable root files)
- `tools/world-index/tests/atomic-source-input.test.ts` (modify — replace legacy-dispatch assertion with missing-atomic-source rejection)
- `tools/world-index/tests/commands.test.ts` (modify — command suite builds/syncs/verifies atomic temp worlds)
- `tools/world-index/tests/enumerate.test.ts` (modify — retired root markdown files are unexpected rather than indexable)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (new — shared atomic temp-world fixture helper)

## Out of Scope

- `WORLD_KERNEL.md` and `ONTOLOGY.md` prose parsing (retained per SPEC-13 §A).
- `world-index render` CLI (Phase 2 per SPEC-13 Q2).
- Validator framework (SPEC-04 Phase 2).
- MCP tool additions `get_record` / `find_sections_touched_by` / `get_compiled_view` (Phase 2 SPEC-02 update).
- Skill `SKILL.md` rewrites (Phase 2 SPEC-06).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && npm test` succeeds (atomic-source test suite from SPEC13ATOSRCMIG-002 remains passing after legacy dispatch removal).
2. `rg -n "parseCanon|parseInvariants|parseMysteryReserve|parseOpenQuestions|parseTimeline|parseGeography|parseInstitutions|parseEverydayLife|parseEconomyResources|parsePeoplesSpecies|parseMagicTech" tools/world-index/src` returns no matches.
3. Building a world without recognized `_source/*.yaml` records exits non-zero with a clear error message (verified by `tools/world-index/tests/atomic-source-input.test.ts`).
4. `node tools/world-index/dist/src/cli.js build animalia` from the repo root continues to succeed (regression check against the migrated animalia from SPEC13ATOSRCMIG-003).

### Invariants

1. Parser has exactly one input path after this ticket: `_source/` atomic-YAML reading (plus `WORLD_KERNEL.md` + `ONTOLOGY.md` prose for lexical input).
2. `WORLD_KERNEL.md` and `ONTOLOGY.md` prose parsing is preserved at the root-level of every machine-layer-enabled world.
3. No legacy markdown parse function for the 11 retired file classes remains in production code under `tools/world-index/src/`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/atomic-source-input.test.ts` — modified to assert that building a world without recognized SPEC-13 atomic YAML records exits 3.
2. `tools/world-index/tests/commands.test.ts` — modified to exercise build/sync/verify against an atomic temp world instead of the retired legacy fixture world.
3. `tools/world-index/tests/enumerate.test.ts` — modified to classify the 11 retired root markdown files as unexpected root files while keeping `WORLD_KERNEL.md` and `ONTOLOGY.md` indexable.
4. `tools/world-index/tests/helpers/atomic-fixture.ts` — new shared atomic temp-world helper for command and dispatch tests.

### Commands

1. `cd tools/world-index && npm run build` — TypeScript build.
2. `cd tools/world-index && node --test dist/tests/atomic-source-input.test.js dist/tests/commands.test.js dist/tests/enumerate.test.js` — focused dispatch / command / enumeration proof.
3. `cd tools/world-index && npm test` — full world-index test suite.
4. `node tools/world-index/dist/src/cli.js build animalia` from repo root — regression check against the migrated animalia.
5. `rg -n "parseCanon|parseInvariants|parseMysteryReserve|parseOpenQuestions|parseTimeline|parseGeography|parseInstitutions|parseEverydayLife|parseEconomyResources|parsePeoplesSpecies|parseMagicTech" tools/world-index/src` — targeted stale-symbol grep-proof; expect zero matches.

## Outcome

Implemented. `world-index build` and `world-index sync` now require recognized SPEC-13 atomic YAML records under `_source/`; worlds with only legacy root markdown or placeholder `_source/raw.md` fail with exit code 3 and an actionable migration/create-base-world message. Root enumeration now treats only `WORLD_KERNEL.md` and `ONTOLOGY.md` as indexable top-level markdown files. Command-level tests now build atomic temp worlds, while low-level parser tests continue to exercise markdown/YAML utilities directly.

## Verification Result

Passed on 2026-04-24:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/atomic-source-input.test.js dist/tests/commands.test.js dist/tests/enumerate.test.js`
3. `cd tools/world-index && npm test`
4. `node tools/world-index/dist/src/cli.js build animalia`
5. `rg -n "parseCanon|parseInvariants|parseMysteryReserve|parseOpenQuestions|parseTimeline|parseGeography|parseInstitutions|parseEverydayLife|parseEconomyResources|parsePeoplesSpecies|parseMagicTech" tools/world-index/src` — no matches.

## Deviations

- The drafted legacy parse-function names and delete-module list were stale; no such modules exist in the live package. The implemented removal is the live dispatch/enumeration seam that made legacy worlds buildable.
- No new `legacy-path-removed.test.ts` file was added. The missing-atomic-source failure is covered in the existing atomic-source dispatch test file, and command coverage was moved to atomic temp worlds.
- Legacy markdown fixture files remain under `tools/world-index/tests/fixtures/fixture-world/` because parser unit tests still use them as direct input; they are no longer used as a successful world-build path.
