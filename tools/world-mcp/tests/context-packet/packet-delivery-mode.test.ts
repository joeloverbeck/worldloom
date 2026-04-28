import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble";
import {
  SUMMARY_MAX_LENGTH,
  estimatePacketTokens,
  type ContextPacket,
  type ContextPacketNode
} from "../../src/context-packet/shared";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedMatureFixture(root: string): void {
  const longFiller = "filler ".repeat(80);

  const kernelNodes = Array.from({ length: 6 }, (_, i) => ({
    node_id: `seeded:WORLD_KERNEL.md:Kernel-${i}:0`,
    world_slug: "seeded",
    file_path: "WORLD_KERNEL.md",
    heading_path: `Kernel-${i}`,
    node_type: "section" as const,
    body: `K${i}. ${longFiller}`
  }));

  const invariantNodes = Array.from({ length: 6 }, (_, i) => ({
    node_id: `seeded:INVARIANTS.md:Rule-${i}:0`,
    world_slug: "seeded",
    file_path: "INVARIANTS.md",
    heading_path: `Rule-${i}`,
    node_type: "invariant" as const,
    body: `R${i}. ${longFiller}`
  }));

  const everydayNodes = Array.from({ length: 6 }, (_, i) => ({
    node_id: `seeded:EVERYDAY_LIFE.md:Section-${i}:0`,
    world_slug: "seeded",
    file_path: "EVERYDAY_LIFE.md",
    heading_path: `Section-${i}`,
    node_type: "section" as const,
    body: `E${i}. ${longFiller}`
  }));

  const geographyNodes = Array.from({ length: 4 }, (_, i) => ({
    node_id: `seeded:GEOGRAPHY.md:Harrowgate-${i}:0`,
    world_slug: "seeded",
    file_path: "GEOGRAPHY.md",
    heading_path: `Harrowgate-${i}`,
    node_type: "section" as const,
    body: `G${i}. ${longFiller}`
  }));

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      ...kernelNodes,
      ...invariantNodes,
      ...everydayNodes,
      ...geographyNodes,
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "diegetic_artifact_record",
        body: `---\nauthor_character_id: CHAR-0002\n---\nD. ${longFiller}`
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "character_record",
        body: `---\nname: Melissa Threadscar\n---\nC. ${longFiller}`
      },
      {
        node_id: "DA-0002#scoped:harrowgate:0",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "scoped_reference",
        body: "Harrowgate"
      }
    ],
    edges: [
      {
        source_node_id: "DA-0002",
        target_node_id: "CHAR-0002",
        edge_type: "references_record"
      },
      {
        source_node_id: "DA-0002",
        target_node_id: "DA-0002#scoped:harrowgate:0",
        edge_type: "references_scoped_name"
      },
      {
        source_node_id: "DA-0002",
        target_node_id: geographyNodes[0]!.node_id,
        edge_type: "required_world_update"
      }
    ],
    scopedReferences: [
      {
        reference_id: "DA-0002#scoped:harrowgate:0",
        world_slug: "seeded",
        display_name: "Harrowgate",
        reference_kind: "place",
        relation: "filing_location",
        source_node_id: "DA-0002"
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

function nodeIdsByLayer(packet: ContextPacket): Record<string, string[]> {
  return {
    local_authority: packet.local_authority.nodes.map((node) => node.id).sort(),
    exact_record_links: packet.exact_record_links.nodes.map((node) => node.id).sort(),
    scoped_local_context: packet.scoped_local_context.nodes.map((node) => node.id).sort(),
    governing_world_context: packet.governing_world_context.nodes.map((node) => node.id).sort(),
    impact_surfaces: packet.impact_surfaces.nodes.map((node) => node.id).sort()
  };
}

test("packet-delivery-mode summary_only response is materially smaller than full on a mature-world fixture", async () => {
  const root = createTempRepoRoot();

  try {
    seedMatureFixture(root);

    const fullPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000,
        delivery_mode: "full"
      })
    );
    assert.ok(!("code" in fullPacket));

    const summaryPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000,
        delivery_mode: "summary_only"
      })
    );
    assert.ok(!("code" in summaryPacket));

    const fullSize = estimatePacketTokens(fullPacket);
    const summarySize = estimatePacketTokens(summaryPacket);

    assert.ok(
      summarySize <= fullSize * 0.55,
      `summary_only size ${summarySize} should be <= 55% of full size ${fullSize} on a mature fixture (ratio ${(summarySize / fullSize).toFixed(3)}); per-node body_preview cap is 280 chars vs summary cap 100 chars, so material reduction (>=45%) is the achievable target.`
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-delivery-mode both modes return the same node-id set per layer", async () => {
  const root = createTempRepoRoot();

  try {
    seedMatureFixture(root);

    const fullPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000,
        delivery_mode: "full"
      })
    );
    assert.ok(!("code" in fullPacket));

    const summaryPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000,
        delivery_mode: "summary_only"
      })
    );
    assert.ok(!("code" in summaryPacket));

    assert.deepEqual(nodeIdsByLayer(summaryPacket), nodeIdsByLayer(fullPacket));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-delivery-mode summary_only nodes omit body_preview and carry a non-empty summary <= 100 chars", async () => {
  const root = createTempRepoRoot();

  try {
    seedMatureFixture(root);

    const summaryPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000,
        delivery_mode: "summary_only"
      })
    );
    assert.ok(!("code" in summaryPacket));

    const allNodes = collectAllNodes(summaryPacket);
    assert.ok(allNodes.length > 0, "fixture should produce at least one node across the five layers");

    for (const node of allNodes) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(node, "body_preview"),
        false,
        `summary_only node ${node.id} must omit body_preview`
      );
      assert.equal(typeof node.summary, "string", `summary_only node ${node.id} must carry a string summary`);
      assert.ok(
        (node.summary ?? "").length > 0,
        `summary_only node ${node.id} must carry a non-empty summary`
      );
      assert.ok(
        (node.summary ?? "").length <= SUMMARY_MAX_LENGTH,
        `summary_only node ${node.id} summary length ${(node.summary ?? "").length} exceeds ${SUMMARY_MAX_LENGTH}`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("packet-delivery-mode full nodes carry body_preview", async () => {
  const root = createTempRepoRoot();

  try {
    seedMatureFixture(root);

    const fullPacket = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000,
        delivery_mode: "full"
      })
    );
    assert.ok(!("code" in fullPacket));

    const allNodes = collectAllNodes(fullPacket);
    assert.ok(allNodes.length > 0);

    for (const node of allNodes) {
      assert.equal(
        typeof node.body_preview,
        "string",
        `full-mode node ${node.id} must carry a string body_preview`
      );
      assert.ok(
        (node.body_preview ?? "").length > 0,
        `full-mode node ${node.id} must carry a non-empty body_preview`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});
