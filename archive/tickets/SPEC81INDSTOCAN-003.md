# SPEC81INDSTOCAN-003: branching-story-turn-cycle Phase 2.1 wiring

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-turn-cycle/SKILL.md` and `references/phase-2-3-commitment-and-state-delta.md`; truths the SPEC-81 implementation note and capstone handoff text. No impact on the skill's other phases.
**Deps**: archive/tickets/SPEC81INDSTOCAN-002.md

## Problem

At intake, per SPEC-81 §5.1, `branching-story-turn-cycle` Phase 2 filtered the SLT pool against the parent PG snapshot in-process using the 10-step pipeline at `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (the eligibility-filter opening), plus the SPEC-77 driver-kind filter in Phase 2.1. At scale (50-100+ SLTs), the LLM-facing SLT-selection surface lost visibility because the in-process filter read full bodies, and the story-bundle context-packet's `MAX_VISIBLE_STORYLETS = 50` cap truncated the LLM's view of the pool.

Wire Phase 2 to call `mcp__worldloom__select_storylet_candidates` (post-002) to obtain a shortlist + filter trace before the in-process predicate evaluator runs. The shortlist's full bodies and the filter trace's per-stage counts become the LLM-facing SLT-selection surface; the existing in-process predicate-evaluation pipeline runs only on the shortlist.

## Assumption Reassessment (2026-05-24)

1. `.claude/skills/branching-story-turn-cycle/SKILL.md` defines Phase 2 (line 70: "Select or JIT-create commitment block → SLT"). `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` carries the canonical Phase 2 eligibility-filter pipeline (10 steps) plus Phase 2.1 driver-kind filter (line 32 area).
2. SPEC-81 §5.1: Phase 2 calls `select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature)` to obtain the shortlist + filter trace; the existing in-process predicate-evaluation pipeline runs only on the shortlist; the SLT-selection LLM call sees shortlist full bodies + filter trace, never the full pool.
3. Cross-skill boundary under audit: skill prose (Phase 2 procedural steps) ↔ MCP tool (`select_storylet_candidates` per 002). The skill's procedural step changes from "filter all SLTs in-process" to "call MCP tool for shortlist, then filter shortlist in-process". The MCP tool's input contract (003 reads `world_slug` / `story_slug` / `parent_page_id` / `turn_driver` / `intent_signature` from the in-flight turn-cycle state) becomes the new shared interface.
4. FOUNDATIONS §Story Bundles §5c ("Driver salience is local"; §4.4 step 10's salience+diversity ranking is local-salience-narrowing, not global drama management) + §Story Bundles §6b (Information / Observer Firewall — full predicate evaluation including the firewall remains in the in-process evaluator running on the shortlist; the firewall is NOT delegated to the MCP tool).
5. `docs/HARD-GATE-DISCIPLINE.md` was read because `branching-story-turn-cycle` is a gated story-bundle workflow. This ticket does not edit the `<HARD-GATE>` block, approval timing, submit flow, validator semantics, or PASS/FAIL criteria; it only changes the read-side Phase 2 retrieval path before the existing local evaluator.
6. The drafted separate SPEC-81 §10 follow-up for the phase-2-3 `branch_id` lineage wording became same-seam fallout because the stale wording lived inside the Phase 2 eligibility section this ticket rewrote. The updated reference delegates branch visibility to `select_storylet_candidates`, whose projection filter uses schema-grounded `visible_branch_path_prefix` semantics. `specs/SPEC-81-indexed-storylet-candidate-retrieval.md` and `tickets/SPEC81INDSTOCAN-006.md` were truthed so they no longer point at a separate reconciliation ticket.

## Architecture Check

1. The skill calls the canonical MCP retrieval surface (`select_storylet_candidates`) rather than re-implementing the symbolic pre-filter pipeline in-process. This is cleaner because: (a) the pipeline lives in one canonical place (the MCP tool); (b) the skill's procedural prose shrinks from a 10-step filter pipeline to a tool call + a shortlist-scoped evaluator; (c) consumers' full-body read count is structurally bounded by `max_candidates`. Alternative: keep the in-process filter and pass it the projection columns directly — rejected because it duplicates the pipeline across consumer skills (turn-cycle + commitment-block-authoring + future consumers).
2. No backwards-compatibility aliasing/shims introduced. The skill's procedural prose is updated to describe the new wiring; the prior in-process pipeline prose is removed (per the spec's design intent) rather than aliased.

## Verification Layers

1. Phase 2 prose names the MCP tool call → codebase grep-proof (`grep -n select_storylet_candidates .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns ≥2 hits).
2. In-process predicate-evaluation pipeline still runs on the shortlist (not removed) → manual review of `phase-2-3-commitment-and-state-delta.md` confirms the existing per-precondition evaluator prose remains, scoped to the shortlist.
3. Cross-skill boundary preserved: the skill consumes the MCP tool's typed output and does NOT reach into world-index internals → manual review of the updated prose confirms only MCP-typed retrieval is named.
4. FOUNDATIONS §Story Bundles §5c + §6b explicitly cited in the updated prose where the firewall preservation is relevant.

## Landed Changes

### 1. Updated `branching-story-turn-cycle/SKILL.md` Phase 2 description

`.claude/skills/branching-story-turn-cycle/SKILL.md` now names `mcp__worldloom__select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature)` as the Phase 2 pre-filter entry point. Phase 2's high-level role remains "Select or JIT-create commitment block → SLT"; the procedural mechanism is now "call `select_storylet_candidates` for the shortlist, then run in-process predicate evaluation on the shortlist."

### 2. Rewrote `references/phase-2-3-commitment-and-state-delta.md` Phase 2 eligibility-filter section

`.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` now:

- Opens Phase 2 with the MCP shortlist call, projection-filtered shortlist, `filter_trace`, and deliberate `get_records(record_ids=requires_full_body_ids, story_slug=...)` full-body retrieval.
- Preserves in-process predicate evaluation, alias binding, Information / Observer Firewall enforcement, Mystery Reserve firewall enforcement, cooldown re-check, ranking, and selection, but scopes those checks to the returned shortlist.
- Reconciles Phase 2.1 by stating that driver-kind filtering runs server-side in the MCP projection query and that the shortlist is already driver-kind-narrowed.

### 3. Updated Phase 2's `intent_signature` derivation prose

The reference now explains how the skill derives the `intent_signature` input to `select_storylet_candidates`:

- For `driver.kind = player_action | player_write_in`: derive `intent_signature.action_families` from the chosen `CHC.target_or_action_families`, `intent_signature.grounding_record_classes` from the predicate referenced classes implied by `CHC.grounded_in.records`, and `intent_signature.grounding_record_ids` from `CHC.grounded_in.records` directly.
- For non-player drivers: `intent_signature` may be omitted; the driver's own `driver_records` provide the source-class hints to the filter pipeline.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `specs/SPEC-81-indexed-storylet-candidate-retrieval.md` (modify — implementation note truthing)
- `tickets/SPEC81INDSTOCAN-006.md` (modify — capstone handoff truthing)

## Out of Scope

- Phase 1 of `commitment-block-authoring` — owned by active follow-up SPEC81INDSTOCAN-004.
- Context-packet shortlist embedding — owned by active follow-up SPEC81INDSTOCAN-005.
- End-to-end turn-cycle test against 1000-SLT pool (§9.4) — owned by active capstone SPEC81INDSTOCAN-006.

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
2. Manual review of `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — confirms the local evaluator, Observer Firewall, Mystery Reserve firewall, and cooldown re-check run on the shortlist.
3. `rg -n 'scope\.branch_id.*lineage|phase-2-3 doc reconciliation.*follow-up|separate spec/ticket|scan the entire SLT pool' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md specs/SPEC-81-indexed-storylet-candidate-retrieval.md archive/tickets/SPEC81INDSTOCAN-003.md tickets/SPEC81INDSTOCAN-006.md` — confirms the stale branch-lineage follow-up and full-pool-scan anchors are absent from current operational surfaces; remaining "full pool" mentions are historical/spec context or acceptance wording.

## Outcome

Completed 2026-05-24. Phase 2 of `branching-story-turn-cycle` now uses `mcp__worldloom__select_storylet_candidates` as the projection pre-filter before shortlist-scoped local predicate evaluation and SLT selection. The Phase 2 reference now derives `intent_signature`, fetches full bodies only for `requires_full_body_ids`, preserves local alias binding, Observer Firewall, Mystery Reserve firewall, cooldown, and ranking checks on the shortlist, and records Phase 2.1 driver-kind filtering as server-side projection filtering.

The same rewrite removed the old `branch_prefix_scoped` `scope.branch_id` lineage wording from the operational Phase 2 reference. `specs/SPEC-81-indexed-storylet-candidate-retrieval.md` and the capstone ticket were updated so they no longer point at a separate phase-2-3 reconciliation follow-up.

## Verification Result

PASS — `grep -n select_storylet_candidates .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returned four hits across both owned skill files.

PASS — manual review of `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` confirmed the local predicate evaluator, alias binding, Information / Observer Firewall, Mystery Reserve firewall, cooldown re-check, ranking, and selection run on the MCP-returned shortlist rather than the full author pool.

PASS — manual FOUNDATIONS alignment check confirmed §Story Bundles §5c and §6b are cited in the updated Phase 2.1 prose, and full firewall enforcement remains local on shortlisted full bodies.

PASS — stale-anchor sweep for `scope.branch_id` lineage and separate phase-2-3 follow-up wording found no stale operational hit; remaining "full pool" mentions are historical/spec context or this ticket's accepted proof wording, not live skill instructions.

PASS — `git diff --check -- .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md specs/SPEC-81-indexed-storylet-candidate-retrieval.md archive/tickets/SPEC81INDSTOCAN-003.md tickets/SPEC81INDSTOCAN-006.md`

## Deviations

The drafted separate SPEC-81 §10 phase-2-3 doc reconciliation follow-up was absorbed into this ticket because the stale branch-lineage wording lived inside the Phase 2 section this ticket rewrote. No executable turn-cycle dry-run was run here; the end-to-end 1000-SLT turn-cycle proof remains owned by active capstone ticket SPEC81INDSTOCAN-006.
