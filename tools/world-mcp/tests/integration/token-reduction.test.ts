import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../../src/server";
import {
  buildSpec02Fixture,
  createSpec02FixtureRoot
} from "../fixtures/build-fixture";
import { destroyTempRepoRoot } from "../tools/_shared";

function estimateTokens(bytes: number): number {
  return Math.ceil(bytes / 4);
}

async function withServerClient<T>(root: string, run: (client: Client) => Promise<T>): Promise<T> {
  const originalCwd = process.cwd();
  process.chdir(path.join(root, "tools", "world-mcp"));

  const server = createServer();
  const client = new Client({
    name: "worldloom-token-reduction-test",
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

test("fixture-local canon_addition packet reduces estimated tokens by at least 50% versus eager-load baseline", async () => {
  const root = createSpec02FixtureRoot();
  const fixture = buildSpec02Fixture(root);

  try {
    await withServerClient(root, async (client) => {
      const result = await client.callTool({
        name: "mcp__worldloom__get_context_packet",
        arguments: {
          task_type: "canon_addition",
          world_slug: fixture.worldSlug,
          seed_nodes: [fixture.seedNodeId],
          token_budget: 8000
        }
      });

      assert.notEqual(result.isError, true);

      const packetBytes = Buffer.byteLength(JSON.stringify(result.structuredContent), "utf8");
      const eagerLoadBytes = fixture.eagerLoadFiles.reduce((total, filePath) => {
        return total + Buffer.byteLength(readFileSync(path.join(root, "worlds", fixture.worldSlug, filePath), "utf8"));
      }, 0);

      const packetTokens = estimateTokens(packetBytes);
      const eagerLoadTokens = estimateTokens(eagerLoadBytes);
      const reduction = 1 - packetTokens / eagerLoadTokens;

      console.log(
        JSON.stringify({
          world_slug: fixture.worldSlug,
          eager_load_tokens: eagerLoadTokens,
          context_packet_tokens: packetTokens,
          reduction_percent: Number((reduction * 100).toFixed(2))
        })
      );

      assert.ok(packetTokens <= eagerLoadTokens / 2);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});
