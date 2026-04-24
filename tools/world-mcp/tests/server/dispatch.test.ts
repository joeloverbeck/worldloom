import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../../src/server";
import { MCP_TOOL_NAMES } from "../../src/tool-names";
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
}

async function withServerClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const root = createTempRepoRoot();
  seedServerWorld(root);

  const originalCwd = process.cwd();
  process.chdir(path.join(root, "tools", "world-mcp"));

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
    destroyTempRepoRoot(root);
  }
}

test("registered tools dispatch with either a success payload or the documented stub payload", async () => {
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
        name: MCP_TOOL_NAMES.validate_patch_plan,
        args: { patch_plan: buildValidPatchPlan() },
        expectError: true,
        expectedCode: "validator_unavailable"
      },
      {
        name: MCP_TOOL_NAMES.submit_patch_plan,
        args: { patch_plan: buildValidPatchPlan(), approval_token: "unused-in-phase-1" },
        expectError: true,
        expectedCode: "phase1_stub"
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "CF" },
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
      { name: MCP_TOOL_NAMES.get_neighbors, args: { world_slug: "seeded", depth: 1 } },
      { name: MCP_TOOL_NAMES.get_context_packet, args: { world_slug: "seeded", seed_nodes: ["CF-0001"] } },
      { name: MCP_TOOL_NAMES.find_impacted_fragments, args: { node_ids: ["CF-0001"] } },
      { name: MCP_TOOL_NAMES.find_sections_touched_by, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.find_named_entities, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.find_edit_anchors, args: { world_slug: "seeded" } },
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
