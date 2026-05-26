import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { structuralValidators } from "../../src/public/registry.js";

function readReadmeStructuralInventory(): string[] {
  const readme = readFileSync(new URL("../../../README.md", import.meta.url), "utf8");
  const section = readme.match(/Structural validators:\n\n(?<body>[\s\S]*?)\n\nSkill-judgment rule:/)
    ?.groups?.body;

  assert.ok(section, "README structural validator inventory section should exist");
  const names: string[] = [];
  for (const match of section.matchAll(/^- `([^`]+)`$/gm)) {
    const name = match[1];
    assert.ok(name, "README structural validator inventory entry should have a name");
    names.push(name);
  }

  return names;
}

test("structural registry omits the retired adjudication Discovery validator", () => {
  assert.deepEqual(
    structuralValidators.map((validator) => validator.name),
    [
      "yaml_parse_integrity",
      "id_uniqueness",
      "cross_file_reference",
      "record_schema_compliance",
      "approval_semantics",
      "artifact_maturity",
      "index_disk_consistency",
      "character_memorability_structure",
      "story_fact_authority",
      "lie_promoted_silently",
      "branch_isolation",
      "observer_firewall",
      "no_story_state_in_place_mutation",
      "state_delta_class_integrity",
      "audit_only_se_shape",
      "causal_dependency_threat_scan",
      "expected_witness_coverage",
      "midstory_record_introduction_grounding",
      "clock_introduction_grounding_integrity",
      "slt_created_at_page_origin_consistency",
      "canon_baseline_drift",
      "canon_drift_classification_evidence",
      "non_propagation_facts_completeness",
      "snapshot_replay_equality",
      "recursive_reference_closure",
      "stent_requires_stchar",
      "stchar_resolves",
      "stchar_bound_stent_reciprocity",
      "stchar_active_for_bound_stent",
      "stchar_supersession_integrity",
      "stchar_body_integrity",
      "stchar_source_fact_coverage",
      "stchar_source_material_inventory_integrity",
      "stchar_temporal_reference_boundary",
      "stchar_regeneration_reason_integrity",
      "forbidden_stchar_tamper_hash_fields",
      "no_char_authority_in_story_runtime",
      "character_grounding_consistency",
      "chc_slt_selected_commitment_trace",
      "state_snapshot_integrity",
      "clock_value_in_range",
      "clock_threshold_ordering",
      "clock_tick_provenance",
      "clock_firing_threshold_integrity",
      "clock_terminal_debt_integrity",
      "secret_carrier_existence",
      "critical_secret_clue_coverage_when_revealed",
      "secret_introduction_anchor_integrity",
      "secret_mystery_firewall_compliance",
      "story_question_introduction_grounding_integrity",
      "thread_introduction_grounding_integrity",
      "entity_introduction_status_pairing",
      "relationship_introduction_grounding_integrity",
      "introduction_observer_firewall",
      "record_introduction_uniqueness",
      "narrative_shape_field_rejection",
      "compatibility_drift",
      "active_records_full_shape",
      "page_affordance_integrity",
      "page_plan_body_engine_vocabulary_cleanliness",
      "page_plan_verbatim_section_integrity",
      "page_plan_stchar_packet_integrity",
      "page_plan_turn_driver_consistency",
      "active_pressure_handling_discipline",
      "story_question_payoff_integrity",
      "story_question_setup_predates_payoff",
      "story_question_grounding_integrity",
      "story_question_terminal_debt",
      "story_da_duplicate_heuristic",
      "slt_grounding_minimal_integrity",
      "turn_driver_schema_compliance",
      "turn_driver_pov_observer_firewall",
      "turn_cycle_output_grounding_integrity",
      "touched_by_cf_completeness",
      "proposal_package_shape",
      "prose_receipt_schema_compliance",
      "prose_receipt_hash_integrity",
      "prose_receipt_stchar_integrity",
      "story_kernel_cast_bind_list_integrity",
      "modification_history_retrofit",
      "validation_trace_shape_compliance",
      "stplan_schema_compliance",
      "stplan_id_uniqueness_and_append_only",
      "stplan_holder_exists_and_active",
      "stplan_root_intention_grounded",
      "stplan_belief_basis_grounded",
      "stplan_resource_basis_grounded",
      "stplan_blockers_grounded",
      "stplan_current_step_targets_grounded",
      "stplan_predicate_references",
      "stplan_no_future_page_ids",
      "stplan_supersession_chain_valid",
      "stplan_closure_status_requires_closure_event",
      "stplan_event_plan_relation_consistency",
      "stemo_schema_compliance",
      "stemo_holder_exists_and_active",
      "stemo_trigger_event_on_branch_path",
      "stemo_appraisal_basis_accessible_to_holder",
      "stemo_orientation_records_exist",
      "stemo_enum_compliance",
      "stemo_no_future_page_ids",
      "stemo_supersession_lifecycle_valid",
      "stemo_agency_effect_compatibility"
    ]
  );
});

test("README structural validator inventory matches the public registry", () => {
  const registryNames = structuralValidators.map((validator) => validator.name);
  const readmeNames = readReadmeStructuralInventory();

  assert.equal(readmeNames.length, registryNames.length);
  assert.deepEqual(readmeNames, registryNames);
});
