# Phase 9.5: Bootstrap Discipline Validator

Reference for `branching-story-bootstrap` Phase 9.5 — the post-Phase-9 / pre-Phase-10 validator that records soft-required field discipline outside the Phase 9 20-gate set. The 20 Phase 9 gates split as gates 1-13 FOUNDATIONS-anchored, gates 14-18 SPEC-20/22-anchored (scene-commitment validators), and gates 19-20 plan-authoring-anchored; Phase 9.5 catches operationally-required residue that the JSON schemas (intentionally permissive) do not enforce.

Each check records PASS with a one-line rationale into `STORY_KERNEL.md.discipline_validation_trace`. A bare "PASS" is treated as FAIL per the FOUNDATIONS skill discipline. Any FAIL halts the bootstrap and routes to the responsible upstream phase.

---

## Discipline checks

| # | Check | Surface | Routes to on FAIL |
|---|---|---|---|
| 1 | CHC.choice_contract completeness | Every CHC has non-empty `user_intent`, `guaranteed_action`, `success_policy ∈ {guaranteed, attempted, uncertain, opposed}`, `allowed_outcome_band` non-empty, `forbidden_outcomes` non-empty, `minimum_state_change` non-empty | Phase 8 |
| 2 | STENT.role_in_story enum | Every STENT carries `role_in_story ∈ {protagonist, major, supporting, antagonist, foil}` | Phase 2 |
| 3 | STINT structural completeness | Every STINT carries `stent_id` (story entity it drives), `world_character_id` (or null for story-only). Protagonists + majors carry at least one of `goals`, `fears`, `beliefs` non-empty (Phase 2 halt rule restated) | Phase 2 |
| 4 | THR.type enum | Every THR carries `type ∈ {mystery, relationship, threat, quest, theme, survival}` | Phase 5 |
| 5 | SREL.relation_type populated | Every SREL carries non-empty `relation_type` | Phase 5 (or Phase 2 if relation pre-exists in cast tensions) |
| 6 | SF.reader_visibility_basis | Every SF with `visible_to_reader: true` carries `reader_visibility_basis ∈ {shown_in_pg0001, known_to_pov, dramatic_irony, diegetic_artifact_visible}` (NOT `unrevealed_objective_truth`, which pairs with `visible_to_reader: false`) | Phase 3 |
| 7 | BR-0001 root invariants | `id == 'BR-0001'`, `root_page_id == 'PG-0001'`, `current_leaf_page_id == 'PG-0001'`, `parent_page_id == null` (on PG-0001), `branch_path == ['PG-0001']`, every `forked_from_*` field is null | Phase 7 |
| 8 | OBL.coverage_cache schema (advisory but populated) | Every OBL carries a `coverage_cache` block with `compatible_storylets[]`, `checked_at_page`, `checked_at_storylet_pool_hash` — values may be empty/null at bootstrap, but the keys MUST exist | Phase 5 |
| 9 | SE-0001 genesis discipline | `id == 'SE-0001'`, `actor: system`, `action: bootstrap`, `ops: []`, `state_hash_before: null`, `state_hash_after == PG-0001.state_hash` | Phase 7 |
| 10 | PG-0001 state_snapshot field-key completeness | All keys named in the `templates/story-records.yaml` PG-0001 `state_snapshot` block are present on `PG-0001.state_snapshot` (values may be empty arrays / empty maps; the keys MUST exist for the runtime page-cycle's snapshot-replay equality check on PG-0002) | Phase 7 |
| 11 | `plan_self_containment` | The plan inlines (rather than bare-references) every CF / CHAR / SF / OBL / THR / SREL / STINT / STLOC / STOBJ / SLT / DA / M / INV id that appears in any plan section. A bare `CF-NNNN` reference in §5 without the CF record body inlined fails; a bare `OBL-NNNN` reference in §10 without the OBL fields inlined fails; etc. The plan IS the prompt — the external prose renderer reads only the plan file, so unrendered record bodies are unrenderable context that corrupts prose silently. | Phase 7 |

---

## Workflow

Phase 9.5 runs after every Phase 9 gate has recorded PASS and BEFORE Phase 10's deliverable summary. If any check FAILs, halt the bootstrap, surface the failing check + the routed phase, and let the operator re-derive. Up to 1 re-derive cycle per check; a second failure escalates to user with the specific record(s) failing.

`STORY_KERNEL.md.discipline_validation_trace` is a sibling block to `validation_trace` (Phase 9). Each entry: `discipline_check_<NN>_<name>: PASS — <rationale>`.

---

## Composition with Phase 9

Phase 9.5 does NOT duplicate Phase 9 work. The 20 Phase 9 gates are FOUNDATIONS-anchored, validator-aligned, and plan-authoring-anchored; Phase 9.5 covers the operationally-required residue. If a future ticket promotes a Phase 9.5 check to a Phase 9 gate (because a new FOUNDATIONS principle motivates it), the corresponding row migrates from this table to `references/phase-9-validation-gates.md`.

Storylet-pool diversity is owned by Phase 9 gate 9 and is measured by
`arc_contract.commitment_class`. Phase 9.5 keeps the 11 discipline checks
above unchanged; it does not add a separate storylet-diversity row.

`plan_completeness_check` (Phase 9 gate 19), `cast_material_reality_consistency` (Phase 9 gate 20), and `plan_self_containment` (this check 11) are intentionally split: gate 19 is structural (sections populated, ids resolve, frontmatter well-formed), gate 20 is physical-consistency grounding against projected CHAR Material Reality, and check 11 is content-completeness (every referenced id has its record body inlined verbatim). The Phase 9 gates protect parser/validator correctness and physical grounding; the Phase 9.5 check protects the rendered prose's context completeness.
