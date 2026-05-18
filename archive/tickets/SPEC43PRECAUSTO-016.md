# SPEC43PRECAUSTO-016: Health-Audit `compatibility` Mode + SAU Report Section

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-health-audit/SKILL.md` to add a new `compatibility` audit mode (also `structural,compatibility` composite mode) + a new `Compatibility drift` section in SAU reports.
**Deps**: archive/tickets/SPEC43PRECAUSTO-012.md

## Problem

At intake, SPEC-43 §Approach E + §Approach H Phase 2i vs Phase 9 clarification required health-audit skill amendments: (a) a new audit mode `compatibility` (or composite `structural,compatibility`) that runs the `compatibility_drift` validator from `archive/tickets/SPEC43PRECAUSTO-012.md` + emits findings in a new SAU report section; (b) explicit clarification that the new mid-story-introduction validators (tickets 003-011) are Phase 9 turn-cycle gates (per ticket 013), NOT Phase 2i retrospective audits. This ticket landed that skill prose, so authors now have a documented compatibility-drift audit mode and the Phase 2i / Phase 9 boundary is explicit.

## Assumption Reassessment (2026-05-18)

1. `branching-story-health-audit/SKILL.md` documents Phase 2i ("CLK / STSEC / STQ mechanism health") with the load-bearing rule: "These checks are retrospective audit warnings, not page-commit HARD-REJECTs... They only run when the corresponding record class exists in the scoped bundle; absence of CLK / STSEC / STQ records is never itself a finding." This rule was preserved unchanged; the new `compatibility` mode is additive.
2. SPEC-43 §Approach H is explicit: "The new mid-story-introduction validators are per-commit gates in Phase 9 of turn-cycle, NOT Phase 2i retrospective audits. Phase 2i at `branching-story-health-audit/SKILL.md:280` retains its 'absence of CLK / STSEC / STQ records is never itself a finding' rule + retrospective mechanism-rot audits. The new `compatibility_drift` reporting IS a Phase 2i extension (new audit-mode `compatibility` or `structural,compatibility`); the introduction validators are NOT."
3. Cross-skill boundary under audit: the new audit mode consumes `archive/tickets/SPEC43PRECAUSTO-012.md`'s `compatibility_drift` validator (`applies_to: ["branching-story-health-audit", ...]`); the SAU report section enumerates compatibility-drift findings + classifications.
4. FOUNDATIONS §Story Bundles §4b (Canon Baseline Drift) restated: canon-baseline drift is operationally distinct from schema drift; this audit mode tracks the latter. The SAU report's new Compatibility-drift section sits alongside existing audit sections without conflating with canon-baseline-drift findings.

## Architecture Check

1. Cleaner than alternative #1 (add a new top-level audit mode that runs ONLY compatibility-drift): the composite-mode pattern (`structural,compatibility`) follows the existing mode-composition convention in the health-audit skill; adopting that pattern keeps the skill's mode taxonomy consistent.
2. Cleaner than alternative #2 (fold compatibility-drift into the existing `structural` mode): drift findings are advisory (info/warn), not structural failures; bundling them into the existing structural mode would noise-pollute structural-mode output. A separate mode is cleaner.
3. No backwards-compatibility aliasing/shims introduced: the new mode is purely additive; existing audit modes (`structural`, `prose`, `remediation`, `cross_story`) retain semantics.

## Verification Layers

1. Audit mode addition → codebase grep-proof: `grep -n "compatibility\|structural,compatibility" .claude/skills/branching-story-health-audit/SKILL.md` returns the new mode documentation.
2. Compatibility-drift section in SAU → codebase grep-proof: `grep -n "Compatibility drift\|compatibility_drift" .claude/skills/branching-story-health-audit/SKILL.md` returns the new SAU section template.
3. Phase 2i vs Phase 9 clarification → codebase grep-proof: `grep -n "introduction validators\|Phase 9.*not Phase 2i\|Phase 2i.*not introduction" .claude/skills/branching-story-health-audit/SKILL.md` returns the new clarification statement.
4. Existing Phase 2i rule preserved → codebase grep-proof: `grep -n "absence of CLK / STSEC / STQ records is never itself a finding" .claude/skills/branching-story-health-audit/SKILL.md` continues to return the existing line 280 rule.

## Landed Changes

### 1. Amend health-audit SKILL.md to add `compatibility` audit mode

Added to the audit-mode listing (alongside existing `structural`, `prose`, `remediation`, `cross_story`):

> **`compatibility`** (or `structural,compatibility` composite) — runs the `compatibility_drift` validator (per `archive/tickets/SPEC43PRECAUSTO-012.md`) against the bundle structure + PG snapshots. Emits info-level findings for missing optional `_source/{clocks,secrets,story-questions,artifacts}/` subdirectories + missing CLK/STSEC/STQ/DA keys in PG snapshots; warn-level findings when a new PG omits required active-record keys without grandfathered-parent explanation. Hard-fail severity for new-current-contract PG shape mismatch is deferred to Wave 3 (needs the `story_system_contract_revision` marker for deterministic detection).
>
> When invoked as the composite `structural,compatibility` mode, both structural-mode and compatibility-mode validators run; their findings are emitted in separate SAU sections.
>
> Per SPEC-43 §Approach E: this audit mode does NOT auto-create optional CLK / STSEC / STQ records to "improve playability"; pure compatibility scan writes SAU/SCMP report artifacts only. The classification enum (`current_contract` / `compatible_optional_absence` / `grandfathered_snapshot_shape` / `compatible_with_advisory` / `requires_compatibility_audit` / `requires_migration_patch` / `manual_review` / `blocked_contract_break`) is recorded per-bundle in the SAU report.

### 2. Add Compatibility-drift section template to SAU report structure

Documented the new SAU section the compatibility audit mode emits:

> **§Compatibility drift** (compatibility-mode audit only) — enumerates:
> - **Classification**: one of `current_contract` / `compatible_optional_absence` / `grandfathered_snapshot_shape` / `compatible_with_advisory` / `requires_compatibility_audit` / `requires_migration_patch` / `manual_review` / `blocked_contract_break`.
> - **Findings**: per-finding info/warn entries from `compatibility_drift` validator with location + recommendation.
> - **Recommendation**: per-classification routing — e.g., `compatible_optional_absence` → no action required; `requires_compatibility_audit` → manual review; `requires_migration_patch` → defer to Wave 3 dedicated compatibility-repair skill.

### 3. Add Phase 2i vs Phase 9 clarification statement

Inserted near the existing Phase 2i rule:

> **Phase 2i scope vs SPEC-43 mid-story-introduction validators**: the SPEC-43 mid-story-introduction validators (`midstory_record_introduction_grounding`, `clock_introduction_grounding_integrity`, `secret_introduction_anchor_integrity`, `story_question_introduction_grounding_integrity`, `thread_introduction_grounding_integrity`, `entity_introduction_status_pairing`, `relationship_introduction_grounding_integrity`, `introduction_observer_firewall`, `narrative_shape_field_rejection`) are per-commit gates in **branching-story-turn-cycle Phase 9** — NOT Phase 2i retrospective audits. Phase 2i retains its existing "absence is not a finding" rule + retrospective mechanism-rot audits. The new `compatibility_drift` reporting IS a Phase 2i extension (via the new `compatibility` audit mode); the introduction validators are NOT.

### 4. No changes to Phase 2i existing rules

Phase 2i mechanism-health rules ("absence of CLK / STSEC / STQ records is never itself a finding") remain unchanged. SPEC-43's compatibility-drift validator handles absence as `info`-level "compatible optional absence" (NOT a Phase 2i finding).

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Phase 9 gates 12-15 documentation — handled by ticket 013.
- The `compatibility_drift` validator implementation — handled by `archive/tickets/SPEC43PRECAUSTO-012.md`.
- Snapshot-key normalization — handled by `archive/tickets/SPEC43PRECAUSTO-012.md`.
- Dedicated `branching-story-compatibility-repair` skill — deferred to Wave 3.
- `story_system_contract_revision` marker — deferred to Wave 3.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "compatibility\|structural,compatibility" .claude/skills/branching-story-health-audit/SKILL.md` returns the new audit-mode documentation.
2. `grep -n "Compatibility drift" .claude/skills/branching-story-health-audit/SKILL.md` returns the new SAU section template.
3. `grep -n "absence of CLK / STSEC / STQ records is never itself a finding" .claude/skills/branching-story-health-audit/SKILL.md` returns the preserved Phase 2i rule (unchanged).
4. `grep -nE "Phase 9.{0,80}not Phase 2i|Phase 2i.{0,80}not.*introduction|mid-story-introduction validators.{0,40}Phase 9" .claude/skills/branching-story-health-audit/SKILL.md` returns the new Phase 2i vs Phase 9 clarification statement.

### Invariants

1. Phase 2i existing semantics ("absence is not a finding" + retrospective mechanism-rot audits) are preserved unchanged.
2. The new `compatibility` audit mode is composable with `structural` via `structural,compatibility` — both mode-set instances must produce internally-consistent SAU outputs (no conflicting findings from the two modes).
3. The Phase 2i vs Phase 9 clarification prevents mis-wiring of the introduction validators into Phase 2i — a real risk surfaced in SPEC-43 §Risks & Open Questions.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The `compatibility_drift` validator behavior is tested by `archive/tickets/SPEC43PRECAUSTO-012.md`; this ticket only updates skill prose to document the audit mode + SAU report section + Phase 2i/9 clarification.

### Commands

1. `grep -nE "compatibility|Compatibility drift|Phase 2i" .claude/skills/branching-story-health-audit/SKILL.md` (sanity grep that the amendments landed).

## Outcome

Completed on 2026-05-18.

Updated `.claude/skills/branching-story-health-audit/SKILL.md` so the skill now documents five modes, including `compatibility`, and accepts the composite `structural,compatibility` form. Added a conditional Phase 2j compatibility-drift pass that consumes `compatibility_drift`, records Wave 2 info/warn classifications, keeps structural findings separate in composite mode, and explicitly forbids automatic optional `CLK` / `STSEC` / `STQ` creation.

Added a `Compatibility drift` SAU report section template with classification, findings, and routing guidance. Added the Phase 2i vs Phase 9 clarification beside the existing Phase 2i mechanism-health rule, preserving the existing "absence of CLK / STSEC / STQ records is never itself a finding" rule unchanged.

## Verification Result

1. `grep -nE "compatibility|Compatibility drift|Phase 2i" .claude/skills/branching-story-health-audit/SKILL.md` returned the new mode documentation, Phase 2j compatibility-drift section, SAU `Compatibility drift` section, and Phase 2i clarification.
2. `grep -n "absence of CLK / STSEC / STQ records is never itself a finding" .claude/skills/branching-story-health-audit/SKILL.md` returned the preserved Phase 2i rule.
3. `grep -nE "Phase 9.{0,80}not Phase 2i|Phase 2i.{0,80}not.*introduction|mid-story-introduction validators.{0,40}Phase 9" .claude/skills/branching-story-health-audit/SKILL.md` returned the new Phase 2i vs Phase 9 clarification.

## Deviations

- No executable skill dry-run or package test was needed for this documentation-only ticket. The `compatibility_drift` validator behavior remains covered by `archive/tickets/SPEC43PRECAUSTO-012.md`; this ticket's proof is grep/manual contract review over the edited health-audit skill.
