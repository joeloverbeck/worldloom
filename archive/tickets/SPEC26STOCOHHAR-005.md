# SPEC26STOCOHHAR-005: Add causal-dependency threat scan to turn-cycle and health-audit

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-turn-cycle` and `branching-story-health-audit` skill prose, plus SPEC-26 implementation-note truthing. No schema, MCP, or validator change.
**Deps**: None

## Problem

At intake, when a turn's `state_delta` closed or superseded a record, nothing verified that an emitted `CHC`, an open `OBL` counterparty, a visible affordance, or an eligible `SLT` precondition did not depend on it. A player could see a choice that no longer made sense, an affordance pointing at a dead record, or an obligation whose counterparty had left the stage. This was Rule 5 (No Consequence Evasion) at story scope, unenforced. SPEC-26 D4 is now implemented as `causal_dependency_threat_scan` in the turn-cycle and matching `Phase 2g` in the health audit.

## Assumption Reassessment (2026-05-14)

1. At intake, verified against the then-current codebase at SPEC-26 Step 2: `branching-story-turn-cycle/SKILL.md` Phase 9 ran 4 turn-cycle-additional checks (action-source legality, entity death/incapacity reconciliation, belief/visibility coverage, write-in world-logic rationale) — confirmed at `:43` and `:342`; a fifth check was the next slot. `branching-story-health-audit/SKILL.md` Phase 2 ran sub-phases 2a–2f (`:151`–`:203`); `2g` was the next sub-phase. SPEC-25 D5's `CHC.grounded_in`, D1's `STSTAT`, and D3's `OBL`/`CNSQ` `urgency` were all landed — confirmed present in `story-state-contract.md` §4 and the JSON schemas — so the scan's substrate existed.
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D4: the scan has four sub-checks — `choice_dependency_clobbered` (error: a record in an emitted `CHC.grounded_in.records[]` is closed/superseded/moved/invalidated but the `CHC` remains emitted), `affordance_dependency_clobbered` (error: a `PG.state_snapshot.visible_affordances` entry survives its grounding `STLOC`/`STOBJ`/`STENT` going inactive/inaccessible/relocated), `obligation_counterparty_unavailable_without_transfer` (error: an entity owing/owed an open `OBL` becomes unavailable per its active `STSTAT` without the `OBL` being closed or transferred), `slt_precondition_clobbered` (warning: a high-salience open debt's eligible author-pool `SLT` has its preconditions destroyed without the debt being closed/transferred/replaced).
3. Cross-skill / cross-artifact boundary under audit: the causal-dependency invariant shared between `branching-story-turn-cycle` Phase 9 (turn-time enforcement, before snapshot hashes are computed) and `branching-story-health-audit` Phase 2 (audit-time replay enforcement). Both consume the same already-landed substrate (`CHC.grounded_in`, `STSTAT`, `OBL`/`CNSQ` urgency, `PG.state_snapshot.visible_affordances`); the four sub-checks must be stated identically in both places so a turn-time pass and an audit-time pass agree.
4. FOUNDATIONS principle under audit: Rule 5 (No Consequence Evasion) — at story scope, "if a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest." `causal_dependency_threat_scan` IS Rule 5 at story scope: `obligation_counterparty_unavailable_without_transfer` forces a dangling obligation to be closed or transferred; the other sub-checks force a clobbered dependency to be integrated or explicitly resolved before the page commits. It also engages §Story Bundles §5c — it asks only "does current state still support what it claims", never "where should the story go".
5. HARD-GATE / gate-validation surface (per `tickets/README.md` check 9): this ticket adds a fifth check to `branching-story-turn-cycle` Phase 9 — the validation phase that immediately precedes the Phase 10 HARD-GATE — and a Phase 2g to the health audit's structural replay. Confirmed: the new check operates on `CHC`/`OBL`/affordance/`SLT` dependency clobbering only; it does not touch gate 3 (the mystery/invariant firewall), does not resolve any `forbidden`-status mystery, and does not reorder or relax the existing 8 shared hard gates or the 4 prior additional checks — the Mystery Reserve firewall and HARD-GATE semantics are unchanged.
6. Adjacent contradiction classification (per `tickets/_TEMPLATE.md` menu item 8): reassessment surfaces that `slt_precondition_clobbered` overlaps `branching-story-health-audit` Phase 2c's existing `invalidated_debt` finding. Classification: **acknowledged-acceptable redundancy, not a bug** — `slt_precondition_clobbered` fires at *turn time* (before the page commits), `invalidated_debt` fires at *audit time*; the turn-time catch is the earlier, cheaper surface. Per SPEC-26 §Risks, if implementation finds the turn-time sub-check fully redundant with Phase 2c, dropping `slt_precondition_clobbered` is acceptable — record the decision in the completion note.
7. Closeout reassessment: `slt_precondition_clobbered` was retained as the warning-severity turn-time check. `branching-story-health-audit` Phase 2g also reports it as WARNING and routes remediation to `commitment_block` when a replacement block is needed, otherwise `turn_repair`; this preserves the SPEC-26 redundancy decision without weakening Phase 2c's audit-time `invalidated_debt` finding.
8. Proof-surface correction: no executable workflow runner exists for invoking these prose skills against a constructed two-turn fixture inside the public repo. The active proof boundary is grep proof plus manual fixture review of the four sub-check definitions in both skills; the original "skill dry-run" wording is treated as a manual/surrogate proof, not as a command that was run.

## Architecture Check

1. Skill-prose checks (not an executable `tools/validators/` validator) is the cleaner choice: `branching-story-health-audit` Phase 2's six existing sub-phases (2a–2f) are all skill-prose structural replay, so a seventh sub-phase matching that architecture is structurally consistent rather than a new mechanism. `CHC.grounded_in` (SPEC-25 D5) already supplies the machine-readable substrate the checks read, so no validator infrastructure is needed.
2. No backwards-compatibility aliasing or shims — the scan is net-new; the 4 prior turn-cycle-additional checks and the 2a–2f health-audit sub-phases are unchanged.

## Verification Layers

1. The turn-cycle gains a fifth additional check -> codebase grep-proof: `causal_dependency_threat_scan` and its four sub-checks appear in `branching-story-turn-cycle/SKILL.md` Phase 9, and the "4 turn-cycle-additional checks" count references are updated to 5.
2. The health audit gains Phase 2g -> codebase grep-proof: `Phase 2g` with the same four sub-checks appears in `branching-story-health-audit/SKILL.md` after Phase 2f.
3. The scan catches a clobbered choice dependency -> manual fixture review: a two-turn fixture where turn N closes a record in turn N−1's `CHC.grounded_in.records[]` maps to `choice_dependency_clobbered` at turn time, and the Phase 2g replay maps to the same finding at audit time.
4. The two statements agree -> manual review: the four sub-checks are worded identically in turn-cycle Phase 9 and health-audit Phase 2g, so turn-time and audit-time verdicts cannot diverge.

## What to Change

### 1. turn-cycle — fifth turn-cycle-additional check

`branching-story-turn-cycle/SKILL.md` Phase 9 now includes `causal_dependency_threat_scan` as the fifth turn-cycle-additional check, running after the `state_delta` is drafted and before snapshot hashes are computed. The four sub-checks (`choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer` as errors; `slt_precondition_clobbered` as a warning) are defined per Assumption Reassessment item 2. The "4 turn-cycle-additional checks" references are updated to 5, and Rule 5 alignment names the new dependency-clobbering mechanism.

### 2. health-audit — Phase 2g: Causal dependency health

`branching-story-health-audit/SKILL.md` now has `Phase 2g: Causal dependency health` after Phase 2f, applying the same four sub-checks across the audit's branch replay. Structural-mode counts and the SAU report template now include the seventh structural sub-phase.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-26-story-coherence-hardening-ii.md` (modify — implementation note only)

## Out of Scope

- Any schema, MCP, patch-engine, or validator change — the scan reads only already-landed substrate (`CHC.grounded_in`, `STSTAT`, `OBL`/`CNSQ` urgency, `visible_affordances`).
- The schema-reference prose reconciliation in the same two files (SPEC26STOCOHHAR-001) and the expected-witness discipline (SPEC26STOCOHHAR-006) — disjoint sections, separate tickets.
- Re-implementing the scan as an executable `tools/validators/` validator (rejected in SPEC-26 §Key design decisions in favor of skill-prose parity with Phase 2's existing architecture).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'causal_dependency_threat_scan\|choice_dependency_clobbered\|affordance_dependency_clobbered\|obligation_counterparty_unavailable_without_transfer\|slt_precondition_clobbered' .claude/skills/branching-story-turn-cycle/SKILL.md` returns the fifth check and its four sub-checks.
2. `grep -n 'Phase 2g' .claude/skills/branching-story-health-audit/SKILL.md` returns the new sub-phase; `grep -nE '4 turn-cycle-additional|five turn-cycle-additional|5 turn-cycle-additional' .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the count was updated from 4 to 5 everywhere.
3. Manual fixture review: a constructed two-turn fixture (turn N closes a record grounding a turn N−1 `CHC`) maps to `choice_dependency_clobbered` at both turn-cycle Phase 9 and health-audit Phase 2g. No executable skill runner exists for this prose-only workflow in the public repo.

### Invariants

1. The four sub-checks are stated identically in `branching-story-turn-cycle` Phase 9 and `branching-story-health-audit` Phase 2g — turn-time and audit-time verdicts cannot diverge.
2. The scan never resolves a mystery, reorders the 8 shared hard gates, or alters the 4 prior turn-cycle-additional checks — Rule 7 firewall and HARD-GATE semantics are untouched.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The scan is a skill-prose structural check matching the architecture of health-audit Phase 2a–2f, which are themselves skill-prose; verification is grep-proof + manual fixture review.

### Commands

1. `grep -rnE 'causal_dependency_threat_scan|choice_dependency_clobbered|affordance_dependency_clobbered|obligation_counterparty_unavailable_without_transfer|slt_precondition_clobbered|Phase 2g' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `grep -rnE '[45] turn-cycle-additional|four turn-cycle-additional|five turn-cycle-additional' .claude/skills/branching-story-turn-cycle/SKILL.md`
3. A grep-plus-manual-review boundary is correct: the scan is skill-prose with no machine-layer surface, mirroring how Phase 2a–2f are verified — there is no validator binary or skill runner to invoke.

## Outcome

Completed: 2026-05-14.

Implemented. `branching-story-turn-cycle` Phase 9 now has 5 turn-cycle-additional checks and includes `causal_dependency_threat_scan` before final PG hash computation. `branching-story-health-audit` structural mode now has 7 sub-phases and includes Phase 2g causal dependency health. The four sub-checks are stated with the same names, severities, and condition text in both skills. SPEC-26 now has a dated D4 implementation note.

## Verification Result

1. `grep -rnE 'causal_dependency_threat_scan|choice_dependency_clobbered|affordance_dependency_clobbered|obligation_counterparty_unavailable_without_transfer|slt_precondition_clobbered|Phase 2g' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — passed; both skills contain the scan/sub-checks, and health-audit contains Phase 2g.
2. `grep -rnE '[45] turn-cycle-additional|four turn-cycle-additional|five turn-cycle-additional' .claude/skills/branching-story-turn-cycle/SKILL.md` — passed; active turn-cycle count references are `5 turn-cycle-additional`; no `4 turn-cycle-additional` or `four turn-cycle-additional` hit remains in the skill.
3. `if grep -rnE '6 structural sub-phases|six structural sub-phases|2a[–-]2f' .claude/skills/branching-story-health-audit/SKILL.md; then exit 1; fi` — passed with no hits; structural mode now names 7 sub-phases / 2g.
4. Manual fixture review — passed; a turn that closes a record grounding a still-emitted prior `CHC` maps to `choice_dependency_clobbered` in both turn-cycle Phase 9 and health-audit Phase 2g. The equivalent clobbered-affordance, unavailable-counterparty, and SLT-precondition cases map to the same named sub-checks in both skills.
5. `git diff --check` — passed.

## Deviations

The original acceptance text called the representative fixture proof a "skill dry-run". Reassessment found no executable runner for these prose-only skills in the public repo, so closeout uses grep proof plus manual fixture review instead. No schema, MCP, patch-engine, validator, or world-content files changed.
