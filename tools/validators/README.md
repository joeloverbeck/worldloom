# validators

Executable FOUNDATIONS Rules 1, 2, 4, 5, 6, 7, 11, and 12 plus story-scope predicate parsability and structural invariant enforcement.

**Current authority**: `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `docs/MACHINE-FACING-LAYER.md`, and the current non-archived validator source under `tools/validators/src/`.

Historical note: `archive/specs/SPEC-04-validator-framework.md` is archived prior art only. It is not current design authority.
**Phase**: 2 Tier 1. CLI activation and the pre-apply engine/MCP entry point are present.
**Status**: package scaffold, framework types, record-class JSON Schemas, the 107 structural validators, the 12 rule-derived/story-scope validators, package-internal structural/rule registries, the `world-validate` CLI, and the public `validatePatchPlan` entry point are present.

## Schemas

Static JSON Schemas live under `src/schemas/`. They cover the CF, CH, INV, M,
OQ, ENT, SEC, PA frontmatter, CHAR frontmatter, proposal-card/proposal-batch
frontmatter (including mined-from-diegetic-artifact variants), NCP
proposal-card frontmatter, NCB proposal-batch frontmatter, DA frontmatter, and story-bundle
atomic YAML record classes (STENT, STSTAT, SF, SE, OBL, CNSQ, THR, CLK, STSEC, STQ,
SREL, STINT, STLOC, STOBJ, SCN, BR, PG, CHC, SLT, BEL, STPLAN, STEMO, and story-local DA). The prose receipt schemas cover
direct-write `stories/<story-slug>/pages-prose-receipts/PG-*.yaml` and `stories/<story-slug>/scene-prose-receipts/SCN-*.yaml` artifacts. The PA
schema validates YAML frontmatter parsed from `adjudications/PA-NNNN-*.md`; PA body
prose is not schema-constrained.

## Validator Inventory

Rule-derived mechanized validators:

- `rule1_no_floating_facts`
- `rule2_no_pure_cosmetics`
- `rule4_no_globalization_by_accident`
- `rule5_no_consequence_evasion`
- `rule6_no_silent_retcons`
- `rule7_mystery_reserve_preservation`
- `chc_grounded_in_artifact_accessible`
- `choice_set_noncollapse`
- `prose_load_bearing_artifact_mention`
- `storylet_predicate_dsl_parsability`
- `rule11_action_space`
- `rule12_redundancy`

Structural validators:

- `yaml_parse_integrity`
- `id_uniqueness`
- `cross_file_reference`
- `record_schema_compliance`
- `approval_semantics`
- `artifact_maturity`
- `index_disk_consistency`
- `character_memorability_structure`
- `story_fact_authority`
- `lie_promoted_silently`
- `branch_isolation`
- `observer_firewall`
- `no_story_state_in_place_mutation`
- `state_delta_class_integrity`
- `audit_only_se_shape`
- `causal_dependency_threat_scan`
- `expected_witness_coverage`
- `midstory_record_introduction_grounding`
- `clock_introduction_grounding_integrity`
- `slt_created_at_page_origin_consistency`
- `canon_baseline_drift`
- `canon_drift_classification_evidence`
- `non_propagation_facts_completeness`
- `snapshot_replay_equality`
- `recursive_reference_closure`
- `stent_requires_stchar`
- `stchar_resolves`
- `stchar_bound_stent_reciprocity`
- `stchar_active_for_bound_stent`
- `stchar_supersession_integrity`
- `stchar_body_integrity`
- `stchar_source_fact_coverage`
- `stchar_source_material_inventory_integrity`
- `stchar_temporal_reference_boundary`
- `stchar_regeneration_reason_integrity`
- `forbidden_stchar_tamper_hash_fields`
- `no_char_authority_in_story_runtime`
- `character_grounding_consistency`
- `chc_slt_selected_commitment_trace`
- `state_snapshot_integrity`
- `clock_value_in_range`
- `clock_threshold_ordering`
- `clock_tick_provenance`
- `clock_firing_threshold_integrity`
- `clock_terminal_debt_integrity`
- `secret_carrier_existence`
- `critical_secret_clue_coverage_when_revealed`
- `secret_introduction_anchor_integrity`
- `secret_mystery_firewall_compliance`
- `story_question_introduction_grounding_integrity`
- `thread_introduction_grounding_integrity`
- `entity_introduction_status_pairing`
- `relationship_introduction_grounding_integrity`
- `introduction_observer_firewall`
- `record_introduction_uniqueness`
- `narrative_shape_field_rejection`
- `compatibility_drift`
- `active_records_full_shape`
- `page_affordance_integrity`
- `page_plan_body_engine_vocabulary_cleanliness`
- `page_plan_verbatim_section_integrity`
- `page_plan_stchar_packet_integrity`
- `page_plan_turn_driver_consistency`
- `active_pressure_handling_discipline`
- `story_question_payoff_integrity`
- `story_question_setup_predates_payoff`
- `story_question_grounding_integrity`
- `story_question_terminal_debt`
- `story_da_duplicate_heuristic`
- `slt_grounding_minimal_integrity`
- `turn_driver_schema_compliance`
- `turn_driver_pov_observer_firewall`
- `turn_cycle_output_grounding_integrity`
- `touched_by_cf_completeness`
- `proposal_package_shape`
- `prose_receipt_schema_compliance`
- `scene_prose_receipt_schema_compliance`
- `scene_range_integrity`
- `scene_plan_structural`
- `scene_plan_verbatim_section_integrity`
- `scene_plan_body_engine_vocabulary_cleanliness`
- `scn_no_narrative_shape_language`
- `prose_receipt_hash_integrity`
- `prose_receipt_stchar_integrity`
- `story_kernel_cast_bind_list_integrity`
- `modification_history_retrofit`
- `validation_trace_shape_compliance`
- `stplan_schema_compliance`
- `stplan_id_uniqueness_and_append_only`
- `stplan_holder_exists_and_active`
- `stplan_root_intention_grounded`
- `stplan_belief_basis_grounded`
- `stplan_resource_basis_grounded`
- `stplan_blockers_grounded`
- `stplan_current_step_targets_grounded`
- `stplan_predicate_references`
- `stplan_no_future_page_ids`
- `stplan_supersession_chain_valid`
- `stplan_closure_status_requires_closure_event`
- `stplan_event_plan_relation_consistency`
- `stemo_schema_compliance`
- `stemo_holder_exists_and_active`
- `stemo_trigger_event_on_branch_path`
- `stemo_appraisal_basis_accessible_to_holder`
- `stemo_orientation_records_exist`
- `stemo_enum_compliance`
- `stemo_no_future_page_ids`
- `stemo_supersession_lifecycle_valid`
- `stemo_agency_effect_compatibility`

Skill-judgment rule:

- Rule 3 No Specialness Inflation remains in `canon-addition` Phase 14a Test 10 and `propose-new-canon-facts` Phase 8. It is not mechanized because enforcing it would require prose-content heuristics.

## Verdict Schema

`Verdict` is exported from `@worldloom/validators/public/types`: `{ validator, severity: 'fail' | 'warn' | 'info', code, message, location: { file, line_range?, node_id? }, suggested_fix? }`.

## Gate Semantics

- Pre-apply mode: engine-called; any `fail` blocks the patch.
- Full-world mode: CLI reports all verdicts; exits 1 on any `fail`.
- Incremental mode: Hook 5 post-apply logs to `validation_results`; non-blocking because the write already happened.

## CLI

```text
world-validate <world-slug>
world-validate <world-slug> --rules=1,2,6,11,12
world-validate <world-slug> --story <story-slug> --rules=storylet_predicate_dsl_parsability
world-validate <world-slug> --rules=all
world-validate <world-slug> --structural
world-validate <world-slug> --json
world-validate <world-slug> --file <path>
world-validate <world-slug> --since <commit>
world-validate --help
world-validate --version
```

The CLI reads `worlds/<slug>/_index/world.db`, runs the selected validators in
`full-world` mode, writes per-verdict rows to `validation_results`, and exits
`1` when any `fail` verdict is emitted. `--file` and `--since` narrow selector
applicability and persistence cleanup to the touched files while preserving the
runtime `full-world` run mode. `--story` narrows story-bundle validators to one
indexed story bundle; when omitted, story-bundle validators scan all indexed
story bundles for the world.

## Bootstrap Grandfathering

When a world has an explicit `audits/validation-grandfathering.yaml` policy, the
runner matches exact `fail` verdicts by validator, code, file, node id, and
message. Matched bootstrap findings are emitted and persisted as `info` with a
`Grandfathered by GF-NNNN` audit reference and rationale. Unmatched failures stay
as `fail`, so the CLI still exits non-zero for new or changed defects.

## Phase 14a Migration

`canon-addition` Phase 14a collapses to `mcp__worldloom__validate_patch_plan(plan)` for the structural catchments of Tests 1, 2, 3, 4, 5, 6, and 7.

Skill judgment remains for:

- Test 3 stabilizer quality
- Test 6 Mystery Reserve forbidden-answer overlap
- Test 8 stabilizer mechanism quality
- Test 9 verdict cites phases
- Test 10 specialness inflation
