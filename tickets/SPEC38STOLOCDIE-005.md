# SPEC38STOLOCDIE-005: Amend `branching-story-health-audit` with Phase 2x DA checks

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-health-audit/SKILL.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md, archive/tickets/SPEC38STOLOCDIE-010.md, SPEC38STOLOCDIE-011

## Problem

`branching-story-health-audit` covers BEL/visibility (Phase 2d), mystery/canon safety (Phase 2e), continuation health (Phase 2f), and 5 other structural checks (Phases 2a, 2b, 2c, 2g, 2h) but ZERO DA-specific checks across all 8 sub-phases. The audit does not check DA active-record consistency, CHC.grounded_in.records[].DA accessibility, duplicate-DA presence, or body specificity. Operators running health-audit on a story bundle with DA-related defects (CHC grounding in an inactive DA; duplicate DAs lacking supersedes/derived_from; vague DA bodies that future quotation will fail to support) receive no feedback. This ticket adds a new Phase 2x sub-section covering 3 narrowed mechanical checks plus 1 authorial body-specificity warning.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2a-2h has zero DA-specific checks (per brainstorm agent verification — audit covers BEL/visibility/mystery/canon-safety/continuation but no DA active-in-PG check, no CHC.grounded_in DA accessibility check, no duplicate-DA heuristic, no body-specificity warning).
2. Verified SPEC-38 §D5 prescribes 3 mechanical checks (consumes validators from tickets 010 + 011) plus 1 authorial warning, with a cross-reference to existing validators (`expected_witness_coverage`, `record_schema_compliance`) that already cover their respective surfaces and are not re-implemented here. The narrowed scope (vs the source report's 9 FAIL + 8 WARN list) is documented per SPEC-38 §Key design decision #2 with overlapping conditions deferred to §Risks #2.
3. Cross-skill boundary: this ticket's audit prose consumes verdict codes `chc_grounded_in_da_not_active` (from ticket 010) and `story_da_duplicate_heuristic` (from ticket 011). The verdict-code names must match the validator implementations; ticket 005 lands AFTER 010 and 011 so the cited codes resolve. Cross-reference to existing validators must match their current names exactly.
4. FOUNDATIONS principles motivating this ticket: Rule 1 No Floating Facts (DA must remain reachable from its grounding choices — D10 check enforces this at the CHC boundary); Rule 6 No Silent Retcons (duplicate DAs without supersedes/derived_from break the audit trail — D11 heuristic surfaces candidates); §Story Bundles §6b Information / Observer Firewall (CHC grounding access is the runtime firewall enforcement point at audit time).

## Architecture Check

1. Narrowed scope (3 mechanical + 1 authorial check, not the source report's 9 FAIL + 8 WARN): per SPEC-38 §Key design decision #2, 6 of the report's conditions are already covered by existing structural validators (`expected_witness_coverage`, `record_schema_compliance`); the remaining 9 await pilot-bundle evidence per §Risks #2. Landing the load-bearing 3 + 1 establishes the discipline and gives the next iteration concrete evidence for which additional checks to implement.
2. Cross-reference to existing validators (not re-implementation): SPEC-38 §D5 explicitly notes `expected_witness_coverage` and `record_schema_compliance` already cover their surfaces; the new Phase 2x section names them rather than duplicating their logic.
3. No backwards-compatibility shims; Phase 2x is a new additive sub-section within existing Phase 2 structure.

## Verification Layers

1. Phase 2x sub-section present → codebase grep-proof: `grep -nE '^### 2x|DA health|chc_grounded_in_da_not_active|story_da_duplicate_heuristic' .claude/skills/branching-story-health-audit/SKILL.md`.
2. All 4 checks (3 mechanical + 1 authorial) described with verdict codes where applicable → grep + manual review against §D5 §Change list.
3. Cross-reference to existing validators (`expected_witness_coverage`, `record_schema_compliance`) noted as already-covered → grep-proof.
4. Validator verdict-code names match implementations in tickets 010 + 011 → cross-validation: `grep -E 'chc_grounded_in_da_not_active' tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` (per ticket 010) AND `grep -E 'story_da_duplicate_heuristic' tools/validators/src/structural/story-da-duplicate-heuristic.ts` (per ticket 011) — names align across audit prose and validator implementations.

## What to Change

### 1. Add new Phase 2x sub-section

Placement per SPEC-38 §D5: after Phase 2d (belief/visibility health), before Phase 2e (mystery/canon safety). Title: `2x — DA health`. Content covers 4 checks:

1. **CHC active-record DA accessibility** (consumes ticket 010 validator). Every `DA-<integer>` in any active `CHC.grounded_in.records[]` MUST be in the emitting PG's `state_snapshot.active_records.DA[]`. Verdict code `chc_grounded_in_da_not_active` (D10) surfaces violations. Severity: FAIL.
2. **Duplicate DA heuristic** (consumes ticket 011 validator). WARN when multiple active DAs share `(title + author)` exactly without a chain via `supersedes` or `derived_from`. Verdict code `story_da_duplicate_heuristic` (D11) surfaces candidates; the audit lists each cluster for operator review. Severity: WARN.
3. **DA body specificity** (authorial; no validator). WARN when a DA body matches non-specific patterns such as "contains a clue", "reveals a secret", "describes the truth", "explains everything", or otherwise lacks the clue-bearing content that later quotation / comparison / audit would require. Phase 2x scans active DA bodies, lists candidates for operator review, and points the operator at `da-authoring-reference.md` §Field semantics §body. No verdict-code consumption — authorial warning only.
4. **Cross-reference to existing validators**. Phase 2x prose notes that `expected_witness_coverage` (public/factional DA propagation) and `record_schema_compliance` (DA schema enum violations) already cover their respective surfaces and are not re-implemented here.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The remaining 9 audit conditions from `reports/story-local-diegetic-artifacts.md` §10 (circulation/BEL mismatch, suppressed-artifact custody, `truth_relation: true` without support, body-overlength, world-level DA import ambiguity, suppressor evidence check, etc.) — deferred per SPEC-38 §Risks #2 pending pilot-bundle evidence
- Validator implementations (live in tickets 010 + 011; this ticket only adds audit prose that CONSUMES the verdict codes)
- Other Phase 2 sub-sections (2a-2h) — not modified by this ticket
- DA schema changes (deferred per SPEC-38 §Out of Scope)

## Acceptance Criteria

### Tests That Must Pass

1. Phase 2x sub-section present at the specified placement.
2. All 4 checks described with their verdict codes (where applicable) and operator-action guidance.
3. Cross-reference to existing `expected_witness_coverage` and `record_schema_compliance` validators is concrete.
4. Verdict-code names match validator implementations (tickets 010 + 011).

### Invariants

1. The audit remains read-only — Phase 2x adds new check guidance but does not mutate story state or world canon.
2. Phase 2x cross-references the same shared reference (`da-authoring-reference.md`) as bootstrap (ticket 003) and turn-cycle (ticket 004).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'Phase 2x|DA health|chc_grounded_in_da_not_active|story_da_duplicate_heuristic' .claude/skills/branching-story-health-audit/SKILL.md`
2. `grep -nE 'chc_grounded_in_da_not_active' tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` (cross-validation against ticket 010)
3. `grep -nE 'story_da_duplicate_heuristic' tools/validators/src/structural/story-da-duplicate-heuristic.ts` (cross-validation against ticket 011)
