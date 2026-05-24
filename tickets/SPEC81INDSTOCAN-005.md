# SPEC81INDSTOCAN-005: Context packet story_bundle_context shortlist embedding

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/world-mcp/src/context-packet/story-bundle-context.ts`. No impact on other context-packet layers.
**Deps**: SPEC81INDSTOCAN-002

## Problem

Per SPEC-81 §5.3, the story-bundle context packet currently caps visible storylet enumeration at `MAX_VISIBLE_STORYLETS = 50` (`tools/world-mcp/src/context-packet/story-bundle-context.ts:48`). Above 50, full SLT bodies disappear from the packet and only the aggregate distribution remains. Turn-cycle Phase 2's SLT-selection inputs become truncated; turn-cycle still works (it filters against the parent PG snapshot directly via the new MCP tool) but the LLM-facing context loses visibility of the candidates that pre-filter would have surfaced.

Wire the context-packet to additionally embed the output of `select_storylet_candidates(turn_driver: derived_or_player_default)` with `max_candidates: 12-24` when the packet is assembled for a story-pipeline task type with a `parent_page_id` available. The visible-storylets summary (50-cap) is preserved for human-readable summary; the shortlist (12-24-cap) is the LLM-facing candidate surface, labeled as "candidates already filtered by driver-kind + active-class compatibility."

## Assumption Reassessment (2026-05-24)

1. `tools/world-mcp/src/context-packet/story-bundle-context.ts` defines `MAX_VISIBLE_STORYLETS = 50` (line 48), `visibleRecords` selection (line 236), and the aggregate-distribution overflow path (line 252 area). The file is consumed by `tools/world-mcp/src/context-packet/assemble.ts` and is exposed to story-pipeline task types through `get_context_packet`.
2. SPEC-81 §5.3: preserve the 50-cap visible-storylets summary (human-readable); when packet assembled for a story-pipeline task type with `parent_page_id` available, additionally embed `select_storylet_candidates(...)` output with `max_candidates: 12-24` as the LLM-facing shortlist; both surfaces coexist with the shortlist labeled "candidates already filtered by driver-kind + active-class compatibility."
3. Cross-skill boundary under audit: context-packet assembler (`tools/world-mcp/src/context-packet/`) ↔ MCP tool (`select_storylet_candidates` per 002). The context-packet calls into the same tool that consumer skills call into; both surfaces stay consistent.
4. FOUNDATIONS §Tooling Recommendation: the context packet is the canonical "LLM agents should always receive..." delivery mechanism; embedding the shortlist makes the candidate pool legible at large pool sizes when the 50-cap would otherwise truncate it.

## Architecture Check

1. The context-packet calls `select_storylet_candidates` directly rather than re-implementing the pre-filter pipeline. This is cleaner because: (a) the pipeline lives in one canonical place (the MCP tool, owned by 002); (b) the context-packet's shortlist matches what a turn-cycle invocation would see (a single source of truth for "candidates at this page"); (c) the human-readable 50-cap summary remains for at-a-glance review, while the shortlist is the LLM-facing decision surface. Alternative: scale the 50-cap up to a larger value — rejected because (i) it does not address the underlying pre-filter quality issue (every candidate is still uniformly weighted in the summary); (ii) larger caps inflate context-packet token cost without proportional decision-relevance.
2. No backwards-compatibility aliasing/shims introduced. The 50-cap visible-storylets summary is preserved; the shortlist is additive. Existing consumers reading `story_bundle_context.visible_storylets` continue to work.

## Verification Layers

1. Context-packet response shape includes the shortlist when `parent_page_id` available → schema validation (assert response shape has `shortlist_candidates` field or equivalent named per the implementation choice).
2. The 50-cap visible-storylets summary remains for all story-pipeline task types → codebase grep-proof (`grep -n MAX_VISIBLE_STORYLETS tools/world-mcp/src/context-packet/story-bundle-context.ts` still returns the constant; line 48's value unchanged at 50).
3. The shortlist is labeled to distinguish it from the summary → manual review confirms the embedded shortlist carries a label like "candidates already filtered by driver-kind + active-class compatibility" or equivalent prose that names its filtered-pre-shortlist nature.
4. FOUNDATIONS §Tooling Recommendation cited in the response-shape documentation.

## What to Change

### 1. Update `tools/world-mcp/src/context-packet/story-bundle-context.ts`

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`:

- Preserve `MAX_VISIBLE_STORYLETS = 50` (line 48) and the existing visible-storylets selection (line 236) and overflow-aggregate-distribution path (line 252).
- When the context-packet is assembled for a story-pipeline task type AND a `parent_page_id` is supplied (from the caller's task-header or via packet seed nodes), additionally invoke `select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver: derived_or_player_default, max_candidates: 24)` and embed the resulting shortlist (`shortlisted_projection_records[]` + `filter_trace`) into the packet response shape under a new field (e.g., `selection_shortlist`).
- Label the shortlist with prose like: "candidates already filtered by driver-kind + active-class compatibility per SPEC-81; full SLT bodies for the shortlist are retrievable via `get_records(record_ids=requires_full_body_ids, story_slug=...)`."
- When `parent_page_id` is not supplied (e.g., for bootstrap or task types that do not have a current page), skip the shortlist embedding; the visible-storylets summary remains as before.
- `turn_driver` derivation: when the caller does not supply a driver, default to `player_action` per the SPEC-81 §5.3 "derived_or_player_default" prose — this represents the most common LLM-facing decision surface.

### 2. Update context-packet response-shape documentation

If `tools/world-mcp/README.md` or `docs/CONTEXT-PACKET-CONTRACT.md` enumerates the `story_bundle_context` layer's fields, add the new `selection_shortlist` field (or whatever the implementation names it) to the documented response shape. Verify which docs surface enumerates the layer before editing.

## Files to Touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)

## Out of Scope

- Phase 2.1 wiring for `branching-story-turn-cycle` — landed in SPEC81INDSTOCAN-003.
- Phase 1 wiring for `commitment-block-authoring` — landed in SPEC81INDSTOCAN-004.
- Lowering or removing the 50-cap visible-storylets summary — per SPEC-81 §7 explicitly out-of-scope (the 50-cap is preserved; the shortlist is additive).
- Performance benchmarking — landed in SPEC81INDSTOCAN-006 (capstone).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all existing tests pass; new tests for shortlist embedding (added in the implementation file) pass.
2. `grep -n MAX_VISIBLE_STORYLETS tools/world-mcp/src/context-packet/story-bundle-context.ts` still returns the constant with value 50 (preserved per SPEC §5.3).
3. For a story-pipeline task type with `parent_page_id` supplied, the assembled context packet contains BOTH the existing 50-cap visible_storylets summary AND the new shortlist (12-24 entries with projection records).

### Invariants

1. The 50-cap visible-storylets summary is preserved verbatim for every story-pipeline task type — the new shortlist is additive.
2. When `parent_page_id` is not supplied (bootstrap, non-page task types), the shortlist is not embedded (no behavior change for those task types).
3. The shortlist's projection-records contain no full SLT bodies — they are projection-only, consistent with the MCP tool's §4.5 invariant.

## Test Plan

### New/Modified Tests

1. New or extended tests in `tools/world-mcp/tests/context-packet/` covering shortlist embedding (parent_page_id present → both surfaces; parent_page_id absent → only visible_storylets summary). Specific test path follows existing context-packet test naming conventions.

### Commands

1. `cd tools/world-mcp && npm test` — runs context-packet tests including the new shortlist-embedding cases.
2. `cd tools/world-mcp && npm run build` — confirms TypeScript compiles cleanly with the new field in the response shape.
