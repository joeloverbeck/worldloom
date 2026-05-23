import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { OperationKind } from "@worldloom/patch-engine";

import { computePatchOperationSchemaHash, computeValidatorRegistryHash } from "../../src/build-info.js";
import { OPERATION_KINDS } from "../../src/package-interop.js";
import { createServer } from "../../src/server.js";
import { MCP_TOOL_ORDER, MCP_TOOL_NAMES } from "../../src/tool-names.js";
import { describeEnvelopeSchema } from "../../src/tools/describe-envelope-schema.js";

const requireFromThisTest = createRequire(import.meta.url);

const EXPECTED_VALIDATOR_NAMES = [
  "active_records_full_shape",
  "approval_semantics",
  "artifact_maturity",
  "audit_only_se_shape",
  "branch_isolation",
  "canon_baseline_drift",
  "canon_drift_classification_evidence",
  "causal_dependency_threat_scan",
  "character_grounding_consistency",
  "character_memorability_structure",
  "chc_slt_selected_commitment_trace",
  "chc_grounded_in_artifact_accessible",
  "choice_set_noncollapse",
  "clock_firing_threshold_integrity",
  "clock_introduction_grounding_integrity",
  "clock_terminal_debt_integrity",
  "clock_threshold_ordering",
  "clock_tick_provenance",
  "clock_value_in_range",
  "compatibility_drift",
  "critical_secret_clue_coverage_when_revealed",
  "cross_file_reference",
  "entity_introduction_status_pairing",
  "expected_witness_coverage",
  "forbidden_stchar_tamper_hash_fields",
  "id_uniqueness",
  "index_disk_consistency",
  "introduction_observer_firewall",
  "lie_promoted_silently",
  "midstory_record_introduction_grounding",
  "modification_history_retrofit",
  "narrative_shape_field_rejection",
  "no_char_authority_in_story_runtime",
  "no_story_state_in_place_mutation",
  "non_propagation_facts_completeness",
  "observer_firewall",
  "page_affordance_integrity",
  "page_plan_stchar_packet_integrity",
  "proposal_package_shape",
  "prose_load_bearing_artifact_mention",
  "prose_receipt_schema_compliance",
  "prose_receipt_stchar_integrity",
  "record_introduction_uniqueness",
  "record_schema_compliance",
  "recursive_reference_closure",
  "relationship_introduction_grounding_integrity",
  "rule1_no_floating_facts",
  "rule2_no_pure_cosmetics",
  "rule4_no_globalization_by_accident",
  "rule5_no_consequence_evasion",
  "rule6_no_silent_retcons",
  "rule7_mystery_reserve_preservation",
  "rule11_action_space",
  "rule12_redundancy",
  "secret_carrier_existence",
  "secret_introduction_anchor_integrity",
  "secret_mystery_firewall_compliance",
  "slt_created_at_page_origin_consistency",
  "snapshot_replay_equality",
  "state_delta_class_integrity",
  "state_snapshot_integrity",
  "stchar_active_for_bound_stent",
  "stchar_body_integrity",
  "stchar_bound_stent_reciprocity",
  "stchar_regeneration_reason_integrity",
  "stchar_resolves",
  "stchar_source_fact_coverage",
  "stchar_source_material_inventory_integrity",
  "stchar_supersession_integrity",
  "stchar_temporal_reference_boundary",
  "stemo_agency_effect_compatibility",
  "stemo_appraisal_basis_accessible_to_holder",
  "stemo_enum_compliance",
  "stemo_holder_exists_and_active",
  "stemo_no_future_page_ids",
  "stemo_orientation_records_exist",
  "stemo_schema_compliance",
  "stemo_supersession_lifecycle_valid",
  "stemo_trigger_event_on_branch_path",
  "stent_requires_stchar",
  "story_da_duplicate_heuristic",
  "story_fact_authority",
  "story_kernel_cast_bind_list_integrity",
  "story_question_grounding_integrity",
  "story_question_introduction_grounding_integrity",
  "story_question_payoff_integrity",
  "story_question_setup_predates_payoff",
  "story_question_terminal_debt",
  "storylet_predicate_dsl_parsability",
  "stplan_belief_basis_grounded",
  "stplan_blockers_grounded",
  "stplan_closure_status_requires_closure_event",
  "stplan_current_step_targets_grounded",
  "stplan_event_plan_relation_consistency",
  "stplan_holder_exists_and_active",
  "stplan_id_uniqueness_and_append_only",
  "stplan_no_future_page_ids",
  "stplan_predicate_references",
  "stplan_resource_basis_grounded",
  "stplan_root_intention_grounded",
  "stplan_schema_compliance",
  "stplan_supersession_chain_valid",
  "thread_introduction_grounding_integrity",
  "touched_by_cf_completeness",
  "turn_cycle_output_grounding_integrity",
  "validation_trace_shape_compliance",
  "yaml_parse_integrity"
].sort((left, right) => left.localeCompare(right));

interface Validator {
  name: string;
}

async function withServerClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const server = createServer();
  const client = new Client({
    name: "worldloom-capability-parity-test",
    version: "0.1.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return await run(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

test("describe_capabilities lists every registered tool in order", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      tools?: Array<{ name?: string }>;
    };

    assert.deepEqual(
      structured.tools?.map((tool) => tool.name),
      MCP_TOOL_ORDER
    );
  });
});

test("describe_envelope_schema covers every operation kind", async () => {
  for (const kind of OPERATION_KINDS) {
    const manifest = await describeEnvelopeSchema({ op_kind: kind });

    assert.equal(manifest.delivery_status, "inline", `${kind} should fit inline when requested directly`);
    assert.deepEqual(Object.keys(manifest.op_schemas), [kind]);

    const schema = manifest.op_schemas[kind] as
      | {
          required?: unknown;
          properties?: {
            op?: { const?: OperationKind };
            payload?: { type?: string; properties?: Record<string, unknown> };
          };
        }
      | undefined;
    assert.ok(schema, `${kind} should have a schema entry`);
    assert.deepEqual(schema.required, ["op", "target_world", "target_file", "payload"]);
    assert.equal(schema.properties?.op?.const, kind);
    assert.equal(schema.properties?.payload?.type, "object");
    assert.ok(schema.properties?.payload?.properties, `${kind} should expose a structured payload schema`);
  }
});

test("validator registry contains every named validator", () => {
  const validatorsEntryPath = requireFromThisTest.resolve("@worldloom/validators");
  const registryPath = validatorsEntryPath.replace(/index\.js$/, "registry.js");
  const registry = requireFromThisTest(registryPath) as {
    structuralValidators: readonly Validator[];
    ruleValidators: readonly Validator[];
  };

  const names = [...registry.structuralValidators, ...registry.ruleValidators]
    .map((validator) => validator.name)
    .sort((left, right) => left.localeCompare(right));

  assert.deepEqual(names, EXPECTED_VALIDATOR_NAMES);
});

test("describe_capabilities exposes validator_registry_hash for the current validator source content", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      build_info?: { validator_registry_hash?: string };
    };

    assert.match(structured.build_info?.validator_registry_hash ?? "", /^[0-9a-f]{64}$/);
    assert.equal(structured.build_info?.validator_registry_hash, computeValidatorRegistryHash());
  });
});

test("describe_capabilities exposes patch_operation_schema_hash for the current op schema manifest", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      build_info?: { patch_operation_schema_hash?: string };
    };

    assert.match(structured.build_info?.patch_operation_schema_hash ?? "", /^[0-9a-f]{64}$/);
    assert.equal(structured.build_info?.patch_operation_schema_hash, computePatchOperationSchemaHash());
  });
});
