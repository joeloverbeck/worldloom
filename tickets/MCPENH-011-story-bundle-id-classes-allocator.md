# MCPENH-011: Add story-bundle ID classes to allocate_next_id

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/` (allocator tool + id-class enum), `tools/world-index/` (db query for per-bundle scan), `.claude/skills/branching-story-page-cycle/SKILL.md` (revert manual-scan fallback after landing)
**Deps**: MCPENH-010 (STORY id class precedent), SPEC-13 (atomic-source storage form for the world-canon side)

## Problem

`mcp__worldloom__allocate_next_id` currently supports world-scoped classes (CF, CH, INV, M, OQ, ENT, SEC-*, PA, CHAR, DA, PR, BATCH, AU, RP, EPE, STORY) and pipeline-scoped classes (NWP, NWB) via the `__pipeline__` sentinel. It does NOT yet support the per-story-bundle ID classes that `branching-story-page-cycle` and `branching-story-bootstrap` emit:

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

Both `branching-story-page-cycle` and `branching-story-bootstrap` ship today with manual filesystem scan as the allocator (per the Shape A integration posture). The manual scan is correct but verbose; engine-routed allocation centralizes the discipline (collision detection at submit time + uniform error shape) and removes the per-skill scan boilerplate.

## Assumption Reassessment (2026-05-02)

1. The current allocator surface is `tools/world-mcp/src/tools/allocate-next-id.ts` (file path inferred from `tools/world-mcp/src/tools/` listing per CLAUDE.md repository layout); the precedent for adding a class is MCPENH-010 (STORY) and MCPENH-006 (EPE). Confirm the actual file by grep before implementation: `grep -r "allocate_next_id" tools/world-mcp/src/`.
2. Story-bundle IDs are STORY-scoped, not WORLD-scoped — the allocator must accept a `story_slug` argument (or equivalent compound key) to scan the correct subdirectory. World-scoped allocation has signature `allocate_next_id(world_slug, id_class)`; story-scoped needs `allocate_next_id(world_slug, id_class, story_slug)`. The pipeline-scoped variant uses `world_slug='__pipeline__'` per existing convention; story-scoped should NOT collapse onto `__pipeline__`. Confirm with grep before implementation that no story-bundle class has been silently aliased to `__pipeline__`.
3. The shared boundary under audit is the contract between (a) skills emitting story-bundle records, (b) the allocator, and (c) the world-index DB if/when it indexes story-bundle records. Today the world-index DB indexes only world-canon records (per SPEC-13 §Atomic-Source Migration scope). Story-bundle indexing is out-of-scope for this ticket — manual scan over the bundle subdirectory is the allocator's data source until story-bundle indexing lands separately.
4. **FOUNDATIONS principle**: No FOUNDATIONS principle is directly motivated by this ticket — story-bundle records are story-scoped, not world-canon. The motivation is operational consistency: every other emergent ID class in the pipeline allocates via MCP; per-story scan-and-increment in skill prose is the sole holdout. Reducing it to a single API call removes a future drift surface.
5. This ticket does NOT touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. Story-bundle allocation is a procedural concern (do not collide IDs); it does not gate canon mutation.
6. This ticket extends an existing API surface (`allocate_next_id`) by adding a new optional argument (`story_slug`) and new accepted values for the `id_class` enum. Consumers: `branching-story-bootstrap` SKILL.md (Pre-flight allocator call), `branching-story-page-cycle` SKILL.md (Pre-flight allocator call). The extension is additive-only — pre-existing world-scoped and pipeline-scoped calls remain valid without `story_slug`. World-level DA continues to allocate at world scope; story-local DA allocates at story scope (the same class name routes by presence/absence of `story_slug`).
7. No skill / tool / hook / validator / schema field is renamed or removed. New id-class enum values are added; the `story_slug` argument is added.
8. No adjacent contradictions exposed — this is forward-work; the manual-scan posture in the two skills is documented as temporary and removed only after this ticket lands.

## Architecture Check

1. Compound-key allocation (`world_slug` + `id_class` + `story_slug`) is cleaner than a `__story__:<world>:<story>` sentinel because the per-bundle scope is hierarchical, not pipeline-flat. Sentinel-style would force consumers to construct opaque strings; explicit `story_slug` argument makes the call site self-documenting and lets the allocator do the path resolution.
2. No backwards-compatibility aliasing: `story_slug` is optional and absent for world/pipeline-scoped allocations. Existing callers do not change. New story-bundle allocations require it; the allocator returns a clear `Missing story_slug for story-scoped id_class '<X>'` error if omitted for a story-bundle class.

## Verification Layers

1. **Allocator unit tests** — for each new id-class, assert next-id allocation against fixture story bundles with various existing-id ranges (empty, `[1]`, `[1,2,3]`, sparse `[1,3,7]`).
2. **Skill integration check** — `branching-story-bootstrap` Pre-flight and `branching-story-page-cycle` Pre-flight switch from manual scan to `mcp__worldloom__allocate_next_id` call; integration test fires both skills end-to-end against a fixture world + fixture story bundle and asserts no ID collisions.
3. **Conformance check** — `world-validate` (or equivalent CLI) re-runs against the fixture bundle; story-bundle records produced via the new allocator pass schema validation. (Note: story-bundle records are not yet validated by the validator framework — that's a separate forward ticket. This layer asserts the allocator's outputs are well-formed YAML at minimum.)
4. **Skill-revert sub-task** — after landing, update `.claude/skills/branching-story-page-cycle/SKILL.md` Pre-flight Check + HARD-GATE block + Guardrails to remove the "engine-routed allocation deferred per `tickets/MCPENH-011`" disclosures and the manual-scan fallback prose. Same revert for `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight Check.

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

### 3. Update the two consuming skills (skill-revert, after landing)

Remove the "deferred per MCPENH-011" disclosures and switch the manual-scan prose to a single `mcp__worldloom__allocate_next_id(world_slug, id_class='PG', story_slug)` call (and per-class equivalents).

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (or actual allocator filename — confirm via grep) (modify)
- `tools/world-mcp/src/tool-names.ts` and any id-class registry (modify)
- Allocator unit tests under `tools/world-mcp/src/` or `tools/world-mcp/test/` (modify or new)
- `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight + Guardrails (modify post-landing — separate revert sub-task)
- `.claude/skills/branching-story-page-cycle/SKILL.md` Pre-flight + HARD-GATE + Guardrails (modify post-landing — separate revert sub-task)

## Out of Scope

- Story-bundle indexing in `world.db` (separate forward ticket if desired).
- Patch-engine ops for story-bundle record classes (separate forward ticket; story-bundle records are direct-Write today and that is correct under Shape A).
- Hook 3 namespace extension to gate story-bundle direct writes (intentionally deferred — story records are not world canon, and Shape A is the correct posture until the runtime stabilizes).
- Validator schemas for story-bundle records (separate forward ticket).

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

1. `tools/world-mcp/src/tools/allocate-next-id.test.ts` (or actual test path — confirm) — new test cases per the Acceptance Criteria.
2. Skill-integration smoke test (manual or scripted): bootstrap a fixture story bundle via `branching-story-bootstrap`, then run `branching-story-page-cycle` once, then assert all emergent records have unique IDs in the bundle.

### Commands

1. `pnpm --filter world-mcp test` (or equivalent test command for the world-mcp package).
2. `world-validate worlds/animalia/stories/<fixture-slug>/` post-allocation to verify the bundle is well-formed.
3. The skill-revert sub-task is a separate verification: after landing, re-grep the two skill SKILL.md files for "deferred per MCPENH-011" — zero hits expected.
