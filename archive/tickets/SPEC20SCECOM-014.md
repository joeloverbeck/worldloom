# SPEC20SCECOM-014: Phase 7.5 — CHC v2 Affordance-to-Choice Contract Alignment

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` Phase 8 contract prose updated to stop requiring stale v1 `choice_mode` / `poetic_effect` diversity and instead hand visible affordances to the CHC v2 choice-worthiness / strong-axis gate.
**Deps**: `archive/tickets/SPEC20SCECOM-005.md` (Phase 8 Choice-Surface Gate), `archive/tickets/SPEC20SCECOM-012.md` (Phase 8 label prompt CHC v2 fields), `archive/tickets/SPEC20SCECOM-013.md` (Phase 1 Path A selected-CHC commitment-class handoff)

## Problem

At intake, post-ticket review of `archive/tickets/SPEC20SCECOM-013.md` confirmed that Phase 1 Path A consumed CHC v2 fields and carried `commitment_class` to Phase 4, but the Phase 7.5 visible-affordance reference still said Phase 8 preserves "at least 3 distinct `choice_mode` values" and "at least 3 distinct `poetic_effect` values." Those were v1 choice-diversity terms. Under SPEC-20 §F and the live Phase 8 reference, visible affordances now feed a CHC v2 gate that validates `commitment_class`, populated `choice_worthiness`, and collective `strong_axes` difference.

## Assumption Reassessment (2026-05-07)

1. At intake, verified `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` §Phase 8 Contract still contained `choice_mode` and `poetic_effect` diversity bullets.
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

## Landed Changes

### 1. Phase 8 Contract bullets

In `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`, replaced the v1 diversity bullets with CHC v2 conditions:

- hard preconditions remain satisfied;
- candidate CHCs carry populated `choice_worthiness`;
- the menu collectively differs across at least two distinct `strong_axes`;
- visible affordance anchoring remains grounded in state or planned records;
- `choice_contract`, `likely_effects`, and `continuation_capacity` remain populated.

### 2. Handoff wording

Made clear that the Visible Affordance Map is an anchor source for Phase 8's Choice-Surface Gate, not a separate v1 diversification pass.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` (modify)

## Out of Scope

- Phase 8 gate semantics already landed in `archive/tickets/SPEC20SCECOM-005.md`.
- Phase 8 label prompt cleanup already landed in `archive/tickets/SPEC20SCECOM-012.md`.
- Phase 1 Path A handoff already landed in `archive/tickets/SPEC20SCECOM-013.md`.
- Parent `branching-story-page-cycle/SKILL.md` integration remains `tickets/SPEC20SCECOM-009.md`.
- Runtime validators and deterministic package proof remain SPEC-22; non-production capstone fixture proof was rejected by `archive/tickets/SPEC20SCECOM-011.md`.

## Acceptance Criteria

### Tests That Must Pass

1. PASS — documentation proof: `phase-7-5-visible-affordance-extraction.md` no longer uses `choice_mode` or `poetic_effect`.
2. PASS — documentation proof: §Phase 8 Contract names `choice_worthiness`, `strong_axes`, `choice_contract`, `likely_effects`, and `continuation_capacity`.
3. PASS — manual review confirmed §Memory-Only Boundary remains unchanged: no persisted Visible Affordance Map record is introduced.

### Invariants

1. Visible affordances remain grounded anchors; they do not become a separate persisted state surface.
2. Phase 8 diversity is expressed through CHC v2 choice-worthiness and strong-axis collective difference, not v1 aliases.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification was command-based and manual contract review.

### Commands

1. `! grep -nE "choice_mode|poetic_effect" .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` — confirms stale v1 diversity terms are removed from the reference.
2. `grep -nE "choice_worthiness|strong_axes|choice_contract|likely_effects|continuation_capacity" .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` — confirms CHC v2 terms are present in the Phase 8 handoff.
3. Manual review of §Memory-Only Boundary in `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`.

## Outcome

Completed: 2026-05-07. `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` now describes Phase 8's handoff in CHC v2 terms. The Visible Affordance Map remains a memory-only anchor source, and the stale v1 `choice_mode` / `poetic_effect` diversity bullets were removed from the Phase 7.5 reference.

## Verification Result

1. PASS — `grep -nE "choice_mode|poetic_effect" .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` returned no matches.
2. PASS — `grep -nE "choice_worthiness|strong_axes|choice_contract|likely_effects|continuation_capacity" .claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`.
3. PASS — manual review of §Memory-Only Boundary confirmed no persisted Visible Affordance Map record was introduced; the map is still discarded after Phase 8 and durable state still routes through the existing Phase 5 / Phase 7 claim-record path before the map feeds Phase 8.

## Deviations

1. Parent `.claude/skills/branching-story-page-cycle/SKILL.md` still contains v1 Phase 8 summary prose with `choice_modes` / `poetic_effects`; this remains outside this ticket and is owned by `tickets/SPEC20SCECOM-009.md`.
