import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";
import type { ContextPacket, ContextPacketNode } from "../../src/context-packet/shared";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  seedWorld,
  withRepoRoot
} from "../tools/_shared";

function seedDefaultFixture(root: string): void {
  const filler = "filler ".repeat(40);

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: `Kernel. ${filler}`
      },
      {
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: `id: ONT-1\nstatement: Invariant. ${filler}\n`
      },
      {
        node_id: "M-0001",
        world_slug: "seeded",
        file_path: "_source/mystery-reserve/M-0001.yaml",
        node_type: "mystery_reserve_entry",
        body: "id: M-0001\nstatus: open\nwhat_is_unknown: Unknown.\n"
      },
      {
        node_id: "CHAR-0001",
        world_slug: "seeded",
        file_path: "characters/protagonist.md",
        node_type: "character_record",
        body: "---\nname: Protagonist\n---\nProtagonist body."
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

test("packet-class-filter default behavior (no node_classes argument) returns mixed-class nodes", async () => {
  const root = createTempRepoRoot();

  try {
    seedDefaultFixture(root);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: 100000
      })
    );
    assert.ok(!("code" in packet));

    const nodes = collectAllNodes(packet);
    assert.ok(nodes.length > 0);

    const distinctClasses = new Set(nodes.map((n) => n.node_type));
    assert.ok(
      distinctClasses.size >= 2,
      `default behavior should yield mixed classes; got ${[...distinctClasses].join(", ")}`
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
