import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

test("packet v2 populates locality-first classes before advisory impact surfaces", async () => {
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
          node_id: "seeded:EVERYDAY_LIFE.md:Routine:0",
          world_slug: "seeded",
          file_path: "EVERYDAY_LIFE.md",
          heading_path: "Routine",
          node_type: "section",
          body: "Routine"
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
        },
        {
          node_id: "seeded:GEOGRAPHY.md:Harrowgate:0",
          world_slug: "seeded",
          file_path: "GEOGRAPHY.md",
          heading_path: "Harrowgate",
          node_type: "section",
          body: "Harrowgate"
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
          target_node_id: "seeded:GEOGRAPHY.md:Harrowgate:0",
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

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 4000
      })
    );

    assert.ok(!("code" in packet));
    assert.equal(packet.task_header.packet_version, 2);
    assert.ok(packet.local_authority.nodes.some((node) => node.id === "DA-0002"));
    assert.ok(
      packet.local_authority.nodes.some((node) => node.id === "DA-0002#scoped:harrowgate:0")
    );
    assert.ok(packet.exact_record_links.nodes.some((node) => node.id === "CHAR-0002"));
    assert.ok(
      packet.scoped_local_context.nodes.some((node) => node.id === "seeded:GEOGRAPHY.md:Harrowgate:0")
    );
    assert.ok(
      packet.governing_world_context.nodes.some((node) => node.file_path === "WORLD_KERNEL.md")
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
