import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer, getRegisteredToolNames } from "../../src/server";

test("listTools returns exactly the registered worldloom MCP tool inventory", async () => {
  const server = createServer();
  const client = new Client({
    name: "worldloom-server-list-tools-test",
    version: "0.1.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name).sort((left, right) => left.localeCompare(right));
    const expected = getRegisteredToolNames().sort((left, right) => left.localeCompare(right));

    assert.equal(listed.tools.length, 14);
    assert.deepEqual(names, expected);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
});
