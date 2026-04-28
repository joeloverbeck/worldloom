import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";
import {
  SUMMARY_MAX_LENGTH,
  type ContextPacket,
  type ContextPacketNode
} from "../../src/context-packet/shared";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  seedWorld,
  withRepoRoot
} from "../tools/_shared";

function seedCompositionFixture(root: string): void {
  const filler = "filler ".repeat(60);

  const kernelNode = {
    node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
    world_slug: "seeded",
    file_path: "WORLD_KERNEL.md",
    heading_path: "Kernel",
    node_type: "section" as const,
    body: `Kernel premise. ${filler}`
  };

  const invariantNodes = Array.from({ length: 3 }, (_, i) => ({
    node_id: `seeded:INVARIANTS.md:Rule-${i}:0`,
    world_slug: "seeded",
    file_path: "INVARIANTS.md",
    heading_path: `Rule-${i}`,
    node_type: "invariant" as const,
    body: `id: ONT-${i + 1}\nstatement: Invariant body ${i}. ${filler}\n`
  }));

  const mysteryNodes = Array.from({ length: 4 }, (_, i) => ({
    node_id: `M-${String(i + 1).padStart(4, "0")}`,
    world_slug: "seeded",
    file_path: `_source/mystery-reserve/M-${String(i + 1).padStart(4, "0")}.yaml`,
    heading_path: null,
    node_type: "mystery_reserve_entry" as const,
    body: `id: M-${String(i + 1).padStart(4, "0")}\nstatus: open\nwhat_is_unknown: Unknown ${i}. ${filler}\n`
  }));

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      kernelNode,
      ...invariantNodes,
      ...mysteryNodes,
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

test("packet-class-filter composition with delivery_mode='summary_only' returns mystery-only nodes carrying summary and no body_preview", async () => {
  const root = createTempRepoRoot();

  try {
    seedCompositionFixture(root);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: 100000,
        delivery_mode: "summary_only",
        node_classes: ["mystery_reserve_entry"]
      })
    );
    assert.ok(!("code" in packet));

    const nodes = collectAllNodes(packet);
    assert.ok(nodes.length > 0, "composition should retain at least one mystery_reserve_entry node");

    for (const node of nodes) {
      assert.equal(
        node.node_type,
        "mystery_reserve_entry",
        `composition node ${node.id} must be mystery_reserve_entry, got ${node.node_type}`
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(node, "body_preview"),
        false,
        `composition node ${node.id} must omit body_preview under summary_only`
      );
      assert.equal(typeof node.summary, "string", `composition node ${node.id} must carry a summary string`);
      assert.ok((node.summary ?? "").length > 0);
      assert.ok((node.summary ?? "").length <= SUMMARY_MAX_LENGTH);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-class-filter composition with delivery_mode='full' returns mystery-only nodes carrying body_preview", async () => {
  const root = createTempRepoRoot();

  try {
    seedCompositionFixture(root);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CHAR-0001"],
        token_budget: 100000,
        delivery_mode: "full",
        node_classes: ["mystery_reserve_entry"]
      })
    );
    assert.ok(!("code" in packet));

    const nodes = collectAllNodes(packet);
    assert.ok(nodes.length > 0);

    for (const node of nodes) {
      assert.equal(node.node_type, "mystery_reserve_entry");
      assert.equal(typeof node.body_preview, "string");
      assert.ok((node.body_preview ?? "").length > 0);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});
