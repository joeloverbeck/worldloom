# BSPAG-006: Propagate CHC pair-distance discipline to runtime page-cycle

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — downstream `branching-story-page-cycle` skill contract prose only.
**Deps**: archive/tickets/BSBOOT-016.md

## Problem

At intake, BSBOOT-016 had added bootstrap Phase 8 pair-distance discipline so no pair of emitted root CHCs could pass by differing only on `choice_mode` and `poetic_effect`. Runtime `branching-story-page-cycle` was the other CHC producer, and its Phase 8 diversification/scoring surface still only said:

- avoid 6 versions of a single `(verb, target)` pair,
- mix moral / strategic / emotional / investigative / risky / self-protective axes,
- cover at least 3 distinct `choice_mode` values,
- cover at least 3 distinct `poetic_effect` values,
- cover high-salience OBLs,
- prefer grounded Visible Affordance Map anchors when valid.

That left the same cosmetic-variant risk on later pages that BSBOOT-016 fixed for PG-0001: two runtime CHCs could share operation, actor, target, `uses_fact`, `choice_contract.minimum_state_change`, and `choice_contract.success_policy` while differing only in modal labels.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-016.md` — verified bootstrap now requires every CHC pair to differ on at least 2 of 8 axes, with at least 1 difference from structural axes 1-6.
2. `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — at intake, verified runtime Phase 8 Step 4 still had set-level diversification only and no pair-distance rule.
3. Cross-skill / cross-artifact boundary: `branching-story-bootstrap` and `branching-story-page-cycle` both emit persisted CHC records; the shared contract is CHC operational distinctness during Phase 8 choice generation.
4. FOUNDATIONS / hard-gate principle: this strengthens Phase 8 halt-and-rederive discipline without changing Phase 9 gate wording, Mystery Reserve behavior, approval-token behavior, `validate_patch_plan`, or `submit_patch_plan`.
5. Schema-extension classification: no schema change. The rule operates over existing CHC fields: `operation`, `actor`, `target`, `uses_fact`, `choice_contract.minimum_state_change`, `choice_contract.success_policy`, `choice_mode`, and `poetic_effect`.
6. Existing-ticket scan: no active `BSPAG-*` ticket owns runtime CHC pair-distance parity. Archived BSPAG tickets cover JIT delegation, audit signals, continuation capacity, and visible affordance extraction, not semantic-distance discipline.

## Architecture Check

1. The clean design is to make both CHC producers apply the same pair-distance rule over the same existing fields. This avoids a bootstrap-only special case and keeps runtime player choices structurally distinct after the story advances.
2. No backwards-compatibility aliasing/shims. Existing persisted CHCs are not migrated; the rule applies to newly emitted runtime CHC sets.

## Verification Layers

1. Page-cycle Phase 8 Step 4 includes the same 8-axis pair-distance rule and structural-axis requirement as BSBOOT-016 -> codebase grep-proof.
2. Parent `branching-story-page-cycle/SKILL.md` Phase 8 summary mentions pair-distance discipline if its summary would otherwise remain stale -> manual review plus grep-proof when edited.
3. Phase 9 gate wording remains unchanged and the rule is enforced at Phase 8 halt-time -> manual review.
4. Non-owner skills remain unchanged -> manual review; no health-audit, bootstrap, storylet-pool-authoring, story-fact-promotion-to-canon, package, validator, or world-content change.

## Landed Changes

### 1. `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`

Added a §Pair-distance discipline subsection under Step 4 mirroring the BSBOOT-016 semantics:

- every pair of emitted CHCs differs on at least 2 of the 8 axes;
- at least 1 difference must be from structural axes 1-6;
- mode/effect-only differences fail Phase 8 and route to re-derive;
- the check is mechanical over in-memory CHC records.

### 2. `.claude/skills/branching-story-page-cycle/SKILL.md`

Updated the parent Phase 8 process-flow and procedure summaries so they name diversification plus pair-distance scoring instead of set-level diversification alone.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)

## Out of Scope

- Editing `branching-story-bootstrap`; BSBOOT-016 already landed the bootstrap side.
- Adding a code-level validator, JSON Schema change, patch-engine change, package code, or MCP tool.
- Migrating existing stories or persisted CHC records.
- Editing `branching-story-health-audit`; persisted-CHC audit coverage is owned by `tickets/BSAUD-002-audit-chc-pair-distance-discipline.md`.
- Editing `storylet-pool-authoring` or `story-fact-promotion-to-canon`; neither emits runtime CHC sets.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Pair-distance|at least 2.*axes|minimum_state_change.*set|structural axes 1-6" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` returns matches.
2. Manual review confirms the page-cycle rule rejects a pair differing only on `choice_mode` and `poetic_effect`.
3. Manual review confirms Phase 9 gate wording and HARD-GATE approval flow are unchanged.

### Invariants

1. Bootstrap and runtime page-cycle CHC producers share the same pair-distance semantics for newly emitted CHC sets.
2. Runtime Phase 8 remains the enforcement point; Phase 9 gate wording is not expanded by this ticket.
3. The rule is mechanical over existing CHC fields; no new schema field or validator is introduced.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based plus manual contract review because these branching-story skills are prose workflow definitions.

### Commands

1. `grep -nE "Pair-distance|at least 2.*axes|minimum_state_change.*set|structural axes 1-6" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`
2. `rg -n "Pair-distance|structural axes 1-6|choice_mode.*poetic_effect" .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md`
3. Manual cross-read against `archive/tickets/BSBOOT-016.md` and `docs/HARD-GATE-DISCIPLINE.md`.

## Outcome

Completed on 2026-05-06. Runtime `branching-story-page-cycle` Phase 8 now applies the same CHC pair-distance discipline as bootstrap: every emitted CHC pair must differ on at least 2 of 8 existing axes, with at least 1 difference from structural axes 1-6. Pairs that differ only in `choice_mode` and `poetic_effect` fail Phase 8 and route to halt-and-rederive. The parent skill summary now reflects the new pair-distance scoring requirement.

## Verification Result

1. `grep -nE "Pair-distance|at least 2.*axes|minimum_state_change.*set|structural axes 1-6" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — PASS; returned the pair-distance heading, total-axis rule, structural-axis requirement, and `minimum_state_change` set axis.
2. `rg -n "Pair-distance|structural axes 1-6|choice_mode.*poetic_effect" .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` — PASS; returned the runtime reference rule, the mode/effect-only rejection, and the parent skill's Phase 8 summary/procedure references.
3. Manual review against `archive/tickets/BSBOOT-016.md` — PASS; runtime page-cycle now uses the same 8 axes and structural-axis requirement as bootstrap.
4. Manual HARD-GATE alignment review against `docs/HARD-GATE-DISCIPLINE.md` — PASS; the edit preserves Phase 9 gate wording and approval-token / patch-plan flow, and keeps enforcement at Phase 8 halt-and-rederive.

## Deviations

None. The ticket remained a skill-contract prose change only; no package, validator, schema, world-content, Phase 9 gate, or archival work was added.
