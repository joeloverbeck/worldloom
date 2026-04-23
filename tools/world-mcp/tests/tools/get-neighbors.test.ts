import assert from "node:assert/strict";
import test from "node:test";

import { getNeighbors } from "../../src/tools/get-neighbors";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildNeighborWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record",
        body: "CF-0001"
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: "Brinewick"
      },
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "MYSTERY_RESERVE.md",
        heading_path: "M-1",
        node_type: "mystery_reserve_entry",
        body: "Mystery reserve"
      },
      {
        node_id: "seeded:INVARIANTS.md:Salt:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Salt Trade",
        node_type: "invariant",
        body: "Salt trade invariant"
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
        target_node_id: "M-1",
        edge_type: "firewall_for"
      },
      {
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        target_node_id: "seeded:INVARIANTS.md:Salt:0",
        edge_type: "patched_by"
      }
    ]
  });
}

test("getNeighbors depth 1 returns only direct neighbors", async () => {
  const root = createTempRepoRoot();

  try {
    buildNeighborWorld(root);

    const result = await withRepoRoot(root, () =>
      getNeighbors({ node_id: "CF-0001", world_slug: "seeded", depth: 1 })
    );

    assert.ok("seed" in result);
    assert.deepEqual(
      result.hop1.map((node) => node.node_id),
      ["M-1", "seeded:GEOGRAPHY.md:Brinewick:0"]
    );
    assert.equal(result.hop2, undefined);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNeighbors depth 2 includes neighbors of neighbors without cycling back to the seed", async () => {
  const root = createTempRepoRoot();

  try {
    buildNeighborWorld(root);

    const result = await withRepoRoot(root, () =>
      getNeighbors({ node_id: "CF-0001", world_slug: "seeded", depth: 2 })
    );

    assert.ok("seed" in result);
    assert.deepEqual(
      result.hop2?.map((node) => node.node_id),
      ["seeded:INVARIANTS.md:Salt:0"]
    );
    assert.equal(result.hop2?.[0]?.via_node_id, "seeded:GEOGRAPHY.md:Brinewick:0");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getNeighbors respects an edge_types filter", async () => {
  const root = createTempRepoRoot();

  try {
    buildNeighborWorld(root);

    const result = await withRepoRoot(root, () =>
      getNeighbors({
        node_id: "CF-0001",
        world_slug: "seeded",
        depth: 2,
        edge_types: ["required_world_update"]
      })
    );

    assert.ok("seed" in result);
    assert.deepEqual(
      result.hop1.map((node) => node.node_id),
      ["seeded:GEOGRAPHY.md:Brinewick:0"]
    );
    assert.deepEqual(result.hop2 ?? [], []);
  } finally {
    destroyTempRepoRoot(root);
  }
});
