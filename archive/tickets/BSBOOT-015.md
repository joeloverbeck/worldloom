# BSBOOT-015: Bootstrap-specific strict validator (pre-Phase-10 schema discipline)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — new pre-Phase-10 step + new reference file. The validator is operator-discipline running over in-memory records before Phase 10's HARD-GATE; it does not require new validator code. (A future ticket may upgrade this to a code-level validator under `tools/validators/src/bootstrap-discipline/`; that's out of scope here.)
**Deps**: archive/tickets/BSBOOT-003.md (relies on the renamed STINT field for the `stent_id` discipline check), archive/tickets/BSBOOT-009.md (relies on the conditional CNSQ discipline so the validator does not require unused records), archive/tickets/BSBOOT-010.md (relies on the new SF visibility default + basis enum), archive/tickets/BSBOOT-013.md (relies on the new CHC `continuation_capacity` block).

## Problem

`references/engine-envelope-shape.md:84-85` documents:

> "The story-bundle record schemas at `tools/validators/src/schemas/story-*.schema.json` require only `id` and `story_id` with `additionalProperties: true` — every other field documented in `templates/story-records.yaml` and the storylet-pool-authoring template is operator-discipline rather than schema-enforced."

Phase 9's 12 gates cover the load-bearing soft-required cases:

- gate 6 (cast intention coverage),
- gate 7 (obligation salience + ≥2 payoff_modes),
- gate 8 (epistemic_class declared on every SF),
- gate 9 (storylet diversity ≥5 distinct shapes),
- gate 11 (choice consequence-capacity),
- gate 12 (state_snapshot completeness + recursive reference closure).

But several soft-required fields have NO bootstrap-time gate and only fail at Phase 11 submit time (or worse, at runtime page-cycle), specifically:

- CHC.choice_contract completeness: `user_intent`, `guaranteed_action`, `success_policy`, `allowed_outcome_band`, `forbidden_outcomes`, `minimum_state_change` (template lines 364-378). A CHC with empty `forbidden_outcomes` or missing `success_policy` is operationally broken; the JSON schema accepts it.
- STENT.role_in_story enum (`protagonist | major | supporting | antagonist | foil`) — gate 6 implies presence but doesn't enumerate.
- STINT structural completeness (after BSBOOT-003: `stent_id`, `world_character_id`, plus at least one of `goals` / `fears` / `beliefs` for protagonists/majors per the Phase 2 halt rule).
- THR.type enum (`mystery | relationship | threat | quest | theme | survival`) presence.
- SREL.relation_type populated (the field is open per template line 185).
- SF.reader_visibility_basis when visible_to_reader: true (after BSBOOT-010).
- BR-0001 root-branch invariants: `parent_page_id: null`, `branch_path: [PG-0001]`, `forked_from_*: null`.

Each of these failing in production means a runtime page-cycle that loads a corrupt bundle and fails at first tick.

## Assumption Reassessment (2026-05-06)

1. `references/engine-envelope-shape.md:84-85` — verified permissive schemas.
2. `references/phase-9-validation-gates.md` 12-gate list — verified the gaps named above.
3. `templates/story-records.yaml:364-378` — verified CHC `choice_contract` block has multiple soft-required sub-fields.
4. Cross-skill / cross-artifact boundary: this validator is bootstrap-only (Phase 9.5, between Phase 9 gates and Phase 10 HARD-GATE). It does not change the patch-engine submit path; it does not extend the JSON schemas. Its outputs feed Phase 10's deliverable summary.
5. FOUNDATIONS / hard-gate principle: Phase 9 gates are the FOUNDATIONS-anchored checks (Rules 1, 4, 5, 7). Phase 9.5 catches the soft-required-by-discipline residue that the gates intentionally do not cover. The HARD-GATE per-gate-PASS-with-rationale discipline is preserved; Phase 9.5 records its own one-line PASS rationale alongside Phase 9's 12 entries.
6. Schema-extension classification: this is a new bootstrap-time validation step (Phase 9.5). Records and schemas are unchanged; only the workflow gets a new check.
7. Naming: "Phase 9.5" is consistent with BSBOOT-014's "Phase 7.5" precedent (insert between an existing pair without renumbering).
8. Worked check: a bootstrap that produces a CHC with empty `forbidden_outcomes` would currently pass Phase 9 (no gate names this field) but fail at runtime when the page-cycle tries to validate the choice's outcome band. Phase 9.5 catches it pre-Phase-10.
9. Sibling-scope check: `tickets/BSBOOT-016.md` names Phase 9.5 as a possible future code-level enforcement site for CHC pair-distance, but it owns a Phase 8 diversification rule and remains active. BSBOOT-015 does not absorb that rule; Phase 9.5 here covers the 10 soft-required-field checks listed below.
10. Same-seam correction: because Phase 9.5 must pass before Phase 10 approval, the Phase 10 deliverable summary should surface the Phase 9.5 verdict alongside the existing firewall verdicts. This stays inside `SKILL.md` and does not add a new file.

## Architecture Check

1. **Why cleaner**: Phase 9.5 closes the gap between the FOUNDATIONS-anchored gates (intentionally narrow) and the operationally-required field set (broader). It records a single PASS with rationale, parallel to the 12 Phase 9 gates, and routes failures to the responsible upstream phase.
2. **Alternative considered**: extending Phase 9 with a 13th-Nth gate per soft-required field. Rejected: Phase 9 gates 1-12 are FOUNDATIONS-anchored; mixing operator-discipline checks into the same numbered list dilutes the FOUNDATIONS provenance. A separate "Phase 9.5: Bootstrap Discipline Validator" preserves the FOUNDATIONS / discipline distinction.
3. No backwards-compatibility shim. Phase 9.5 runs on every new bootstrap; existing committed bundles are not retroactively validated.

## Verification Layers

1. New reference file at `references/phase-9-5-bootstrap-discipline-validator.md` exists and enumerates every soft-required check → codebase grep-proof + manual review.
2. `SKILL.md` Process Flow + procedure list reference Phase 9.5 → codebase grep-proof.
3. `STORY_KERNEL.md` template's `validation_trace` (or a new `discipline_validation_trace`) records Phase 9.5's PASS rationale → codebase grep-proof.
4. The HARD-GATE block at SKILL.md top references Phase 9.5 in addition to Phase 9 → codebase grep-proof.
5. Each soft-required check in the validator routes failures to the correct upstream phase → manual review of the route table.

## Landed Changes

### 1. NEW: `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md`

Created the Phase 9.5 reference. It defines 10 discipline checks, each route-to-fix phase, PASS-with-rationale semantics, the post-Phase-9 / pre-Phase-10 ordering, and the `STORY_KERNEL.md.discipline_validation_trace` output surface.

### 2. `.claude/skills/branching-story-bootstrap/SKILL.md`

Added Phase 9.5 to the HARD-GATE condition, process-flow diagram, procedure list, and Phase 10 deliverable summary. Phase 10 approval now surfaces the Phase 9.5 bootstrap-discipline verdict alongside the existing firewall verdicts.

### 3. `.claude/skills/branching-story-bootstrap/templates/story-kernel.md`

Added a new `discipline_validation_trace` frontmatter block after `validation_trace`, with one key per Phase 9.5 check, plus a matching body section for the human-readable PASS rationales.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (new)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify)

## Out of Scope

- A code-level validator under `tools/validators/src/bootstrap-discipline/`. The current ticket establishes Phase 9.5 as an operator-discipline step; if recurring failures justify code-level enforcement, that becomes a follow-up ticket.
- Adding the same checks to `branching-story-page-cycle` (the runtime has its own Phase 9 gates; cross-skill alignment is a separate concern).
- Migration of existing bundles. Forward-only.

## Acceptance Criteria

### Tests That Must Pass

1. `ls .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` exists.
2. `grep -nE "Phase 9\.5|discipline_validation_trace|Bootstrap Discipline" .claude/skills/branching-story-bootstrap/SKILL.md` returns matches in the Process Flow diagram, the procedure list, and the HARD-GATE block.
3. `grep -nE "discipline_validation_trace" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` returns the new frontmatter block.
4. The 10 discipline checks are enumerated; each names the routed-to-on-FAIL upstream phase.

### Invariants

1. Phase 9.5 runs after Phase 9 and before Phase 10's HARD-GATE.
2. The HARD-GATE requires Phase 9.5 PASS for every check (in addition to Phase 9's 12 gates).
3. `discipline_validation_trace` is structurally distinct from `validation_trace`.
4. No FOUNDATIONS-anchored check is duplicated between Phase 9 and Phase 9.5.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `test -f .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md`
2. `grep -nE "Phase 9\\.5|discipline_validation_trace|Bootstrap Discipline" .claude/skills/branching-story-bootstrap/SKILL.md`
3. `grep -nE "discipline_validation_trace" .claude/skills/branching-story-bootstrap/templates/story-kernel.md`
4. `grep -nE "discipline_check_" .claude/skills/branching-story-bootstrap/templates/story-kernel.md`
5. `grep -nE "Routes to on FAIL|Phase 8|Phase 2|Phase 5|Phase 3|Phase 7" .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md`
6. (Manual) walk through a hypothetical bootstrap with a CHC missing `forbidden_outcomes` and verify Phase 9.5 check 1 fires the Phase 8 re-derive.

## Outcome

Completed: 2026-05-06.

Phase 9.5 now exists as bootstrap-only operator discipline. The bootstrap skill requires the 10 discipline checks before Phase 10 approval, the Phase 10 summary exposes the verdict, and the story kernel template records the checks in a trace distinct from the FOUNDATIONS-anchored Phase 9 `validation_trace`.

## Verification Result

1. `test -f .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` — passed; the new reference file exists.
2. `grep -nE "Phase 9\\.5|discipline_validation_trace|Bootstrap Discipline" .claude/skills/branching-story-bootstrap/SKILL.md` — passed; matched the HARD-GATE condition, process-flow entry, procedure-list step, and Phase 10 deliverable-summary verdict.
3. `grep -nE "discipline_validation_trace" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` — passed; matched the new frontmatter block and body-section reference.
4. `grep -nE "discipline_check_" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` — passed; returned all 10 discipline-check frontmatter keys.
5. `grep -nE "^\\| [0-9]+ \\|" .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` — passed; returned the 10 discipline-check table rows.
6. `grep -nE "Routes to on FAIL|Phase 8|Phase 2|Phase 5|Phase 3|Phase 7" .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` — passed; every row has a routed-to upstream phase.
7. Manual walkthrough — passed. A CHC with empty `forbidden_outcomes` fails discipline check 1 and routes back to Phase 8 before Phase 10 approval.

## Deviations

- Reassessment added a same-seam SKILL.md update to the Phase 10 deliverable summary so the newly required Phase 9.5 verdict is visible at the approval checkpoint.
- The new Phase 9.5 reference avoids a brittle line-number citation for the PG-0001 `state_snapshot` fields and instead points to the live `templates/story-records.yaml` PG-0001 `state_snapshot` block.
- `tickets/BSBOOT-016.md` remains active and unabsorbed. Its CHC pair-distance rule is Phase 8 diversification work, not part of BSBOOT-015's 10 discipline checks.
