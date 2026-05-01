import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function seedHarnessCeilingWorld(root: string): void {
  const largeSummary = "structural-key ".repeat(260);

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "Kernel body.",
        summary: largeSummary
      },
      {
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: "Invariant body.",
        summary: largeSummary
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Harrowgate:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Harrowgate",
        node_type: "section",
        body: "Harrowgate body.",
        summary: largeSummary
      },
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "diegetic_artifact_record",
        body: "---\nauthor_character_id: CHAR-0002\n---\nReport body.\n",
        summary: "Seed report."
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "character_record",
        body: "---\nname: Melissa Threadscar\n---\nMelissa.\n",
        summary: largeSummary
      },
      {
        node_id: "DA-0002#scoped:harrowgate:0",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "scoped_reference",
        body: "Harrowgate",
        summary: "Harrowgate."
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
}

test("assembler drops layers until the serialized packet fits the configured harness ceiling", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "4500";

  try {
    seedHarnessCeilingWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000
      })
    );

    assert.ok(!("code" in result), `expected packet response, got ${"code" in result ? result.code : "n/a"}`);
    assert.equal(result.task_header.harness_ceiling_chars, 4500);
    assert.equal(result.task_header.estimator_version, "chars-per-token-v1");
    assert.ok(
      JSON.stringify(result).length <= result.task_header.harness_ceiling_chars,
      "serialized response must fit the configured harness ceiling"
    );
    assert.ok(
      result.truncation_summary.dropped_layers.length > 0,
      "character-ceiling pressure must record layer drops"
    );
    assert.ok(
      result.truncation_summary.dropped_layers.includes("impact_surfaces"),
      "lower-priority impact surfaces should drop under character-ceiling pressure"
    );
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
    destroyTempRepoRoot(root);
  }
});
