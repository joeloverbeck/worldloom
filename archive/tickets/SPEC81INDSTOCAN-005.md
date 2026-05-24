# SPEC81INDSTOCAN-005: Context packet story_bundle_context shortlist embedding

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/world-mcp` context-packet assembly, `get_context_packet` input metadata, story-bundle fixture/tests, and context-packet docs. No change to canon write paths.
**Deps**: archive/tickets/SPEC81INDSTOCAN-002.md

## Problem

At intake, per SPEC-81 §5.3, the story-bundle context packet capped visible storylet enumeration at `MAX_VISIBLE_STORYLETS = 50` (`tools/world-mcp/src/context-packet/story-bundle-context.ts`). Above 50, full SLT bodies disappeared from the packet and only the aggregate distribution remained. Turn-cycle Phase 2's SLT-selection inputs still worked through the new MCP tool, but the LLM-facing context packet did not expose the candidates that pre-filter would have surfaced.

This ticket wires the context-packet to additionally embed the output of `select_storylet_candidates(turn_driver: derived_or_player_default)` with `max_candidates: 24` when the packet is assembled for a non-bootstrap story-pipeline task type with a `parent_page_id` available. The visible-storylets summary (50-cap) is preserved for human-readable summary; the shortlist is the LLM-facing candidate surface, labeled as "candidates already filtered by driver-kind + active-class compatibility."

## Assumption Reassessment (2026-05-24)

1. `tools/world-mcp/src/context-packet/story-bundle-context.ts` defines `MAX_VISIBLE_STORYLETS = 50`, the capped `visibleRecords` selection, and the aggregate-distribution overflow path. The file is consumed by `tools/world-mcp/src/context-packet/assemble.ts` and is exposed to story-pipeline task types through `get_context_packet`.
2. SPEC-81 §5.3: preserve the 50-cap visible-storylets summary (human-readable); when packet assembled for a story-pipeline task type with `parent_page_id` available, additionally embed `select_storylet_candidates(...)` output with `max_candidates: 12-24` as the LLM-facing shortlist; both surfaces coexist with the shortlist labeled "candidates already filtered by driver-kind + active-class compatibility."
3. Cross-skill boundary under audit: context-packet assembler (`tools/world-mcp/src/context-packet/`) ↔ MCP tool (`select_storylet_candidates` per 002). The context-packet calls into the same tool that consumer skills call into; both surfaces stay consistent.
4. FOUNDATIONS §Tooling Recommendation: the context packet is the canonical "LLM agents should always receive..." delivery mechanism; embedding the shortlist makes the candidate pool legible at large pool sizes when the 50-cap would otherwise truncate it.
5. Live reassessment found that `get_context_packet` did not previously accept a `parent_page_id`; the landed same-seam correction adds optional `parent_page_id` to `tools/world-mcp/src/tools/get-context-packet.ts`, the MCP input schema in `tools/world-mcp/src/server.ts`, and `assembleContextPacket`. For compatibility with existing story-pipeline callers, a `PG-*` entry in `seed_nodes` is still warned-and-dropped from world-scope local authority, but is also used as the parent page for shortlist embedding.
6. Documentation surfaces that enumerate the context-packet response shape are same-seam consumers: `tools/world-mcp/README.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, and `docs/MACHINE-FACING-LAYER.md` now name `story_bundle_context.selection_shortlist`.

## Architecture Check

1. The context-packet calls `select_storylet_candidates` directly rather than re-implementing the pre-filter pipeline. This is cleaner because: (a) the pipeline lives in one canonical place (the MCP tool, owned by 002); (b) the context-packet's shortlist matches what a turn-cycle invocation would see (a single source of truth for "candidates at this page"); (c) the human-readable 50-cap summary remains for at-a-glance review, while the shortlist is the LLM-facing decision surface. Alternative: scale the 50-cap up to a larger value — rejected because (i) it does not address the underlying pre-filter quality issue (every candidate is still uniformly weighted in the summary); (ii) larger caps inflate context-packet token cost without proportional decision-relevance.
2. No backwards-compatibility aliasing/shims introduced. The 50-cap visible-storylets summary is preserved; the shortlist is additive. Existing consumers reading `story_bundle_context.visible_storylets` continue to work.

## Verification Layers

1. Context-packet response shape includes the shortlist when `parent_page_id` is available → schema validation (assert response shape has `selection_shortlist`).
2. The 50-cap visible-storylets summary remains for all story-pipeline task types → codebase grep-proof (`grep -n MAX_VISIBLE_STORYLETS tools/world-mcp/src/context-packet/story-bundle-context.ts` still returns the constant with value 50).
3. The shortlist is labeled to distinguish it from the summary → manual review confirms the embedded shortlist carries a label like "candidates already filtered by driver-kind + active-class compatibility" or equivalent prose that names its filtered-pre-shortlist nature.
4. FOUNDATIONS §Tooling Recommendation cited in the response-shape documentation.

## Landed Changes

### 1. Update `tools/world-mcp/src/context-packet/story-bundle-context.ts`

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`:

- Preserved `MAX_VISIBLE_STORYLETS = 50` and the existing visible-storylets summary path.
- Added `selection_shortlist` under `story_bundle_context` when a parent page is available.
- Calls the existing `selectStoryletCandidates` implementation with `max_candidates: 24` and a default `player_action` turn driver.
- Labels the shortlist: "candidates already filtered by driver-kind + active-class compatibility per SPEC-81; full SLT bodies for the shortlist are retrievable via `get_records(record_ids=requires_full_body_ids, story_slug=...)`."
- Leaves `selection_shortlist: null` when no parent page is available.

### 2. Update context-packet response-shape documentation

Updated `tools/world-mcp/README.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, and `docs/MACHINE-FACING-LAYER.md` to document `parent_page_id` and `story_bundle_context.selection_shortlist`.

### 3. Expose parent-page input through `get_context_packet`

Added optional `parent_page_id` to `getContextPacket`, MCP input schema metadata, and assembly. Existing `PG-*` seed-node inputs continue to be warned/dropped from local authority, but now also identify the parent page for shortlist embedding.

## Files to Touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Phase 2.1 wiring for `branching-story-turn-cycle` — landed in archive/tickets/SPEC81INDSTOCAN-003.md.
- Phase 1 wiring for `commitment-block-authoring` — landed in archive/tickets/SPEC81INDSTOCAN-004.md.
- Lowering or removing the 50-cap visible-storylets summary — per SPEC-81 §7 explicitly out-of-scope (the 50-cap is preserved; the shortlist is additive).
- Performance benchmarking — landed in SPEC81INDSTOCAN-006 (capstone).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all existing tests pass; new tests for shortlist embedding (added in the implementation file) pass.
2. `grep -n MAX_VISIBLE_STORYLETS tools/world-mcp/src/context-packet/story-bundle-context.ts` still returns the constant with value 50 (preserved per SPEC §5.3).
3. For a story-pipeline task type with `parent_page_id` supplied, the assembled context packet contains BOTH the existing 50-cap visible_storylets summary AND the new shortlist (up to 24 entries with projection records).

### Invariants

1. The 50-cap visible-storylets summary is preserved verbatim for every story-pipeline task type — the new shortlist is additive.
2. When `parent_page_id` is not supplied (bootstrap, non-page task types), the shortlist is not embedded (no behavior change for those task types).
3. The shortlist's projection-records contain no full SLT bodies — they are projection-only, consistent with the MCP tool's §4.5 invariant.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — covers absent parent page (`selection_shortlist: null`) and parent-page-present shortlist embedding with projection-only records.
2. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — covers PG seed-node derivation to `selection_shortlist` while preserving `story_local_seed_nodes_ignored`.
3. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` — fixture projection/edge seed data for the shortlist tests.

### Commands

1. `cd tools/world-mcp && npm test` — runs context-packet tests including the new shortlist-embedding cases.
2. `cd tools/world-mcp && npm run build` — confirms TypeScript compiles cleanly with the new field in the response shape.

## Outcome

Completed 2026-05-24.

- `story_bundle_context.selection_shortlist` now embeds the projection-only SPEC-81 shortlist when a non-bootstrap story-pipeline context packet has a parent page.
- `get_context_packet` accepts optional `parent_page_id`; `PG-*` seed nodes are still filtered from world-scope local authority but can identify the parent page for shortlist assembly.
- The 50-cap visible storylet summary remains unchanged and coexists with the shortlist.
- Context-packet docs and package README now document the new field and retrieval pattern.

## Verification Result

- PASS — `cd tools/world-mcp && npm test` passed before edits as a baseline: 437 pass, 0 fail.
- PASS — `cd tools/world-mcp && npm run build` passed after implementation.
- PASS — `cd tools/world-mcp && node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/tools/get-context-packet.story-pipeline.test.js` passed: 18 pass, 0 fail.
- PASS — `cd tools/world-mcp && npm test` passed after implementation: 438 pass, 0 fail.
- PASS — manual review confirmed `MAX_VISIBLE_STORYLETS` remains `50`, `selection_shortlist` records contain no `body` / `full_body`, and docs cite the projection-only `get_records(requires_full_body_ids)` follow-up path.

## Deviations

- The ticket's drafted file list was too narrow. The live `get_context_packet` surface had no `parent_page_id` input, so the same-seam implementation added optional input/schema metadata, wrapper derivation from `PG-*` seed nodes, docs, and fixture/test coverage.
- The default turn-driver derivation is intentionally minimal for this ticket: absent a caller-supplied driver, the context-packet shortlist uses `player_action`, matching SPEC-81's `derived_or_player_default` note for the common LLM-facing decision surface.
