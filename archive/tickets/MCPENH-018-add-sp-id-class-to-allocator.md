# MCPENH-018: Add SP id-class to allocator (story-scoped tier — `story-promotions/`)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts` (extends `ID_CLASS_FORMATS`, `STORY_SCOPED_ID_CLASS_DIRECTORIES`, and story-scoped extension handling for SP); `tools/world-mcp/src/server.ts` (extends `ID_CLASSES` enum); `tools/world-mcp/tests/tools/allocate-next-id.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (SP direct + MCP-boundary coverage); `tools/world-mcp/README.md` and `CLAUDE.md` ID Allocation Conventions section (document the live SP allocator surface)
**Deps**: `archive/tickets/MCPENH-011-story-bundle-id-classes-allocator.md` (completed story-scoped allocator infrastructure); `archive/tickets/MCPENH-014-add-slb-id-class-to-allocator.md` (most recent story-scoped extension precedent); `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md` (story-scoped `audits/` directory precedent — directly parallel to `story-promotions/`)

## Problem

`story-fact-promotion-to-canon` (the canon-mutating skill that bridges story-local outcomes to world canon) emits `SP-NNNN` ledger files at `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN.md` plus a sidecar `SP-NNNN-proposal-package.yaml`. SP is a story-bundle-scoped id class — `SP-0001` in story A and story B do not collide; uniqueness is per-bundle, not per-world or per-pipeline. The class is structurally analogous to `SAU` (per-bundle audit ledger) and `SLB` (per-bundle storylet batch).

At intake (the skill's first shipping pass), `SP-NNNN` was not registered in `tools/world-mcp/src/tools/allocate-next-id.ts`. The skill shipped with a manual-scan fallback in Pre-flight Step 6 (scan `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-*.md` and `SP-*-proposal-package.yaml` for the highest existing SP integer, increment). This worked for single-author serial workflows but broke the canonical allocator contract: every other story-scoped class (`PG`, `SE`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `SLT`, `SLB`, `SAU`, `STLOC`, `STOBJ`, `BR`, `CHC`, `STENT`, `DA`) routes through `mcp__worldloom__allocate_next_id`, and concurrent invocations on the same story bundle (rare but possible during multi-pass authoring) could race against the manual-scan path.

## Assumption Reassessment (2026-05-03)

1. `tools/world-mcp/src/tools/allocate-next-id.ts` defines `STORY_SCOPED_ID_CLASS_DIRECTORIES` as a const-satisfies map — adding `SP: "story-promotions"` is parallel to the `SAU: "audits"` and `SLB: "storylet-batches"` precedents. The `ID_CLASS_FORMATS` map takes an additive `SP` entry, but the live scanner currently assumes one extension per story-scoped class. Because SP must count both `SP-NNNN.md` ledgers and `SP-NNNN-proposal-package.yaml` sidecars, this ticket also owns a narrow SP scan-extension helper rather than claiming the existing path is unchanged.
2. `tools/world-mcp/src/server.ts` exposes the supported allocator id_classes as a string-literal enum in the input schema; SP must be appended there parallel to the most recent additions (RSP per MCPENH-016, SAU per MCPENH-015).
3. Cross-skill / cross-artifact boundary: SP is emitted ONLY by `story-fact-promotion-to-canon` Phase 10 (the SP ledger) + Phase 9 (the SP proposal-package sidecar). The SP-NNNN naming convention is shared between the ledger filename (`SP-NNNN.md`) and the sidecar filename (`SP-NNNN-proposal-package.yaml`); the allocator regex must match the bare id and the optional `-proposal-package` suffix, and the directory scan must inspect both `.md` and `.yaml` files when computing the highest existing integer.
4. FOUNDATIONS Rule 6 spirit: SP records are append-only audit artifacts (the SP ledger is THE story-side audit trail of every promotion attempt — accept, revise, reject, firewall-reject); allocator support enforces per-bundle uniqueness over written SP files structurally. There is no supported workflow for re-using a dropped SP id; gaps in the SP-NNNN sequence are permanent and indicate either an aborted Pre-flight (the skill aborts before allocating in some failure modes) or a manual filesystem cleanup (out-of-band — not skill-supported).
5. Schema parity: not applicable — registering an id class extends an enum and adds a directory mapping; no record schema changes.
6. `describe_capabilities` has no separate source enum; `tools/world-mcp/tests/tools/describe-capabilities.test.ts` proves the exported `ID_CLASSES` enum from `tools/world-mcp/src/server.ts` stays reflected in capability metadata.
7. The companion ticket `MCPENH-019-register-story-fact-promotion-task-type` registers the context-packet `task_type='story_fact_promotion_to_canon'` in `tools/world-mcp/src/ranking/profiles/index.ts` `TASK_TYPES`. The two tickets are independent — they touch different files and can land in either order. Both must land before `SFPC-001-revert-fallbacks-after-mcpenh-lands` removes the skill's interim fallbacks. The untracked `.claude/skills/story-fact-promotion-to-canon/` directory and `tickets/MCPENH-019-register-story-fact-promotion-task-type.md` are pre-existing sibling scope at intake; this ticket does not edit them.

## Architecture Check

1. The pattern is established: every story-bundle-scoped output directory gets a paired entry in `STORY_SCOPED_ID_CLASS_DIRECTORIES` + `ID_CLASS_FORMATS`. Adding SP follows MCPENH-014 (SLB) and MCPENH-015 (SAU) precedent exactly — no new abstraction, no new resolution branch, no new argument required (`story_slug` is already the canonical extra argument for story-scoped allocation).
2. No backwards-compatibility shim: the skill switches from manual-scan to allocator call atomically when `SFPC-001-revert-fallbacks-after-mcpenh-lands` is executed (see that ticket for the skill-prose edit).
3. SP and SF do not collide: distinct regex prefixes (`/^SP-(\d{4})(?:-proposal-package)?$/` vs `/^SF-(\d{4})$/`), distinct directories (`story-promotions/` vs `_source/facts/`).

## Verification Layers

1. **Allocator returns next free SP id given an existing story-promotions directory** → `allocate-next-id.test.ts` adds SP cases (empty story-promotions directory → SP-0001; SP-0001..0003 present → SP-0004; non-SP files in story-promotions/ ignored; SP-NNNN-proposal-package.yaml sidecar files counted alongside SP-NNNN.md ledgers when computing highest).
2. **Allocator rejects SP without story_slug** → existing "story-scoped id_class requires story_slug" error fires unchanged.
3. **Allocator rejects audit_id on SP** → existing "id_class 'SP' is not sub-audit-scoped and does not accept audit_id" error fires (SP is story-scoped, not sub-audit-scoped).
4. **Allocator returns SP-0001 when story-promotions directory does not yet exist** → graceful degradation (the directory is created at Phase 9/10 first-write time; if SP allocation is called before that, the empty-directory case applies — first-promotion case for any story bundle).
5. **MCP boundary exposes SP** → `dispatch.test.ts` asserts `mcp__worldloom__allocate_next_id(world_slug, 'SP', story_slug=<story_slug>)` returns the expected next id.
6. **`describe_capabilities` lists SP** → server input-schema enum includes SP after the edit; `describe-capabilities.test.ts` covers the enum surface.

## Landed Changes

### 1. Extend `ID_CLASS_FORMATS`

Added `SP: { width: 4, zeroPad: true, regex: /^SP-(\d{4})(?:-proposal-package)?$/ }` to the `ID_CLASS_FORMATS` const in `tools/world-mcp/src/tools/allocate-next-id.ts`.

### 2. Extend `STORY_SCOPED_ID_CLASS_DIRECTORIES`

Added `SP: "story-promotions"` to the `STORY_SCOPED_ID_CLASS_DIRECTORIES` const. SP is treated as a direct story-directory class like `SAU` and `SLB`, with both `.md` and `.yaml` suffixes scanned so sidecar-only directories still advance the high-water mark.

### 3. Update MCP input schema

Added `SP` to the `ID_CLASSES` enum in `tools/world-mcp/src/server.ts`; `describe_capabilities` reflects it through the existing enum-lockstep path.

### 4. Tests

- `tools/world-mcp/tests/tools/allocate-next-id.test.ts`: added SP cases for first-run allocation, mixed ledger + proposal-package sidecar high-water calculation, non-SP files ignored, missing `story_slug` rejected, `audit_id` rejected, and enum/format lockstep.
- `tools/world-mcp/tests/server/dispatch.test.ts`: added SP MCP-boundary coverage.
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts`: existing enum-lockstep assertion covers SP through `ID_CLASSES`.

### 5. Documentation

- `tools/world-mcp/README.md`: documented SP allocator surface in the ID Allocation Conventions section.
- `CLAUDE.md`: added `SP-NNNN` to the ID Allocation Conventions enumeration.

## Files Touched

- `tools/world-mcp/src/tools/allocate-next-id.ts`
- `tools/world-mcp/src/server.ts`
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts`
- `tools/world-mcp/tests/server/dispatch.test.ts`
- `tools/world-mcp/README.md`
- `CLAUDE.md`
- `tickets/MCPENH-018-add-sp-id-class-to-allocator.md`

Reviewed but not modified: `tools/world-mcp/tests/tools/describe-capabilities.test.ts` already asserts the capability enum comes from `ID_CLASSES`.

## Out of Scope

- Changing the SP-NNNN file naming convention (the skill emits both `SP-NNNN.md` and `SP-NNNN-proposal-package.yaml` — both are recognized by the regex; this ticket does not change that).
- Patch-engine ops for SP records (SP is direct-write only — `worlds/<slug>/stories/<slug>/story-promotions/` is outside Hook 3's `_source/<subdir>/*.yaml` regex; no engine op is needed).
- Validator schemas for SP records (SP is markdown + YAML sidecar; no `record_schema_compliance` validator is needed — the SP ledger is human-prose-shaped).
- Skill prose edits to drop the manual-scan fallback (covered by `SFPC-001-revert-fallbacks-after-mcpenh-lands`).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` — TypeScript compilation passes after the SP registry and test updates.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` — direct allocator, MCP boundary, and capability enum tests pass with new SP cases.
3. `cd tools/world-mcp && npm test` — full package test lane passes.

### Invariants

1. SP allocator returns story-bundle-scoped unique ids; per-bundle namespace; story_slug required.
2. Empty story-promotions directory → SP-0001 (first-promotion-per-bundle case).
3. SP and SF allocators do not collide (distinct regex, distinct directories).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — SP test coverage paralleling SAU and SLB plus mixed `.md` / `.yaml` sidecar high-water behavior.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — SP MCP-boundary case.

### Commands

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js`.
3. `cd tools/world-mcp && npm test`.

## Outcome

Completion date: 2026-05-03.

- Added `SP` to the allocator format registry and MCP `ID_CLASSES` enum.
- Routed `SP` through story-bundle-scoped allocation at `worlds/<world-slug>/stories/<story-slug>/story-promotions/`.
- Counted both `SP-NNNN.md` ledgers and `SP-NNNN-proposal-package.yaml` sidecars when computing the next id; unrelated suffixes such as `SP-9999-draft.yaml` remain ignored.
- Updated package README and repo ID allocation conventions so the live machine-facing surface documents `SP-NNNN`.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` — passed.
3. `cd tools/world-mcp && npm test` — passed; the full package lane reported 288 passing tests.
4. `rg -n "SP|story-promotions|ID_CLASSES|48 id classes" tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts tools/world-mcp/tests/tools/allocate-next-id.test.ts tools/world-mcp/tests/server/dispatch.test.ts tools/world-mcp/tests/tools/describe-capabilities.test.ts tools/world-mcp/README.md CLAUDE.md` — manual grep review confirmed SP appears in the allocator registry, server enum, direct/MCP tests, docs, and repo ID conventions.
5. `git diff --check` — passed for tracked edits. `git diff --check --no-index /dev/null tickets/MCPENH-018-add-sp-id-class-to-allocator.md` exited 1 with no whitespace diagnostics, the expected no-index result for an untracked file that differs from `/dev/null`.
6. `git status --short --ignored tools/world-mcp CLAUDE.md tickets/MCPENH-018-add-sp-id-class-to-allocator.md` — owned edits are the world-mcp source/tests/README, `CLAUDE.md`, and this untracked ticket. Ignored package artifacts remain `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`; `npm run build` / `npm test` refreshed `dist/` as expected.

## Deviations

- The draft said SP could share the existing story-scoped scanner unchanged. Live code used one extension per story-scoped class, so the landed change includes a narrow SP-specific multi-extension scan to count both `SP-NNNN.md` and `SP-NNNN-proposal-package.yaml`.
- `.claude/skills/story-fact-promotion-to-canon/` and `tickets/MCPENH-019-register-story-fact-promotion-task-type.md` were already untracked sibling scope at intake. This ticket did not edit the skill fallback prose; `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` remains the explicit owner after MCPENH-018 and MCPENH-019 both land.
- Direct external `mcp__worldloom__allocate_next_id(...)` invocation is not exposed in this Codex session, so verification used package-local direct handler tests and in-memory MCP server dispatch/capability tests after build.
