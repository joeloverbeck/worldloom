# BSBOOT-015: Bootstrap-specific strict validator (pre-Phase-10 schema discipline)

**Status**: PENDING
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

## What to Change

### 1. NEW: `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md`

Create with the following content:

```
# Phase 9.5: Bootstrap Discipline Validator

Reference for `branching-story-bootstrap` Phase 9.5 — the post-Phase-9 / pre-Phase-10 validator that records soft-required field discipline outside the FOUNDATIONS-anchored gate set. Phase 9 gates 1-12 are FOUNDATIONS rules; Phase 9.5 catches operationally-required residue that the JSON schemas (intentionally permissive) do not enforce.

Each check records PASS with a one-line rationale into `STORY_KERNEL.md.discipline_validation_trace`. A bare "PASS" is treated as FAIL per the FOUNDATIONS skill discipline. Any FAIL halts the bootstrap and routes to the responsible upstream phase.

---

## Discipline checks

| # | Check | Surface | Routes to on FAIL |
|---|---|---|---|
| 1 | CHC.choice_contract completeness | Every CHC has non-empty `user_intent`, `guaranteed_action`, `success_policy ∈ {guaranteed, attempted, uncertain, opposed}`, `allowed_outcome_band` non-empty, `forbidden_outcomes` non-empty, `minimum_state_change` non-empty | Phase 8 |
| 2 | STENT.role_in_story enum | Every STENT carries `role_in_story ∈ {protagonist, major, supporting, antagonist, foil}` | Phase 2 |
| 3 | STINT structural completeness (post-BSBOOT-003) | Every STINT carries `stent_id` (story entity it drives), `world_character_id` (or null for story-only). Protagonists + majors carry at least one of `goals`, `fears`, `beliefs` non-empty (Phase 2 halt rule restated) | Phase 2 |
| 4 | THR.type enum | Every THR carries `type ∈ {mystery, relationship, threat, quest, theme, survival}` | Phase 5 |
| 5 | SREL.relation_type populated | Every SREL carries non-empty `relation_type` | Phase 5 (or Phase 2 if relation pre-exists in cast tensions) |
| 6 | SF.reader_visibility_basis (post-BSBOOT-010) | Every SF with `visible_to_reader: true` carries `reader_visibility_basis ∈ {shown_in_pg0001, known_to_pov, dramatic_irony, diegetic_artifact_visible}` (NOT `unrevealed_objective_truth`, which pairs with `visible_to_reader: false`) | Phase 3 |
| 7 | BR-0001 root invariants | `id == 'BR-0001'`, `root_page_id == 'PG-0001'`, `current_leaf_page_id == 'PG-0001'`, `parent_page_id == null` (on PG-0001), `branch_path == ['PG-0001']`, every `forked_from_*` field is null | Phase 7 |
| 8 | OBL.coverage_cache schema (advisory but populated) | Every OBL carries a `coverage_cache` block with `compatible_storylets[]`, `checked_at_page`, `checked_at_storylet_pool_hash` — values may be empty/null at bootstrap, but the keys MUST exist | Phase 5 |
| 9 | SE-0001 genesis discipline | `id == 'SE-0001'`, `actor: system`, `action: bootstrap`, `ops: []`, `state_hash_before: null`, `state_hash_after == PG-0001.state_hash` | Phase 7 |
| 10 | PG-0001 state_snapshot field-key completeness | All keys named in `templates/story-records.yaml:294-316` are present on `PG-0001.state_snapshot` (values may be empty arrays / empty maps; the keys MUST exist for the runtime page-cycle's snapshot-replay equality check on PG-0002) | Phase 7 |

---

## Workflow

Phase 9.5 runs after every Phase 9 gate has recorded PASS and BEFORE Phase 10's deliverable summary. If any check FAILs, halt the bootstrap, surface the failing check + the routed phase, and let the operator re-derive. Up to 1 re-derive cycle per check; a second failure escalates to user with the specific record(s) failing.

`STORY_KERNEL.md.discipline_validation_trace` is a sibling block to `validation_trace` (Phase 9). Each entry: `discipline_check_<NN>_<name>: PASS — <rationale>`.

---

## Composition with Phase 9

Phase 9.5 does NOT duplicate Phase 9 work. The 12 Phase 9 gates are FOUNDATIONS-anchored (Rules 1, 4, 5, 7); Phase 9.5 covers the operationally-required residue. If a future ticket promotes a Phase 9.5 check to a Phase 9 gate (because a new FOUNDATIONS principle motivates it), the corresponding row migrates from this table to `references/phase-9-validation-gates.md`.
```

### 2. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Process Flow diagram (lines 64-165): insert Phase 9.5 between Phase 9 and Phase 10:

  ```
  Phase 9.5: Bootstrap Discipline       (10 soft-required-field checks
            Validator                    outside the FOUNDATIONS-anchored
                                         12-gate set; PASS-with-rationale
                                         into discipline_validation_trace;
                                         FAIL routes to responsible phase)
  ```

- Procedure list: insert a new step after Phase 9, "9.5. **Phase 9.5: Bootstrap Discipline Validator.** Run all 10 discipline checks; each must record PASS with a one-line rationale into `STORY_KERNEL.md.discipline_validation_trace`. Any FAIL halts and routes to the responsible upstream phase. Load `references/phase-9-5-bootstrap-discipline-validator.md`."

- HARD-GATE block at top of SKILL.md: extend condition (c) — currently lists "Phase 9 Validation Gates record PASS … for every gate"; add ", AND Phase 9.5's 10 discipline checks record PASS with a one-line rationale".

### 3. `.claude/skills/branching-story-bootstrap/templates/story-kernel.md`

- Add a new frontmatter block `discipline_validation_trace` after `validation_trace` (line 56-69), with one entry per check (e.g., `discipline_check_01_choice_contract_completeness: "PASS — <rationale>"`, …).

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

1. `grep -nE "Phase 9\.5" .claude/skills/branching-story-bootstrap/` — surfaces every reference.
2. `grep -nE "discipline_check_" .claude/skills/branching-story-bootstrap/templates/story-kernel.md` — confirms the new frontmatter keys.
3. (Manual) walk through a hypothetical bootstrap with a CHC missing `forbidden_outcomes` and verify Phase 9.5 check 1 fires the Phase 8 re-derive.
