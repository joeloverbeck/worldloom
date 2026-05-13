# MCPENH-037: Extend world-index inventory to recognize story-bundle markdown paths

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/enumerate.ts` (extended `isIndexablePath` with closed story-bundle markdown branches); `tools/world-index/tests/` (added enumeration and build-regression coverage)
**Deps**: None — independent of MCPENH-010 / MCPENH-014 / MCPENH-015 / MCPENH-018 (those tickets landed allocator support for `STORY` / `SLB` / `SAU` / `SP` id classes; this ticket is about the world-index file-inventory enumeration, a separate surface that has not previously been touched for story bundles)

## Problem

At intake, when a `world-index build` (or any tool that calls it transitively, including `mcp__worldloom__get_context_packet`) ran against a world that contained a story bundle, the index emitted `unexpected_path` warnings for legitimate story-bundle markdown artifacts:

- `stories/<slug>/STORY_KERNEL.md` — primary-authored story-bundle root file (parallel to world-level `WORLD_KERNEL.md`)
- `stories/<slug>/pages-prose/PG-NNNN.md` — rendered page prose, one per emitted page
- `stories/<slug>/storylet-batches/SLB-NNNN.md` — storylet-batch manifests (allocator surface per archived MCPENH-014)
- `stories/<slug>/story-promotions/SP-NNNN.md` — story-fact-promotion-to-canon ledger entries (allocator surface per archived MCPENH-018)
- `stories/<slug>/audits/SAU-NNNN-<date>.md` — story-bundle health-audit reports (allocator surface per archived MCPENH-015)
- `stories/<slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md` — RSP cards consumed by `storylet-pool-authoring`'s `mode=audit`
- `stories/<slug>/character-proposals/NCP-*.md` and `stories/<slug>/character-proposals/batches/NCB-*.md` — story-scoped character-proposal cards and batch manifests (when they exist; analogous to world-level `character-proposals/` which the inventory already recognizes)

Session evidence (storylet-pool-authoring run on 2026-05-04, `world_slug=erotica-world`, `story_slug=red-bunny`): a single `mcp__worldloom__get_context_packet` call surfaced 7 `unexpected_path` warnings for files in `stories/red-bunny/` and `stories/marla-kern-seduction/`:

```
- 'stories/red-bunny/pages-prose/PG-1.md'
- 'stories/red-bunny/STORY_KERNEL.md'
- 'stories/marla-kern-seduction/storylet-batches/SLB-0001.md'
- 'stories/marla-kern-seduction/pages-prose/PG-3.md'
- 'stories/marla-kern-seduction/pages-prose/PG-2.md'
- 'stories/marla-kern-seduction/pages-prose/PG-1.md'
- 'stories/marla-kern-seduction/STORY_KERNEL.md'
```

The warnings did not block any operation — `storylet-pool-authoring` completed successfully and the patch engine submission landed all 15 SLT records. But the warnings appeared on every story-pipeline skill invocation that traversed the world index (`branching-story-bootstrap`, `branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `storylet-pool-authoring`), creating chronic noise that contradicted the index's documented purpose: legitimate story-bundle files are exactly part of the worldloom-managed inventory by design (per FOUNDATIONS §Story Bundles §2 Storage Form), not "unexpected."

This ticket extended `isIndexablePath` in `tools/world-index/src/enumerate.ts` to recognize the story-bundle markdown paths above as a closed enumeration parallel to the existing world-level branches.

## Assumption Reassessment (2026-05-04)

1. At intake, **`tools/world-index/src/enumerate.ts` (`isIndexablePath`)** handled six branches: (a) 3-segment `_source/<class>/*.yaml` matched against `ATOMIC_SOURCE_DIRECTORIES`; (b) 5-segment `stories/<slug>/_source/<class>/*.yaml` matched against `STORY_SOURCE_DIRECTORIES`; (c) 1-segment root `.md` files matched against `PRIMARY_AUTHORED_ROOT_FILES = {WORLD_KERNEL.md, ONTOLOGY.md}`; (d) 2-segment hybrid markdown directories matched against `{adjudications, characters, diegetic-artifacts, proposals, character-proposals, audits}`; (e) 3-segment proposal/character-proposal batch markdown; (f) 4-segment world-level audit retcon-proposals. None of those intake branches matched `stories/<slug>/<file>.md` (3-segment), `stories/<slug>/<dir>/<file>.md` (4-segment story-bundle prose / batches / promotions / SAU reports), `stories/<slug>/character-proposals/batches/<file>.md` (5-segment), or `stories/<slug>/audits/SAU-NNNN/remediation-storylet-proposals/<file>.md` (6-segment).

2. **`docs/FOUNDATIONS.md` §Story Bundles** (currently at lines 526-547 per the `## Story Bundles` heading) declares `STORY_KERNEL.md` as primary-authored at the story-bundle root and the per-bundle `INDEX.md` as a derived rendering. Per-bundle prose (`pages-prose/`), batch manifests (`storylet-batches/`), promotion ledgers (`story-promotions/`), and audit reports (`audits/SAU-*.md`) are documented in their respective skills (`branching-story-page-cycle/SKILL.md`, `storylet-pool-authoring/SKILL.md`, `story-fact-promotion-to-canon/SKILL.md`, `branching-story-health-audit/SKILL.md`) as story-bundle artifacts. The `INDEX.md` exclusion is already in `isExcludedPath` at `enumerate.ts:126-128` and remains correct (it stays excluded as a derived rendering); this ticket extends `isIndexablePath` to recognize the AUTHORED story-bundle markdown surfaces, not the derived per-bundle index.

3. **Cross-skill / cross-tool boundary under audit**: the contract between (a) story-pipeline skills (`branching-story-bootstrap`, `branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `storylet-pool-authoring`) as producers of story-bundle markdown artifacts AND (b) `tools/world-index/src/enumerate.ts` as the consumer that classifies disk-backed world files into `indexable` vs `unexpected`. The shared boundary is the file-path enumeration: every story-pipeline skill writes to one of the markdown surfaces above; the world-index inventory now recognizes them as part of the documented worldloom file shape, not as unexpected artifacts. The inventory's `unexpected_path` warning class returns to its intended use: surfacing genuinely-unexpected files (typos, orphaned tooling output, accidental commits) rather than chronic false positives on every story-pipeline build.

4. Restate the FOUNDATIONS principle under audit: §Story Bundles §2 Storage Form commits worldloom to the form `worlds/<slug>/stories/<story-slug>/<file>` for primary-authored bundle root files (`STORY_KERNEL.md`) AND for per-bundle artifact directories (`pages-prose/`, `storylet-batches/`, `story-promotions/`, `audits/`). The world-index inventory now aligns with this declared shape.

5. Mismatch + correction: at intake the gap appears as a single missing branch ("add story-bundle markdown to `isIndexablePath`"), but on reassessment the surface is multi-segment: 3-seg `STORY_KERNEL.md`, 4-seg `<dir>/<file>.md` for directory types (`pages-prose`, `storylet-batches`, `story-promotions`, `audits`, `character-proposals`), 5-seg `character-proposals/batches/*.md`, and 6-seg `audits/SAU-*/remediation-storylet-proposals/*.md` for the RSP cards consumed by `storylet-pool-authoring`'s `mode=audit`. Each segment depth needs its own branch in `isIndexablePath`.
6. Package command correction: `tools/world-index/package.json` runs tests from compiled output via `node --test "dist/tests/**/*.test.js"`. The drafted `npm test -- --filter=enumerate` selector is not a truthful package-local proof. The accepted proof is `npm run build`, then compiled targeted tests such as `node --test dist/tests/enumerate.test.js` and `node --test dist/tests/commands.test.js`, followed by `npm test` for the package-wide compiled suite when feasible.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: `isIndexablePath` already classifies world-level markdown surfaces by enumerating directory names per segment depth (e.g., `{adjudications, characters, diegetic-artifacts, proposals, character-proposals, audits}` for 2-segment world-level). Extending the function with parallel story-bundle branches preserves the existing classification structure — adds story-bundle-specific `STORY_DIRECTORY_<DEPTH>_FILES` constant sets analogous to the existing world-level constants, plus per-segment branches. Alternatives considered and rejected: (a) regex-based path matching — less readable, harder to verify against a documented enumeration, and the existing function uses segment+set lookup throughout; (b) blanket allowance of all `stories/<slug>/**.md` — over-allows orphan files, undermining the inventory check's purpose for the story-bundle surface (e.g., a stray `notes.md` in a story bundle root would silently pass).

2. No backwards-compatibility shims or alias paths introduced. `isIndexablePath` returns boolean; the change adds story-bundle branches that return `true` for valid story-bundle markdown paths. Existing world-level branches are untouched. No fallback path, no shim, no deprecation surface — the inventory simply gains coverage for surfaces FOUNDATIONS already commits to.

## Verification Layers

1. `isIndexablePath('stories/<slug>/STORY_KERNEL.md')` returns `true` after the change → codebase grep-proof: `tools/world-index/tests/enumerate.test.ts` (or `enumerate.fixture.test.ts`) covers the 3-segment `STORY_KERNEL.md` case explicitly.
2. `isIndexablePath('stories/<slug>/pages-prose/PG-NNNN.md')` returns `true` → fixture test covers the 4-segment `pages-prose/` case; parallel cases cover `storylet-batches/SLB-NNNN.md`, `story-promotions/SP-NNNN.md`, and `audits/SAU-NNNN-<date>.md` at the same segment depth.
3. `isIndexablePath('stories/<slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md')` returns `true` → fixture test covers the 6-segment RSP path.
4. `world-index build` against a fixture world containing both world-level canon and a story bundle emits zero `unexpected_path` warnings for legitimate story-bundle files → skill dry-run / CLI test (`node tools/world-index/dist/src/cli.js build <fixture-world>` then assert `validation_results` row count for `code='unexpected_path' AND file_path LIKE 'stories/%'` is zero).
5. FOUNDATIONS alignment check → `docs/FOUNDATIONS.md` §Story Bundles §2 Storage Form remains the authoritative declaration of the story-bundle file shape; this ticket aligns the world-index inventory to match. No FOUNDATIONS edit required.
6. Negative case: `isIndexablePath('stories/<slug>/notes.md')` returns `false` (orphan files at story-bundle root that aren't `STORY_KERNEL.md`) → fixture test covers the negative case so the inventory check still surfaces genuinely-unexpected files. Same for `isIndexablePath('stories/<slug>/<unknown-dir>/<file>.md')`.

## Landed Changes

### 1. Extend `isIndexablePath` with story-bundle markdown branches

In `tools/world-index/src/enumerate.ts`:

- Added three new constant sets paralleling the existing `PRIMARY_AUTHORED_ROOT_FILES` / `ATOMIC_SOURCE_DIRECTORIES` / `STORY_SOURCE_DIRECTORIES`:
  - `STORY_PRIMARY_AUTHORED_FILES = new Set(["STORY_KERNEL.md"])` — 3-segment, story-bundle root.
  - `STORY_BUNDLE_MARKDOWN_DIRECTORIES = new Set(["pages-prose", "storylet-batches", "story-promotions", "audits", "character-proposals"])` — 4-segment, `stories/<slug>/<dir>/<file>.md`.
  - `STORY_BUNDLE_CHARACTER_PROPOSAL_SUBDIRECTORIES = new Set(["batches"])` — 5-segment, `stories/<slug>/character-proposals/batches/<file>.md`.

- Added story-bundle branches to `isIndexablePath` after the existing world-level branches and before the catch-all `return false`:

```ts
// Story-bundle root primary-authored markdown (3-segment)
if (
  segments.length === 3 &&
  segments[0] === "stories" &&
  basename.endsWith(".md")
) {
  return STORY_PRIMARY_AUTHORED_FILES.has(basename);
}

// Story-bundle artifact-directory markdown (4-segment)
if (
  segments.length === 4 &&
  segments[0] === "stories" &&
  basename.endsWith(".md")
) {
  const bundleDirectory = segments[2];
  return bundleDirectory ? STORY_BUNDLE_MARKDOWN_DIRECTORIES.has(bundleDirectory) : false;
}

// Story-bundle nested markdown (5-segment)
// stories/<slug>/character-proposals/batches/<file>.md
if (
  segments.length === 5 &&
  segments[0] === "stories" &&
  basename.endsWith(".md")
) {
  const outerDir = segments[2];
  const innerDir = segments[3];
  if (outerDir === "character-proposals" && innerDir === "batches") {
    return true;
  }
  return false;
}

// Story-bundle sub-audit remediation proposals (6-segment)
// stories/<slug>/audits/SAU-NNNN/remediation-storylet-proposals/<file>.md
if (
  segments.length === 6 &&
  segments[0] === "stories" &&
  basename.endsWith(".md")
) {
  return (
    segments[2] === "audits" &&
    /^SAU-\d+$/.test(segments[3] ?? "") &&
    segments[4] === "remediation-storylet-proposals"
  );
}
```

The exact shape for SAU sub-audit RSPs is 6-segment when the basename is included: `["stories", "<slug>", "audits", "SAU-NNNN", "remediation-storylet-proposals", "<file>.md"]`.

### 2. Add fixture tests covering story-bundle path classification

In `tools/world-index/tests/enumerate.test.ts`, added per-shape positive and negative cases:

- positive: `stories/foo/STORY_KERNEL.md`, `stories/foo/pages-prose/PG-1.md`, `stories/foo/storylet-batches/SLB-0001.md`, `stories/foo/story-promotions/SP-0001.md`, `stories/foo/audits/SAU-0001-2026-05-04.md`, `stories/foo/audits/SAU-0001/remediation-storylet-proposals/RSP-0001-fix-thread-coverage.md`.
- negative: `stories/foo/notes.md` (orphan root file), `stories/foo/scratch/draft.md` (unknown sub-directory), `stories/foo/audits/SAU-0001/RSP-0001.md` (RSPs must be nested under `remediation-storylet-proposals/`, not directly under SAU-NNNN).

### 3. Verify `world-index build` against a story-bundle fixture emits zero false-positive `unexpected_path` warnings

Extended the existing atomic fixture world with a populated story bundle (STORY_KERNEL.md + pages-prose/ + storylet-batches/ + story-promotions/ + audits/ with both flat SAU reports and nested RSPs + character-proposals); `tools/world-index/tests/commands.test.ts` asserts that `build()` leaves zero `unexpected_path` rows whose `file_path` starts with `stories/`.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify — add story-bundle branches and constants)
- `tools/world-index/tests/enumerate.test.ts` (modify — add story-bundle positive/negative cases)
- `tools/world-index/tests/commands.test.ts` (modify — assert zero story-bundle `unexpected_path` warnings after build)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify — extend atomic fixture with story-bundle markdown files)

## Out of Scope

- Allocator support for new id classes (already landed via MCPENH-010 / 014 / 015 / 018; this ticket is exclusively about file-inventory enumeration).
- Story-bundle YAML record class registration in `STORY_SOURCE_DIRECTORIES` — that surface already covers story-bundle YAML records and is unchanged by this ticket.
- INDEX.md handling — `isExcludedPath` correctly excludes `INDEX.md` as a derived rendering; do not change.
- Adding new story-bundle directory types beyond those FOUNDATIONS §Story Bundles already commits to. New directory types added by future story-pipeline work require their own ticket extending the constants in this ticket's set.
- Renaming or deprecating `unexpected_path` — the warning code remains; only its trigger surface narrows back to genuinely-unexpected files.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` in `tools/world-index/` succeeds so compiled source and tests are fresh.
2. `node --test dist/tests/enumerate.test.js` in `tools/world-index/` passes; all new positive and negative fixture cases pass.
3. `node --test dist/tests/commands.test.js` in `tools/world-index/` passes and proves `build()` writes zero `unexpected_path` warnings whose `file_path` starts with `stories/` for the atomic story-bundle fixture.
4. `npm test` in `tools/world-index/` passes as the package-wide compiled suite.
5. `node tools/world-index/dist/src/cli.js build erotica-world` from repo root plus a SQLite query against `worlds/erotica-world/_index/world.db` is an optional checkout-local regression check when the gitignored `worlds/erotica-world` exists.

### Invariants

1. `isIndexablePath` remains a pure function: identical input → identical output, with no side effects on filesystem or database state.
2. `unexpected_path` warnings still fire for genuinely-unexpected files (e.g., `stories/<slug>/notes.md`, orphan `.md` files at unknown sub-paths) — the inventory check's purpose is preserved, only the false-positive surface is removed.
3. The story-bundle directory enumeration (`STORY_BUNDLE_MARKDOWN_DIRECTORIES`) is a closed set; adding new story-bundle directory types is a documented edit to this constant + a new ticket, not LLM-side invention. This parallels the existing closed-enumeration discipline at `STORY_SOURCE_DIRECTORIES` and `ATOMIC_SOURCE_DIRECTORIES`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/enumerate.test.ts` — positive cases for `stories/<slug>/STORY_KERNEL.md`, `pages-prose/*.md`, `storylet-batches/*.md`, `story-promotions/*.md`, `audits/SAU-*.md`, `audits/SAU-*/remediation-storylet-proposals/*.md`; negative cases for orphan story-bundle `.md` files and unknown sub-directories. Each case asserts `enumerate()` classification directly.
2. `tools/world-index/tests/commands.test.ts` — the atomic fixture story bundle exercises the build pipeline end-to-end; assert zero `unexpected_path` rows in `validation_results` for `file_path LIKE 'stories/%'`.

### Commands

1. `npm run build` (from `tools/world-index/`)
2. `node --test dist/tests/enumerate.test.js` (from `tools/world-index/`)
3. `node --test dist/tests/commands.test.js` (from `tools/world-index/`)
4. `npm test` (from `tools/world-index/`)
5. Optional checkout-local regression when `worlds/erotica-world` exists: `node tools/world-index/dist/src/cli.js build erotica-world` then `sqlite3 worlds/erotica-world/_index/world.db "SELECT count(*) FROM validation_results WHERE validator_name='enumeration' AND code='unexpected_path' AND file_path LIKE 'stories/%';"` — expect `0`.

## Outcome

Completed on 2026-05-04. `tools/world-index/src/enumerate.ts` now treats these story-bundle markdown paths as indexable closed inventory:

- `stories/<story-slug>/STORY_KERNEL.md`
- `stories/<story-slug>/pages-prose/*.md`
- `stories/<story-slug>/storylet-batches/*.md`
- `stories/<story-slug>/story-promotions/*.md`
- `stories/<story-slug>/audits/*.md`
- `stories/<story-slug>/audits/SAU-*/remediation-storylet-proposals/*.md`
- `stories/<story-slug>/character-proposals/*.md`
- `stories/<story-slug>/character-proposals/batches/*.md`

The enumeration remains closed: orphan story-root markdown, unknown story subdirectories, and directly nested RSP files under `audits/SAU-*/*.md` still classify as unexpected.

## Verification Result

Completed on 2026-05-04:

1. `npm run build` from `tools/world-index/` — passed.
2. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` — passed.
3. `node --test dist/tests/commands.test.js` from `tools/world-index/` — passed.
4. `npm test` from `tools/world-index/` — passed; 76 tests passed.
5. Optional checkout-local regression: `node tools/world-index/dist/src/cli.js build erotica-world` from repo root — passed; then `sqlite3 worlds/erotica-world/_index/world.db "SELECT count(*) FROM validation_results WHERE validator_name='enumeration' AND code='unexpected_path' AND file_path LIKE 'stories/%';"` returned `0`.

## Deviations

- The drafted targeted command `npm test -- --filter=enumerate` was replaced with `npm run build` plus compiled `node --test dist/tests/enumerate.test.js` because `tools/world-index/package.json` runs tests from compiled `dist/tests/**/*.test.js`.
- The drafted RSP segment count was corrected from 5 to 6 because `stories/<slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md` includes the basename as the sixth segment.
- The optional `erotica-world` rebuild still emitted three non-owned schema-pattern skip warnings: `_source/change-log/CH-0006.yaml` is missing its `change_id`, and two `STINT-1-*` story intention records do not match `^STINT-[0-9]{4}$`. Those warnings are unrelated to story markdown path enumeration; the story `unexpected_path` count is `0`.
