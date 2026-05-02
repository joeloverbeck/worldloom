# MCPENH-011: Add story-bundle ID classes to allocate_next_id

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/` (allocator tool + id-class enum + optional `story_slug` input), `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-page-cycle/SKILL.md`, `tools/world-mcp/README.md`, and skill-creator ID-allocation references
**Deps**: MCPENH-010 (STORY id class precedent), SPEC-13 (atomic-source storage form for the world-canon side)

## Problem

At intake, `mcp__worldloom__allocate_next_id` supported world-scoped classes (CF, CH, INV, M, OQ, ENT, SEC-*, PA, CHAR, DA, PR, BATCH, AU, RP, EPE, STORY) and pipeline-scoped classes (NWP, NWB) via the `__pipeline__` sentinel. It did not yet support the per-story-bundle ID classes that `branching-story-page-cycle` and `branching-story-bootstrap` emit:

- `PG` (pages)
- `SE` (story events)
- `SF` (story facts)
- `OBL` (story obligations)
- `CNSQ` (story consequences)
- `THR` (story threads)
- `SREL` (story relationships)
- `STINT` (story intentions, suffixed `-<char>`)
- `SLT` (storylets — both author-pool and JIT)
- `STLOC` (story locations)
- `STOBJ` (story objects)
- `BR` (story branches)
- `CHC` (story choices)
- `STENT` (story entities — bootstrap mirrors of CHAR; nested storage)
- Story-local `DA` (in-story diegetic artifacts under `stories/<slug>/_source/artifacts/`; collides with world-level DA at the class-name level but lives in a different scope)

`branching-story-page-cycle` shipped with manual filesystem scan as the allocator (per the Shape A integration posture). `branching-story-bootstrap` initializes a new bundle with deterministic first IDs (`PG-0001`, `BR-0001`, etc.) and therefore does not call story-scoped allocation before the story directory exists, but its integration-debt prose still needed truthing. Engine-routed allocation centralizes the page-cycle discipline and removes the per-turn scan boilerplate.

## Assumption Reassessment (2026-05-02)

1. The current allocator surface is `tools/world-mcp/src/tools/allocate-next-id.ts`; the MCP input enum and capability metadata are fed from `tools/world-mcp/src/server.ts` (`ID_CLASSES`). MCPENH-010 is the live STORY precedent: `archive/tickets/MCPENH-010-add-story-id-class-to-allocator.md` added `STORY` via `ID_CLASS_FORMATS`, `ID_CLASSES`, direct handler tests, server dispatch tests, `tools/world-mcp/README.md`, and skill prose truthing.
2. Story-bundle IDs are story-bundle-scoped, not world-scoped or pipeline-scoped. The allocator must accept optional `story_slug` to scan `worlds/<world_slug>/stories/<story_slug>/_source/<subdir>/`. Pipeline-scoped IDs continue to use `world_slug='__pipeline__'`; story-bundle classes do not collapse onto that sentinel.
3. The shared boundary under audit is the contract between (a) skills emitting story-bundle records, (b) the allocator handler and MCP input schema/capability enum, and (c) same-seam skill/docs references that currently describe manual scan or the two-argument signature. `archive/specs/SPEC-13-atomic-source-migration.md` and `docs/FOUNDATIONS.md` scope `worlds/<slug>/_source/` as world-canon storage; story-bundle `_source/` is nested story state and is intentionally out of `world-index` for this ticket. No `tools/world-index/` code is owned.
4. **FOUNDATIONS principle**: No FOUNDATIONS principle is directly motivated by this ticket — story-bundle records are story-scoped, not world-canon. The motivation is operational consistency: every other emergent ID class in the pipeline allocates via MCP; per-story scan-and-increment in skill prose is the sole holdout. Reducing it to a single API call removes a future drift surface.
5. This ticket does NOT touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. Story-bundle allocation is a procedural concern (do not collide IDs); it does not gate canon mutation.
6. This ticket extends an existing API surface (`allocate_next_id`) by adding optional `story_slug` and new accepted `id_class` enum values. Consumers: `branching-story-bootstrap` (integration-debt prose), `branching-story-page-cycle` (per-turn records), `tools/world-mcp/README.md`, and skill-creator ID-allocation guidance. `docs/MACHINE-FACING-LAYER.md` does not currently document `allocate_next_id`, so there is no same-seam doc hit there. The extension is additive-only — pre-existing world-scoped and pipeline-scoped calls remain valid without `story_slug`. World-level `DA` continues to allocate at world scope; story-local `DA` allocates at story scope when `story_slug` is present.
7. No skill / tool / hook / validator / schema field is renamed or removed. New id-class enum values are added; the `story_slug` argument is added. Existing `DA` is dual-scope by argument presence, not aliased.
8. Reassessment correction: the ticket's drafted `tools/world-index/` DB query work is removed. Story-bundle indexing remains out of scope; package-local tests seed temporary story-bundle directories and prove filesystem scanning directly.
9. Reassessment correction: the drafted "skill integration smoke test" and `world-validate` lanes are not live proof surfaces for story-bundle records. The truthful proof is `cd tools/world-mcp && npm test` plus grep/manual review over the two branching-story skills and same-seam docs.

## Architecture Check

1. Compound-key allocation (`world_slug` + `id_class` + `story_slug`) is cleaner than a `__story__:<world>:<story>` sentinel because the per-bundle scope is hierarchical, not pipeline-flat. Sentinel-style would force consumers to construct opaque strings; explicit `story_slug` argument makes the call site self-documenting and lets the allocator do the path resolution.
2. No backwards-compatibility aliasing: `story_slug` is optional and absent for world/pipeline-scoped allocations. Existing callers do not change. New story-bundle allocations require it; the allocator returns a clear `story-scoped id_class '<X>' requires story_slug` error if omitted for a story-bundle class.

## Verification Layers

1. **Allocator unit tests** — for each new id-class, assert next-id allocation against fixture story bundles with various existing-id ranges (empty, `[1]`, `[1,2,3]`, sparse `[1,3,7]`).
2. **MCP schema/dispatch tests** — the wrapped MCP input schema accepts the new story-scoped enum values and optional `story_slug`, rejects missing/invalid scope combinations, and preserves existing world/pipeline behavior.
3. **Skill/docs grep/manual review** — `branching-story-page-cycle` switches from manual-scan-as-authority prose to `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)` for per-turn story-bundle IDs, while retaining direct story-bundle `Write` posture. `branching-story-bootstrap` keeps deterministic first IDs for a brand-new bundle and removes stale "allocator not scoped" debt. Package README and skill-creator references describe the new sub-world allocation path.
4. **Out-of-scope conformance** — no `world-validate` lane is claimed because story-bundle record validators are not yet live.

## What to Change

### 1. Extend the id-class enum

Add to whatever enum or registry stores the class names:

- `PG`, `SE`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `SLT`, `STLOC`, `STOBJ`, `BR`, `CHC`, `STENT` (story-scoped)
- Story-local `DA` allocator must route to `worlds/<world>/stories/<story>/_source/artifacts/` when `story_slug` is present (vs world-canon `worlds/<world>/_source/...` when absent). This is the same id-class name routed by argument presence.

### 2. Extend the API signature

`allocate_next_id(world_slug, id_class, story_slug=None)`:
- `story_slug` required for story-scoped classes; absent for world-scoped and pipeline-scoped.
- Validate combo at entry: world-scoped class + present `story_slug` → error; story-scoped class + absent `story_slug` → error.
- For story-scoped classes: scan `worlds/<world_slug>/stories/<story_slug>/_source/<class-subdir>/<CLASS>-*.yaml` (or `<CLASS>-*-<char>.yaml` for STINT) and return next monotonic id.

### 3. Update the consuming skill/doc prose

Remove the "deferred per MCPENH-011" disclosures. `branching-story-page-cycle` switches its per-turn PG/BR allocation prose to `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`; `branching-story-bootstrap` removes the stale debt note while keeping deterministic first IDs for a newly-created story bundle.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify — input schema and id-class enum)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight + Guardrails (modify post-landing — separate revert sub-task)
- `.claude/skills/branching-story-page-cycle/SKILL.md` Pre-flight + HARD-GATE + Guardrails (modify post-landing — separate revert sub-task)
- `tools/world-mcp/README.md` (modify — public command signature)
- `.claude/skills/skill-creator/references/skill-design-drafting.md` and `.claude/skills/skill-creator/references/foundations-conformance-check.md` (modify — remove now-stale MCPENH-011 fallback framing)

## Out of Scope

- Story-bundle indexing in `world.db` (separate forward ticket if desired).
- Patch-engine ops for story-bundle record classes (separate forward ticket; story-bundle records are direct-Write today and that is correct under Shape A).
- Hook 3 namespace extension to gate story-bundle direct writes (intentionally deferred — story records are not world canon, and Shape A is the correct posture until the runtime stabilizes).
- Validator schemas for story-bundle records (separate forward ticket).
- End-to-end invocation of the two branching-story skills; this ticket changes their allocator prose and proves the MCP allocator boundary directly.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__allocate_next_id(world_slug='animalia', id_class='PG', story_slug='wolf-tale')` returns the next free PG-NNNN by scanning `worlds/animalia/stories/wolf-tale/_source/pages/PG-*.yaml`.
2. `mcp__worldloom__allocate_next_id(world_slug='animalia', id_class='STINT', story_slug='wolf-tale')` returns the next free STINT-NNNN by scanning `worlds/animalia/stories/wolf-tale/_source/intentions/STINT-*-*.yaml` (the `-<char>` suffix is preserved, the numeric prefix is the increment target).
3. World-scoped allocation calls without `story_slug` continue to behave identically to today (no regressions).
4. Pipeline-scoped allocation (`world_slug='__pipeline__'`) continues to behave identically.
5. Combo error: `allocate_next_id(world_slug='animalia', id_class='CF', story_slug='wolf-tale')` returns a "world-scoped id_class does not accept story_slug" error.
6. Combo error: `allocate_next_id(world_slug='animalia', id_class='PG')` returns a "story-scoped id_class requires story_slug" error.

### Invariants

1. ID monotonicity is per-class-per-bundle: PG-NNNN in story A is independent of PG-NNNN in story B.
2. The same id-class name (e.g., `DA`) routes by presence/absence of `story_slug` to the world-scoped or story-scoped subdirectory respectively; no silent collision between world-DA and story-local-DA.
3. Allocator never mutates state — it scans and reads.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — new story-scoped scan, first-run, sparse, STINT suffix, story-local DA, and combo-error cases.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — MCP schema/dispatch coverage for story-scoped `story_slug` calls and missing/invalid scope errors.

### Commands

1. `cd tools/world-mcp && npm test`.
2. `rg -n "MCPENH-011|manual filesystem scan|manual scan|story_slug" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/skill-creator/references/skill-design-drafting.md .claude/skills/skill-creator/references/foundations-conformance-check.md tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` — verify only truthful residual references remain; `docs/MACHINE-FACING-LAYER.md` has no current `allocate_next_id` entry.

## Outcome

Completion date: 2026-05-02.

- Added story-bundle-scoped `id_class` values to `tools/world-mcp/src/tools/allocate-next-id.ts` and `tools/world-mcp/src/server.ts`: `PG`, `SE`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `SLT`, `STLOC`, `STOBJ`, `BR`, `CHC`, and `STENT`.
- Extended `allocate_next_id` with optional `story_slug`; story-scoped classes scan `worlds/<world_slug>/stories/<story_slug>/_source/<subdir>/*.yaml`, while existing world-scoped and pipeline-scoped calls continue without `story_slug`.
- Preserved `DA` as dual-scope: no `story_slug` keeps the existing world-level path; present `story_slug` routes to story-local `_source/artifacts/DA-*.yaml`.
- Updated package README, `branching-story-page-cycle`, `branching-story-bootstrap`, and skill-creator ID-allocation guidance so the live story-bundle allocation contract is no longer described as deferred.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed; the build succeeded and the compiled test suite reported 275 passing tests.
2. `rg -n 'MCPENH-011|manual filesystem scan|manual scan|story_slug|allocate_next_id\(world_slug, id_class\)' ...` over the two branching-story skills, skill-creator references, package README, and `docs/MACHINE-FACING-LAYER.md` — remaining hits are truthful: `story_slug` arguments, package README signature, skill-creator sub-world guidance, bootstrap's argument/slug-collision prose, page-cycle fork-detection page scan, and the active ticket itself. `docs/MACHINE-FACING-LAYER.md` had no `allocate_next_id` entry to update.
3. `git status --short --ignored tools/world-mcp ...` — owned tracked edits are the package source/tests/README, the two branching-story skill files, the two skill-creator references, and this ticket. Pre-existing ignored package artifacts remain `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`; `npm test` refreshed `dist/` as expected.

## Deviations

- Direct external `mcp__worldloom__allocate_next_id(...)` invocation is not exposed in this Codex session, so verification used package-local direct handler tests and in-memory MCP server dispatch tests after build.
- The ticket originally named `docs/MACHINE-FACING-LAYER.md`, but the live doc has no `allocate_next_id` entry; no edit was needed there.
- Missing story bundles return the existing `invalid_input` error code with a specific message rather than adding a new public error taxonomy code.
