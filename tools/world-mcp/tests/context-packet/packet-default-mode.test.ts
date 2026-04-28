import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";
import type { ContextPacket, ContextPacketNode } from "../../src/context-packet/shared";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedDefaultModeFixture(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: `Kernel premise. ${"salt ".repeat(40)}`
      },
      {
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: `Invariant text. ${"brine ".repeat(40)}`
      },
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "diegetic_artifact_record",
        body: "---\nauthor_character_id: CHAR-0002\n---\nReport body.\n"
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "character_record",
        body: "---\nname: Melissa Threadscar\n---\nMelissa.\n"
      }
    ],
    edges: [
      {
        source_node_id: "DA-0002",
        target_node_id: "CHAR-0002",
        edge_type: "references_record"
      }
    ]
  });
}

function collectAllNodes(packet: ContextPacket): ContextPacketNode[] {
  return [
    ...packet.local_authority.nodes,
    ...packet.exact_record_links.nodes,
    ...packet.scoped_local_context.nodes,
    ...packet.governing_world_context.nodes,
    ...packet.impact_surfaces.nodes
  ];
}

test("packet-default-mode no delivery_mode argument returns the same shape as delivery_mode='full'", async () => {
  const root = createTempRepoRoot();

  try {
    seedDefaultModeFixture(root);

    const defaultPacket = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000
      })
    );
    assert.ok(!("code" in defaultPacket));

    const explicitFullPacket = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000,
        delivery_mode: "full"
      })
    );
    assert.ok(!("code" in explicitFullPacket));

    const defaultNodes = collectAllNodes(defaultPacket);
    const explicitNodes = collectAllNodes(explicitFullPacket);

    assert.equal(defaultNodes.length, explicitNodes.length);
    assert.ok(defaultNodes.length > 0);

    for (const node of defaultNodes) {
      assert.equal(
        typeof node.body_preview,
        "string",
        `default-mode node ${node.id} must carry a string body_preview (full-mode shape)`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-default-mode rejects unsupported delivery_mode values", async () => {
  const root = createTempRepoRoot();

  try {
    seedDefaultModeFixture(root);

    await assert.rejects(
      withRepoRoot(root, () =>
        getContextPacket({
          task_type: "diegetic_artifact_generation",
          world_slug: "seeded",
          seed_nodes: ["DA-0002"],
          token_budget: 100000,
          // @ts-expect-error - invalid delivery_mode value at runtime
          delivery_mode: "compact"
        })
      ),
      /delivery_mode/i
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
