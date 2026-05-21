# SPEC60STCHARMACLAY-003: Patch-engine stale-index covers the STCHAR hybrid path

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine` `detectStaleIndex` pre-apply guard; adds a `stories/%/story-characters/%.md` watch clause. No impact on world-level hybrid path coverage (additive).
**Deps**: None

## Problem

At intake, `detectStaleIndex` (`tools/patch-engine/src/apply.ts`) detected out-of-band edits to hybrid markdown files before a patch applied, but its `file_versions` query watched only world-level hybrids — `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md`. It did not watch `stories/<story_slug>/story-characters/STCHAR-*.md`. An out-of-band edit to a STCHAR hybrid file therefore was not caught as a stale index, so a patch built on a stale index could silently overwrite a hand-edited STCHAR profile — even though the engine already had staging support for the STCHAR hybrid path.

## Assumption Reassessment (2026-05-21)

1. At intake, `detectStaleIndex` was at `tools/patch-engine/src/apply.ts`; the `file_versions` `WHERE` clause listed `characters/%.md`, `diegetic-artifacts/%.md`, `adjudications/%.md` and no `stories/%` clause (confirmed). The function compared on-disk content hash against the indexed hash and pushed divergent/missing files into `divergentFiles`. This ticket added `file_path LIKE 'stories/%/story-characters/%.md'` to that same query.
2. STCHAR hybrid files live at `worlds/<slug>/stories/<story_slug>/story-characters/STCHAR-*.md` (per FOUNDATIONS §Story Bundles §6 and the `append_story_character_authority_record` / `supersede_story_character_authority_record` ops). The `file_versions` `file_path` column stores world-relative paths (e.g., `characters/CHAR-1.md`), so the STCHAR clause is `file_path LIKE 'stories/%/story-characters/%.md'`, matching the existing world-hybrid LIKE-clause style.
3. **Cross-package boundary under audit**: this change is internal to `tools/patch-engine/src/apply.ts` (the SQL query string). No new dependency, no `world-index` parser reach-in; the `file_versions` table is patch-engine's own index read. The hash-comparison logic below the query is class-agnostic and needs no change — only the row-selection clause widens.
4. **Rule 6 (No Silent Retcons)**: the stale-index guard is the engine's defense against a patch silently overwriting an out-of-band edit. Extending it to the STCHAR hybrid path preserves the append-only / no-silent-overwrite discipline for story-local character authority exactly as it already holds for world-level `characters/`. The change strengthens (never weakens) the guard.
5. **Patch-engine pre-apply gate surface**: `detectStaleIndex` runs at `apply.ts:109` before patch application — a Canon-Safety-adjacent pre-apply gate for story-bundle hybrid writes. Confirmed the change adds detection coverage only (returns an `EngineError` on divergence); it does not relax any existing gate, alter write ordering, weaken the Mystery Reserve firewall, or resolve any `M-<integer>` entry. Widening the watch set is monotonic — strictly more files are guarded.

## Architecture Check

1. Adding one `OR file_path LIKE 'stories/%/story-characters/%.md'` clause to the existing query is the minimal, pattern-consistent fix — it mirrors the three world-hybrid clauses already present and reuses the unchanged downstream hash-comparison loop. No new code path or helper is warranted.
2. No backwards-compatibility shim: the clause is added directly to the live query; there is no legacy/world-only branch retained behind a flag.

## Verification Layers

1. A modified `stories/<slug>/story-characters/STCHAR-*.md` whose on-disk hash differs from the indexed hash triggers the stale-index guard → new patch-engine pre-apply test asserting the `EngineError`.
2. World-level hybrid path coverage (`characters/`, `diegetic-artifacts/`, `adjudications/`) is unchanged → existing `index-stale-preapply` test still passes.
3. The clause matches the stored world-relative `file_path` form → codebase grep-proof of the LIKE pattern against `file_versions` path conventions.

## Landed Changes

### 1. Widened the `detectStaleIndex` watch set

In `tools/patch-engine/src/apply.ts`, added `OR file_path LIKE 'stories/%/story-characters/%.md'` to the `WHERE` clause of the `file_versions` query in `detectStaleIndex`. No other engine behavior changed.

### 2. Proved the STCHAR stale-index path

In `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts`, added a receipt test that seeds `file_versions` with `stories/ember-arc/story-characters/STCHAR-1.md`, edits the on-disk file, and asserts `submitPatchPlan` returns `index_stale` before invoking pre-apply validators or staging writes.

## Files to Touch

- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` (modify) — add a STCHAR-hybrid divergence case

## Out of Scope

- No change to the hash-comparison loop, the `StaleIndexFile` shape, or the `EngineError` payload.
- No change to world-level hybrid path coverage.
- No new staging or op support (STCHAR staging already exists).

## Acceptance Criteria

### Tests That Must Pass

1. An edited `stories/<slug>/story-characters/STCHAR-*.md` whose hash differs from the indexed version triggers the stale-index guard (returns `EngineError`).
2. Existing world-level hybrid stale-index detection (`characters/`, `diegetic-artifacts/`, `adjudications/`) is unchanged — `index-stale-preapply.test.ts` passes.
3. From `tools/patch-engine`, `npm test` passes.

### Invariants

1. Every hybrid markdown surface the engine stages — world-level (`characters/`, `diegetic-artifacts/`, `adjudications/`) and story-local (`stories/%/story-characters/`) — is covered by the stale-index pre-apply guard.
2. The guard only adds detection; no patch that would have applied cleanly against a fresh index is newly rejected.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` — STCHAR-hybrid divergence case (modified on-disk hash ≠ indexed hash → stale-index `EngineError`).

### Commands

1. From `tools/patch-engine`: `npm run build`
2. From `tools/patch-engine`: `node --test dist/tests/receipt/index-stale-preapply.test.js`
3. From `tools/patch-engine`: `npm test`
4. `grep -n "story-characters" tools/patch-engine/src/apply.ts` — confirm the STCHAR LIKE clause is present in `detectStaleIndex`.

## Outcome

Completed: 2026-05-21

`detectStaleIndex` now includes STCHAR hybrid markdown paths stored in `file_versions` as `stories/%/story-characters/%.md`. The existing hash-comparison loop remains class-agnostic; the change only widens the guarded row set. A new receipt test proves that an edited story-character authority markdown file produces an `index_stale` `EngineError`, skips pre-apply validators, and leaves the target section file unchanged.

## Verification Result

1. Baseline before edits: from `tools/patch-engine`, `npm test` passed: 91 tests passed.
2. After edits: from `tools/patch-engine`, `npm run build` passed.
3. After edits: from `tools/patch-engine`, `node --test dist/tests/receipt/index-stale-preapply.test.js` passed: 4 tests passed, including the new STCHAR stale-index case.
4. After edits: from `tools/patch-engine`, `npm test` passed: 92 tests passed.
5. `grep -n "story-characters" tools/patch-engine/src/apply.ts` returned the STCHAR LIKE clause in `detectStaleIndex`.

## Deviations

None.
