# MCPENH-001: Add NWB and NWP id_class support to allocate_next_id for pipeline-scoped IDs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts` and `tools/world-mcp/src/server.ts` (id_class enum extension + pipeline-scoped scan path); `tools/world-mcp/tests/tools/allocate-next-id.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (package-local proof); `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (Pre-flight Step 4 + Phase 9 framing reverted to MCP-as-primary); `tools/world-mcp/README.md` (allocator scope note)
**Deps**: none

## Problem

At intake, `mcp__worldloom__allocate_next_id` did not accept `NWB` or `NWP` as `id_class` values, even though the `propose-new-worlds-from-preferences` skill needs them to allocate batch IDs (`NWB-NNNN` at `world-proposals/batches/`) and proposal-card IDs (`NWP-NNNN` at root-level `world-proposals/`). The skill documented a manual-scan fallback as the *current path* (per implementation of MCPENH-001's audit-prep peer ticket) because the MCP call would fail schema-validation. This forced every batch invocation to bypass the MCP allocator and reimplement scan-and-increment logic in skill prose, breaking the FOUNDATIONS Tooling Recommendation that "LLM agents should never operate on prose alone" where the MCP could deterministically allocate.

The gap also blocked any future skill that writes pipeline-scoped (non-world-scoped) IDs to root-level surfaces from using the standard MCP allocator.

## Assumption Reassessment (2026-04-28)

1. The canonical MCP input enum is split between `tools/world-mcp/src/tools/allocate-next-id.ts` (`ID_CLASS_FORMATS`) and `tools/world-mcp/src/server.ts` (`ID_CLASSES`), with a lockstep test in `tools/world-mcp/tests/tools/allocate-next-id.test.ts`. Grep found no shared `world-index` id_class enum; `tools/world-index/src/parse/prose.ts` and `tools/world-index/src/parse/semantic.ts` have structured-id recognition regexes, not the allocator input contract. The current allocator covers world-scoped IDs (`CF`, `CH`, `M`, `OQ`, `ENT`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`, invariant prefixes `ONT|CAU|DIS|SOC|AES`, section prefixes `SEC-ELF|SEC-INS|SEC-MTS|SEC-GEO|SEC-ECR|SEC-PAS|SEC-TML`) but no pipeline-scoped ID class.
2. `docs/FOUNDATIONS.md §Tooling Recommendation` and `§Machine-Facing Layer` mandate that retrieval and allocation flow through the documented MCP surface; manual-scan fallbacks are explicit downgrades. At intake, `propose-new-worlds-from-preferences/SKILL.md` Pre-flight Step 4 documented the manual-scan path as primary because the MCP enum did not include `NWB`/`NWP` — this was a tooling-layer downgrade, not a design preference.
3. Cross-skill boundary under audit: the contract between (a) the `propose-new-worlds-from-preferences` skill (consumer of `allocate_next_id`) and (b) `tools/world-mcp/src/tools/allocate-next-id.ts` + `tools/world-mcp/src/server.ts` (provider). The shared schema is the `id_class` enum and the `world_slug` semantics. The skill uses a `__pipeline__` sentinel for `world_slug`; this ticket honors that sentinel and routes only `NWB` / `NWP` through root-level `world-proposals/` scans.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation ("LLM agents should never operate on prose alone … the context-packet API is the machine-facing mechanism for delivering this set with completeness guarantees"). Allocation is part of the same machine-facing contract; before this ticket, the skill operated on prose-driven scan logic.
5. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. The IDs allocated here belong to pre-canon proposal artifacts (NWP cards) and pipeline batch manifests (NWB), neither of which is canon.
6. Not applicable — no existing output schema (CF / CH / proposal card / dossier / artifact) is extended. The change is purely on the allocation surface.
7. The change adds two enum values (`NWB`, `NWP`); it does not rename or remove any existing value. Blast radius scan (`rg -n "NWB|NWP|__pipeline__|manual scan|manual-scan|world-proposals" tools .claude/skills/propose-new-worlds-from-preferences docs specs`) shows the live consumer skill and its templates/examples. The templates/examples already document the ID shape; the required stale same-seam consumer text is in `SKILL.md`.
8. Adjacent contradiction surfaced during reassessment: `propose-new-worlds-from-preferences/SKILL.md` Pre-flight Step 4 inverted the framing (manual-scan as primary, MCP as future). The skill text was inverted back to MCP-primary as a required consequence of this ticket.
9. Verification correction: direct `mcp__worldloom__allocate_next_id(...)` is not exposed as a callable Codex tool in this session, so the acceptance proof uses package-local direct handler tests plus in-memory MCP server dispatch tests after `npm run build`, which is the truthful substitute for schema/handler behavior.

## Architecture Check

1. Adding `NWB` and `NWP` to the existing enum is the minimal change preserving the allocator's invariants (append-only IDs, scan-the-disk-for-highest-then-increment, abort on collision). The alternative (a separate "pipeline-allocator" tool with its own schema) duplicates code, fragments the contract, and pushes operators to learn two tools for the same operation.
2. No backwards-compatibility shims — the enum extension is additive. Existing consumers of `allocate_next_id` are unaffected; no aliasing, no deprecation period required.

## Verification Layers

1. The `id_class` enum literally includes `NWB` and `NWP` after the change → codebase grep-proof: `grep -E '"NWB"|"NWP"' tools/world-mcp/src/tools/allocate-next-id.ts` returns hits.
2. A successful `allocate_next_id(world_slug='__pipeline__', id_class='NWB')` call against a clean repo returns `NWB-0001`; against a repo with `world-proposals/batches/NWB-0001.md` present returns `NWB-0002`; `NWP` scans `world-proposals/NWP-*.md` and ignores nonmatching filenames → package-local direct handler tests in `tools/world-mcp/tests/tools/allocate-next-id.test.ts`.
3. The `__pipeline__` sentinel resolves to root-level `world-proposals/` and `world-proposals/batches/` (NOT to any `worlds/<slug>/` directory), and cross-scope misuse returns `invalid_input` → in-memory MCP server dispatch tests in `tools/world-mcp/tests/server/dispatch.test.ts`.
4. After the skill text is reverted (§Files to Touch §3), `propose-new-worlds-from-preferences` Pre-flight Step 4 + Phase 9 + HARD-GATE block + Process Flow no longer reference the manual-scan-as-primary framing → grep-proof: `grep -n 'manual-scan path is current\|manual scan of world-proposals' .claude/skills/propose-new-worlds-from-preferences/SKILL.md` returns zero hits.

## What to Change

### 1. Extend the id_class enum

In `tools/world-mcp/src/tools/allocate-next-id.ts` and `tools/world-mcp/src/server.ts`, add `NWB` and `NWP` to the supported `id_class` enum. `world-index` has no allocator enum to update.

### 2. Add pipeline-scoped scan path

Implement the scan-and-increment logic for the two new id_classes. Pipeline-scoped allocation differs from world-scoped allocation in two respects:
- The scan target is root-level (`world-proposals/NWP-*.md` for NWP; `world-proposals/batches/NWB-*.md` for NWB), not under any `worlds/<slug>/` directory.
- The `world_slug` parameter MUST be the sentinel `__pipeline__` (any other value is rejected). Define this contract explicitly in the tool's input-validation step so a misuse error returns a clear message rather than scanning a non-existent path.

### 3. Revert the skill's manual-scan-as-primary framing

In `.claude/skills/propose-new-worlds-from-preferences/SKILL.md`, revert Pre-flight Step 4 + Phase 9 + the HARD-GATE block + the Process Flow Pre-flight entry back to MCP-as-primary framing (with manual scan as fallback only if the MCP call errors). The current text was added in the audit-prep session as a workaround; this ticket removes the workaround and restores the original design intent.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (modify — revert manual-scan-as-primary framing in Pre-flight Step 4, Phase 9, HARD-GATE block, Process Flow Pre-flight entry)

## Out of Scope

- Pipeline-scoped IDs beyond `NWB` / `NWP` (e.g., a future `LINEAGE` row ID). LINEAGE.md rows are unkeyed timestamp-and-batch entries, not allocated IDs; revisit only if a future skill needs LINEAGE-row allocation.
- World-scoped sibling enum extensions. Other `propose-new-X` skills (propose-new-canon-facts produces `PR`/`BATCH`; propose-new-characters produces `NCP`/`NCB`) already have their id_classes registered. No further additions warranted by this ticket.
- Migrating existing manually-scanned NWB-0001 / NWP-0001..0008 records to a re-allocated state. The IDs already exist on disk; the new MCP call simply continues the sequence.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class='NWB')` returns the next NWB-NNNN sequentially after the highest `NWB-*.md` file under `world-proposals/batches/`.
2. `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class='NWP')` returns the next NWP-NNNN sequentially after the highest `NWP-*.md` file under `world-proposals/`.
3. `mcp__worldloom__allocate_next_id(world_slug='animalia', id_class='NWB')` (incorrect — non-`__pipeline__` slug for pipeline-scoped class) returns a clear validation error naming the `__pipeline__` sentinel as the required value.
4. `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class='CF')` (incorrect — pipeline sentinel for world-scoped class) returns a clear validation error naming valid id_class values for pipeline scope.

### Invariants

1. Pipeline-scoped IDs are append-only: a successful allocation call never returns a value lower than or equal to the highest existing on-disk ID for that class.
2. World-scoped allocation behavior is unchanged: existing CF / M / OQ / etc. allocations on real worlds return the same values they returned before this ticket landed.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — add cases for `NWB` and `NWP` happy-path + the two cross-scope validation-error cases above.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — prove the MCP input enum accepts `NWB` and rejects cross-scope misuse through the wrapped server boundary.
3. `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` dry-run substitute — direct skill invocation is manual/organic because it requires a preference document and user approval gate; the skill text revert is verified by grep-proof per Verification Layers item 4.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js` — narrow MCP package tests; this is the correct verification boundary for the allocator and wrapped-server schema change.
3. `grep -E '"NWB"|"NWP"' tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts` — confirms the enum extension.
4. `grep -n 'manual-scan path is current\|manual scan of world-proposals' .claude/skills/propose-new-worlds-from-preferences/SKILL.md` — must return zero hits after §Files to Touch §3 lands.

## Outcome

Implemented pipeline-scoped ID allocation in `tools/world-mcp`:

1. Added `NWB` and `NWP` to `ID_CLASS_FORMATS` and the MCP server `ID_CLASSES` enum.
2. Added `__pipeline__` sentinel handling that scans root-level `world-proposals/batches/NWB-*.md` and `world-proposals/NWP-*.md` without opening a world index.
3. Added `invalid_input` guardrails for `NWB` / `NWP` with ordinary world slugs and ordinary world-scoped classes with `__pipeline__`.
4. Updated `propose-new-worlds-from-preferences` to make MCP allocation primary, with manual scan as fallback only when the MCP call errors.
5. Updated `tools/world-mcp/README.md` with the pipeline allocator contract.

## Verification Result

Completed on 2026-04-28:

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/server/dispatch.test.js` — passed.
3. `cd tools/world-mcp && npm test` — passed: 202 tests passing.
4. `grep -E '"NWB"|"NWP"' tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts` — confirmed enum/schema hits.
5. `grep -n 'manual-scan path is current\|manual scan of world-proposals' .claude/skills/propose-new-worlds-from-preferences/SKILL.md` — returned no hits.
6. `git diff --check` — passed.

Ignored artifact state: `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/.secret` are ignored package artifacts; `dist/` was rebuilt by verification. `tools/world-index/dist/` and `tools/world-index/node_modules/` were already ignored artifacts and were not owned by this ticket.

## Deviations

Direct external `mcp__worldloom__allocate_next_id(...)` invocation was unavailable in this Codex session, so verification used the package-local direct handler tests plus in-memory MCP server dispatch tests. The live package proof is stronger for this implementation seam because it exercises both the handler and wrapped server validation without requiring a restarted external MCP client.
