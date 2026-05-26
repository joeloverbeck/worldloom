import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createServer } from "../src/server/http.js";
import type { BranchMapEdge } from "../src/view-models/branch-map-edge.js";
import type { BranchMapNode } from "../src/view-models/branch-map-node.js";

function createTempRepo(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-sketch-"));
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny"), { recursive: true });
  return repoRoot;
}

test("branch-map view-model types expose the SPEC-87 type-only fields", () => {
  const node: BranchMapNode = {
    pageId: "PG-1",
    branchId: "BR-1",
    turnIndex: 0,
    label: "PG-1",
    hasProse: true,
    isCurrent: true,
    isLeaf: false,
    isTerminal: false,
    eventKind: "npc_action",
    outcomeRoute: "accept",
  };
  const edge: BranchMapEdge = {
    fromPageId: "PG-1",
    toPageId: "PG-2",
    choiceId: "CHC-1",
    choiceLabel: "Follow the thread",
    variantLabel: null,
    branchId: "BR-2",
  };

  assert.equal(node.pageId, "PG-1");
  assert.equal(edge.toPageId, "PG-2");
});

test("search sketch route returns a SPEC-90 not-implemented envelope and validates query params", async () => {
  const server = await createServer({ repoRoot: createTempRepo() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/search?q=thread&kinds=PG,CHC&limit=5&offset=1",
    });
    const body = JSON.parse(response.body) as {
      data?: {
        kind?: string;
        spec?: string;
        query?: { q?: string; kinds?: string[]; limit?: number; offset?: number };
      };
    };
    assert.equal(response.statusCode, 200);
    assert.equal(body.data?.kind, "not_implemented");
    assert.equal(body.data?.spec, "SPEC-90");
    assert.deepEqual(body.data?.query, {
      q: "thread",
      kinds: ["PG", "CHC"],
      limit: 5,
      offset: 1,
    });

    const missingQueryResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/search",
    });
    const missingQueryBody = JSON.parse(missingQueryResponse.body) as { data?: { error?: string; field?: string } };
    assert.equal(missingQueryResponse.statusCode, 400);
    assert.equal(missingQueryBody.data?.error, "invalid_input");
    assert.equal(missingQueryBody.data?.field, "q");

    const badLimitResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/search?q=thread&limit=bad",
    });
    const badLimitBody = JSON.parse(badLimitResponse.body) as { data?: { error?: string; field?: string } };
    assert.equal(badLimitResponse.statusCode, 400);
    assert.equal(badLimitBody.data?.error, "invalid_input");
    assert.equal(badLimitBody.data?.field, "limit");
  } finally {
    await server.close();
  }
});

test("branch-map sketch route returns a SPEC-90 not-implemented envelope and validates query params", async () => {
  const server = await createServer({ repoRoot: createTempRepo() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/branch-map?focus=PG-1&depth=4",
    });
    const body = JSON.parse(response.body) as {
      data?: {
        kind?: string;
        spec?: string;
        query?: { focus?: string; depth?: number };
      };
    };
    assert.equal(response.statusCode, 200);
    assert.equal(body.data?.kind, "not_implemented");
    assert.equal(body.data?.spec, "SPEC-90");
    assert.deepEqual(body.data?.query, { focus: "PG-1", depth: 4 });

    const missingFocusResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/branch-map",
    });
    const missingFocusBody = JSON.parse(missingFocusResponse.body) as { data?: { error?: string; field?: string } };
    assert.equal(missingFocusResponse.statusCode, 400);
    assert.equal(missingFocusBody.data?.error, "invalid_input");
    assert.equal(missingFocusBody.data?.field, "focus");

    const badDepthResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/branch-map?focus=PG-1&depth=11",
    });
    const badDepthBody = JSON.parse(badDepthResponse.body) as { data?: { error?: string; field?: string } };
    assert.equal(badDepthResponse.statusCode, 400);
    assert.equal(badDepthBody.data?.error, "invalid_input");
    assert.equal(badDepthBody.data?.field, "depth");
  } finally {
    await server.close();
  }
});
