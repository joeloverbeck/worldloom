import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { TASK_TYPES } from "../../src/ranking/profiles";
import { createServer, ID_CLASSES } from "../../src/server";
import { MCP_TOOL_NAMES } from "../../src/tool-names";
import { VOCABULARY_CLASSES } from "../../src/tools/get-canonical-vocabulary";
import { SUPPORTED_RECORD_SCHEMA_NODE_TYPES } from "../../src/tools/get-record-schema";
import { SUPPORTED_LIST_RECORD_TYPES } from "../../src/tools/list-records";
import { createTempRepoRoot, destroyTempRepoRoot, seedWorld } from "../tools/_shared";

function textContent(result: any): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  return content[0]?.type === "text" ? (content[0].text ?? "") : "";
}

function buildValidPatchPlan() {
  return {
    plan_id: "plan-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "insert_before_node",
        target_world: "seeded",
        target_file: "GEOGRAPHY.md",
        payload: { body: "Brinewick expands." }
      }
    ]
  };
}

function seedServerWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "Kernel overview."
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: "Brinewick is a salt-port city."
      },
      {
        node_id: "entity:brinewick",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick Entity",
        node_type: "named_entity",
        body: "Entity anchor for Brinewick."
      },
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "_source/canon/CF-0001.yaml",
        heading_path: "CF-0001",
        node_type: "canon_fact_record",
        body: [
          "id: CF-0001",
          "title: Brinewick Lighthouse",
          "status: hard_canon",
          "type: geography",
          "statement: Brinewick maintains the northern lighthouse.",
          "scope:",
          "  geographic: regional",
          "  temporal: current",
          "  social: public",
          "truth_scope:",
          "  world_level: true",
          "  diegetic_status: objective",
          "domains_affected:",
          "  - geography",
          "required_world_updates:",
          "  - GEOGRAPHY.md",
          "source_basis:",
          "  direct_user_approval: true",
          ""
        ].join("\n")
      },
      {
        node_id: "SEC-GEO-001",
        world_slug: "seeded",
        file_path: "_source/geography/SEC-GEO-001.yaml",
        heading_path: "SEC-GEO-001",
        node_type: "section",
        body: [
          "id: SEC-GEO-001",
          "file_class: GEOGRAPHY",
          "order: 1",
          "heading: Brinewick",
          "heading_level: 2",
          "body: Brinewick is a salt-port city.",
          "touched_by_cf:",
          "  - CF-0001",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "MYSTERY_RESERVE.md",
        heading_path: "M-1",
        node_type: "mystery_reserve_entry",
        body: "The drowned bell has an unknown caller."
      }
    ],
    edges: [
      {
        source_node_id: "CF-0001",
        target_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        edge_type: "required_world_update"
      },
      {
        source_node_id: "CF-0001",
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      },
      {
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      },
      {
        source_node_id: "M-1",
        target_node_id: "CF-0001",
        edge_type: "firewall_for"
      }
    ],
    entities: [
      {
        entity_id: "entity:brinewick",
        world_slug: "seeded",
        canonical_name: "Brinewick",
        entity_kind: "place",
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0"
      }
    ],
    aliases: [
      {
        entity_id: "entity:brinewick",
        alias_text: "Salt Port",
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0"
      }
    ],
    mentions: [
      {
        node_id: "CF-0001",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick"
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick"
      }
    ],
    anchors: [
      {
        node_id: "CF-0001",
        anchor_form: "## CF-0001"
      }
    ]
  });

  const pressureEventsDirectory = path.join(root, "worlds", "seeded", "pressure-events");
  mkdirSync(pressureEventsDirectory, { recursive: true });
  writeFileSync(path.join(pressureEventsDirectory, "EPE-0003-salt-riot.md"), "event", "utf8");
  writeFileSync(
    path.join(pressureEventsDirectory, "EPE-0004-salt-riot.proposal.md"),
    "proposal",
    "utf8"
  );

  const toolResultsDirectory = path.join(root, "tool-results");
  mkdirSync(toolResultsDirectory, { recursive: true });
  writeFileSync(
    path.join(toolResultsDirectory, "packet.json"),
    JSON.stringify({ governing_world_context: { nodes: [{ id: "CF-0001" }] } }),
    "utf8"
  );
}

async function withServerClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const root = createTempRepoRoot();
  seedServerWorld(root);

  const originalCwd = process.cwd();
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  process.chdir(path.join(root, "tools", "world-mcp"));
  process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = path.join(root, "tool-results");

  const server = createServer();
  const client = new Client({
    name: "worldloom-server-dispatch-test",
    version: "0.1.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return await run(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
    process.chdir(originalCwd);
    if (originalResultsDir === undefined) {
      delete process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
    } else {
      process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = originalResultsDir;
    }
    destroyTempRepoRoot(root);
  }
}

test("registered tools dispatch with either a success payload or the documented error payload", async () => {
  await withServerClient(async (client) => {
    const calls = [
      {
        name: MCP_TOOL_NAMES.search_nodes,
        args: { query: "Brinewick", filters: { world_slug: "seeded" } },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_node,
        args: { node_id: "CF-0001", world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_record,
        args: { record_id: "CF-0001", world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_records,
        args: { record_ids: ["CF-0001", "SEC-GEO-001"], world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_persisted_packet_slice,
        args: {
          persisted_path: path.join(process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR!, "packet.json"),
          slice_path: "governing_world_context.nodes"
        },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.list_records,
        args: { world_slug: "seeded", record_type: "canon_fact" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_record_field,
        args: { record_id: "SEC-GEO-001", field_path: ["touched_by_cf"], world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_record_schema,
        args: { node_type: "canon_fact_record" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_neighbors,
        args: { node_id: "CF-0001", world_slug: "seeded", depth: 1 },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_context_packet,
        args: { task_type: "canon_addition", world_slug: "seeded", seed_nodes: ["CF-0001"], token_budget: 1200 },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_impacted_fragments,
        args: { world_slug: "seeded", node_ids: ["CF-0001"] },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_sections_touched_by,
        args: { world_slug: "seeded", cf_id: "CF-0001" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_named_entities,
        args: { world_slug: "seeded", names: ["Brinewick"] },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_edit_anchors,
        args: { world_slug: "seeded", targets: ["CF-0001"] },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_canonical_vocabulary,
        args: { class: "domain" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.validate_patch_plan,
        args: { patch_plan: buildValidPatchPlan() },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.submit_patch_plan,
        args: { patch_plan: buildValidPatchPlan(), approval_token: "unused-in-phase-1" },
        expectError: true,
        expectedCode: "envelope_shape_invalid"
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "SEC-GEO" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "EPE" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "__pipeline__", id_class: "NWB" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.describe_capabilities,
        args: {},
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.describe_envelope_schema,
        args: { op_kind: "create_cf_record" },
        expectError: false
      }
    ] as const;

    for (const call of calls) {
      const result = await client.callTool({
        name: call.name,
        arguments: call.args
      });

      assert.ok(Array.isArray(result.content));
      assert.equal(result.content[0]?.type, "text");

      if (call.expectError) {
        assert.equal(result.isError, true);
        const structured = result.structuredContent as { code?: string };
        assert.equal(structured.code, call.expectedCode);
        continue;
      }

      assert.notEqual(result.isError, true);
      assert.ok(result.structuredContent);
    }
  });
});

test("missing required inputs fail at the MCP validation boundary", async () => {
  await withServerClient(async (client) => {
      const invalidCalls = [
      { name: MCP_TOOL_NAMES.search_nodes, args: {} },
      { name: MCP_TOOL_NAMES.get_node, args: {} },
      { name: MCP_TOOL_NAMES.get_record, args: {} },
      { name: MCP_TOOL_NAMES.get_records, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_persisted_packet_slice, args: { slice_path: "governing_world_context.nodes" } },
      { name: MCP_TOOL_NAMES.list_records, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_record_field, args: { record_id: "SEC-GEO-001", world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_record_schema, args: {} },
      { name: MCP_TOOL_NAMES.get_neighbors, args: { world_slug: "seeded", depth: 1 } },
      { name: MCP_TOOL_NAMES.get_context_packet, args: { world_slug: "seeded", seed_nodes: ["CF-0001"] } },
      { name: MCP_TOOL_NAMES.find_impacted_fragments, args: { node_ids: ["CF-0001"] } },
      { name: MCP_TOOL_NAMES.find_sections_touched_by, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.find_named_entities, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.find_edit_anchors, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_canonical_vocabulary, args: {} },
      { name: MCP_TOOL_NAMES.validate_patch_plan, args: {} },
      { name: MCP_TOOL_NAMES.submit_patch_plan, args: { patch_plan: buildValidPatchPlan() } },
      { name: MCP_TOOL_NAMES.allocate_next_id, args: { world_slug: "seeded" } }
    ] as const;

    for (const invalid of invalidCalls) {
      const result = (await client.callTool({
        name: invalid.name,
        arguments: invalid.args as Record<string, unknown>
      })) as any;

      assert.equal(result.isError, true);
      assert.match(textContent(result), /invalid|required/i);
    }
  });
});

test("unsupported id classes fail at the MCP validation boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "NOT_A_CLASS" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /invalid/i);
  });
});

test("list_records include_full_body dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.list_records,
      arguments: {
        world_slug: "seeded",
        record_type: "canon_fact",
        fields: ["title"],
        include_full_body: true
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      records?: Array<{
        record_id?: string;
        content_hash?: string;
        file_path?: string;
        body?: { record_kind?: string; title?: string };
      }>;
    };
    const record = structured.records?.[0];
    assert.equal(record?.record_id, "CF-0001");
    assert.equal(record?.file_path, "_source/canon/CF-0001.yaml");
    assert.equal(typeof record?.content_hash, "string");
    assert.equal(record?.body?.record_kind, "canon_fact");
    assert.equal(record?.body?.title, "Brinewick Lighthouse");
    assert.equal("title" in record!, false);
  });
});

test("EPE id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "EPE" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "EPE-0004");
  });
});

test("get_canonical_vocabulary accepts every registered vocabulary class through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    for (const vocabularyClass of VOCABULARY_CLASSES) {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.get_canonical_vocabulary,
        arguments: { class: vocabularyClass }
      });

      assert.notEqual(result.isError, true);
      const structured = result.structuredContent as { canonical_values?: string[] };
      assert.ok(Array.isArray(structured.canonical_values));
      assert.ok(structured.canonical_values.length > 0);
    }
  });
});

test("get_record_schema accepts every registered node type through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    for (const nodeType of SUPPORTED_RECORD_SCHEMA_NODE_TYPES) {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.get_record_schema,
        arguments: { node_type: nodeType }
      });

      assert.notEqual(result.isError, true);
      const structured = result.structuredContent as {
        node_type?: string;
        schema?: { $id?: string };
        source_path?: string;
        required_fields?: string[];
        conditional_blocks?: Record<string, unknown>;
      };
      assert.equal(structured.node_type, nodeType);
      assert.ok(structured.schema?.$id);
      assert.match(structured.source_path ?? "", /^tools\/validators\/src\/schemas\//);
      assert.ok(Array.isArray(structured.required_fields));
      assert.ok(structured.conditional_blocks);
    }
  });
});

test("get_record_schema exposes canon safety conditional blocks through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.get_record_schema,
      arguments: { node_type: "canon_fact_record" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      conditional_blocks?: {
        epistemic_profile?: { required_for_types?: string[] };
        exception_governance?: { required_for_types?: string[] };
      };
    };

    assert.deepEqual(structured.conditional_blocks?.exception_governance?.required_for_types, [
      "capability",
      "bloodline",
      "magic_practice",
      "technology",
      "divine_action",
      "artifact_dependent_truth",
      "exception_introducing_fact"
    ]);
    assert.ok(
      structured.conditional_blocks?.epistemic_profile?.required_for_types?.includes("knowledge_asymmetric_fact")
    );
  });
});

test("pipeline-scoped id classes reject non-pipeline world slugs at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "NWP" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /__pipeline__/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("pipeline sentinel rejects world-scoped id classes at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "__pipeline__", id_class: "CF" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /NWB, NWP/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("pipeline sentinel rejects EPE at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "__pipeline__", id_class: "EPE" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /NWB, NWP/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("describe_capabilities dispatches through the MCP boundary with no arguments", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      build_info?: {
        git_commit_hash?: string;
        build_timestamp?: string;
        source_schema_hash?: string;
      };
      tools?: Array<{
        name?: string;
        input_schema_enums?: Record<string, string[]>;
      }>;
    };

    assert.match(structured.build_info?.git_commit_hash ?? "", /^[0-9a-f]{40}$|^unknown$/);
    assert.ok(!Number.isNaN(Date.parse(structured.build_info?.build_timestamp ?? "")));
    assert.match(structured.build_info?.source_schema_hash ?? "", /^[0-9a-f]{64}$/);

    const byName = new Map(structured.tools?.map((tool) => [tool.name, tool]) ?? []);
    assert.ok(byName.has(MCP_TOOL_NAMES.describe_capabilities));
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.allocate_next_id)?.input_schema_enums?.id_class, [...ID_CLASSES]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.get_context_packet)?.input_schema_enums?.task_type, [...TASK_TYPES]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.get_canonical_vocabulary)?.input_schema_enums?.class, [
      ...VOCABULARY_CLASSES
    ]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.get_record_schema)?.input_schema_enums?.node_type, [
      ...SUPPORTED_RECORD_SCHEMA_NODE_TYPES
    ]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.list_records)?.input_schema_enums?.record_type, [
      ...SUPPORTED_LIST_RECORD_TYPES
    ]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.describe_envelope_schema)?.input_schema_enums?.op_kind, [
      "create_cf_record",
      "create_ch_record",
      "create_inv_record",
      "create_m_record",
      "create_oq_record",
      "create_ent_record",
      "create_sec_record",
      "update_record_field",
      "append_extension",
      "append_touched_by_cf",
      "append_modification_history_entry",
      "append_adjudication_record",
      "append_character_record",
      "append_diegetic_artifact_record"
    ]);
  });
});

test("describe_envelope_schema dispatches through the MCP boundary with an op filter", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_envelope_schema,
      arguments: { op_kind: "create_cf_record" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      envelope_schema?: { properties?: Record<string, unknown> };
      op_schemas?: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
      referenced_schemas?: Record<string, { required?: string[] }>;
    };

    assert.ok(structured.envelope_schema?.properties?.patches);
    assert.deepEqual(Object.keys(structured.op_schemas ?? {}), ["create_cf_record"]);
    assert.deepEqual(structured.op_schemas?.create_cf_record?.required, [
      "op",
      "target_world",
      "target_file",
      "payload"
    ]);
    assert.ok(
      structured.referenced_schemas?.["https://worldloom.local/schemas/canon-fact-record.schema.json"]?.required?.includes(
        "required_world_updates"
      )
    );
  });
});
