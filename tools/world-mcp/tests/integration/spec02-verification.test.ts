import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../../src/server";
import { MCP_TOOL_NAMES } from "../../src/tool-names";
import {
  SPEC02_FIXTURE_SEED_NODE,
  SPEC02_FIXTURE_SUMMARY_NULL_NODE,
  SPEC02_FIXTURE_WEIGHTED_ONLY_NODE,
  buildDriftedWorldFixture,
  buildEmptyWorldFixture,
  buildSpec02Fixture,
  buildSpec02MultiWorldFixture,
  buildVersionMismatchFixture,
  createSpec02FixtureRoot
} from "../fixtures/build-fixture";
import { destroyTempRepoRoot } from "../tools/_shared";

function extractContractKeyTree(): Record<string, string[]> {
  const contractPath = path.join(
    "/home/joeloverbeck/projects/worldloom",
    "docs",
    "CONTEXT-PACKET-CONTRACT.md"
  );
  const source = readFileSync(contractPath, "utf8");
  const match = source.match(/```yaml\n([\s\S]*?)```/);
  assert.ok(match?.[1], "expected canonical YAML example in CONTEXT-PACKET-CONTRACT.md");

  const lines = match[1].split("\n");
  const tree: Record<string, string[]> = {};
  let currentTopLevel: string | null = null;

  for (const rawLine of lines) {
    if (rawLine.trim().length === 0 || rawLine.trim().startsWith("- ")) {
      continue;
    }

    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const trimmed = rawLine.trim();
    const key = trimmed.replace(/:.*$/, "");

    if (indent === 0) {
      currentTopLevel = key;
      tree[currentTopLevel] = [];
      continue;
    }

    if (indent === 2 && currentTopLevel !== null) {
      tree[currentTopLevel]?.push(key);
    }
  }

  return tree;
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

async function withServerClient<T>(root: string, run: (client: Client) => Promise<T>): Promise<T> {
  const originalCwd = process.cwd();
  process.chdir(path.join(root, "tools", "world-mcp"));

  const server = createServer();
  const client = new Client({
    name: "worldloom-spec02-verification-test",
    version: "0.1.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return await run(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
    process.chdir(originalCwd);
  }
}

test("SPEC-02 capstone: canon_addition packet stays under budget and cuts eager-load bytes by at least 50%", async () => {
  const root = createSpec02FixtureRoot();
  const fixture = buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.get_context_packet,
        arguments: {
          task_type: "canon_addition",
          world_slug: fixture.worldSlug,
          seed_nodes: [fixture.seedNodeId],
          token_budget: 8000
        }
      });

      assert.notEqual(result.isError, true);
      const packet = result.structuredContent as Record<string, unknown>;
      const packetBytes = Buffer.byteLength(JSON.stringify(packet), "utf8");
      const eagerLoadBytes = fixture.eagerLoadFiles.reduce((total, filePath) => {
        return total + Buffer.byteLength(readFileSync(path.join(root, "worlds", fixture.worldSlug, filePath), "utf8"));
      }, 0);

      assert.ok(packetBytes < 8000);
      assert.ok(packetBytes <= eagerLoadBytes / 2);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: multi-world search requests stay world-scoped under concurrent server calls", async () => {
  const root = createSpec02FixtureRoot();
  const fixture = buildSpec02MultiWorldFixture(root);

  try {
    await withServerClient(root, async (client) => {
      const [worldA, worldB] = await Promise.all([
        client.callTool({
          name: MCP_TOOL_NAMES.search_nodes,
          arguments: {
            query: "Brinewick",
            filters: { world_slug: fixture.worldA }
          }
        }),
        client.callTool({
          name: MCP_TOOL_NAMES.search_nodes,
          arguments: {
            query: "Blackreef",
            filters: { world_slug: fixture.worldB }
          }
        })
      ]);

      const worldANodes = (worldA.structuredContent as { nodes: Array<{ world_slug: string; id: string }> }).nodes;
      const worldBNodes = (worldB.structuredContent as { nodes: Array<{ world_slug: string; id: string }> }).nodes;

      assert.ok(worldANodes.length > 0);
      assert.ok(worldBNodes.length > 0);
      assert.ok(worldANodes.every((node) => node.world_slug === fixture.worldA));
      assert.ok(worldBNodes.every((node) => node.world_slug === fixture.worldB));
      assert.ok(worldANodes.every((node) => !node.id.startsWith(`${fixture.worldB}:`)));
      assert.ok(worldBNodes.every((node) => !node.id.startsWith(`${fixture.worldA}:`)));
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: search_nodes preserves exact-entity results ahead of weighted-only lexical hits through the MCP server", async () => {
  const root = createSpec02FixtureRoot();
  const fixture = buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.search_nodes,
        arguments: {
          query: "Brinewick",
          filters: { world_slug: fixture.worldSlug }
        }
      });

      assert.notEqual(result.isError, true);
      const nodes = (result.structuredContent as { nodes: Array<{ id: string }> }).nodes.map((node) => node.id);
      const weightedIndex = nodes.indexOf(SPEC02_FIXTURE_WEIGHTED_ONLY_NODE);
      const seedIndex = nodes.indexOf(SPEC02_FIXTURE_SEED_NODE);

      assert.notEqual(seedIndex, -1);
      assert.notEqual(weightedIndex, -1);
      assert.ok(seedIndex < weightedIndex);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: server returns empty_index for an empty indexed world", async () => {
  const root = createSpec02FixtureRoot();
  buildEmptyWorldFixture(root, "empty-world");

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.search_nodes,
        arguments: {
          query: "anything",
          filters: { world_slug: "empty-world" }
        }
      });

      assert.equal(result.isError, true);
      assert.equal((result.structuredContent as { code: string }).code, "empty_index");
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: server returns stale_index when tracked source files drift after indexing", async () => {
  const root = createSpec02FixtureRoot();
  const driftedFile = buildDriftedWorldFixture(root, "drifted-world");

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.search_nodes,
        arguments: {
          query: "water",
          filters: { world_slug: "drifted-world" }
        }
      });

      assert.equal(result.isError, true);
      const structured = result.structuredContent as { code: string; details?: { drifted_files?: string[] } };
      assert.equal(structured.code, "stale_index");
      assert.deepEqual(structured.details?.drifted_files, [driftedFile]);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: server returns index_version_mismatch when the sidecar version drifts", async () => {
  const root = createSpec02FixtureRoot();
  buildVersionMismatchFixture(root, "skewed-world");

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.search_nodes,
        arguments: {
          query: "anything",
          filters: { world_slug: "skewed-world" }
        }
      });

      assert.equal(result.isError, true);
      assert.equal((result.structuredContent as { code: string }).code, "index_version_mismatch");
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: search_nodes preserves summary nulls and still returns a preview", async () => {
  const root = createSpec02FixtureRoot();
  const fixture = buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.search_nodes,
        arguments: {
          query: "Salt Quay",
          filters: { world_slug: fixture.worldSlug }
        }
      });

      assert.notEqual(result.isError, true);
      const match = (result.structuredContent as {
        nodes: Array<{ id: string; summary: string | null; body_preview: string }>;
      }).nodes.find((node) => node.id === SPEC02_FIXTURE_SUMMARY_NULL_NODE);

      assert.ok(match);
      assert.equal(match.summary, null);
      assert.ok(match.body_preview.length > 0);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: context packet shape still matches the canonical contract through the MCP server", async () => {
  const root = createSpec02FixtureRoot();
  const fixture = buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.get_context_packet,
        arguments: {
          task_type: "canon_addition",
          world_slug: fixture.worldSlug,
          seed_nodes: [fixture.seedNodeId],
          token_budget: 8000
        }
      });

      assert.notEqual(result.isError, true);
      const packet = result.structuredContent as Record<string, Record<string, unknown>>;
      const contractTree = extractContractKeyTree();

      assert.deepEqual(Object.keys(packet), Object.keys(contractTree));
      assert.deepEqual(Object.keys(packet.task_header ?? {}), contractTree.task_header);
      assert.deepEqual(Object.keys(packet.nucleus ?? {}), contractTree.nucleus);
      assert.deepEqual(Object.keys(packet.envelope ?? {}), contractTree.envelope);
      assert.deepEqual(Object.keys(packet.constraints ?? {}), contractTree.constraints);
      assert.deepEqual(
        Object.keys(packet.suggested_impact_surfaces ?? {}),
        contractTree.suggested_impact_surfaces
      );
      assert.equal(packet.task_header?.packet_version, 1);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: types-only world-index public export imports cleanly", () => {
  const exported = require("@worldloom/world-index/public/types") as { CURRENT_INDEX_VERSION?: unknown };
  assert.equal(typeof exported.CURRENT_INDEX_VERSION, "number");
});

test("SPEC-02 capstone: validate_patch_plan still returns validator_unavailable in Phase 1", async () => {
  const root = createSpec02FixtureRoot();
  buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.validate_patch_plan,
        arguments: { patch_plan: buildValidPatchPlan() }
      });

      assert.equal(result.isError, true);
      assert.equal((result.structuredContent as { code: string }).code, "validator_unavailable");
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: submit_patch_plan still returns phase1_stub in Phase 1", async () => {
  const root = createSpec02FixtureRoot();
  buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.submit_patch_plan,
        arguments: {
          patch_plan: buildValidPatchPlan(),
          approval_token: "unused-in-phase-1"
        }
      });

      assert.equal(result.isError, true);
      assert.equal((result.structuredContent as { code: string }).code, "phase1_stub");
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-02 capstone: integration suite completes within the 30s sentinel", async () => {
  const startedAt = Date.now();
  const root = createSpec02FixtureRoot();
  buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      await client.callTool({
        name: MCP_TOOL_NAMES.get_context_packet,
        arguments: {
          task_type: "canon_addition",
          world_slug: "seeded",
          seed_nodes: [SPEC02_FIXTURE_SEED_NODE],
          token_budget: 8000
        }
      });
    });
  } finally {
    destroyTempRepoRoot(root);
  }

  assert.ok(Date.now() - startedAt < 30_000);
});
