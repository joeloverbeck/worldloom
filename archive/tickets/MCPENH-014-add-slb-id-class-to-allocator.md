# MCPENH-014: Add `SLB` id-class to `allocate_next_id`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (allocator handler + id-class enum + capability metadata + tests + README), `.claude/skills/storylet-pool-authoring/SKILL.md` (manual-scan fallback removed)
**Deps**: archive/tickets/MCPENH-011-story-bundle-id-classes-allocator.md (compound-key story-bundle allocator precedent that already supports `SLT` + 13 other story-bundle classes)

## Problem

At intake, `.claude/skills/storylet-pool-authoring` allocated two id classes: `SLT` (storylet records) and `SLB` (storylet batch manifests). MCPENH-011 added `SLT` to `allocate_next_id` along with 13 other story-bundle classes (PG / SE / SF / OBL / CNSQ / THR / SREL / STINT / SLT / STLOC / STOBJ / BR / CHC / STENT + story-local DA), but did not include `SLB` because no existing skill emitted SLB-NNNN at the time MCPENH-011 landed.

At intake, `.claude/skills/storylet-pool-authoring` shipped with a manual-scan fallback (per Shape A integration posture):

> Allocate `SLB-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, id_class='SLB', story_slug=<story_slug>)`.
>
> **Defensive recovery**: if the allocator returns `Unsupported id_class 'SLB'` from a pre-MCPENH-014 server, fall back to scanning `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-*.md` for the highest existing id and incrementing.

That fallback was correct but reintroduced the per-skill manual-scan boilerplate that MCPENH-011's compound-key allocation pattern was designed to eliminate. This ticket added `SLB` to the allocator enum and removed the storylet-pool fallback prose.

## Assumption Reassessment (2026-05-02)

1. The live allocator surface is `tools/world-mcp/src/tools/allocate-next-id.ts` (handler + format registry); the MCP input enum and capability metadata feed from `tools/world-mcp/src/server.ts` (`ID_CLASSES`). MCPENH-011's archive ticket confirmed these locations on 2026-05-02 when adding the 14 story-bundle classes.
2. MCPENH-011 is the live precedent: it added compound-key (`world_slug` + `id_class` + `story_slug`) allocation for 14 story-bundle classes via `ID_CLASS_FORMATS`, `ID_CLASSES`, direct handler tests, server dispatch tests, `tools/world-mcp/README.md`, and skill prose truthing. `SLB` was not in scope at that time because `storylet-pool-authoring` had not yet shipped; this ticket is the targeted extension covering the 15th story-bundle class.
3. The shared boundary under audit is the contract between (a) `.claude/skills/storylet-pool-authoring/SKILL.md` Pre-flight allocation (and any future skill emitting SLB-NNNN — none currently planned, but the manifest class is reusable for future batch-style storylet authoring), (b) the allocator handler + MCP input schema/capability enum, and (c) the skill's defensive-recovery fallback prose that this ticket removes.
4. **FOUNDATIONS principle**: No FOUNDATIONS principle is directly motivated by this ticket — SLB-NNNN batch manifest records are story-scoped audit artifacts, not world-canon. The motivation is operational consistency with MCPENH-011: every other emergent ID class in the storylet pipeline allocates via MCP; SLB is the sole holdout. Reducing it to a single API call removes a future drift surface.
5. This ticket does NOT touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. SLB allocation is a procedural concern (do not collide manifest ids); it does not gate canon mutation.
6. This ticket extends an existing API surface (`allocate_next_id`) by adding one new accepted `id_class` enum value. Consumer: `.claude/skills/storylet-pool-authoring` (Pre-flight allocation + Guardrails debt bullet revert). The extension is additive-only — pre-existing world-scoped, pipeline-scoped, and story-bundle-scoped calls remain valid; the existing 14 story-bundle classes from MCPENH-011 continue to work without modification.
7. No skill / tool / hook / validator / schema field is renamed or removed. New id-class enum value added; no aliases.
8. Reassessment correction: `SLB` lives at `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md` — a per-story-bundle directory parallel to `_source/<class>/` but NOT under `_source/`. The allocator scan path is `storylet-batches/SLB-*.md` (markdown manifest, not YAML record). This is a deliberate departure from `_source/<class>/<ID>.yaml` because the manifest is human-facing audit prose, not a structured record. The allocator's filename-globbing logic must accept this directory + extension shape.
9. Reassessment correction: the live package test paths are `tools/world-mcp/tests/tools/allocate-next-id.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts`, not the stale singular `test/...` paths drafted below.

## Architecture Check

1. Compound-key allocation (`world_slug` + `id_class='SLB'` + `story_slug`) is the right pattern, identical to MCPENH-011's existing 14 story-bundle classes. The per-bundle scope is hierarchical, not pipeline-flat. SLB does not collapse onto pipeline scope or world scope.
2. No backwards-compatibility aliasing: `SLB` is added as a new enum value alongside the 14 existing story-bundle classes; existing callers do not change. The handler routes `SLB` to a per-bundle `storylet-batches/SLB-*.md` scan, parallel to the existing routing for `SLT` (which scans `_source/storylets/SLT-*.yaml`).

## Verification Layers

1. **Allocator unit tests** — assert next-id allocation for `SLB` against fixture story bundles with an existing high-water mark plus lower same-story ids and an empty first-run directory; the scan path resolves to `storylet-batches/SLB-*.md` (not `_source/<subdir>/SLB-*.yaml`).
2. **MCP schema/dispatch tests** — wrapped MCP input schema accepts `id_class='SLB'` with `story_slug` provided; rejects missing `story_slug` for `SLB` (parallel to the SLT/PG/etc. `story-scoped id_class requires story_slug` error from MCPENH-011); preserves existing world/pipeline/story-bundle behavior.
3. **Skill/docs grep/manual review** — `.claude/skills/storylet-pool-authoring/SKILL.md` switches from manual-scan-as-defensive-fallback prose to engine-allocator wording: the §Pre-flight Check "Defensive recovery" bullet under SLB allocation is removed, and the §Guardrails MCPENH-014 debt bullet is removed.
4. **README + docs update** — `tools/world-mcp/README.md` id-classes table gains a `SLB` row in the story-bundle section.

## Landed Changes

### 1. Extend the id-class enum

Added `SLB` to `ID_CLASSES` in `tools/world-mcp/src/server.ts` and `ID_CLASS_FORMATS` in `tools/world-mcp/src/tools/allocate-next-id.ts`. The format matches MCPENH-011's story-bundle zero-padded four-digit entries.

### 2. Wire the allocator scan path

`SLB` allocation now scans `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-*.md` (not `_source/<subdir>/`). The allocator continues to treat a missing `storylet-batches/` directory as an empty id range and returns `SLB-0001` for first use inside an existing story bundle.

### 3. Tests

Extended direct handler tests in `tools/world-mcp/tests/tools/allocate-next-id.test.ts` so the existing story-scoped table covers `SLB-0007.md -> SLB-0008` with lower same-story ids ignored except for high-water calculation, first-run `SLB-0001`, enum/format lockstep, and existing story-scoped rejection paths.

Extended server dispatch tests in `tools/world-mcp/tests/server/dispatch.test.ts` so `allocate_next_id({world_slug, id_class: 'SLB', story_slug})` dispatches through the wrapped MCP boundary and returns `SLB-0004` against the seeded manifest fixture.

### 4. Skill prose revert

`.claude/skills/storylet-pool-authoring/SKILL.md` now names MCP allocation for both `SLT` and `SLB` without the pre-MCPENH-014 defensive fallback, and its known-integration-debt list no longer carries an MCPENH-014 bullet.

### 5. Docs

`tools/world-mcp/README.md` now documents `SLB` as a story-bundle-scoped allocator class with path `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-*.md`.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify; add to `ID_CLASSES`)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify; add `SLB` route to `storylet-batches/`)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify; add `SLB` allocation tests)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify; add dispatch test)
- `tools/world-mcp/README.md` (modify; add `SLB` row)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify; revert manual-scan prose)

## Out of Scope

- Other deferred integration: archive/tickets/MCPENH-013-register-storylet-pool-authoring-task-type.md completed the `storylet_pool_authoring` task type; BSBOOT-002 (bootstrap delegation), BSPAG-001 (page-cycle JIT delegation), and `branching-story-health-audit` remain separate deferred siblings.
- Patch-engine ops for SLB records — SLB is markdown manifest, not YAML record; no Hook 3 surface and no engine ops needed. Manifest writes remain direct `Write` per the same Shape A posture as the rest of `_source/<class>/` story-bundle records.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — passes including new `SLB` allocation and dispatch tests.
2. Grep proof: `grep -n "Unsupported id_class 'SLB'\\|MCPENH-014" .claude/skills/storylet-pool-authoring/SKILL.md` returns zero hits after the prose revert.

### Invariants

1. `ID_CLASSES` includes `'SLB'` and the existing 14 story-bundle classes from MCPENH-011 remain intact.
2. `allocate_next_id({world_slug, id_class: 'SLB', story_slug})` returns the next free SLB id by scanning `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-*.md`; empty directory → `SLB-0001`.
3. `allocate_next_id({world_slug, id_class: 'SLB'})` (missing `story_slug`) returns the same `story-scoped id_class 'SLB' requires story_slug` error shape as the other 14 story-bundle classes from MCPENH-011.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — `SLB` allocation against fixture story bundles (empty, contiguous, sparse).
2. `tools/world-mcp/tests/server/dispatch.test.ts` — MCP dispatch test for `id_class='SLB'`.

### Commands

1. `cd tools/world-mcp && npm test` — full package test suite.
2. `grep -n "Unsupported id_class 'SLB'\\|MCPENH-014" .claude/skills/storylet-pool-authoring/SKILL.md` — should return zero lines after the revert.

## Outcome

Completion date: 2026-05-02.

- Added `SLB` to the world-mcp allocator format registry and MCP `ID_CLASSES` enum/capability metadata.
- Routed `SLB` through the story-scoped allocator path while scanning markdown manifests under `storylet-batches/` instead of YAML records under `_source/`.
- Added direct allocator and in-memory MCP dispatch coverage for `SLB` success and missing-`story_slug` behavior.
- Updated `tools/world-mcp/README.md` and `.claude/skills/storylet-pool-authoring/SKILL.md` so `SLB` allocation is documented as allocator-supported and the manual fallback is gone.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed. The package build succeeded and the compiled Node test suite reported `279` passing subtests, including the new `SLB` allocator/dispatch coverage.
2. `rg -n "Unsupported id_class 'SLB'|MCPENH-014|SLB is \\*\\*new\\*\\*|Pre-flight fallback" .claude/skills/storylet-pool-authoring/SKILL.md` — returned zero hits.
3. Manual review of `tools/world-mcp/README.md`, `tools/world-mcp/src/server.ts`, and `tools/world-mcp/src/tools/allocate-next-id.ts` confirmed the public enum/capability metadata and package README now include `SLB` with the manifest path.
4. `git status --short --ignored tools/world-mcp .claude/skills/storylet-pool-authoring/SKILL.md tickets/MCPENH-014-add-slb-id-class-to-allocator.md` — owned tracked edits include the allocator source, server enum, allocator tests, dispatch tests, package README, storylet-pool skill, and this ticket. Pre-existing same-package/same-skill edits from the MCPENH-013/storylet-pool-authoring task-type work remain in the worktree and were not reverted. Ignored package artifacts remain `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`; `npm test` refreshed `dist/` as expected.

## Deviations

- The drafted `tools/world-mcp/test/...` paths were stale; the live paths are `tools/world-mcp/tests/tools/allocate-next-id.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts`.
- Direct external `mcp__worldloom__allocate_next_id(...)` invocation is not exposed in this Codex session, so verification used package-local direct handler tests and in-memory MCP server dispatch tests after build.
