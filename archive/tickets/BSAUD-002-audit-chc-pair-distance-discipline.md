# BSAUD-002: Audit persisted CHC pair-distance discipline

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-health-audit` skill contract prose and report template only.
**Deps**: archive/tickets/BSBOOT-016.md; archive/tickets/BSPAG-006-runtime-chc-pair-distance-parity.md

## Problem

At intake, BSBOOT-016 had added bootstrap Phase 8 pair-distance discipline for emitted CHC sets: every pair must differ on at least 2 of 8 existing CHC axes, with at least 1 difference from structural axes 1-6. BSPAG-006 had completed propagation of the same producer-side rule to runtime `branching-story-page-cycle`.

`branching-story-health-audit` was the read-only downstream consumer that audits persisted page records and CHC records after a story exists. It already consumed `PG.emitted_choices`, CHC actor/target/effect references, and CHC `continuation_capacity`, but it did not have an audit focus, finding category, or report-template language for CHC pair-distance violations. That meant a persisted page could offer operational cosmetic variants and the audit would not identify the fake-agency / choice-distinctness defect.

## Assumption Reassessment (2026-05-06)

1. `.claude/skills/branching-story-health-audit/SKILL.md` — verified the audit loads each in-scope page's full closure root, including `emitted_choices`, and directly reads the cited `choices/CHC-NNNN.yaml` records.
2. `.claude/skills/branching-story-health-audit/SKILL.md` and `templates/story-audit-report.md` — verified the current audit categories include `choice_continuation_capacity` but no CHC pair-distance / choice-distinctness category.
3. Cross-skill / cross-artifact boundary: `branching-story-bootstrap` and `branching-story-page-cycle` produce CHC sets; `branching-story-health-audit` consumes persisted PG / CHC records and reports read-only diagnostics.
4. FOUNDATIONS / hard-gate principle: this is a read-only audit strengthening. It does not weaken Mystery Reserve behavior, canon-write gates, approval-token behavior, `validate_patch_plan`, or `submit_patch_plan`.
5. Schema-extension classification: no persisted story schema change. The audit computes pairwise distance from existing CHC fields: `operation`, `actor`, `target`, `uses_fact`, `choice_contract.minimum_state_change`, `choice_contract.success_policy`, `choice_mode`, and `poetic_effect`.
6. Downstream-consumer scan:
   - `branching-story-page-cycle` producer parity is completed in `archive/tickets/BSPAG-006-runtime-chc-pair-distance-parity.md`.
   - `storylet-pool-authoring` owns SLT `choice_templates` scaffolds and explicitly records them as runtime-overridable; it does not emit persisted CHC sets.
   - `story-fact-promotion-to-canon` promotes story-local facts, mystery resolutions, character outcomes, or artifacts to world canon; it does not consume or validate offered-choice sets.
   - `branching-story-health-audit` is the only named read-only consumer that should inspect persisted CHC set health.
7. Implementation kept the ticket's scope unchanged: skill-local audit prose and report-template contract only. No producer skill, package code, validator, schema, world content, or archive move was added.

## Architecture Check

1. The clean design is to keep pair-distance enforcement in producer Phase 8, then add read-only detection in health-audit for persisted pages. This preserves the write-time halt-and-rederive path while giving operators a post-hoc diagnostic for older or manually repaired bundles.
2. No backwards-compatibility aliasing/shims. Existing pages that predate BSBOOT-016 / BSPAG-006 can be classified as legacy/info or warning by bundle age and producer provenance rather than migrated or silently rewritten.

## Verification Layers

1. Health-audit exposes a CHC pair-distance / choice-distinctness audit focus and finding category -> codebase grep-proof.
2. Health-audit Phase 3 or Phase 4 documents the pairwise check over each page's `emitted_choices` set using the 8 BSBOOT-016 axes and the structural-axis requirement -> codebase grep-proof + manual review.
3. Report template lists the new category and tells reports what evidence to cite -> codebase grep-proof.
4. Non-owner skills remain unchanged -> manual review; page-cycle producer work stays in BSPAG-006, and storylet-pool-authoring / story-fact-promotion-to-canon stay out of scope.

## Landed Changes

### 1. `.claude/skills/branching-story-health-audit/SKILL.md`

- Added `choice_pair_distance` to the `audit_focus` enum surfaces.
- Added a persisted CHC pair-distance integrity check under Phase 3 Coverage Analysis.
- The check inspects each in-scope page's `emitted_choices` set pairwise and computes the same 8 axes as BSBOOT-016 / BSPAG-006: `operation`, `actor`, `target`, `uses_fact`, `choice_contract.minimum_state_change`, `choice_contract.success_policy`, `choice_mode`, and `poetic_effect`.
- The check flags any pair with fewer than 2 total differences or no structural-axis difference from axes 1-6.
- Explicit pre-BSBOOT-016 / pre-BSPAG-006 pages are legacy `info` or `warning` by operator impact rather than retroactive hard failures.
- Current-format violations become `choice_pair_distance` findings, warning by default and error when the offered set collapses below two structurally distinct operational options.
- Remediation routes to page-cycle rollback / re-render / re-derive choices or manual intervention, never direct CHC mutation.
- Phase 7 self-check, Rule 5 alignment prose, and the final health rule now include CHC pair-distance evidence expectations.

### 2. `.claude/skills/branching-story-health-audit/templates/story-audit-report.md`

- Added `choice_pair_distance` to the valid finding category list.
- Documented the required evidence shape for these findings: page id, both CHC ids, same/different axis summary, structural-axis result, severity rationale, and recommended remediation route.
- The template explicitly prohibits direct CHC mutation, CHC overwrite, or hand-edited persisted choice repair from the audit.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)

## Out of Scope

- Editing `branching-story-page-cycle`; producer-side runtime parity is completed in `archive/tickets/BSPAG-006-runtime-chc-pair-distance-parity.md`.
- Editing `branching-story-bootstrap`; BSBOOT-016 already landed the bootstrap producer rule.
- Editing `storylet-pool-authoring`; SLT `choice_templates` are scaffolds, not emitted CHC records.
- Editing `story-fact-promotion-to-canon`; canon promotion does not validate offered-choice-set diversity.
- Adding validators, JSON Schema changes, package code, or world-content migrations.
- Mutating persisted CHC records. Health-audit remains read-only and emits findings / optional remediation proposals only.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'choice_pair_distance|choice_distinctness|pair-distance|structural axes 1-6' .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` returns matches.
2. Manual review confirms the audit check uses the same 8 axes and structural-axis requirement as BSBOOT-016 / BSPAG-006.
3. Manual review confirms remediation routes to page-cycle rollback / re-render / re-derive or manual intervention, not direct CHC mutation.

### Invariants

1. Health-audit remains read-only.
2. Pair-distance producer enforcement remains in Phase 8 of bootstrap/page-cycle; health-audit only diagnoses persisted defects.
3. Storylet-pool-authoring and story-fact-promotion-to-canon do not gain CHC-emission or choice-set validation responsibilities.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based plus manual contract review because these branching-story skills are prose workflow definitions.

### Commands

1. `rg -n 'choice_pair_distance|choice_distinctness|pair-distance|structural axes 1-6' .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md`
2. `rg -n 'direct CHC mutation|mutate CHC|overwrite CHC' .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` — inspect any hits and confirm no direct-mutation remediation is introduced.
3. Manual cross-read against `archive/tickets/BSBOOT-016.md`, `archive/tickets/BSPAG-006-runtime-chc-pair-distance-parity.md`, and `docs/FOUNDATIONS.md`.

## Outcome

Completed on 2026-05-06. `branching-story-health-audit` now exposes a read-only `choice_pair_distance` audit focus / finding category for persisted CHC sets. Phase 3 checks every in-scope page's `emitted_choices` pairwise against the producer-side 8-axis rule and structural-axis requirement from BSBOOT-016 / BSPAG-006, records legacy pages without retroactive mutation, and routes current-format violations to page-cycle rollback / re-render / re-derive or manual intervention. The SAU report template now lists the category and requires the page/CHC/axis/severity/remediation evidence shape.

## Verification Result

1. `rg -n 'choice_pair_distance|choice_distinctness|pair-distance|structural axes 1-6' .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` — PASS; returned the new audit focus/category, Phase 3 pair-distance evidence, Rule 5 alignment, and report-template guidance.
2. `rg -n 'direct CHC mutation|mutate CHC|overwrite CHC' .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` — PASS after inspection; the only hits are explicit prohibitions against direct CHC mutation or overwrite.
3. Manual cross-read against `archive/tickets/BSBOOT-016.md` and `archive/tickets/BSPAG-006-runtime-chc-pair-distance-parity.md` — PASS; health-audit uses the same 8 axes and structural-axis requirement as both producer tickets.
4. Manual FOUNDATIONS alignment review against `docs/FOUNDATIONS.md` Rule 5 / Story Bundle validation scope — PASS; the audit remains read-only, writes only diagnostic audit surfaces when invoked through its existing HARD-GATE, and does not mutate persisted story records or world canon.

## Deviations

None. The ticket remained a skill-contract/report-template prose change only; no producer skill, validator, schema, package code, world-content migration, or archival work was added.
