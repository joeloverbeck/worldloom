# SPEC93DECSTATUR-007: turn-cycle — remove page-plan authoring; compute the delta from parent PG records

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-turn-cycle/SKILL.md` + focused references under `.claude/skills/branching-story-turn-cycle/references/`
**Deps**: archive/tickets/SPEC93DECSTATUR-004.md

## Problem

This is the primary-motive fix of SPEC-93. `branching-story-turn-cycle` currently authors a 19-section page plan (Phase 7) and, in practice, computes the next state delta by reading the prior page's prose **plan** rather than the authoritative story records — "operating on prose" where FOUNDATIONS §Tooling Recommendation requires operating on records. SPEC-93 §2.1 removes the page-plan authoring phase so the state turn outputs `SE` + `PG` snapshot + `CHC` + validation trace only, removes the page-plan HARD-GATE precondition and the `page_plan_drafts` argument from the skill's `validate_patch_plan` / `submit_patch_plan` calls, and adds an explicit step that retrieves the parent `PG`'s story records (`get_record` / `get_records` / `get_context_packet` with `story_slug`) to compute the delta.

## Assumption Reassessment (2026-05-28)

1. `branching-story-turn-cycle/SKILL.md` has a Phase 7 "Author page plan" step, a Phase 10 HARD-GATE precondition requiring the page plan be drafted (19 sections / STCHAR packets) before submission, and four `page_plan_drafts=[...]` calls to `validate_patch_plan` / `submit_patch_plan`; `references/phase-7-page-plan.md` is the page-plan authoring reference; `references/phase-9-validation-gates.md` references `page_plan_drafts` — confirmed during SPEC-93 reassessment (this session).
2. SPEC-93 §2.1 + §6 skills bullet: remove the page-plan authoring phase, the HARD-GATE precondition, and the `page_plan_drafts` argument; add explicit parent-`PG`-record retrieval for the delta; §8 AC1 + AC2 are the acceptance surface.
3. Cross-artifact boundary: the skill is a consumer of the `page_plan_drafts` argument removed at the tool surface in archive/tickets/SPEC93DECSTATUR-004.md (Deps) and of the MCP retrieval surface (`get_record`/`get_records`/`get_context_packet`); the nine hard gates it populates are defined in `story-state-contract.md §7` (SPEC93DECSTATUR-010).
4. FOUNDATIONS §Tooling Recommendation (LLM agents should never operate on prose alone): removing the page plan from the state turn forces the delta to be computed from the prior `PG`'s story records via MCP retrieval — the correctness improvement the spec names as its primary motive. Gate 7 (state-delta grounding) now grounds on the `PG` record.
5. Reassessment correction: the live stale prose was not confined to the five originally named files. `pre-flight-and-prerequisites.md`, `phase-1-action-resolution.md`, `phase-8-choice-generation.md`, and `mid-story-record-introduction.md` also carried same-skill page-plan-era guidance that would have contradicted the new state-only flow, so this ticket absorbs those same-seam reference edits.

## Architecture Check

1. Removing the page-plan phase (vs. lightening it) is the only change that severs the prose-contamination path — a lighter plan still invites delta-from-prose reasoning. The skill becomes state-only, with prose deferred to the scene layer (SPEC-92).
2. No backwards-compatibility shim: the Phase 7 authoring step, the HARD-GATE precondition, and the `page_plan_drafts` call arguments are removed from the skill prose; no "optional page plan" fallback is retained.

## Verification Layers

1. No page-plan authoring -> skill-contract grep-proof (`SKILL.md` produces no `pages-prose-plans/PG-<n>.md`; no Phase 7 page-plan-authoring step).
2. No `page_plan_drafts` calls -> skill-contract grep-proof (`page_plan_drafts` absent from `SKILL.md` + `references/phase-9-validation-gates.md`).
3. Delta computed from records -> skill-contract grep-proof (the flow contains `get_record`/`get_records`/`get_context_packet` with `story_slug` and no instruction to read a prior prose plan for delta reasoning).
4. State-turn output shape -> manual review (the turn outputs `SE` + `PG` + `CHC` + validation trace only).

## What to Change

### 1. Remove the page-plan authoring phase

In `branching-story-turn-cycle/SKILL.md` and `references/phase-7-page-plan.md`: remove the Phase 7 page-plan authoring step and the reference's page-plan-authoring content. The state turn ends after `SE` + `PG` snapshot + `CHC` + validation trace.

### 2. Add explicit parent-record retrieval

In the skill's delta-computation phase (and `references/phase-6-page-snapshot.md`): add the explicit step that retrieves the parent `PG`'s story records via `get_record` / `get_records` / `get_context_packet` (with `story_slug`) to compute the delta; remove any instruction to read a prior prose plan for delta reasoning.

### 3. Remove HARD-GATE precondition + page_plan_drafts calls

Remove the Phase 10 page-plan HARD-GATE precondition and the `page_plan_drafts=[...]` arguments from the `validate_patch_plan` / `submit_patch_plan` calls in `SKILL.md` and `references/phase-9-validation-gates.md`. Update `references/governance-and-foundations.md` for the rehomed gate-7 grounding (PG record) per `story-state-contract.md §7`.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-1-action-resolution.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` (modify)

## Out of Scope

- The tool-side `page_plan_drafts` argument removal (archive/tickets/SPEC93DECSTATUR-004.md).
- The gate-7/9 validator-code rehoming (archive/tickets/SPEC93DECSTATUR-002.md) and gate definitions in `story-state-contract.md` (SPEC93DECSTATUR-010).
- bootstrap's root page-plan removal (SPEC93DECSTATUR-008).
- The scene-plan / scene-prose-attach flow (SPEC-92, already landed).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "pages-prose-plans\|page_plan_drafts\|Author page plan" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no live authoring/argument references.
2. `grep -n "get_record\|get_records\|get_context_packet" .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the parent-record-retrieval step is present.
3. No instruction in `SKILL.md` to read a prior prose plan for delta reasoning (manual review).

### Invariants

1. The state turn outputs `SE` + `PG` snapshot + `CHC` + validation trace only — no page-plan render artifact.
2. The delta is computed from the parent `PG`'s story records, not from a prose plan.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is command-based (grep-proofs above) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "pages-prose-plans\|page_plan_drafts\|prior prose plan" .claude/skills/branching-story-turn-cycle/` — expect no live authoring/delta-from-prose references.
2. End-to-end planless bootstrap→turn-cycle→scene flow exercised in SPEC93DECSTATUR-013.

## Outcome

Completed: 2026-05-28

Turn-cycle is now documented as a state-only causal turn. The skill no longer produces a page plan, no longer blocks on a page-plan draft before HARD-GATE approval, and no longer passes `page_plan_drafts` to validate/submit. Phase 7 now emits choices, Phase 8 validates record-based gates, and Phase 9 submits the patch plan plus INDEX update after approval.

The flow now explicitly retrieves the parent `PG` and material parent-active story records through `get_record` / `get_records` / `get_context_packet(..., story_slug=...)` before drafting the state delta or emitted choices. Gate 7 is documented as state-delta grounding over `PG.state_snapshot`, `SE.state_delta`, selected `SLT`, emitted `CHC`, active records, and loaded canon; Gate 9 is record-based turn-driver lawfulness.

Same-skill supporting references were updated where leaving page-plan-era prose would have made the turn-cycle contract contradictory.

## Verification Result

PASS — `rg -n "pages-prose-plans|page_plan_drafts|prior prose plan|Author page plan" .claude/skills/branching-story-turn-cycle` returned no matches, proving the removed authoring/argument/delta-from-prose anchors are absent from the turn-cycle skill directory.

PASS — `rg -n "get_record|get_records|get_context_packet" .claude/skills/branching-story-turn-cycle/SKILL.md` returned the HARD-GATE and procedure retrieval requirements, including `get_context_packet(..., story_slug=...)`.

PASS — pre-archive `git diff --check -- .claude/skills/branching-story-turn-cycle tickets/SPEC93DECSTATUR-007.md` completed with no whitespace errors; post-archive hygiene uses `archive/tickets/SPEC93DECSTATUR-007.md`.

## Deviations

- The active shared contract templates still carry page-plan-era global wording; that is dependency-ordered into SPEC93DECSTATUR-010 and outside this ticket's turn-cycle-local owner boundary.
- The end-to-end planless bootstrap→turn-cycle→scene regression remains assigned to SPEC93DECSTATUR-013.
