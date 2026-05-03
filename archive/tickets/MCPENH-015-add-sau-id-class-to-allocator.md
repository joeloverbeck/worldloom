# MCPENH-015: Add SAU id-class to allocator (story-bundle-scoped story-audit reports)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts` (extends `ID_CLASS_FORMATS` + adds SAU to story-scoped resolution branch); `tools/world-mcp/src/server.ts` (adds SAU to the MCP input enum); `tools/world-mcp/tests/tools/allocate-next-id.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts`, and `tools/world-mcp/tests/tools/describe-capabilities.test.ts` coverage/proof; `tools/world-mcp/README.md`, `CLAUDE.md`, and `.claude/skills/branching-story-health-audit/SKILL.md` updated to treat SAU allocation as live
**Deps**: None (parallels existing SLB allocation pattern; no schema migrations needed)

## Problem

At intake, `branching-story-health-audit` allocated `SAU-NNNN` ids at Pre-flight by manual scan of `worlds/<world-slug>/stories/<story-slug>/audits/SAU-*.md` — the same fallback pattern used by other story-scoped skills before their id-classes landed in the allocator. The interim manual-scan path worked but diverged from `mcp__worldloom__allocate_next_id`, the canonical worldloom ID-allocation contract per FOUNDATIONS §Tooling Recommendation. Without allocator support, concurrent audit invocations could race (two audits on the same date pick the same `SAU-NNNN` before either writes), and the skill's Pre-flight had to re-implement the highest-id scan that the allocator already does for analogous classes.

The closest existing analog is `SLB` (storylet-batches manifests) — also story-scoped, also lives outside `_source/` (under `storylet-batches/`), also append-only per-bundle. The `SAU` class fits the same shape: per-story-bundle scope, lives at `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN-<date>.md`, append-only.

## Assumption Reassessment (2026-05-03)

1. `tools/world-mcp/src/tools/allocate-next-id.ts` enumerated 16 story-scoped id-classes via `STORY_SCOPED_ID_CLASS_DIRECTORIES` (`PG`, `SE`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `SLT`, `SLB`, `STLOC`, `STOBJ`, `BR`, `CHC`, `STENT`, `DA`). `SLB` was the existing precedent for a story-scoped class that lives outside `_source/` — its directory is `storylet-batches`, not `_source/storylet-batches`. `SAU` follows the same pattern (`audits/` directory under `storyDirectory`, `.md` extension), so the allocator extension is mechanically the same as SLB.
2. FOUNDATIONS §Tooling Recommendation requires monotonic-ID allocation through the allocator for indexed pipeline classes; `SAU` is a new pipeline-output class shipped in the May 2026 audit-skill batch and previously allocated via manual fallback per the skill's Pre-flight Check section. CLAUDE.md §ID Allocation Conventions enumerates allocator-supported classes; this ticket adds `SAU` to that surface.
3. Cross-skill / cross-artifact boundary: `SAU-NNNN` is consumed by `branching-story-health-audit` (allocator) and referenced by `RSP-NNNN` cards (frontmatter `audit_id` field) and by future `storylet-pool-authoring` audit-mode invocations (`source_audit_path` argument's containing-directory id). Schema for `SAU-NNNN` filenames must follow the date-suffixed pattern (`SAU-NNNN-<YYYY-MM-DD>.md`) the skill uses; the allocator only returns the bare id (`SAU-NNNN`), the skill composes the filename. Note: `continuity-audit`'s `AU-NNNN` (already in the allocator at line 23) follows the same date-suffix convention but the allocator's regex deliberately matches only the bare `AU-NNNN` prefix — the same approach applies to SAU.
4. FOUNDATIONS Rule 6 (No Silent Retcons) motivation: SAU reports are append-only audit artifacts; allocator support centralizes the per-bundle highest-id scan, and the skill's final filename-collision check still aborts a stale concurrent write. Two concurrent pre-write calls can still observe the same disk state; the preserved invariant is no silent overwrite/reuse after collision detection.
5. Schema parity: not applicable — this ticket adds an id-class to an existing enum, not a record schema.
6. Reassessment correction: `describe_capabilities` does not maintain a separate source enum in `tools/world-mcp/src/tools/describe-capabilities.ts`; it surfaces `ID_CLASSES` from `tools/world-mcp/src/server.ts`. The owned source edit is therefore `server.ts`, with `describe-capabilities.test.ts` proving the capability response stays in lockstep.
7. Reassessment correction: `cd tools/world-mcp && npm test -- allocate-next-id` is not a narrow allocator-only lane in this package because the package script appends extra args to `node --test "dist/tests/**/*.test.js"`. The truthful narrow lane is `npm run build` followed by direct compiled tests under `dist/tests/...`; the full package lane remains `npm test`.
8. HARD-GATE check: the skill edit changes only the Pre-flight allocation mechanism from manual scan to `allocate_next_id`; it preserves the same gate ordering, approval point, write prohibition, and direct-audit write surface documented in `docs/HARD-GATE-DISCIPLINE.md`.
9. Dirty-worktree boundary: `.claude/skills/branching-story-health-audit/`, this ticket, and `tickets/MCPENH-016-add-rsp-id-class-to-allocator-sub-audit-scoped.md` were already untracked at intake. This ticket owns edits to the audit skill's SAU-specific prose only; the untracked skill directory as a whole and MCPENH-016's RSP scope remain pre-existing sibling/family work.

## Architecture Check

1. The SLB precedent (story-scoped class with non-`_source/` directory + `.md` extension) maps cleanly onto SAU; extending the same directory/extension conditional keeps the allocator tier simple.
2. No backwards-compatibility shim needed: the skill now calls `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)` directly and keeps the collision-abort check for the final date-suffixed report path.

## Verification Layers

1. **Allocator returns next free SAU id given an existing audit directory** → `tools/world-mcp/tests/tools/allocate-next-id.test.ts` adds SAU test cases parallel to existing SLB tests (empty audits/ → SAU-0001; date-suffixed SAU file present → next id; other-story files ignored).
2. **Allocator rejects non-story_slug call for SAU** → SAU is story-scoped; calling without `story_slug` returns the existing "story-scoped id_class requires story_slug" error.
3. **Allocator rejects pipeline-scoped invocation for SAU** → SAU is not in `PIPELINE_ID_CLASSES`; calling with `world_slug='__pipeline__'` returns the existing pipeline-scope rejection naming `NWB, NWP`.
4. **Skill Pre-flight switches to allocator on landing** → `branching-story-health-audit/SKILL.md` Pre-flight Check section's `Once MCPENH-015 lands` paragraph is replaced with the allocator call as the primary path; the manual-scan fallback is removed (parallels how `branching-story-bootstrap` removed its manual STORY-NNN scan after MCPENH-010 landed, leaving only a defensive fallback for older MCP server versions).
5. **describe-capabilities tool surface** → `tools/world-mcp/tests/tools/describe-capabilities.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` prove `ID_CLASSES` drives the supported `id_class` enum exposed by the server.

## Landed Changes

### 1. Extend `ID_CLASS_FORMATS` and `STORY_SCOPED_ID_CLASS_DIRECTORIES`

Added `SAU: { width: 4, zeroPad: true, regex: /^SAU-(\d{4})(?:-.+)?$/ }` to `ID_CLASS_FORMATS`.

Added `SAU: "audits"` to `STORY_SCOPED_ID_CLASS_DIRECTORIES` and `SAU` to the server `ID_CLASSES` enum.

### 2. Extend the SLB special-case in `findHighestStoryScopedId`

The SLB path/extension branch now also treats SAU as a direct story-directory markdown class. The optional suffix regex handles `SAU-NNNN-<YYYY-MM-DD>.md` stems directly.

### 3. Update describe-capabilities

`mcp__worldloom__describe_capabilities` lists supported id-classes from `ID_CLASSES` in `tools/world-mcp/src/server.ts`; adding SAU there updates both input validation and capability metadata.

### 4. Update generated skill

`.claude/skills/branching-story-health-audit/SKILL.md` now calls `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)` in Pre-flight and no longer lists MCPENH-015 as known integration debt. RSP allocation remains manual until MCPENH-016.

### 5. Update CLAUDE.md

Added `SAU-NNNN` to §ID Allocation Conventions in the project root `CLAUDE.md` parallel to the existing `AU-NNNN` entry.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — extend `ID_CLASS_FORMATS`, `STORY_SCOPED_ID_CLASS_DIRECTORIES`, and the `findHighestStoryScopedId` SLB conditional)
- `tools/world-mcp/src/server.ts` (modify — add SAU to `ID_CLASSES`)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — add SAU coverage)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add SAU MCP-boundary dispatch coverage)
- `tools/world-mcp/README.md` (modify — document SAU allocator scan path)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — switch Pre-flight + ID Allocation + HARD-GATE references from manual-scan-with-future-allocator to unconditional allocator call)
- `CLAUDE.md` (modify — add `SAU-NNNN` to §ID Allocation Conventions and truth the allocator signature/scope summary)

## Out of Scope

- `RSP-NNNN` allocator support — that is a separate sub-audit-scoped tier; tracked in MCPENH-016.
- `branching_story_health_audit` task_type registration for context-packet ranking — tracked in MCPENH-017.
- Migration of any existing SAU files — none exist yet (the skill is shipping in this batch); the allocator's first call on a fresh audit-bearing bundle will return SAU-0001, exactly matching the manual-scan path's behavior for an empty `audits/` directory.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` passes.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` passes with new SAU test cases.
3. `cd tools/world-mcp && npm test` passes.
4. Negative: invoke allocator with `id_class='SAU'` and no `story_slug` → returns "story-scoped id_class requires story_slug" error.
5. Negative: invoke allocator with `id_class='SAU'` and `world_slug='__pipeline__'` → returns the existing pipeline-scope rejection naming `NWB, NWP`.

### Invariants

1. SAU ids are monotonic per-bundle (highest existing + 1; no reuse).
2. Allocator's filename-stem regex matches the date-suffixed `SAU-NNNN-<date>.md` pattern via the optional-suffix regex form (`/^SAU-(\d{4})(?:-.+)?$/`), parallel to STINT's existing pattern.
3. Concurrent audit invocations never silently overwrite an existing SAU report: if both calls observe the same pre-write disk state, the second writer's final filename-collision check aborts; if the first write completed before the second allocation, the second allocation sees the new highest id.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — extends SLB-pattern coverage with SAU cases (empty bundle, date-suffixed SAU file, story_slug missing, enum lockstep).
2. `tools/world-mcp/tests/server/dispatch.test.ts` — adds SAU dispatch through the in-memory MCP boundary.
3. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — existing enum-lockstep test covers SAU through `ID_CLASSES`.

### Commands

1. `cd tools/world-mcp && npm run build` — TypeScript compilation passes after `ID_CLASS_FORMATS` / `ID_CLASSES` extension.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` — targeted compiled SAU coverage.
3. `cd tools/world-mcp && npm test` — full world-mcp test suite to verify no regression in adjacent allocator branches.

## Outcome

SAU is now a story-bundle-scoped allocator id-class. The allocator scans `worlds/<world-slug>/stories/<story-slug>/audits/SAU-*.md`, accepts date-suffixed report filenames, returns first-run `SAU-0001`, and requires `story_slug` through both direct module and MCP-boundary validation. The audit skill now uses `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)` during Pre-flight while leaving RSP allocation to MCPENH-016.

## Verification Result

1. `cd tools/world-mcp && npm test -- allocate-next-id` — passed before edits as a command-shape probe; this package script runs the full compiled suite, not a narrow allocator-only lane.
2. `cd tools/world-mcp && npm run build` — passed after implementation.
3. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` — passed after implementation.
4. `cd tools/world-mcp && npm test` — passed after implementation.

## Deviations

1. `tools/world-mcp/src/tools/describe-capabilities.ts` did not need a source edit; `describe_capabilities` exposes `ID_CLASSES` supplied by `tools/world-mcp/src/server.ts`.
2. `npm run typecheck` is not a live script in `tools/world-mcp/package.json`; `npm run build` is the truthful TypeScript compile gate.
3. Direct external `mcp__worldloom__describe_capabilities()` was not available in this Codex session, so post-change proof used package-local build, direct compiled tests, and in-memory MCP dispatch/capability tests.
