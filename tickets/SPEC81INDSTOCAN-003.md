# SPEC81INDSTOCAN-003: branching-story-turn-cycle Phase 2.1 wiring

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-turn-cycle/SKILL.md` and `references/phase-2-3-commitment-and-state-delta.md`. No impact on the skill's other phases.
**Deps**: archive/tickets/SPEC81INDSTOCAN-002.md

## Problem

Per SPEC-81 §5.1, `branching-story-turn-cycle` Phase 2 currently filters the SLT pool against the parent PG snapshot in-process using the 10-step pipeline at `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (lines 5-17, eligibility filter), plus the SPEC-77 driver-kind filter at line 32 (Phase 2.1). At scale (50-100+ SLTs), the LLM-facing SLT-selection surface loses visibility because the in-process filter reads full bodies, and the story-bundle context-packet's `MAX_VISIBLE_STORYLETS = 50` cap truncates the LLM's view of the pool.

Wire Phase 2 to call `mcp__worldloom__select_storylet_candidates` (post-002) to obtain a shortlist + filter trace before the in-process predicate evaluator runs. The shortlist's full bodies and the filter trace's per-stage counts become the LLM-facing SLT-selection surface; the existing in-process predicate-evaluation pipeline runs only on the shortlist.

## Assumption Reassessment (2026-05-24)

1. `.claude/skills/branching-story-turn-cycle/SKILL.md` defines Phase 2 (line 70: "Select or JIT-create commitment block → SLT"). `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` carries the canonical Phase 2 eligibility-filter pipeline (10 steps) plus Phase 2.1 driver-kind filter (line 32 area).
2. SPEC-81 §5.1: Phase 2 calls `select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature)` to obtain the shortlist + filter trace; the existing in-process predicate-evaluation pipeline runs only on the shortlist; the SLT-selection LLM call sees shortlist full bodies + filter trace, never the full pool.
3. Cross-skill boundary under audit: skill prose (Phase 2 procedural steps) ↔ MCP tool (`select_storylet_candidates` per 002). The skill's procedural step changes from "filter all SLTs in-process" to "call MCP tool for shortlist, then filter shortlist in-process". The MCP tool's input contract (003 reads `world_slug` / `story_slug` / `parent_page_id` / `turn_driver` / `intent_signature` from the in-flight turn-cycle state) becomes the new shared interface.
4. FOUNDATIONS §Story Bundles §5c ("Driver salience is local"; §4.4 step 10's salience+diversity ranking is local-salience-narrowing, not global drama management) + §Story Bundles §6b (Information / Observer Firewall — full predicate evaluation including the firewall remains in the in-process evaluator running on the shortlist; the firewall is NOT delegated to the MCP tool).

## Architecture Check

1. The skill calls the canonical MCP retrieval surface (`select_storylet_candidates`) rather than re-implementing the symbolic pre-filter pipeline in-process. This is cleaner because: (a) the pipeline lives in one canonical place (the MCP tool); (b) the skill's procedural prose shrinks from a 10-step filter pipeline to a tool call + a shortlist-scoped evaluator; (c) consumers' full-body read count is structurally bounded by `max_candidates`. Alternative: keep the in-process filter and pass it the projection columns directly — rejected because it duplicates the pipeline across consumer skills (turn-cycle + commitment-block-authoring + future consumers).
2. No backwards-compatibility aliasing/shims introduced. The skill's procedural prose is updated to describe the new wiring; the prior in-process pipeline prose is removed (per the spec's design intent) rather than aliased.

## Verification Layers

1. Phase 2 prose names the MCP tool call → codebase grep-proof (`grep -n select_storylet_candidates .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns ≥2 hits).
2. In-process predicate-evaluation pipeline still runs on the shortlist (not removed) → manual review of `phase-2-3-commitment-and-state-delta.md` confirms the existing per-precondition evaluator prose remains, scoped to the shortlist.
3. Cross-skill boundary preserved: the skill consumes the MCP tool's typed output and does NOT reach into world-index internals → manual review of the updated prose confirms only MCP-typed retrieval is named.
4. FOUNDATIONS §Story Bundles §5c + §6b explicitly cited in the updated prose where the firewall preservation is relevant.

## What to Change

### 1. Update `branching-story-turn-cycle/SKILL.md` Phase 2 description

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, Phase 2's prose (around line 70 and any references to the in-process filter pipeline) updates to name the MCP tool call as the new pre-filter entry point. Phase 2's high-level role does not change ("Select or JIT-create commitment block → SLT"); the procedural mechanism changes from "filter all SLTs in-process" to "call `select_storylet_candidates` for the shortlist, then run in-process predicate evaluation on the shortlist."

### 2. Rewrite `references/phase-2-3-commitment-and-state-delta.md` Phase 2 eligibility-filter section

In `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`, the existing eligibility-filter pipeline (lines 5-17 area) is rewritten:

- Open Phase 2 with: "Call `mcp__worldloom__select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature)` to obtain the shortlist (≤24 candidates by default) plus `filter_trace`. The shortlist's full bodies (retrieved via `get_records(record_ids=requires_full_body_ids, story_slug=...)`) become the LLM-facing SLT-selection input; the `filter_trace`'s per-stage counts inform the operator about pool-level pressure on each filter dimension."
- Preserve the existing in-process predicate-evaluation prose (alias-binding, comparator evaluation, Information/Observer Firewall enforcement, mystery firewall, cooldown enforcement) but scope it to the shortlist returned by the MCP call — explicitly remove the "scan the entire SLT pool" framing and replace with "scan the shortlist".
- Reconcile Phase 2.1 (driver-kind filter, line 32 area) — the driver-kind filter is now applied server-side as step 3 of the MCP tool's pipeline; the skill's Phase 2.1 prose is updated to note that the filter ran server-side and the shortlist is already driver-kind-narrowed.

### 3. Update Phase 2's `intent_signature` derivation prose

Add prose explaining how the skill derives the `intent_signature` input to `select_storylet_candidates`:

- For `driver.kind = player_action | player_write_in`: derive `intent_signature.action_families` from the chosen `CHC.target_or_action_families`, `intent_signature.grounding_record_classes` from the predicate referenced classes implied by `CHC.grounded_in.records`, and `intent_signature.grounding_record_ids` from `CHC.grounded_in.records` directly.
- For non-player drivers: `intent_signature` may be omitted; the driver's own `driver_records` provide the source-class hints to the filter pipeline.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)

## Out of Scope

- Reconciliation of the existing phase-2-3 doc's `branch_id` lineage phrasing for `branch_prefix_scoped` SLTs (the schema's actual field is `visible_branch_path_prefix`, a PG-array) — flagged in SPEC-81 §10 follow-up as out-of-scope; handled as cross-spec follow-up (routing pattern (c) direct edit) per the Step 6 summary.
- Phase 1 of `commitment-block-authoring` — landed in SPEC81INDSTOCAN-004.
- Context-packet shortlist embedding — landed in SPEC81INDSTOCAN-005.
- End-to-end turn-cycle test against 1000-SLT pool (§9.4) — landed in SPEC81INDSTOCAN-006.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n select_storylet_candidates .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns ≥2 hits.
2. Manual review: the updated `phase-2-3-commitment-and-state-delta.md` describes the in-process predicate evaluator as running on the shortlist, not on the full pool.
3. Manual review: FOUNDATIONS §Story Bundles §5c + §6b are explicitly cited where firewall preservation is named.

### Invariants

1. Full predicate evaluation (alias-binding, comparator evaluation, Observer Firewall, mystery firewall) remains in-process in the turn-cycle skill — the MCP tool runs only the symbolic pre-filter. Moving full evaluation server-side is explicitly out-of-scope per SPEC-81 §7.
2. The skill's Phase 2 produces no canon writes (it produces SE / PG / CHC records via the patch engine; the new MCP call is purely a read).

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n select_storylet_candidates .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — confirms the new tool call is named in both files.
2. End-to-end turn-cycle invocation against a fixture story bundle with ≥30 SLTs (manual dry-run runbook in the capstone ticket SPEC81INDSTOCAN-006).
