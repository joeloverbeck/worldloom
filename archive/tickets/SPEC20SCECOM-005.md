# SPEC20SCECOM-005: Phase 8 — Choice-Surface Gate

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` rewritten from v1 Amendment B Pipeline to 6-step Choice-Surface Gate (narrative-point classification, hybrid exit portfolio, choice-worthiness validation, strong-axis pair distance, LLM surface label, write-in slot); CONTINUE_ONLY_PAUSE handling added; auto-chaining in interactive_runtime added; Bootstrap PG-0001 special-case mode documented.
**Deps**: `archive/tickets/SPEC20SCECOM-004.md` (Phase 7.6 produces the ARC_TRACE that drives narrative-point classification); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22 §Track 2 implements `choice_worthiness_completeness` validator + extends `choice_pair_distance` for v2 strong-axis collective difference; §Track 3 implements `commitment_class` and `strong_axis` enums)

## Problem

At intake, Phase 8 emitted 4-6 structured choices every page via the v1 Amendment B Pipeline (affordance-space collection → salient shortlist → LLM proposer → engine validation → diversification). Empirical evidence from the test bundle: 30/30 CHCs with empty `likely_effects`, late-page collapse to postural variants. Under the scene-commitment-arc pivot, Phase 8 stops being an agency-generator and becomes a choice-surface validator — a menu emerges only at a commitment hinge (NATURAL_COMMITMENT_HINGE or INTERRUPT_HINGE), CONTINUE_ARC and CONTINUE_ONLY_PAUSE auto-chain in interactive_runtime, and TERMINAL_OR_CHAPTER_CLOSE emits no menu. SPEC-20 §F specifies the rewritten 6-step gate plus the Bootstrap PG-0001 special-case sub-paragraph that `branching-story-bootstrap` Phase 8 delegates against.

## Assumption Reassessment (2026-05-07)

1. At intake, verified `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` existed and housed the v1 Amendment B Pipeline; this ticket replaced that structure with the 6-step gate while preserving the Step 5 LLM label-rendering discipline and Step 6 write-in-slot discipline.
2. Verified archived SPEC-19 §B defines CHC v2 schema with `choice_worthiness` block (`strategic_question_answered`, `strong_axes[]`, `expected_state_delta`, `why_not_microbeat`, `foreseeable_difference`) plus mandatory non-empty `likely_effects`; `choice_kind` enum {`scene_commitment`, `tactical_beat`} also defined. Validator `choice_worthiness_completeness` HARD-REJECTs empty fields (SPEC-22 §Track 2).
3. Cross-skill boundary: this ticket consumes (a) the ARC_TRACE produced by SPEC20SCECOM-004 (for narrative-point classification when ambiguous); (b) the closed `commitment_class` and `strong_axis` enums from SPEC-22 §Track 3; (c) the realized arc's `exit_portfolio.native_seeds[]` and the storylet pool for hybrid exit portfolio composition. It produces CHC v2 records consumed by `branching-story-bootstrap` Phase 8 in PG-0001 special-case mode (per SPEC-22 §Track 4 sibling-skill alignment).
4. FOUNDATIONS Rule 1 (No Floating Facts) — renumbered from template item 4: Step 3 (Choice-Worthiness Validation) HARD-REJECTs CHCs with empty `likely_effects` or missing `choice_worthiness` fields. The 0/30 pathology from the test bundle is structurally impossible under v2.
5. Schema extension (renumbered from template item 6): this ticket references CHC v2 schema (already landed via SPEC19SCECOM-002 in `record-schemas.md`); does NOT extend the schema itself. Additive consumer-side discipline.
6. Verification-boundary correction: the drafted skill dry-run / fixture assertions are not executable yet because SPEC-22's v2 validators remain pending. This ticket's truthful proof is documentation-surface grep plus manual contract review against SPEC-20 §F, SPEC-22 Track 2/3/4, archived SPEC-19 §B/E, `docs/FOUNDATIONS.md` §Story Bundles, and `docs/HARD-GATE-DISCIPLINE.md`. `archive/tickets/SPEC20SCECOM-011.md` later rejected non-production capstone fixture proof.

## Architecture Check

1. Splitting "agency generation" from "choice-surface validation" structurally prevents the late-page collapse pathology — Phase 8 no longer manufactures choices to fill a slot; it validates that the menu (when emitted) collectively differs on ≥2 strong axes and that each surviving CHC carries non-empty `likely_effects` + populated `choice_worthiness`.
2. Auto-chaining CONTINUE_ARC and CONTINUE_ONLY_PAUSE in interactive_runtime mode preserves the user's reading flow (no intermediate Phase 10 pauses) while keeping authoring mode strictly hand-stepped (HARD-GATE always fires per arc-page). The split is mode-conditional, not behavior-conditional.
3. PG-0001 special-case mode (no parent arc, no ARC_TRACE) keeps the bootstrap-skill delegation clean — bootstrap supplies `state_snapshot` + Phase 7.5 affordance map + governor_nudge; this ticket's gate runs in special-case mode without re-implementing bootstrap-side logic. Avoids duplication between bootstrap Phase 8 and runtime Phase 8.
4. No backwards-compatibility aliasing/shims: v1 5-step Amendment B Pipeline is retired; the 6-step gate is the only path post-cutover.

## Verification Layers

1. 6-step gate structure (narrative-point classification → hybrid exit portfolio → choice-worthiness validation → strong-axis pair distance → LLM surface label → write-in slot) → codebase grep-proof in `phase-8-choice-generation.md` for each step anchor.
2. Choice-worthiness validation HARD-REJECT failures → schema validation via SPEC-22's `choice_worthiness_completeness` validator (cross-spec); this ticket documents the discipline. `archive/tickets/SPEC20SCECOM-011.md` later rejected a separate non-production capstone.
3. Strong-axis pair distance (≥2 distinct `strong_axes` across menu) → schema validation via SPEC-22's extension to existing `choice_pair_distance` validator.
4. CONTINUE_ONLY_PAUSE single-CHC carve-out → codebase grep-proof for the `commitment_class: continue_arc_continuation` exemption.
5. Bootstrap PG-0001 special-case → codebase grep-proof for the dedicated sub-paragraph.

## Landed Changes

### 1. Phase 8 — Choice-Surface Gate (rewrite)

In `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`, replaced the v1 Amendment B Pipeline with the 6-step gate per SPEC-20 §F:

- **Step 1 — Narrative-Point Classification** (engine-deterministic with LLM fallback): classifies into one of `{CONTINUE_ARC, NATURAL_COMMITMENT_HINGE, INTERRUPT_HINGE, CONTINUE_ONLY_PAUSE, TERMINAL_OR_CHAPTER_CLOSE}` per the trigger table in SPEC-20 §F.
- **Step 2 — Hybrid Exit Portfolio Composition** (deterministic; engine): for NATURAL_COMMITMENT_HINGE and INTERRUPT_HINGE, compose candidate exits from native_seeds + engine-discovered exits (capped at `arc.exit_portfolio.engine_discovered_exit_budget.max`) + JIT synthesis when below `STORY_KERNEL.menu_policy.min_distinct_commitments` (default 2).
- **Step 3 — Choice-Worthiness Validation** (engine; HARD-REJECT failures): each candidate CHC must have non-empty `likely_effects`; `choice_worthiness.strong_axes[]` ≥1 entry; `choice_worthiness.expected_state_delta` non-empty; `choice_worthiness.foreseeable_difference` populated; commitment_class differs from at least one other surviving candidate.
- **Step 4 — Strong-Axis Pair Distance** (engine; HARD-REJECT failures): the menu's surviving CHCs must collectively differ on ≥2 distinct `strong_axes`.
- **Step 5 — LLM Surface Label Rendering** (preserved from existing Step 5 at the discipline level): 5-15 word user-facing label, faithful to underlying operation, no outcome preview.
- **Step 6 — Write-In Slot** (preserved): always offered as choice N+1.

### 2. CONTINUE_ONLY_PAUSE handling

Documented the special case: emit a single CHC with `choice_kind: tactical_beat`, `commitment_class: continue_arc_continuation`, `label: "Continue."`, fully-populated `choice_worthiness` block whose `strong_axes: []` and `why_not_microbeat: "CONTINUE_ONLY_PAUSE - only one plausible next commitment"`. Step 3 validation is bypassed for this exact case only (validator carve-out for `commitment_class: continue_arc_continuation`).

### 3. Auto-chaining in interactive_runtime

Documented: when narrative-point is CONTINUE_ARC or CONTINUE_ONLY_PAUSE, interactive_runtime auto-chains — Phase 11 commits the current page, then immediately re-invokes page-cycle with `parent_page_id = this_PG` and `chosen_choice_id = the auto-chain CHC`. User sees one continuous reading flow without intermediate Phase 10 pauses. `authoring` mode never auto-chains; HARD-GATE always fires.

### 4. Bootstrap PG-0001 special case (NEW sub-paragraph)

Documented the PG-0001 special-case mode that `branching-story-bootstrap` Phase 8 delegates against:

- Step 1 narrative-point classification: skipped at PG-0001; defaults to NATURAL_COMMITMENT_HINGE.
- Step 2 hybrid exit portfolio: composed without `native_seeds` from a closed arc; candidate set drawn from initial obligations + active threads + seed-pool arc eligibility (each eligible arc's `commitment_class` becomes a candidate); optional JIT synthesis when below threshold.
- Steps 3, 4, 5 apply normally (mandatory `likely_effects`, populated `choice_worthiness`, ≥1 strong_axes per CHC, ≥2 distinct strong_axes across menu, LLM label rendering).
- Step 6 not stored as CHC at bootstrap (existing v1 convention preserved); slot presented at runtime when user reads PG-0001.
- PG-0001's `state_snapshot`: `applied_effect_variant: null`, `narrative_point_classification: NATURAL_COMMITMENT_HINGE`, `arc_trace_id: null`, `arc_trace_emitted: false`. SPEC-22 §Track 2 validators accept these null/default values when `id == PG-0001` (root-page exception).

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` (modify)

## Out of Scope

- `choice_worthiness_completeness` validator implementation (SPEC-22 §Track 2).
- `choice_pair_distance` validator extension for v2 strong-axis collective difference (SPEC-22 §Track 2).
- `commitment_class` / `strong_axis` enum implementations (SPEC-22 §Track 3).
- `narrative_point_classification` validator (SPEC-22 §Track 2).
- `branching-story-bootstrap` Phase 8 reference rewrite to delegate-and-cite this Phase 8 (SPEC-22 §Track 4).
- `state_snapshot.narrative_point_classification` field schema (SPEC-22 §Track 4).
- SKILL.md Phase 8 description summary update (SPEC20SCECOM-009).

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: `phase-8-choice-generation.md` documents the 6-step Choice-Surface Gate with all six step anchors.
2. Documentation proof: all five narrative-point enum values are present and mapped to menu behavior.
3. Documentation proof: CONTINUE_ONLY_PAUSE documents the exact `continue_arc_continuation` single-CHC carve-out and limits the Step 3 bypass to that class.
4. Documentation proof: Bootstrap PG-0001 special-case mode is documented with root-page state markers and normal Step 3/4/5 validation.

### Invariants

1. Every CHC v2 emitted by Phase 8 carries non-empty `likely_effects` (the 0/30 pathology is structurally impossible).
2. The menu's surviving CHCs collectively differ on ≥2 distinct `strong_axes` (strong-axis collective difference invariant).
3. CONTINUE_ONLY_PAUSE's single-CHC carve-out applies ONLY to `commitment_class: continue_arc_continuation`; no other commitment-class bypasses Step 3.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Runtime validator/package proof remains owned by SPEC-22; non-production empirical capstone proof was rejected by `archive/tickets/SPEC20SCECOM-011.md`.

### Commands

1. `grep -nE "Step 1.*Narrative-Point Classification|Step 2.*Hybrid Exit Portfolio|Step 3.*Choice-Worthiness Validation|Step 4.*Strong-Axis Pair Distance|Step 5.*LLM Surface Label|Step 6.*Write-In Slot" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — confirms 6-step structure lands.
2. `grep -nE "CONTINUE_ARC|NATURAL_COMMITMENT_HINGE|INTERRUPT_HINGE|CONTINUE_ONLY_PAUSE|TERMINAL_OR_CHAPTER_CLOSE" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — confirms all 5 narrative-point enum values documented.
3. `grep -n "Bootstrap PG-0001 special case" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — confirms NEW sub-paragraph for bootstrap delegation lands.
4. `grep -n "continue_arc_continuation" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — confirms CONTINUE_ONLY_PAUSE carve-out documented.

## Outcome

Completed: 2026-05-07. `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` now documents Phase 8 as the scene-commitment-arc Choice-Surface Gate instead of the v1 Amendment B Pipeline.

The reference covers narrative-point classification, deterministic hybrid exit portfolio composition, CHC v2 choice-worthiness validation, strong-axis collective difference, the CONTINUE_ONLY_PAUSE single-CHC carve-out, `interactive_runtime` auto-chaining, and Bootstrap PG-0001 special-case delegation. It preserves the existing write-in slot and the user-facing label rendering discipline, and it keeps parent `SKILL.md` / Phase 9 gate-list integration in SPEC20SCECOM-009 by design.

## Verification Result

1. PASS — `grep -nE "Step 1.*Narrative-Point Classification|Step 2.*Hybrid Exit Portfolio|Step 3.*Choice-Worthiness Validation|Step 4.*Strong-Axis Pair Distance|Step 5.*LLM Surface Label|Step 6.*Write-In Slot" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`.
2. PASS — `grep -nE "CONTINUE_ARC|NATURAL_COMMITMENT_HINGE|INTERRUPT_HINGE|CONTINUE_ONLY_PAUSE|TERMINAL_OR_CHAPTER_CLOSE" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`.
3. PASS — `grep -n "Bootstrap PG-0001 special case" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`.
4. PASS — `grep -n "continue_arc_continuation" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`.
5. PASS — `rg -n "Amendment B|Affordance Space Collection|Salient-Affordance|Diversification|Pair-distance discipline|5-step" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` returned no stale v1 Phase 8 anchors.
6. PASS — manual review against `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` §F, `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` Track 2/3/4, `archive/specs/SPEC-19-scene-commitment-arc-schema.md` §B/E, `docs/FOUNDATIONS.md` §Story Bundles, and `docs/HARD-GATE-DISCIPLINE.md` confirmed the reference preserves Rule 1 story-scope completeness, story-bundle write discipline, Phase 4.5 canon-promotion HARD-GATE preservation, and the PG-0001 root-page exception boundary.

## Deviations

1. The drafted skill dry-run / fixture assertions were not executed because the live repo still lacks the SPEC-22 v2 runtime validators. This ticket's accepted proof is documentation-surface grep plus manual contract review; non-production capstone fixture proof was later rejected by `archive/tickets/SPEC20SCECOM-011.md`.
2. Parent `.claude/skills/branching-story-page-cycle/SKILL.md`, `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`, and `branching-story-bootstrap` Phase 8 delegation remain out of scope. Active follow-up `tickets/SPEC20SCECOM-009.md` owns parent page-cycle integration; SPEC-22 Track 4 owns sibling-skill alignment.
