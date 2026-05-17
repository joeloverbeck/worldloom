import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { OPERATION_KINDS, type OperationKind } from "@worldloom/patch-engine";

import { computePatchOperationSchemaHash, computeValidatorRegistryHash } from "../../src/build-info";
import { createServer } from "../../src/server";
import { MCP_TOOL_ORDER, MCP_TOOL_NAMES } from "../../src/tool-names";
import { describeEnvelopeSchema } from "../../src/tools/describe-envelope-schema";

const requireFromThisTest = createRequire(__filename);

const EXPECTED_VALIDATOR_NAMES = [
  "audit_only_se_shape",
  "branch_isolation",
  "canon_baseline_drift",
  "canon_drift_classification_evidence",
  "causal_dependency_threat_scan",
  "choice_set_noncollapse",
  "cross_file_reference",
  "expected_witness_coverage",
  "id_uniqueness",
  "lie_promoted_silently",
  "modification_history_retrofit",
  "non_propagation_tag_shape",
  "observer_firewall",
  "proposal_package_shape",
  "prose_receipt_schema_compliance",
  "record_schema_compliance",
  "recursive_reference_closure",
  "rule1_no_floating_facts",
  "rule2_no_pure_cosmetics",
  "rule4_no_globalization_by_accident",
  "rule5_no_consequence_evasion",
  "rule6_no_silent_retcons",
  "rule7_mystery_reserve_preservation",
  "rule11_action_space",
  "rule12_redundancy",
  "slt_created_at_page_origin_consistency",
  "snapshot_replay_equality",
  "state_snapshot_integrity",
  "story_fact_authority",
  "storylet_predicate_dsl_parsability",
  "touched_by_cf_completeness",
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
