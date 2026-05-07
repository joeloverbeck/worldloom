# SPEC20SCECOM-012: Phase 8 — Label Prompt CHC v2 Field Alignment

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` Step 5 label-rendering prompt updated to consume CHC v2 fields instead of stale v1 `choice_mode` / `poetic_effect` prompt fields.
**Deps**: `archive/tickets/SPEC20SCECOM-005.md` (introduced the Phase 8 Choice-Surface Gate and preserved the label-rendering discipline)

## Problem

Post-ticket review of `archive/tickets/SPEC20SCECOM-005.md` found that the new Phase 8 reference correctly rewrote the gate around CHC v2, but Step 5's preserved label-rendering prompt still lists `choice_mode` and `poetic_effect` in the structured-choice input block. The live CHC v2 contract in `record-schemas.md` centers `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness`, `choice_contract`, `likely_effects`, and `continuation_capacity`. Leaving Step 5's prompt on stale v1 fields weakens the handoff from choice-worthiness validation to label rendering.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` Step 5 currently includes `[structured choice - operation, actor, target, uses_fact, likely_effects, choice_mode, poetic_effect]`.
2. Verified `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` Step 2 assembles CHC v2 candidates with `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness`, `choice_contract`, `likely_effects`, `continuation_capacity`, `content_intensity_implied`, and `label`.
3. Verified `.claude/skills/branching-story-page-cycle/references/record-schemas.md` documents CHC v2 fields as `record_version`, `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness`, preserved `choice_contract`, mandatory non-empty `likely_effects`, and `continuation_capacity`.
4. Cross-artifact boundary: the Step 5 label-rendering prompt consumes the validated CHC v2 working record produced by Phase 8 Steps 2-4. Its input list must match the CHC v2 field vocabulary closely enough that labels remain faithful to `choice_contract` and `choice_worthiness`.
5. FOUNDATIONS Rule 1 (No Floating Facts) at story scope: the label renderer must not route around the populated choice-worthiness fields that make a CHC non-floating. Labels are surface text, but their prompt inputs should preserve the validated structural rationale.
6. Mismatch correction: replace the stale v1 prompt field list with CHC v2 fields and add a narrow stale-anchor proof that `choice_mode` / `poetic_effect` no longer appear in the Phase 8 reference.

## Architecture Check

1. Updating Step 5's prompt input list is cleaner than adding aliases because the scene-commitment-arc pivot is forward-only. CHC v2 already carries the structural fields Step 5 needs to render faithful labels.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Step 5 prompt consumes CHC v2 fields → codebase grep-proof in `phase-8-choice-generation.md`.
2. Stale v1 label prompt fields removed from Phase 8 reference → negative codebase grep-proof for `choice_mode` and `poetic_effect` in that file.
3. CHC v2 schema remains the authority → manual review against `record-schemas.md` CHC v2 section.

## What to Change

### 1. Phase 8 Step 5 prompt input list

In `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`, update the Step 5 structured-choice prompt block to name CHC v2 fields such as `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness`, `choice_contract`, `likely_effects`, and `continuation_capacity`.

### 2. Step 5 label-fidelity note

Keep the existing label discipline: 5-15 words, faithful to the validated operation/commitment, no outcome preview, and no promises absent from `choice_contract`. Add or preserve a note that labels are surface text only and must remain faithful to the validated CHC v2 record.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` (modify)

## Out of Scope

- Phase 8 gate semantics from `archive/tickets/SPEC20SCECOM-005.md`.
- Parent `.claude/skills/branching-story-page-cycle/SKILL.md` integration (SPEC20SCECOM-009).
- Runtime validators and capstone fixture proof (SPEC-22 and SPEC20SCECOM-011).
- `branching-story-bootstrap` sibling-skill delegation rewrite (SPEC-22 Track 4).

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: Step 5 prompt block names CHC v2 fields (`commitment_class`, `choice_worthiness`, `choice_contract`, `likely_effects`, `continuation_capacity`).
2. Documentation proof: `choice_mode` and `poetic_effect` no longer appear in `phase-8-choice-generation.md`.
3. Manual review confirms the Step 5 label prompt still preserves no-outcome-preview and label-faithfulness discipline.

### Invariants

1. Step 5 label rendering consumes the validated CHC v2 record, not stale v1 cosmetic fields.
2. Labels remain surface text and do not introduce promises absent from `choice_contract`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual schema review.

### Commands

1. `grep -nE "commitment_class|choice_worthiness|choice_contract|likely_effects|continuation_capacity" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — confirms CHC v2 fields are present in the Phase 8 reference.
2. `! grep -nE "choice_mode|poetic_effect" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — confirms stale v1 label prompt fields are removed.
3. Manual review against `.claude/skills/branching-story-page-cycle/references/record-schemas.md` CHC v2 section.
