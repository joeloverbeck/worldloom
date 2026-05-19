# SPEC50STPSTECHC-011: Active-state-underuse health warnings (warning-first)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-health-audit` skill (new warning-level checks).
**Deps**: None

## Problem

Active high-salience state can sit on a branch without any recent CHC/SLT/page-plan touch — a blocked high-salience `STPLAN`, agency-constraining `STEMO`, urgent `CLK`, high-salience unrevealed `STSEC`, open high-salience `STQ`, open `OBL`, pending `CNSQ`, or active `THR` — and nothing flags that the world's active causal state is going unexploited by the affordances. Health-audit currently checks staleness, contradiction, and noncollapse but not active-state underuse.

## Assumption Reassessment (2026-05-19)

1. Codebase: `branching-story-health-audit/SKILL.md` Phase 2k carries the STPLAN/STEMO checks; the underuse warnings are new checks in the same skill. Verified this session that no active-state-underuse check exists.
2. Specs/contract: SPEC-50 §D.4 — explicitly warning-first; threshold tuning deferred to sample-story evidence (audit Priority 3).
3. Cross-artifact boundary: the warnings read across STPLAN/STEMO/CLK/STSEC/STQ/OBL/CNSQ/THR and the page chain; they benefit from the SPEC50STPSTECHC-005/006 exploitation edges but do not require them (the check can walk records + page snapshots directly).
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape): these checks measure present-state underuse (active state with no recent affordance touch), never future dramatic obligation or narrative-shape targets. They are judgment-adjacent salience heuristics and MUST ship WARN/INFO only — never as deterministic FAIL gates that would impose a "the story should do X" rail.

## Architecture Check

1. Warning-first checks added to the existing Phase 2k surface keep the health-audit's deterministic/judgment split honest — the spec explicitly forbids these from pretending to be deterministic gates. Shipping them as WARN/INFO with placeholder thresholds defers tuning to evidence without blocking on it.
2. No shim — new checks alongside existing Phase 2k checks; no change to existing check semantics.

## Verification Layers

1. A branch with a long-blocked high-salience STPLAN untouched across the window -> WARN (never FAIL).
2. A branch with no underuse -> no finding (silent).
3. §5c boundary preserved (present-state only) -> FOUNDATIONS alignment check on the checks' inputs and severities.

## What to Change

### 1. Active-state-underuse warnings (D.4)

Add WARN/INFO-level checks for active high-salience `STPLAN` (blocked), agency-constraining `STEMO`, urgent `CLK`, high-salience unrevealed `STSEC`, open high-salience `STQ`, open `OBL`, pending `CNSQ`, active `THR` with no recent CHC/SLT/page-plan touch across a window. Thresholds are placeholders (defer tuning to sample-story evidence). Never FAIL.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The contradictory-affect table fix (`archive/tickets/SPEC50STPSTECHC-008.md`).
- Threshold tuning (deferred to sample-story evidence).
- Any deterministic FAIL gate for underuse.

## Acceptance Criteria

### Tests That Must Pass

1. A `branching-story-health-audit` dry-run on a fixture branch with an untouched long-blocked high-salience STPLAN emits a WARN (never FAIL).
2. A dry-run on a branch with no underuse emits no underuse finding.

### Invariants

1. Active-state-underuse checks emit only WARN/INFO — never FAIL.
2. The checks measure present-state underuse, never narrative-shape conformance (§5c).

## Test Plan

### New/Modified Tests

1. `None — skill-prose change; verification is a `branching-story-health-audit` dry-run on underuse and no-underuse fixture branches, per Assumption Reassessment.`

### Commands

1. `grep -n "underuse\|WARN\|INFO" .claude/skills/branching-story-health-audit/SKILL.md` — confirm the new checks are WARN/INFO-tagged.
2. `branching-story-health-audit` dry-run on underuse + no-underuse fixture branches.
