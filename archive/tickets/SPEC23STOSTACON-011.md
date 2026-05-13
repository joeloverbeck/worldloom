# SPEC23STOSTACON-011: Align workflow docs with plan + prose-attach story pipeline

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None -- documentation-only (`docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`)
**Deps**: `archive/tickets/SPEC23STOSTACON-001.md`, `archive/tickets/SPEC23STOSTACON-003.md`

## Problem

At intake, `docs/WORKFLOWS.md` and `docs/HARD-GATE-DISCIPLINE.md` still described the retired page-cycle/finalize/prose-status story pipeline after SPEC23STOSTACON-001 and SPEC23STOSTACON-003 moved the live contract to plan-first pages plus optional prose-attach receipts. That stale guidance could mislead operators into calling removed or renamed skills, expecting `PG.prose_status` lifecycle fields, or treating rendered prose as a parent-page gate for continued turn-cycle authoring.

## Assumption Reassessment (2026-05-13)

1. At intake, live workflow docs still contained stale story-bundle terms and semantics: `docs/WORKFLOWS.md` named `branching-story-page-cycle`, `branching-story-page-prose-finalize`, page `prose_status`, parent render gates, deferred prose validators, and `ARC_TRACE`; `docs/HARD-GATE-DISCIPLINE.md` named the retired storylet/page-cycle/finalize family and finalize semantics.
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

## Landed Changes

### 1. `docs/WORKFLOWS.md` branching story bundles section

Replaced the retired page-cycle/finalize flow with the current `branching-story-turn-cycle` plus `branching-story-prose-attach` operator model. The section now states that page plans are authoritative at commit, rendered prose is externally supplied, prose receipts live under `pages-prose-receipts/`, and any committed page snapshot can be a turn-cycle parent regardless of attached prose.

Updated the commitment-block authoring and health-audit bullets to name `commitment-block-authoring` instead of the retired `storylet-pool-authoring`, and removed the `world-index render --arc-traces` ARC_TRACE example.

### 2. `docs/HARD-GATE-DISCIPLINE.md` story-bundle family paragraph

Aligned the hard-gate overview with the current story-bundle skill names and the prose-attach receipt model. The paragraph now says prose-attach writes a receipt, never mutates PG state, never promotes story facts, and never gates future turn-cycle planning.

Expanded the direct-write surface list to include `pages-prose-plans/` and `pages-prose-receipts/`, matching the shared story-state contract and FOUNDATIONS prose-attach discipline.

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

## Outcome

Completed on 2026-05-13. `docs/WORKFLOWS.md` now presents the current plan-first story-bundle operator model: bootstrap and turn-cycle commit page plans, prose-attach validates externally supplied rendered prose and writes receipts, and rendered prose is not a parent-page gate. `docs/HARD-GATE-DISCIPLINE.md` now names the live story-bundle skill family and describes prose-attach as a receipt-writing, non-PG-mutating flow.

## Verification Result

1. `rg -n 'branching-story-page-cycle|branching-story-page-prose-finalize|storylet-pool-authoring|prose_status|deferred_validation_trace|ARC_TRACE' docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md` — PASS; returned no matches.
2. `rg -n 'branching-story-turn-cycle|branching-story-prose-attach|pages-prose-receipts' docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md` — PASS; returned current-contract matches in both docs.
3. Manual review against `docs/FOUNDATIONS.md` §Story Bundles §4 / §4a — PASS; the updated docs preserve plan authority, prose receipts, and the rule that turn-cycle may advance from any committed page snapshot without rendered parent prose.
4. `git diff --check -- docs/WORKFLOWS.md docs/HARD-GATE-DISCIPLINE.md tickets/SPEC23STOSTACON-011.md` — PASS; no whitespace errors.

## Deviations

None.
