# SPEC20SCECOM-014: Phase 7.5 — CHC v2 Affordance-to-Choice Contract Alignment

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` Phase 8 contract prose updated to stop requiring stale v1 `choice_mode` / `poetic_effect` diversity and instead hand visible affordances to the CHC v2 choice-worthiness / strong-axis gate.
**Deps**: `archive/tickets/SPEC20SCECOM-005.md` (Phase 8 Choice-Surface Gate), `archive/tickets/SPEC20SCECOM-012.md` (Phase 8 label prompt CHC v2 fields), `archive/tickets/SPEC20SCECOM-013.md` (Phase 1 Path A selected-CHC commitment-class handoff)

## Problem

Post-ticket review of `archive/tickets/SPEC20SCECOM-013.md` confirmed that Phase 1 Path A now consumes CHC v2 fields and carries `commitment_class` to Phase 4, but the Phase 7.5 visible-affordance reference still says Phase 8 preserves "at least 3 distinct `choice_mode` values" and "at least 3 distinct `poetic_effect` values." Those are v1 choice-diversity terms. Under SPEC-20 §F and the live Phase 8 reference, visible affordances should feed a CHC v2 gate that validates `commitment_class`, populated `choice_worthiness`, and collective `strong_axes` difference.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` §Phase 8 Contract still contains `choice_mode` and `poetic_effect` diversity bullets.
2. Verified `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` documents the v2 Choice-Surface Gate: candidate CHCs carry `commitment_class`, `choice_worthiness`, `likely_effects`, and `continuation_capacity`; Step 4 requires collective difference across at least two distinct `strong_axes`.
3. Cross-artifact boundary: Phase 7.5 produces a memory-only Visible Affordance Map consumed by Phase 8. The shared contract is affordance anchoring into CHC v2 candidates, not v1 `choice_mode` / `poetic_effect` diversity.
4. FOUNDATIONS Rule 1 at story scope applies by analogy: choices should not float as cosmetic labels; the Phase 7.5 handoff should preserve grounded affordance evidence while Phase 8 validates non-empty `likely_effects` and populated choice-worthiness.
5. Adjacent contradiction classification: this is not unfinished SPEC20SCECOM-013 work because SPEC20SCECOM-013 owned only Phase 1 Path A. It is a separate Phase 7.5-to-Phase-8 contract cleanup exposed by the same stale-v1 vocabulary sweep.

## Architecture Check

1. Updating Phase 7.5 to speak in CHC v2 terms is cleaner than preserving v1 aliases because the scene-commitment-arc pivot has retired `choice_mode` / `poetic_effect` as the diversity surface.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Phase 7.5 no longer names v1 `choice_mode` / `poetic_effect` as required Phase 8 diversity criteria -> negative grep-proof in `phase-7-5-visible-affordance-extraction.md`.
2. Phase 7.5 names the CHC v2 choice-worthiness / strong-axis contract -> codebase grep-proof in the same file.
3. Phase 7.5 remains memory-only and does not invent a persisted affordance record -> manual review against §Memory-Only Boundary.

## What to Change

### 1. Phase 8 Contract bullets

In `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`, replace the v1 diversity bullets with CHC v2 conditions:

- hard preconditions remain satisfied;
- candidate CHCs carry populated `choice_worthiness`;
- the menu collectively differs across at least two distinct `strong_axes`;
- visible affordance anchoring remains grounded in state or planned records;
- `choice_contract`, `likely_effects`, and `continuation_capacity` remain populated.

### 2. Handoff wording

Make clear that the Visible Affordance Map is an anchor source for Phase 8's Choice-Surface Gate, not a separate v1 diversification pass.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` (modify)

## Out of Scope

- Phase 8 gate semantics already landed in `archive/tickets/SPEC20SCECOM-005.md`.
- Phase 8 label prompt cleanup already landed in `archive/tickets/SPEC20SCECOM-012.md`.
- Phase 1 Path A handoff already landed in `archive/tickets/SPEC20SCECOM-013.md`.
- Parent `branching-story-page-cycle/SKILL.md` integration remains `tickets/SPEC20SCECOM-009.md`.
- Runtime validators and capstone fixture proof remain SPEC-22 and `tickets/SPEC20SCECOM-011.md`.

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: `phase-7-5-visible-affordance-extraction.md` no longer uses `choice_mode` or `poetic_effect`.
2. Documentation proof: §Phase 8 Contract names `choice_worthiness`, `strong_axes`, `choice_contract`, `likely_effects`, and `continuation_capacity`.
3. Manual review confirms §Memory-Only Boundary remains unchanged: no persisted Visible Affordance Map record is introduced.

### Invariants

1. Visible affordances remain grounded anchors; they do not become a separate persisted state surface.
2. Phase 8 diversity is expressed through CHC v2 choice-worthiness and strong-axis collective difference, not v1 aliases.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual contract review.

### Commands

1. `! grep -nE "choice_mode|poetic_effect" .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` — confirms stale v1 diversity terms are removed from the reference.
2. `grep -nE "choice_worthiness|strong_axes|choice_contract|likely_effects|continuation_capacity" .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` — confirms CHC v2 terms are present in the Phase 8 handoff.
3. Manual review of §Memory-Only Boundary in `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`.
