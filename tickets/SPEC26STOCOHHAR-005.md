# SPEC26STOCOHHAR-005: Add causal-dependency threat scan to turn-cycle and health-audit

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-turn-cycle` and `branching-story-health-audit` skill prose. No schema, MCP, or validator change.
**Deps**: None

## Problem

When a turn's `state_delta` closes or supersedes a record, nothing verifies that an emitted `CHC`, an open `OBL` counterparty, a visible affordance, or an eligible `SLT` precondition did not depend on it. A player can see a choice that no longer makes sense, an affordance pointing at a dead record, or an obligation whose counterparty has left the stage. This is Rule 5 (No Consequence Evasion) at story scope, currently unenforced. SPEC-26 D4 adds a `causal_dependency_threat_scan` to the turn-cycle and a matching `Phase 2g` to the health audit.

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `branching-story-turn-cycle/SKILL.md` Phase 9 runs 4 turn-cycle-additional checks (action-source legality, entity death/incapacity reconciliation, belief/visibility coverage, write-in world-logic rationale) — confirmed at `:43` and `:342`; a fifth check is the next slot. `branching-story-health-audit/SKILL.md` Phase 2 runs sub-phases 2a–2f (`:151`–`:203`); `2g` is the next sub-phase. SPEC-25 D5's `CHC.grounded_in`, D1's `STSTAT`, and D3's `OBL`/`CNSQ` `urgency` are all landed — confirmed present in `story-state-contract.md` §4 and the JSON schemas — so the scan's substrate exists.
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D4: the scan has four sub-checks — `choice_dependency_clobbered` (error: a record in an emitted `CHC.grounded_in.records[]` is closed/superseded/moved/invalidated but the `CHC` remains emitted), `affordance_dependency_clobbered` (error: a `PG.state_snapshot.visible_affordances` entry survives its grounding `STLOC`/`STOBJ`/`STENT` going inactive/inaccessible/relocated), `obligation_counterparty_unavailable_without_transfer` (error: an entity owing/owed an open `OBL` becomes unavailable per its active `STSTAT` without the `OBL` being closed or transferred), `slt_precondition_clobbered` (warning: a high-salience open debt's eligible author-pool `SLT` has its preconditions destroyed without the debt being closed/transferred/replaced).
3. Cross-skill / cross-artifact boundary under audit: the causal-dependency invariant shared between `branching-story-turn-cycle` Phase 9 (turn-time enforcement, before snapshot hashes are computed) and `branching-story-health-audit` Phase 2 (audit-time replay enforcement). Both consume the same already-landed substrate (`CHC.grounded_in`, `STSTAT`, `OBL`/`CNSQ` urgency, `PG.state_snapshot.visible_affordances`); the four sub-checks must be stated identically in both places so a turn-time pass and an audit-time pass agree.
4. FOUNDATIONS principle under audit: Rule 5 (No Consequence Evasion) — at story scope, "if a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest." `causal_dependency_threat_scan` IS Rule 5 at story scope: `obligation_counterparty_unavailable_without_transfer` forces a dangling obligation to be closed or transferred; the other sub-checks force a clobbered dependency to be integrated or explicitly resolved before the page commits. It also engages §Story Bundles §5c — it asks only "does current state still support what it claims", never "where should the story go".
5. HARD-GATE / gate-validation surface (per `tickets/README.md` check 9): this ticket adds a fifth check to `branching-story-turn-cycle` Phase 9 — the validation phase that immediately precedes the Phase 10 HARD-GATE — and a Phase 2g to the health audit's structural replay. Confirmed: the new check operates on `CHC`/`OBL`/affordance/`SLT` dependency clobbering only; it does not touch gate 3 (the mystery/invariant firewall), does not resolve any `forbidden`-status mystery, and does not reorder or relax the existing 8 shared hard gates or the 4 prior additional checks — the Mystery Reserve firewall and HARD-GATE semantics are unchanged.
6. Adjacent contradiction classification (per `tickets/_TEMPLATE.md` menu item 8): reassessment surfaces that `slt_precondition_clobbered` overlaps `branching-story-health-audit` Phase 2c's existing `invalidated_debt` finding. Classification: **acknowledged-acceptable redundancy, not a bug** — `slt_precondition_clobbered` fires at *turn time* (before the page commits), `invalidated_debt` fires at *audit time*; the turn-time catch is the earlier, cheaper surface. Per SPEC-26 §Risks, if implementation finds the turn-time sub-check fully redundant with Phase 2c, dropping `slt_precondition_clobbered` is acceptable — record the decision in the completion note.

## Architecture Check

1. Skill-prose checks (not an executable `tools/validators/` validator) is the cleaner choice: `branching-story-health-audit` Phase 2's six existing sub-phases (2a–2f) are all skill-prose structural replay, so a seventh sub-phase matching that architecture is structurally consistent rather than a new mechanism. `CHC.grounded_in` (SPEC-25 D5) already supplies the machine-readable substrate the checks read, so no validator infrastructure is needed.
2. No backwards-compatibility aliasing or shims — the scan is net-new; the 4 prior turn-cycle-additional checks and the 2a–2f health-audit sub-phases are unchanged.

## Verification Layers

1. The turn-cycle gains a fifth additional check -> codebase grep-proof: `causal_dependency_threat_scan` and its four sub-checks appear in `branching-story-turn-cycle/SKILL.md` Phase 9, and the "4 turn-cycle-additional checks" count references are updated to 5.
2. The health audit gains Phase 2g -> codebase grep-proof: `Phase 2g` with the same four sub-checks appears in `branching-story-health-audit/SKILL.md` after Phase 2f.
3. The scan catches a clobbered choice dependency -> skill dry-run: a two-turn fixture where turn N closes a record in turn N−1's `CHC.grounded_in.records[]` raises `choice_dependency_clobbered` at turn time, and the Phase 2g replay raises it at audit time.
4. The two statements agree -> manual review: the four sub-checks are worded identically in turn-cycle Phase 9 and health-audit Phase 2g, so turn-time and audit-time verdicts cannot diverge.

## What to Change

### 1. turn-cycle — fifth turn-cycle-additional check

In `branching-story-turn-cycle/SKILL.md` Phase 9, add `causal_dependency_threat_scan` as the fifth turn-cycle-additional check, running after the `state_delta` is drafted and before snapshot hashes are computed. Define the four sub-checks (`choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer` as errors; `slt_precondition_clobbered` as a warning) per Assumption Reassessment item 2. Update the "4 turn-cycle-additional checks" count references (`:43`, `:84`, `:342`, and the Guardrails/§ summary) to 5, naming the new check in the enumerated list.

### 2. health-audit — Phase 2g: Causal dependency health

In `branching-story-health-audit/SKILL.md`, add `Phase 2g: Causal dependency health` after Phase 2f, applying the same four sub-checks across the audit's branch replay. Update any "2a–2f" enumeration of Phase 2 sub-phases to "2a–2g".

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Any schema, MCP, patch-engine, or validator change — the scan reads only already-landed substrate (`CHC.grounded_in`, `STSTAT`, `OBL`/`CNSQ` urgency, `visible_affordances`).
- The schema-reference prose reconciliation in the same two files (SPEC26STOCOHHAR-001) and the expected-witness discipline (SPEC26STOCOHHAR-006) — disjoint sections, separate tickets.
- Re-implementing the scan as an executable `tools/validators/` validator (rejected in SPEC-26 §Key design decisions in favor of skill-prose parity with Phase 2's existing architecture).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'causal_dependency_threat_scan\|choice_dependency_clobbered\|affordance_dependency_clobbered\|obligation_counterparty_unavailable_without_transfer\|slt_precondition_clobbered' .claude/skills/branching-story-turn-cycle/SKILL.md` returns the fifth check and its four sub-checks.
2. `grep -n 'Phase 2g' .claude/skills/branching-story-health-audit/SKILL.md` returns the new sub-phase; `grep -nE '4 turn-cycle-additional|five turn-cycle-additional|5 turn-cycle-additional' .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the count was updated from 4 to 5 everywhere.
3. Skill dry-run: a constructed two-turn fixture (turn N closes a record grounding a turn N−1 `CHC`) raises `choice_dependency_clobbered` at both turn-cycle Phase 9 and health-audit Phase 2g.

### Invariants

1. The four sub-checks are stated identically in `branching-story-turn-cycle` Phase 9 and `branching-story-health-audit` Phase 2g — turn-time and audit-time verdicts cannot diverge.
2. The scan never resolves a mystery, reorders the 8 shared hard gates, or alters the 4 prior turn-cycle-additional checks — Rule 7 firewall and HARD-GATE semantics are untouched.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The scan is a skill-prose structural check matching the architecture of health-audit Phase 2a–2f, which are themselves skill-prose; verification is grep-proof + skill dry-run.

### Commands

1. `grep -rnE 'causal_dependency_threat_scan|choice_dependency_clobbered|affordance_dependency_clobbered|obligation_counterparty_unavailable_without_transfer|slt_precondition_clobbered|Phase 2g' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `grep -rnE '[45] turn-cycle-additional|four turn-cycle-additional|five turn-cycle-additional' .claude/skills/branching-story-turn-cycle/SKILL.md`
3. A grep-plus-dry-run boundary is correct: the scan is skill-prose with no machine-layer surface, mirroring how Phase 2a–2f are verified — there is no validator binary to invoke.
