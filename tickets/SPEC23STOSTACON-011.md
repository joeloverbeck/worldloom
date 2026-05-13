# SPEC23STOSTACON-011: Align workflow docs with plan + prose-attach story pipeline

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None -- documentation-only (`docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`)
**Deps**: `archive/tickets/SPEC23STOSTACON-001.md`, `archive/tickets/SPEC23STOSTACON-003.md`

## Problem

`docs/WORKFLOWS.md` and `docs/HARD-GATE-DISCIPLINE.md` still describe the retired page-cycle/finalize/prose-status story pipeline after SPEC23STOSTACON-001 and SPEC23STOSTACON-003 moved the live contract to plan-first pages plus optional prose-attach receipts. That stale guidance can mislead operators into calling removed or renamed skills, expecting `PG.prose_status` lifecycle fields, or treating rendered prose as a parent-page gate for continued turn-cycle authoring.

## Assumption Reassessment (2026-05-13)

1. Live workflow docs still contain stale story-bundle terms and semantics: `docs/WORKFLOWS.md` names `branching-story-page-cycle`, `branching-story-page-prose-finalize`, page `prose_status`, parent render gates, deferred prose validators, and `ARC_TRACE`; `docs/HARD-GATE-DISCIPLINE.md` still names the retired storylet/page-cycle/finalize family and finalize semantics.
2. Current authority is the Story Bundles contract in `docs/FOUNDATIONS.md`: story pages are plan-first records, rendered prose is attached by `branching-story-prose-attach`, and `branching-story-turn-cycle` may advance from a committed page snapshot without requiring rendered parent prose.
3. Shared boundary under audit is documentation only: this ticket owns the quick-reference workflow docs and hard-gate prose, not `.claude/skills/`, validator schemas, MCP tools, or generated world content.
4. FOUNDATIONS principle motivating this ticket is Story Bundles schema minimalism and plan authority: no floating facts and no lifecycle-only `prose_status` field should be presented as current operator contract.
5. Adjacent ownership is separate: `tickets/SPEC23STOSTACON-009.md` owns active SKILL.md vocabulary/prose cleanup, while `archive/tickets/SPEC23STOSTACON-010.md` owns the stale `docs/MACHINE-FACING-LAYER.md` SLT filter example. This ticket only owns `docs/WORKFLOWS.md` and `docs/HARD-GATE-DISCIPLINE.md`.
6. Mismatch + correction: the implementation ticket removed stale validator-schema fields, but follow-up review exposed stale operator docs outside that ticket's code/schema boundary. Correct by updating the docs in a dedicated docs-only ticket instead of widening the archived implementation.

## Architecture Check

1. Update current documentation to the canonical plan + prose-attach pipeline instead of preserving parallel aliases for retired workflows.
2. No backwards-compatibility aliasing, shims, or historical command paths should be introduced.

## Verification Layers

1. Retired story-bundle operational terms are absent from current quick-reference docs -> grep proof over `docs/WORKFLOWS.md` and `docs/HARD-GATE-DISCIPLINE.md`.
2. Current workflow names and prose-receipt concepts are present -> grep proof over the same docs.
3. Rendered prose is not described as a turn-cycle parent gate -> manual review against `docs/FOUNDATIONS.md`.
4. Single-layer docs ticket: no code, schema, or skill dry-run verification applies.

## What to Change

### 1. `docs/WORKFLOWS.md` branching story bundles section

Replace the retired page-cycle/finalize flow with the current `branching-story-turn-cycle` plus `branching-story-prose-attach` operator model. Remove `PG.prose_status`, deferred prose-validation, parent rendered-prose gates, and `ARC_TRACE` finalization language from current guidance.

### 2. `docs/HARD-GATE-DISCIPLINE.md` story-bundle family paragraph

Align the hard-gate overview with the current story-bundle skill names and the prose-attach receipt model. Do not describe finalize as mutating page lifecycle status, and do not imply that rendered prose gates future page planning.

## Files to Touch

- `docs/WORKFLOWS.md` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)

## Out of Scope

- `.claude/skills/` prose and vocabulary updates (`tickets/SPEC23STOSTACON-009.md`)
- Validator schema or test changes (`archive/tickets/SPEC23STOSTACON-003.md`)
- `docs/MACHINE-FACING-LAYER.md` example cleanup (`archive/tickets/SPEC23STOSTACON-010.md`)
- Historical archived tickets, specs, plans, or triage notes

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'branching-story-page-cycle|branching-story-page-prose-finalize|storylet-pool-authoring|prose_status|deferred_validation_trace|ARC_TRACE' docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md` returns no matches.
2. `rg -n 'branching-story-turn-cycle|branching-story-prose-attach|pages-prose-receipts' docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md` returns current-contract matches.
3. `git diff --check -- docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md tickets/SPEC23STOSTACON-011.md` passes after adding the ticket with intent-to-add if needed.

### Invariants

1. Current operator docs must not instruct users to call retired story-bundle skills.
2. Current operator docs must not treat rendered prose or `prose_status` as a gate for continued page planning.

## Test Plan

### New/Modified Tests

1. None -- documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `rg -n 'branching-story-page-cycle|branching-story-page-prose-finalize|storylet-pool-authoring|prose_status|deferred_validation_trace|ARC_TRACE' docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md`
2. `rg -n 'branching-story-turn-cycle|branching-story-prose-attach|pages-prose-receipts' docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md`
3. `git diff --check -- docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md tickets/SPEC23STOSTACON-011.md`
