# MCPENH-016: Add RSP id-class to allocator (sub-audit-scoped tier — new nesting)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts` (extend `ID_CLASS_FORMATS`, add new `audit_id` argument + a sub-audit-scoped resolution branch alongside the completed story-scoped `SAU` branch); `tools/world-mcp/src/server.ts` (extend the MCP input schema and `ID_CLASSES` enum); `tools/world-mcp/tests/tools/allocate-next-id.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (add RSP direct and MCP-boundary coverage); `tools/world-mcp/README.md`, `CLAUDE.md`, and `branching-story-health-audit/SKILL.md` (document the live RSP allocator surface); `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md` precondition (SAU id-class exists; this ticket extends the RSP-vs-SAU nesting hierarchy)
**Deps**: `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md` (completed SAU id-class allocator support — RSP allocation requires the SAU directory to exist; the API contract here also wants `id_class='SAU'` to already be in the enum)

## Problem

At intake, `branching-story-health-audit` allocated `RSP-NNNN` ids lazily at Phase 8 per emitted card by manual scan of `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-*.md`. RSP was a new allocator tier not then representable in `tools/world-mcp/src/tools/allocate-next-id.ts`: the existing tiers were pipeline-scoped (NWB / NWP via `__pipeline__`), world-scoped (CF / CH / AU / RP / etc.), per-world-pressure-event (EPE), per-world-story (STORY), and story-bundle-scoped (including completed `SAU` support from `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md`). RSP is one tier deeper — sub-audit-scoped. Each SAU-NNNN audit owns its own RSP-NNNN namespace; RSP-0001 in SAU-0003 is a different record from RSP-0001 in SAU-0007.

This nesting is structurally analogous to how `continuity-audit` writes RP-NNNN cards under `worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-*.md` — but `continuity-audit` ships with `RP` as a world-scoped class in the allocator (line 24 of `allocate-next-id.ts`) which scans the world's index DB for the highest RP node. RP allocation works because RP cards across all AU directories share a single per-world namespace, which the world index can answer. RSP's namespace is per-SAU, not per-bundle and not per-world — so the world-index branch (default branch in `allocateNextId`) cannot answer the question.

Without allocator support, the skill's lazy-scan pattern worked but could not reuse the canonical allocator contract, and concurrent audit invocations on the same SAU directory (rare but possible during multi-pass authoring) could race.

## Assumption Reassessment (2026-05-03)

1. `tools/world-mcp/src/tools/allocate-next-id.ts` enumerates the current allocator tiers: pipeline, pressure-event, story, story-scoped (including `SAU`). The `AllocateNextIdArgs` interface accepts `world_slug`, `id_class`, and optional `story_slug`. Adding RSP requires ONE more optional argument (`audit_id`) and ONE more resolution branch (`findHighestSubAuditScopedId`). The existing function's argument-validation cascade already handles "id_class requires extra argument" patterns — extend with the `audit_id` analog.
2. `continuity-audit`'s RP cards are world-scoped (allocator scans the world-index DB for highest `RP-*` node). This works for RP because it's a single-namespace-per-world flat allocation. RSP is structurally different: per-audit nesting requires the allocator to know which audit. The cleanest API is `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)` — three identifiers required, parallel to how SAU requires `world_slug + story_slug`.
3. Cross-skill / cross-artifact boundary: RSP cards are emitted ONLY by `branching-story-health-audit` (Phase 8) and consumed ONLY by `storylet-pool-authoring` (mode=audit, post-STPOOL-001). The schema is fully owned by these two skills; this ticket is concerned only with the id-allocation surface, not the card schema (which lives at `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md`).
4. FOUNDATIONS Rule 6 spirit: RSP cards are append-only audit artifacts; allocator support enforces per-SAU uniqueness over written RSP files structurally. Drop-list-at-Phase-9 semantics remain recorded in the audit report's `dropped_card_ids`; future same-SAU continuation writes are not a supported workflow, and partial-failure recovery instructs re-invocation with fresh SAU/RSP ids.
5. Schema parity: the RSP card frontmatter mirrors `storylet-pool-authoring`'s `source_audit_path` parse-time consumer schema (per the audit skill's templates/remediation-storylet-proposal-card.md frontmatter comment). This ticket does NOT change that schema; it only changes the allocation surface.
6. Reassessment correction: `describe_capabilities` does not maintain its own allocator enum in `tools/world-mcp/src/tools/describe-capabilities.ts`; it reflects the `ID_CLASSES` enum and registered tool metadata from `tools/world-mcp/src/server.ts`. The owned capability source edit is therefore `server.ts`, with `describe-capabilities.test.ts` and `dispatch.test.ts` proving the response stays in lockstep.
7. Reassessment correction: `cd tools/world-mcp && npm test -- allocate-next-id` is not a narrow allocator-only lane in this package because the script builds and runs the compiled test glob. The truthful narrow lane is `npm run build` followed by direct compiled tests under `dist/tests/...`; `npm test` remains the full package lane.
8. HARD-GATE check: the skill edit changes only the Phase 8 RSP allocation mechanism from manual scan to `allocate_next_id`; it preserves the same approval point, write prohibition, write order, per-card validation, Mystery Reserve firewall checks, and direct `audits/` write surface documented in `docs/HARD-GATE-DISCIPLINE.md`.
9. Same-family reference sweep found active sibling tickets `STPOOL-001` and `MCPENH-017` still describing MCPENH-016 as pending/manual-scan interim work; those references were same-family drift from this landing and were updated to point at this completed ticket.

## Architecture Check

1. The new tier is structurally analogous to story-scoped allocation but one nesting level deeper. Add `findHighestSubAuditScopedId(worldSlug, storySlug, auditId, idClass)` paralleling `findHighestStoryScopedId`. The path resolution is `path.join(worldDirectory, "stories", storySlug, "audits", auditId, "remediation-storylet-proposals")` and the file extension is `.md`. The function follows the same shape as the existing helpers — no new abstractions required.
2. Argument-validation cascade extends mechanically: add a `SUB_AUDIT_SCOPED_ID_CLASSES` constant set (initially `{ "RSP" }`); add `audit_id?: string` to `AllocateNextIdArgs`; add corresponding error-case branches in `allocateNextId` for "RSP requires audit_id" and "id_class is not sub-audit-scoped but audit_id was supplied." Mechanical, parallel to existing `story_slug` validation.
3. No backwards-compatibility shim needed: the audit skill now calls `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)` directly in Phase 8.
4. No collision with existing `RP` (continuity-audit's retcon-proposal). `RP-NNNN` and `RSP-NNNN` are distinct id-classes with distinct regex patterns (`/^RP-(\d{4})$/` vs `/^RSP-(\d{4})$/`); the longer prefix means there is no risk of one regex matching the other's ids. The semantic distinction (world-scoped retcon proposals from `continuity-audit` vs sub-audit-scoped remediation storylet proposals from `branching-story-health-audit`) is preserved by the namespace separation.

## Verification Layers

1. **Allocator returns next free RSP id given an existing remediation-storylet-proposals directory** → `allocate-next-id.test.ts` adds RSP cases (empty SAU directory → RSP-0001; RSP-0001..0003 present → RSP-0004; non-RSP files in remediation-storylet-proposals/ ignored).
2. **Allocator rejects RSP without audit_id** → "sub-audit-scoped id_class 'RSP' requires audit_id" error.
3. **Allocator rejects RSP without story_slug** → existing "story-scoped id_class requires story_slug" error (RSP is a sub-tier under story-scoped; both arguments required).
4. **Allocator rejects audit_id on a non-sub-audit-scoped id_class** → "id_class 'X' is not sub-audit-scoped and does not accept audit_id" error.
5. **Allocator returns RSP-0001 when SAU directory does not yet exist** → graceful degradation (the parent SAU directory is created at audit-write time; if RSP allocation is called before that, the empty-directory case applies).
6. **Skill Phase 8 switch to allocator on landing** → `branching-story-health-audit/SKILL.md` Phase 8 + §ID Allocation + HARD-GATE/debt references switch from manual-scan-with-future-allocator to unconditional allocator call.

## Landed Changes

### 1. Extend `ID_CLASS_FORMATS`

Added `RSP: { width: 4, zeroPad: true, regex: /^RSP-(\d{4})(?:-.+)?$/ }` between `RP` and `SAU`, matching the date/slug-suffix style used by `STINT` and `SAU`.

### 2. Introduce `SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES`

Added `SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES` with initial member `RSP: "remediation-storylet-proposals"`, plus the corresponding `SubAuditScopedIdClass` type guard.

### 3. Extend `AllocateNextIdArgs`

Added optional `audit_id?: string`, required for sub-audit-scoped `RSP` and rejected for every non-sub-audit-scoped class.

### 4. Add `findHighestSubAuditScopedId`

Added `findHighestSubAuditScopedId(worldSlug, storySlug, auditId, idClass)`, which validates the world and story, validates bare `audit_id` against `SAU-NNNN`, scans `audits/<audit_id>/remediation-storylet-proposals/*.md`, ignores non-RSP files, and returns `0` for a missing proposal directory so first-run allocation returns `RSP-0001`.

RSP filenames include a slug suffix (`RSP-NNNN-<slug>.md`), so the landed regex uses the optional-suffix form `/^RSP-(\d{4})(?:-.+)?$/`.

### 5. Wire the new branch into `allocateNextId`

The argument-validation cascade now trims `audit_id`, rejects `audit_id` on non-sub-audit-scoped classes, preserves the existing `story_slug` requirement wording for sub-audit classes, rejects RSP without `audit_id`, and dispatches RSP to `findHighestSubAuditScopedId`.

RSP is not added to `STORY_SCOPED_ID_CLASS_DIRECTORIES`; it has its own tier and directory layout. The shared story-slug check now treats story-scoped and sub-audit-scoped classes as requiring `story_slug`.

### 6. Update MCP input schema and describe-capabilities surface

Added `RSP` to `tools/world-mcp/src/server.ts` `ID_CLASSES`, added optional `audit_id` to `allocateNextIdInputSchema`, and updated the registered allocator description so `mcp__worldloom__describe_capabilities` documents the sub-audit-scoped argument requirement through the normal server metadata path.

### 7. Update generated skill

Edited `.claude/skills/branching-story-health-audit/SKILL.md`:
- Phase 8 now allocates `RSP-NNNN` with `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)`.
- §ID Allocation now treats RSP allocator support as live.
- The MCPENH-016 known-debt entry was removed.

### 8. Update CLAUDE.md

Added `RSP-NNNN` to §ID Allocation Conventions parallel to AU-NNNN / RP-NNNN, noting the sub-audit-scoped tier and `story_slug` + `audit_id` requirement.

### 9. Truth same-family sibling references

Updated `tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md` and `tickets/MCPENH-017-register-branching-story-health-audit-task-type.md` so they no longer describe RSP allocator support as pending or manual-scan interim work.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — extend types, add helper, wire branch)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — add RSP test cases including new error paths)
- `tools/world-mcp/src/server.ts` (modify — add RSP enum, optional `audit_id`, and allocator capability description)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add RSP MCP-boundary dispatch and error coverage)
- `tools/world-mcp/README.md` (modify — document `audit_id` and the RSP scan path)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — switch RSP allocation from manual-scan-with-future-allocator to unconditional allocator call in Phase 8 + §ID Allocation + HARD-GATE clause (a))
- `CLAUDE.md` (modify — add `RSP-NNNN` to §ID Allocation Conventions)
- `tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md` (modify — truth dependency/out-of-scope reference to completed RSP allocator support)
- `tickets/MCPENH-017-register-branching-story-health-audit-task-type.md` (modify — truth dependency reference to completed RSP allocator support)

## Out of Scope

- `SAU` allocator support — completed in `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md` (precondition for this ticket).
- `branching_story_health_audit` task_type registration — tracked in MCPENH-017.
- Generalizing the sub-audit-scoped tier to other future skills — none currently named; if a future audit skill emits per-AU sub-records (e.g., a continuity-audit-style "remediation worker" sub-class), revisit. Don't pre-emptively design for it.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` passes.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` passes with new RSP direct and MCP-boundary cases.
3. `cd tools/world-mcp && npm test` passes.
4. Manual contract review: `branching-story-health-audit` now calls `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)` for each Phase 8 card; a full skill invocation remains out of scope because it requires a user-approved content-generation HARD-GATE.
5. Negative: invoke allocator with `id_class='RSP'` and no `audit_id` → returns "sub-audit-scoped id_class 'RSP' requires audit_id" error.
6. Negative: invoke allocator with `id_class='SAU'` and an `audit_id` → returns "id_class 'SAU' is not sub-audit-scoped and does not accept audit_id" error.
7. Negative: invoke allocator with `id_class='RSP'` and `audit_id='SAU-99'` (malformed) → returns "audit_id must match pattern 'SAU-NNNN'" error.

### Invariants

1. RSP ids are monotonic per-(world, story, audit) tuple (highest existing + 1; no reuse).
2. RSP allocation never collides with another SAU's RSP allocation (per-SAU namespace isolation).
3. RSP allocation degrades gracefully when the SAU sub-directory does not yet exist (returns RSP-0001 — the audit-skill creates the directory at write time, after Phase 8 allocation).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — added sub-audit-scoped allocation coverage for empty directory, partial-fill, non-RSP ignored, missing `audit_id`, malformed `audit_id`, and `audit_id` on non-sub-audit-scoped classes.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — added in-memory MCP dispatch coverage for successful RSP allocation plus missing/malformed/rejected `audit_id` cases.

### Commands

1. `cd tools/world-mcp && npm run build` — TypeScript compilation passes after `AllocateNextIdArgs` and MCP schema extension.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` — targeted compiled RSP coverage.
3. `cd tools/world-mcp && npm test` — full world-mcp test suite.

## Outcome

RSP is now a sub-audit-scoped allocator id-class. The allocator accepts `world_slug`, `id_class: "RSP"`, `story_slug`, and bare `audit_id: "SAU-NNNN"`, scans `worlds/<world-slug>/stories/<story-slug>/audits/<audit_id>/remediation-storylet-proposals/RSP-*.md`, returns `RSP-0001` for a missing proposal directory, isolates namespaces across SAU directories and story bundles, and rejects missing or malformed `audit_id` inputs. The MCP server schema and `describe_capabilities` metadata expose the new class and argument requirement. The branching-story health audit skill now uses the allocator in Phase 8 instead of documenting a manual-scan fallback.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js dist/tests/tools/describe-capabilities.test.js` — passed.
3. `cd tools/world-mcp && npm test` — passed.
4. Manual review confirmed `.claude/skills/branching-story-health-audit/SKILL.md`, `CLAUDE.md`, and `tools/world-mcp/README.md` now describe the live `RSP` allocator surface and no longer preserve the MCPENH-016 manual-scan debt note.
5. `rg -n 'manual scan|MCPENH-016|until landed|Once.*lands|RSP.*manual|story_slug\?\)' .claude/skills/branching-story-health-audit/SKILL.md CLAUDE.md tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/WORKFLOWS.md tickets/MCPENH-017-register-branching-story-health-audit-task-type.md tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md` — after sibling truthing, no stale MCPENH-016 pending/manual-scan hits remain; remaining hits are unrelated generic RSP/manual-intervention prose.

## Deviations

1. `tools/world-mcp/src/tools/describe-capabilities.ts` did not need a source edit; `describe_capabilities` reflects `ID_CLASSES` and registered metadata from `tools/world-mcp/src/server.ts`.
2. A full `branching-story-health-audit` invocation was not run because that would require a real content-generation HARD-GATE and explicit user approval. The owned proof is package-local direct/MCP allocator behavior plus manual skill contract review.
3. `npm run typecheck` is not a live script in `tools/world-mcp/package.json`; `npm run build` is the truthful TypeScript compile gate.
