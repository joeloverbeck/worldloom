# SPEC50STPSTECHC-011: Active-state-underuse health warnings (warning-first)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-health-audit` skill (new warning-level checks).
**Deps**: None

## Problem

At intake, active high-salience state could sit on a branch without any recent CHC/SLT/page-plan touch — a blocked high-salience `STPLAN`, agency-constraining `STEMO`, urgent `CLK`, high-salience unrevealed `STSEC`, open high-salience `STQ`, open `OBL`, pending `CNSQ`, or active `THR` — and nothing flagged that the world's active causal state was going unexploited by the affordances. Health-audit checked staleness, contradiction, and noncollapse but not active-state underuse.

## Assumption Reassessment (2026-05-20)

1. Codebase: `.claude/skills/branching-story-health-audit/SKILL.md` already had Phase 2i mechanism-rot checks and Phase 2k STPLAN/STEMO checks, but no dedicated `active-state underuse` structural phase or finding codes.
2. Specs/contract: SPEC-50 §D.4 requires warning-first active-state-underuse checks and explicitly defers threshold tuning to sample-story evidence. The originating spec was updated with a dated implementation note after the skill edit landed.
3. Cross-artifact boundary: the warnings read across `STPLAN` / `STEMO` / `CLK` / `STSEC` / `STQ` / `OBL` / `CNSQ` / `THR` and the page chain. They benefit from the SPEC50STPSTECHC-005/006 exploitation edges but do not require them because health-audit can walk records, events, choices, storylets, page plans, and page snapshots directly.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape): these checks measure present-state underuse with no recent affordance / storylet / page-plan / event touch, never future dramatic obligation or narrative-shape targets. They are judgment-adjacent salience heuristics and ship as WARN/INFO only, never deterministic FAIL/ERROR gates.
5. HARD-GATE discipline: the edit touches the health-audit phase inventory in a skill that carries a `<HARD-GATE>` block, so `docs/HARD-GATE-DISCIPLINE.md` and `.codex/skills/implement-ticket/references/hard-gate-read-triage.md` were read. The landed edit preserves approval timing, write gating, failure handling, and operator approval semantics; it only updates the read-only analysis phase list.
6. Proof-surface correction: no executable `branching-story-health-audit` dry-run runner exists in this repo context. The accepted proof is manual contract review plus grep/hygiene over the skill and originating spec, not an end-to-end skill dry-run.

## Architecture Check

1. Warning-first checks added as a separate Phase 2l keep the health-audit's deterministic/judgment split honest — the spec explicitly forbids these from pretending to be deterministic gates. Shipping them as WARN/INFO with placeholder thresholds defers tuning to evidence without blocking on it.
2. No shim — Phase 2l runs alongside the existing Phase 2i and Phase 2k mechanism-health checks; no existing check semantics changed.

## Verification Layers

1. A branch with a long-blocked high-salience STPLAN untouched across the window -> documented as a WARNING / INFO-only audit finding, never ERROR or FAIL.
2. A branch with no underuse -> documented as emitting no Phase 2l finding.
3. §5c boundary preserved (present-state only) -> FOUNDATIONS alignment check on the checks' inputs and severities.

## Landed Changes

### 1. Active-state-underuse warnings (D.4)

Added Phase 2l to `branching-story-health-audit`: WARN/INFO-level checks for active high-salience `STPLAN` (blocked), agency-constraining `STEMO`, urgent `CLK`, high-salience unrevealed `STSEC`, open high-salience `STQ`, open `OBL`, pending `CNSQ`, and active `THR` with no recent CHC / SLT / page-plan / event touch across a default `N=3` page window. Thresholds remain placeholders pending sample-story evidence. Phase 2l explicitly never emits ERROR/FAIL and emits no finding when no underuse is present.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md` (modify — D.4 implementation note)

## Out of Scope

- The contradictory-affect table fix (`archive/tickets/SPEC50STPSTECHC-008.md`).
- Threshold tuning (deferred to sample-story evidence).
- Any deterministic FAIL gate for underuse.

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review confirms Phase 2l records an untouched long-blocked high-salience STPLAN as WARN/INFO-only and never ERROR/FAIL.
2. Manual contract review confirms a no-underuse branch emits no Phase 2l finding.

### Invariants

1. Active-state-underuse checks emit only WARN/INFO — never FAIL.
2. The checks measure present-state underuse, never narrative-shape conformance (§5c).

## Test Plan

### New/Modified Tests

1. None — skill-prose change; verification is manual contract review plus grep/hygiene because no executable `branching-story-health-audit` dry-run runner exists in this repo context.

### Commands

1. `rg -n "Phase 2l|active-state underuse|active_plan_underused|active_emotion_underused|urgent_clock_underused|hidden_secret_underused|open_question_underused|active_debt_underused|MUST NOT emit ERROR|no Phase 2l finding" .claude/skills/branching-story-health-audit/SKILL.md` — confirm the new checks, warning-only boundary, and no-underuse behavior are documented.
2. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC50STPSTECHC-011.md specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md` — whitespace/hygiene over owned prose edits.

## Outcome

Completed 2026-05-20. Added `branching-story-health-audit` Phase 2l for active-state-underuse warnings, updated the structural phase inventory from 11 to 12 sub-phases, and documented six finding families:

- `active_plan_underused`
- `active_emotion_underused`
- `urgent_clock_underused`
- `hidden_secret_underused`
- `open_question_underused`
- `active_debt_underused`

The landed check reads present branch state only: recent `CHC`, selected `SLT`, page-plan, `SE.commitment.alias_bindings`, `SE.state_delta`, `SE.state_relations[]`, and rationale touch surfaces. It explicitly avoids narrative-shape obligations and never emits ERROR/FAIL. The originating spec received a dated implementation note for D.4.

## Verification Result

1. `rg -n "Phase 2l|active-state underuse|active_plan_underused|active_emotion_underused|urgent_clock_underused|hidden_secret_underused|open_question_underused|active_debt_underused|MUST NOT emit ERROR|no Phase 2l finding" .claude/skills/branching-story-health-audit/SKILL.md` — passed; the new phase, all six finding codes, warning-only boundary, and no-underuse behavior are present.
2. Manual FOUNDATIONS alignment review — passed; Phase 2l cites record ids, page windows, and touch surfaces and states why each finding is present-state underuse rather than a narrative-shape demand, preserving FOUNDATIONS §Story Bundles §5c.
3. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC50STPSTECHC-011.md specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md` — passed.

## Deviations

- The drafted `branching-story-health-audit` dry-run proof was replaced with manual contract review plus grep/hygiene because this repo does not expose an executable local dry-run runner for Claude skills.
- The implementation added a separate Phase 2l rather than placing all D.4 wording inside Phase 2k, because the warning spans `CLK`, `STSEC`, `STQ`, `OBL`, `CNSQ`, and `THR` as well as `STPLAN` / `STEMO`.
