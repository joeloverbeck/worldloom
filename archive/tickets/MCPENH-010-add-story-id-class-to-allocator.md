# MCPENH-010: Add `STORY` to id_class enum for allocate_next_id

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts` (`ID_CLASS_FORMATS` extension + STORY world-scoped filesystem scan); `tools/world-mcp/src/server.ts` (`ID_CLASSES` extension); `tools/world-mcp/tests/tools/allocate-next-id.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (package-local proof); `.claude/skills/branching-story-bootstrap/SKILL.md` (Pre-flight: revert manual-scan-as-fallback framing — MCP becomes primary, fallback survives only as defensive recovery for old MCP servers); `tools/world-mcp/README.md` (allocator scope note for STORY).
**Deps**: MCPENH-001 precedent for additive id_class enum extension; MCPENH-006 precedent for filesystem-scan-backed world-scoped id classes (EPE — same shape as STORY); the `branching-story-bootstrap` skill (consumer; shipped with manual-scan-on-`Unsupported id_class` defensive recovery before this ticket).

## Problem

At intake (2026-05-02), `mcp__worldloom__allocate_next_id` did not accept `STORY` as an `id_class` value. The `ID_CLASS_FORMATS` map at `tools/world-mcp/src/tools/allocate-next-id.ts` and the `ID_CLASSES` tuple at `tools/world-mcp/src/server.ts` enumerated 28+ values (CF, CH, PA, CHAR, DA, PR, BATCH, NWB, NWP, NCP, NCB, AU, RP, EPE, M, ONT, CAU, DIS, SOC, AES, OQ, ENT, SEC-ELF, SEC-INS, SEC-MTS, SEC-GEO, SEC-ECR, SEC-PAS, SEC-TML) — `STORY` was absent.

The `branching-story-bootstrap` skill (created 2026-05-02 from `archive/brainstorming/branching-story-bootstrap.md`) writes `STORY-NNNN`-keyed story bundles under `worlds/<world-slug>/stories/<story-slug>/` (the `STORY-NNNN` is recorded in `STORY_KERNEL.md` frontmatter as `story_id`; the directory itself is keyed by user-supplied `story_slug`). Pre-flight needed to allocate the next STORY id per bootstrap. Before this ticket, the skill called `mcp__worldloom__allocate_next_id(world_slug, 'STORY')` as primary with a documented manual-scan fallback for the period before this ticket landed:

> **Fallback path** (if the allocator returns `Unsupported id_class 'STORY'`): manually scan `worlds/<world-slug>/stories/STORY-*/STORY_KERNEL.md`, extract `story_id` from frontmatter, increment to next 4-digit zero-padded id. Defensive recovery — survives in environments where MCPENH-010 has not yet landed.

Before this ticket, the skill's Guardrails named this ticket as the upgrade path:

> `MCPENH-010: Add STORY id_class to allocate_next_id` — when landed, Pre-flight's allocator path becomes the primary; the manual-scan fallback can be removed in a follow-up. Until then, the fallback is the correct path on `Unsupported id_class` errors.

The gap was structurally identical to MCPENH-006 (EPE) — additive enum extension for an id introduced after the original enum definition, with a world-scoped filesystem scan backing the allocator path because the world-index does not yet index `stories/`.

## Assumption Reassessment (2026-05-02)

1. The canonical MCP allocator input enum is split between `tools/world-mcp/src/tools/allocate-next-id.ts` (`ID_CLASS_FORMATS`, defining width/zeroPad/regex per id_class) and `tools/world-mcp/src/server.ts` (`ID_CLASSES`, used by the Zod `z.enum` schema). The two must stay in lockstep; existing tests at `tools/world-mcp/tests/tools/allocate-next-id.test.ts` enforce the lockstep. STORY follows the 4-digit zero-padded shape used by CF / CH / PA / CHAR / DA / PR / BATCH / NWB / NWP / NCP / NCB / AU / RP / EPE / OQ / ENT — so the format entry is `{ width: 4, zeroPad: true, regex: /^STORY-(\d{4})$/ }`.
2. STORY directories live under `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` (per `.claude/skills/branching-story-bootstrap/SKILL.md` §Output). The `story_id` (e.g., `STORY-0007`) is the frontmatter field — the directory is keyed by the user-supplied kebab-case `story_slug`, not by the `STORY-NNNN` id directly. So the allocator scan must read `STORY_KERNEL.md` files to extract `story_id` from frontmatter, NOT just enumerate directory names. STORY is world-scoped, NOT pipeline-scoped — it does NOT use the `__pipeline__` sentinel (those are reserved for NWB / NWP per MCPENH-001).
3. Reassessment correction: the live allocator's existing world-scoped path reads indexed `nodes.node_id` values from `worlds/<slug>/_index/world.db`; it does not scan hybrid directories. Because `world-index` currently indexes `characters`, `diegetic-artifacts`, `proposals`, `character-proposals`, `audits`, `adjudications`, and (post-MCPENH-006) `pressure-events`, but not `stories`, STORY requires a dedicated stories filesystem scan in `allocate-next-id.ts` — parallel to MCPENH-006's `pressure-events/` scan, but with an additional frontmatter parse step to extract `story_id`.
4. Cross-skill / cross-tool boundary under audit: the contract between (a) the `branching-story-bootstrap` skill (consumer of `allocate_next_id`) and (b) `tools/world-mcp/src/tools/allocate-next-id.ts` + `tools/world-mcp/src/server.ts` (provider). The shared schema is the `id_class` enum and the STORY-specific world-scoped filesystem scan over `worlds/<slug>/stories/*/STORY_KERNEL.md` with frontmatter `story_id` extraction. At intake, the skill's Pre-flight prose documents the MCP-as-primary call with manual-scan fallback; the post-implementation skill text removes the fallback prose (or downgrades it to a one-line defensive-recovery note).
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + current Invariants + relevant canon fact records + affected domain files + unresolved contradictions list + mystery reserve entries touching the same domain." Allocation is part of the same machine-facing contract; per the MCPENH-001 / MCPENH-006 precedents and `tickets/README.md` §Mandatory Pre-Implementation Checks item 1, an absent enum value forces the skill to operate on prose-driven scan logic rather than the MCP's deterministic allocator.
6. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. STORY ids belong to story bundles which are NOT canon (per `.claude/skills/branching-story-bootstrap/SKILL.md` §FOUNDATIONS Alignment); the IDs allocated here belong to per-story-bundle artifacts, not canon records.
7. Not applicable — no existing output schema (CF / CH / proposal card / dossier / artifact / EPE card / sidecar / batch manifest) is extended. The change is purely on the allocation surface.
8. The change adds one enum value (`STORY`); it does not rename or remove any existing value. Blast radius scan: `rg -n "stories/|STORY-|allocate_next_id.*STORY" tools docs .claude/skills/branching-story-bootstrap` shows the skill's Pre-flight allocator-and-fallback prose at the §Pre-flight Check section, which requires revert. `tools/world-mcp/README.md` documents `allocate_next_id`, so its allocator scope note also requires update.
9. Adjacent contradiction surfaced during reassessment: the skill shipped with the manual-scan fallback as documented defensive recovery. This ticket downgraded the skill's Pre-flight fallback prose to a one-line older-server note and removed the `MCPENH-010` Guardrails debt bullet, parallel to MCPENH-006's revert of `emergent-pressure-events`'s manual-scan-as-primary framing.
10. Verification correction: direct external `mcp__worldloom__allocate_next_id(...)` invocation is not exposed as a callable Codex tool in this session, so acceptance uses package-local direct handler tests and in-memory MCP server dispatch tests after `npm run build`. This is the truthful post-change substitute for schema/handler behavior because it exercises fresh compiled artifacts without requiring a restarted external MCP client.

## Architecture Check

1. Adding `STORY` to the existing `ID_CLASS_FORMATS` and `ID_CLASSES` enums plus a narrowly scoped `stories/` scan with frontmatter `story_id` extraction is the minimal change preserving the allocator's invariants (append-only IDs, scan for highest then increment, abort on collision at the skill write boundary). This parallels MCPENH-006's filesystem-backed scan for EPE while extending the scan to include a frontmatter parse step (a one-time addition; future world-scoped id classes whose ids are stored in YAML frontmatter rather than filenames will follow the same pattern). The alternative — extending `world-index` to index `stories/` and using the index-backed path — is larger scope and premature: the runtime page-cycle has not yet stabilized whether story records benefit from index coverage.
2. No backwards-compatibility shims — the enum extension is additive. Existing consumers of `allocate_next_id` are unaffected; no aliasing, no deprecation period required. The skill's existing manual-scan code path becomes pure fallback (only fires if the MCP call errors with `Unsupported id_class`).

## Verification Layers

1. The `id_class` enum literally includes `STORY` after the change → codebase grep-proof: `rg -n '"STORY"' tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts` returns hits in both files.
2. A successful `allocate_next_id(world_slug='<world>', id_class='STORY')` call against a world with no `stories/STORY-*/STORY_KERNEL.md` files returns `STORY-0001`; against a directory with `stories/<slug-1>/STORY_KERNEL.md` (frontmatter `story_id: STORY-0005`) and `stories/<slug-2>/STORY_KERNEL.md` (frontmatter `story_id: STORY-0007`) present returns `STORY-0008` while ignoring directories without a `STORY_KERNEL.md` and ignoring malformed frontmatter → package-local direct handler tests in `tools/world-mcp/tests/tools/allocate-next-id.test.ts`.
3. The MCP server's wrapped Zod input schema accepts `STORY` as a valid `id_class` and routes to the STORY world-scoped filesystem scan path (NOT the pipeline-scoped path used by NWB / NWP and NOT the index-backed ordinary world-class path) → in-memory MCP server dispatch tests in `tools/world-mcp/tests/server/dispatch.test.ts`.
4. After the skill text reverts (§Files to Touch §3), `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight prose downgrades the manual-scan fallback to a one-line defensive-recovery note → grep-proof: `rg -n "manually scan worlds/<world-slug>/stories/STORY-\*/STORY_KERNEL.md" .claude/skills/branching-story-bootstrap/SKILL.md` returns zero hits (the multi-line fallback paragraph is gone), and the simpler one-line "fall back to filesystem scan" note remains.
5. The skill's Guardrails `MCPENH-010` entry was removed → grep-proof: the deferred-debt bullet block in §Guardrails no longer carries the `MCPENH-010` line.

## Landed Changes

### 1. Extend the id_class enum

In `tools/world-mcp/src/tools/allocate-next-id.ts`:
- Added an entry to `ID_CLASS_FORMATS` between `EPE` and `M` (preserving the lexical grouping of 4-digit zero-padded ids before the variable-width invariant prefix block):
  ```ts
  STORY: { width: 4, zeroPad: true, regex: /^STORY-(\d{4})$/ },
  ```

In `tools/world-mcp/src/server.ts`:
- Added `"STORY"` to the `ID_CLASSES` tuple between `"EPE"` and `"M"`:
  ```ts
  "EPE",
  "STORY",
  "M",
  ```

### 2. Add the STORY scan path

The ordinary world-scoped allocator path remains index-backed. Added a narrowly scoped STORY path in `allocate-next-id.ts` that:
- verifies `worlds/<world-slug>/` exists and returns the existing `world_not_found` style error if absent;
- scans `worlds/<world-slug>/stories/`;
- enumerates only direct subdirectories (not files);
- for each subdirectory, reads `<subdir>/STORY_KERNEL.md` and parses YAML frontmatter to extract `story_id`;
- ignores subdirectories without a `STORY_KERNEL.md` file (defensive — partial-failure bundles or directories not yet bootstrapped);
- ignores malformed frontmatter by skipping the bundle rather than aborting;
- collects all extracted `story_id` values matching `^STORY-(\d{4})$`;
- returns the next 4-digit zero-padded id (max + 1, or `STORY-0001` if none found).

### 3. Revert the skill's manual-scan-as-fallback framing

In `.claude/skills/branching-story-bootstrap/SKILL.md`:
- **§Pre-flight Check (Allocate next STORY-NNN bullet)**: replaced the multi-line fallback paragraph ("Fallback path (if the allocator returns `Unsupported id_class 'STORY'`): manually scan ...") with a one-line defensive-recovery note: "Defensive recovery: if the allocator returns `Unsupported id_class 'STORY'` from an older MCP server, fall back to scanning `worlds/<world-slug>/stories/*/STORY_KERNEL.md` for the highest existing `story_id` and incrementing."
- **§Guardrails "Known integration debt" block**: removed the `MCPENH-010` bullet.

### 4. Update tests

- `tools/world-mcp/tests/tools/allocate-next-id.test.ts`: added cases for `STORY` happy-path:
  - clean directory (no `stories/`) returns `STORY-0001`;
  - directory with `stories/foo/STORY_KERNEL.md` (frontmatter `story_id: STORY-0001`) returns `STORY-0002`;
  - directory with multiple subdirectories at varying frontmatter ids returns `max + 1`;
  - directory with a subdirectory missing `STORY_KERNEL.md` is skipped gracefully;
  - directory with a subdirectory whose `STORY_KERNEL.md` has malformed frontmatter is skipped gracefully without aborting.
- `tools/world-mcp/tests/server/dispatch.test.ts`: added MCP-server-boundary tests asserting `STORY` is accepted by the Zod enum and routes to the world-scoped scan path, and that the pipeline sentinel rejects `STORY`.

### 5. README pointer

In `tools/world-mcp/README.md`, added `STORY` to the allocator scope note alongside EPE and the pipeline-scoped NWB/NWP classes.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — `ID_CLASS_FORMATS` extension + STORY stories filesystem scan with frontmatter parse)
- `tools/world-mcp/src/server.ts` (modify — `ID_CLASSES` extension)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — `STORY` happy-path coverage incl. malformed-frontmatter edge cases)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — `STORY` schema-acceptance coverage)
- `tools/world-mcp/README.md` (modify — id_class enumeration update)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Pre-flight allocator-and-fallback prose downgrade; §Guardrails entry removal)

## Out of Scope

- Per-story-scoped allocator classes (STENT, SF, SE, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, BR, PG, CHC) — these introduce a new "per-story" scoping concept that does not exist in the allocator today (current scopes are world_slug or `__pipeline__`). Deferred until the runtime page-cycle stabilizes the schemas and per-story collision rates show whether MCP-backed allocation is needed (per the skill's Guardrails).
- The `story_bootstrap` task_type registration (completed separately in `archive/tickets/MCPENH-009-register-story-bootstrap-task-type.md`).
- Hook 3 namespace extension to `worlds/<slug>/stories/<slug>/_source/` — deferred until engine ops for story records exist.
- Patch engine ops for story records — deferred until the runtime page-cycle stabilizes the schemas.
- Validators for story-record schemas — deferred until the runtime page-cycle stabilizes the schemas.
- Extending `world-index` to index `stories/` — premature; the runtime page-cycle has not yet stabilized whether story records benefit from index coverage.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n '"STORY"' tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts` returns hits in both files.
2. The package-local allocate-next-id happy-path tests for `STORY` pass (clean directory → `STORY-0001`; populated directory → `max + 1`; missing-STORY_KERNEL.md skipped; malformed-frontmatter skipped).
3. The in-memory MCP server dispatch test passes — `'STORY'` is accepted by the Zod enum and routes to the world-scoped scan path.
4. `rg -n "manually scan worlds/<world-slug>/stories/STORY-\*/STORY_KERNEL.md" .claude/skills/branching-story-bootstrap/SKILL.md` returns zero hits after the skill revert.
5. `cd tools/world-mcp && npm test` passes.

### Invariants

1. The lockstep between `ID_CLASS_FORMATS` and `ID_CLASSES` is preserved — every existing id_class still has entries in both; no entry references an id_class that does not exist in both.
2. Append-only id allocation discipline preserved — the allocator returns `max + 1` deterministically, never reuses dropped or retired ids.
3. The skill's manual-scan defensive-recovery path continues to function for environments running older MCP servers (the fallback prose is downgraded but not removed).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — `STORY` happy-path + edge cases (missing-STORY_KERNEL.md, malformed-frontmatter).
2. `tools/world-mcp/tests/server/dispatch.test.ts` — `STORY` Zod-acceptance + scan-path routing.

### Commands

1. `cd tools/world-mcp && npm test`
2. `rg -n '"STORY"' tools/world-mcp/src/`
3. `rg -n "manually scan" .claude/skills/branching-story-bootstrap/SKILL.md`

## Outcome

Completion date: 2026-05-02.

- Added `STORY` to `tools/world-mcp` allocator format metadata and the MCP server input enum.
- Added a STORY-specific world-scoped story-bundle scan that reads direct subdirectories under `worlds/<slug>/stories/`, parses `STORY_KERNEL.md` frontmatter, skips missing or malformed kernels, and returns the next 4-digit STORY id without requiring story bundles to be indexed.
- Updated direct handler and in-memory MCP dispatch tests for STORY first-run, populated-world, malformed-frontmatter, missing-kernel, and `__pipeline__` rejection behavior.
- Updated `tools/world-mcp/README.md` with the STORY allocator scope note.
- Updated `branching-story-bootstrap` so `mcp__worldloom__allocate_next_id(world_slug, 'STORY')` is the documented primary path; the old unsupported-server scan survives only as a one-line defensive recovery note, and the `MCPENH-010` integration-debt bullet is gone.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed; package build succeeded and the full compiled test suite reported 270 passing tests.
2. `rg -n '"STORY"|STORY:' tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts` — returned hits in `ID_CLASS_FORMATS`, `STORY_ID_CLASSES`, and `ID_CLASSES`.
3. `rg -n 'manually scan worlds/<world-slug>/stories/STORY-\*/STORY_KERNEL.md' .claude/skills/branching-story-bootstrap/SKILL.md` — returned no hits.
4. `rg -n 'manually scan' .claude/skills/branching-story-bootstrap/SKILL.md` — returned no hits.
5. `git status --short --ignored tools/world-mcp` — showed the owned tracked package edits plus pre-existing ignored `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` artifacts; ignored artifact state was unchanged in kind by this run.

## Deviations

- Direct external `mcp__worldloom__allocate_next_id(...)` invocation was unavailable in this Codex session, so verification used the package-local direct handler tests and in-memory MCP server dispatch tests after build. This proves the source, fresh compiled artifact, Zod enum, and wrapped server dispatch seam without claiming a restarted external MCP client smoke.
- The landed STORY scan silently skips malformed `STORY_KERNEL.md` frontmatter rather than warning, matching the ticket's defensive "do not abort" invariant while avoiding a new user-facing warning channel in the allocator response shape.
