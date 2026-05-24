# SPEC81INDSTOCAN-004: commitment-block-authoring Phase 1 wiring

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/commitment-block-authoring/SKILL.md`. No impact on the skill's other phases.
**Deps**: archive/tickets/SPEC81INDSTOCAN-002.md

## Problem

Per SPEC-81 §5.2, `commitment-block-authoring` Phase 1 currently calls `mcp__worldloom__list_records(record_type='storylet_record', world_slug, story_slug, include_full_body=true)` to compute gap diagnostics over the full SLT pool. At ~25 SLTs the scan is sub-second; at 100-200+ SLTs the per-row YAML parse cost begins to dominate, and gap-diagnostic coverage operates on full bodies when only projection-shape data (move_family, compatible_turn_drivers, predicate classes) is actually consulted.

Wire Phase 1 to call `mcp__worldloom__select_storylet_candidates` (post-002) with `max_candidates: pool_size` (effectively all) and `include_rejection_summary: true` to obtain projection records for the whole pool plus the filter trace. Gap diagnostics operate on projection records — no full bodies needed for the coverage check. Full bodies are read only for blocks the skill plans to mutate (`replace` / `extend` ops).

## Assumption Reassessment (2026-05-24)

1. `.claude/skills/commitment-block-authoring/SKILL.md` Phase 1 (lines 36 + 112 + 128 area) currently invokes `mcp__worldloom__list_records(record_type='storylet_record', world_slug, story_slug, include_full_body=true)` for both `direct_batch` and `audit_repair` modes. The full-body load is consumed by gap-diagnostic weighting (move_family, causal-function, driver-kind × pressure-source per SPEC-80) and by per-block mutation planning (the `replace` / `extend` paths).
2. SPEC-81 §5.2: Phase 1 calls `select_storylet_candidates` with `max_candidates: pool_size` (effectively the whole pool, no shortlist truncation for coverage diagnostics) and `include_rejection_summary: true` to obtain projection records for the whole pool plus the filter trace. Gap diagnostics operate on projection records; full bodies are read only for blocks the skill plans to mutate.
3. Cross-skill boundary under audit: skill prose (Phase 1 procedural steps) ↔ MCP tool (`select_storylet_candidates` per 002). The skill's Phase 1 data-loading mechanism changes from full-body bulk fetch to projection-record bulk fetch + targeted full-body fetch.
4. FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves — gap diagnostics measure coverage of move-family + causal-function axes, never narrative shape; the projection-record path preserves this because projection columns are derived from the same schema fields the in-process gap diagnostic reads).

## Architecture Check

1. The skill calls the canonical MCP retrieval surface (`select_storylet_candidates`) with `max_candidates: pool_size` for coverage diagnostics, falling back to targeted full-body retrieval only for the small subset of blocks it plans to mutate. This is cleaner because: (a) gap-diagnostic computation operates on the same projection shape it actually consults (no over-fetch); (b) the skill's full-body read count drops from `pool_size` to the number of blocks being mutated (typically 0-5 per invocation); (c) the data-loading mechanism is unified with `branching-story-turn-cycle` (which uses the same MCP tool with a smaller `max_candidates`). Alternative: add a projection-only flag to `list_records(record_type='storylet_record')` — rejected because it duplicates the projection-vs-full-body distinction across two MCP tools, and the new tool's `requires_full_body_ids[]` contract is the cleaner convention for the "fetch full bodies for a known subset" pattern.
2. No backwards-compatibility aliasing/shims introduced. The skill's Phase 1 prose updates to describe the new retrieval mechanism; the prior `list_records(include_full_body=true)` references are removed.

## Verification Layers

1. Phase 1 prose names the MCP tool call → codebase grep-proof (`grep -n select_storylet_candidates .claude/skills/commitment-block-authoring/SKILL.md` returns ≥1 hit; `grep -n "list_records(record_type='storylet_record', .*include_full_body=true)" .claude/skills/commitment-block-authoring/SKILL.md` returns 0 hits in active Phase 1 prose, or only retains it under a "fallback" framing per spec §5.2's backward-compat allowance).
2. Cross-skill boundary preserved: the skill consumes the MCP tool's typed output and does NOT reach into world-index internals.
3. Gap-diagnostic coverage operates on projection records → manual review confirms the diagnostic prose names projection fields (move_family, compatible_turn_drivers, predicate_classes, action_families) rather than full-body field paths.
4. FOUNDATIONS §Story Bundles §5a cited where commitment-block causal-move framing is reinforced.

## What to Change

### 1. Update Phase 1 retrieval mechanism in `commitment-block-authoring/SKILL.md`

In `.claude/skills/commitment-block-authoring/SKILL.md`, update Phase 1's data-loading prose:

- The `direct_batch` and `audit_repair` mode descriptions replace the `mcp__worldloom__list_records(record_type='storylet_record', world_slug, story_slug, include_full_body=true)` call with `mcp__worldloom__select_storylet_candidates(world_slug, story_slug, parent_page_id=<latest committed PG>, turn_driver=<derived_or_player_default>, max_candidates=<pool_size>, include_rejection_summary=true)`.
- The shortlist (projection records) is the input to gap-diagnostic weighting; full bodies are retrieved via `get_records(record_ids=<subset>, story_slug=<story_slug>)` only for blocks the skill plans to mutate.
- Preserve the `<persisted-output>` harness-cap recovery prose (lines around 128); it still applies to the projection-record response if the response exceeds the harness's inline limit.

### 2. Update gap-diagnostic prose to reference projection-record fields

In the gap-diagnostic discussion (Phase 1 sub-steps), update field references to name projection columns/edges (`move_family`, `compatible_turn_drivers`, `predicate_classes`, `action_families`) rather than full-body paths (`record.move_family`, `record.grounding.compatible_turn_drivers[]`, etc.). The semantic content is the same; the source-of-truth prose updates to match the actual retrieval mechanism.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Phase 2.1 wiring for `branching-story-turn-cycle` — landed in SPEC81INDSTOCAN-003.
- Context-packet shortlist embedding — landed in SPEC81INDSTOCAN-005.
- Coverage-diagnostic algorithm changes (SPEC-80 territory) — the algorithm reads the same data, just via a different retrieval mechanism.
- End-to-end commitment-block-authoring test against 1000-SLT pool (§9.5) — landed in SPEC81INDSTOCAN-006.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n select_storylet_candidates .claude/skills/commitment-block-authoring/SKILL.md` returns ≥1 hit in active Phase 1 prose.
2. Manual review: Phase 1 prose names `select_storylet_candidates(max_candidates=pool_size, include_rejection_summary=true)` as the canonical retrieval call.
3. Manual review: gap-diagnostic field references name projection-column / edge surfaces (move_family, compatible_turn_drivers, predicate_classes, action_families) consistently.

### Invariants

1. Phase 1 retrieves full SLT bodies only for the subset of blocks it plans to mutate; the gap-diagnostic computation operates on projection records.
2. The skill's Phase 1 produces no canon writes during retrieval (the new MCP call is purely a read; commitment-block-authoring's writes happen in later phases via the patch engine).

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n select_storylet_candidates .claude/skills/commitment-block-authoring/SKILL.md` — confirms the new tool call is named.
2. End-to-end commitment-block-authoring invocation against a fixture story bundle with ≥30 SLTs (manual dry-run runbook in the capstone ticket SPEC81INDSTOCAN-006).
