# MCPENH-043: Bootstrap-mode allocate_next_id for fresh story bundles

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts`; registered MCP description / package README contract; paired tests under `tools/world-mcp/tests/`.
**Deps**: `archive/tickets/MCPENH-011-story-bundle-id-classes-allocator.md`

## Problem

At intake, `branching-story-bootstrap` Pre-flight step 5 instructed the operator to "Allocate ids via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)` for every class to be created: STORY, BR, SE, PG, and class-specific ids for every STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / (optional DA) / CHC / (optional SLT)". The allocator refused every story-bundle-scoped allocation with `"Story '<slug>' does not exist in world '<world>'."` because the bundle directory had not been created yet — the bundle is created by the bootstrap's own patch envelope.

This was the bootstrap chicken-and-egg: the workflow that needs to allocate the first id of every story-bundle-scoped class is the workflow that creates the bundle, so the allocator's pre-existence check made the documented allocation surface unusable at bootstrap. The only working path was to hard-code `-0001`-sequential ids in the patch envelope, which is the workaround the May 2026 red-bunny bootstrap session adopted silently.

The allocator now returns `<CLASS>-0001` when the story-bundle scope is empty because the named bundle does not exist yet under an existing world. This keeps the allocator's contract consistent across bundle creation, pre-bundle creation, and post-bundle append cases.

## Assumption Reassessment (2026-05-13)

1. Intake allocator state: `tools/world-mcp/src/tools/allocate-next-id.ts` returned `"Story '${storySlug}' does not exist in world '${worldSlug}'."` when the story directory was absent. That guard fired for every story-bundle-scoped id class (STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/BR/SE/PG/CHC/SLT/SLB/SAU/SP plus DA with `story_slug`). The landed handler now treats a missing story directory under an existing world as an empty story-bundle scope.
2. Intake skill prose: `.claude/skills/branching-story-bootstrap/SKILL.md` §Pre-flight Check step 5 instructed allocation for every class to be created without documenting an allocator fallback for the pre-bundle case. The landed allocator fix makes that existing instruction true for fresh bundles, so no skill-prose edit was needed.
3. Shared boundary under audit: the MCP allocator API surface (`mcp__worldloom__allocate_next_id`) and its contract with the bootstrap workflow — the allocator is the documented per-class id-assignment surface across all canon-mutating and bundle-creating skills; the bootstrap skill is the only caller that legitimately invokes the allocator BEFORE the scope's parent directory exists.
4. FOUNDATIONS §Tooling Recommendation principle restated: "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern" the canonical retrieval surfaces. The allocator IS the documented id-allocation surface; when it refuses the bootstrap workflow, the skill is forced to operate "on prose alone" (hard-coded sequential ids in a build script), which violates the principle.
5. Adjacent contradiction resolved by this ticket: the bootstrap skill prose already names `allocate_next_id` as the canonical allocation method, and that prose becomes truthful once the allocator supports missing fresh bundles. No skill-prose edit was required for this ticket.
6. Live proof correction: `tools/world-mcp/package.json` exposes package-local `npm run build` and `npm test`; there is no root workspace manifest proof lane in this checkout, so the drafted `cd tools/world-mcp && pnpm test -- allocate-next-id` command is stale. Direct external `mcp__worldloom__allocate_next_id(...)` is not exposed in this Codex session, and there is no executable `branching-story-bootstrap` dry-run runner; the truthful proof is package-local build plus compiled focused tests and manual contract review over the bootstrap consumer prose.
7. Same-seam public surface correction: the registered `allocate_next_id` description in `tools/world-mcp/src/server.ts` and package README row must mention the fresh-bundle `-0001` contract because `describe_capabilities` and README are the operator-facing contract for the tool.

## Architecture Check

1. The landed change extends the allocator's contract to a coherent "next free id in scope; if scope is empty, return -0001" form. This is cleaner than alternatives: skill-side hard-coded `-0001` would re-implement the allocator's job; requiring a separate "create-bundle-directory" step before allocation would introduce ordering complexity; silently accepting caller-supplied ids would break append-only id discipline.
2. No backwards-compatibility shim was introduced. The existing error path for non-bundle-scoped classes against `story_slug` stays intact; the new branch only fires when the requested `id_class` is story-bundle-scoped, the parent world exists, and the story directory is absent.

## Verification Layers

1. Allocator returns `STENT-0001` and analogous `-0001` values for every story-bundle-scoped class when the story directory does not exist → unit test under `tools/world-mcp/tests/tools/allocate-next-id.test.ts`.
2. Allocator continues to return correct sequential ids when the story bundle exists with prior records of that class → existing tests (already covered post-MCPENH-011) continue to pass.
3. Allocator continues to reject non-bundle-scoped classes (CF / CH / INV / M / OQ / ENT / SEC) with `story_slug` argument when the world itself doesn't exist → existing error path preserved → grep-proof + test.
4. Bootstrap consumer contract review: `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight step 5 remains truthful because fresh story-bundle-scoped allocator calls now return `-0001`; no executable skill dry-run runner exists in this repo.
5. MCP registration boundary: the in-memory server dispatch test and registered tool description expose the same fresh-bundle contract that the handler implements.

## Landed Changes

### 1. Allocator: handle fresh-bundle scope

In `tools/world-mcp/src/tools/allocate-next-id.ts`, `findHighestStoryScopedId` now returns `0` when the parent world exists but `worlds/<world_slug>/stories/<story_slug>/` is absent. The existing formatter then returns `<CLASS>-0001` for all story-bundle-scoped classes, including story-local `DA`. `RSP` remains on the stricter sub-audit path and still requires an existing story directory plus `audit_id`.

### 2. Tests for the bootstrap-mode allocation case

Added direct handler coverage under `tools/world-mcp/tests/tools/allocate-next-id.test.ts` for a fresh missing story bundle. The test loops every story-bundle-scoped class in `STORY_CLASS_CASES`, asserts `<CLASS>-0001`, and asserts the allocator did not create the story directory. Existing post-bundle and scope-error coverage remains in the same file.

### 3. Allocator-tool docstring / capabilities surface

Updated the registered `allocate_next_id` tool description in `tools/world-mcp/src/server.ts`, the package README allocator row, and the in-memory MCP dispatch test so the public contract exposes the fresh-bundle behavior.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — add bootstrap-mode test cases)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add MCP-boundary bootstrap-mode proof)
- `tools/world-mcp/src/server.ts` (modify — registered tool description/capability metadata)
- `tools/world-mcp/README.md` (modify — public allocator contract)
- `tools/world-mcp/dist/...` (regenerated by build; not directly edited)

## Out of Scope

- Skill-prose rewrite to `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight step 5. Manual review showed the current allocation instruction remains correct after the allocator fix.
- Auto-creation of the `stories/<slug>/` directory by the allocator (the patch engine remains the authoritative bundle-directory creator on first-write).
- Migration of the existing `red-bunny` bundle's ids (already committed; this ticket affects future bootstraps only).
- Changes to non-bundle-scoped allocator behavior (CF, CH, INV, M, OQ, ENT, SEC, PA, CHAR, etc., all stay as-is).

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: `allocate_next_id('test-world', 'STENT', story_slug='nonexistent-story')` returns `{ next_id: 'STENT-0001' }` when `worlds/test-world/` exists and `worlds/test-world/stories/nonexistent-story/` does not.
2. New unit test: same as above for every story-bundle-scoped id class (STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, BR, SE, PG, CHC, SLT, SLB, SAU, SP).
3. Existing tests under `tools/world-mcp/tests/tools/allocate-next-id.test.ts` continue to pass without modification (no regression on the post-bundle-creation case).
4. MCP-boundary dispatch test proves the registered `allocate_next_id` handler returns `STENT-0001` for a fresh story-bundle scope.
5. Manual review of `branching-story-bootstrap` confirms Pre-flight step 5 is now backed by the allocator behavior rather than a hard-coded id workaround.

### Invariants

1. Allocator is monotonic per scope: once `STENT-0001` is allocated and committed, the next allocation returns `STENT-0002` etc. The bootstrap-mode `-0001` return is consistent with the post-creation `-0002, -0003, ...` sequence.
2. Allocator never creates a story directory as a side effect; bundle-directory creation remains the patch engine's exclusive responsibility on first-write.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — add bootstrap-mode case covering all story-bundle-scoped id classes; assert `-0001` return and no directory side effect.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — add MCP-boundary bootstrap-mode proof for a fresh story-bundle scope.

### Commands

1. Targeted build: `cd tools/world-mcp && npm run build`
2. Targeted handler proof: `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js`
3. Targeted MCP-boundary proof: `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`
4. Full-package: `cd tools/world-mcp && npm test`
5. Manual review: inspect `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight step 5 and `tools/world-mcp/README.md` allocator row for the fresh-bundle contract.

## Outcome

Completion date: 2026-05-13.

- `allocate_next_id` now returns `<CLASS>-0001` for story-bundle-scoped classes when the target world exists but `worlds/<world_slug>/stories/<story_slug>/` does not yet exist.
- The allocator remains read-only; focused tests assert the missing story directory is not created as a side effect.
- `RSP` keeps its sub-audit-scoped behavior and still requires `story_slug` plus `audit_id`.
- The registered MCP tool description and package README now document the fresh-bundle bootstrap contract.
- `branching-story-bootstrap` Pre-flight step 5 was reviewed and left unchanged because its allocator instruction is now backed by the package behavior.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js` — passed, 16 tests. Includes the new fresh missing story-bundle loop for every story-bundle-scoped class in `STORY_CLASS_CASES` and the no-directory-side-effect assertion.
3. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — passed, 30 tests. Includes the new MCP-boundary `STENT-0001` fresh-bundle proof.
4. `cd tools/world-mcp && npm test` — passed, 354 tests. The run emitted the existing diagnostic line for the `drifted-world` fixture having no recognized SPEC-13 atomic source records; it was non-fatal and outside this allocator change.
5. Manual review: `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight step 5 still instructs allocation through `mcp__worldloom__allocate_next_id(...)`; `tools/world-mcp/README.md` now states that fresh missing story bundles return `<CLASS>-0001` without directory creation.

## Deviations

- The drafted `pnpm` proof command was replaced with package-local `npm` commands because `tools/world-mcp/package.json` is the live package command authority in this checkout.
- Direct external `mcp__worldloom__allocate_next_id(...)` and a real `branching-story-bootstrap` dry-run runner are not exposed in this Codex session, so verification used direct handler tests, in-memory MCP dispatch tests, full package tests, and manual consumer-prose review.
