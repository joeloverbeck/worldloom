import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

test("canon_addition packet replaces ad hoc multi-file loading with a bounded packet", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
          world_slug: "seeded",
          file_path: "WORLD_KERNEL.md",
          heading_path: "Kernel",
          node_type: "section",
          body: "Kernel"
        },
        {
          node_id: "seeded:INVARIANTS.md:Rule:0",
          world_slug: "seeded",
          file_path: "INVARIANTS.md",
          heading_path: "Rule",
          node_type: "invariant",
          body: "Invariant"
        },
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
          body: "Mystery"
        }
      ],
      edges: [
        {
          source_node_id: "CF-0001",
          target_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
          edge_type: "required_world_update"
        },
        {
          source_node_id: "M-1",
          target_node_id: "CF-0001",
          edge_type: "firewall_for"
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 1200
      })
    );

    assert.ok(!("code" in packet));
    assert.deepEqual(packet.task_header.seed_nodes, ["CF-0001"]);
    assert.ok(packet.local_authority.nodes.length >= 1);
    assert.ok(packet.governing_world_context.nodes.length >= 2);
    assert.ok(packet.task_header.token_budget.allocated < 1200);
  } finally {
    destroyTempRepoRoot(root);
  }
});
